import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler as linkHandler } from '../netlify/functions/account_link';
import { handler as logoutHandler } from '../netlify/functions/logout';
import { handler as identityHandler } from '../netlify/functions/identity';
import { db, schema } from '../src/db';
import { v4 as uuidv4 } from 'uuid';
import { setupTestDb } from './test_utils';
import { parse } from 'cookie';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// ensure env vars are loaded for test file too
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase Config for Tests');
}

// REAL Supabase Client
const realSupabase = createClient(supabaseUrl, supabaseKey);

// DO NOT MOCK Supabase anymore
vi.unmock('../src/utils/supabase');

const mockContext: any = {};
const mockEvent = (method: string, headers: any = {}, body: any = {}) => ({
    httpMethod: method,
    headers: headers,
    body: JSON.stringify(body),
} as any);

describe('Auth Lifecycle Flows (REAL SUPABASE)', () => {

    beforeEach(async () => {
        vi.clearAllMocks();
        await setupTestDb();
    });

    // Helper: Create a REAL Supabase User and get Token
    const createRealSupabaseUser = async () => {
        const email = `test_user_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
        const password = 'Password123!';

        const { data, error } = await realSupabase.auth.signUp({
            email,
            password,
        });

        if (error) throw new Error(`Supabase SignUp Failed: ${error.message}`);
        if (!data.session) throw new Error('Supabase SignUp did not return session (Check "Allow Email Confirm" settings?)');

        return {
            user: data.user,
            token: data.session.access_token,
            email
        };
    };

    // Flow 1 & 2: Anon -> Signup -> Linked (Preserving History)
    it('Flows 1 & 2: Anonymous User with History -> Signs Up -> Becomes Linked User (Preserves Identity)', async () => {
        const anonId = uuidv4();

        // 1. Create Anon User (Local DB)
        await db.insert(schema.users).values({
            id: anonId,
            displayName: 'Real Anon Player',
            isRegistered: false,
            streak: 5
        });

        // 2. Create REAL Supabase User
        const { user: supaUser, token, email } = await createRealSupabaseUser();

        // 3. Call Link API with REAL Token
        const headers = {
            Authorization: `Bearer ${token}`,
            Cookie: `borderline_user_id=${anonId}`
        };

        const res = await linkHandler(mockEvent('POST', headers), mockContext);

        expect(res?.statusCode).toBe(200);
        const body = JSON.parse(res?.body || '{}');

        // Verify Identity Preserved
        expect(body.id).toBe(anonId);
        expect(body.supabaseUserId).toBe(supaUser!.id);
        expect(body.email).toBe(email);
        expect(body.streak).toBe(5);
        expect(body.isRegistered).toBe(true);
    });

    // Flow 3: Signed Up User -> Login (Account Switch)
    it('Flow 3: Existing Account Login -> Switches from Anon to Account (Account Wins)', async () => {
        const existingAccountId = uuidv4();
        const currentAnonId = uuidv4();

        // 1. Create REAL User A
        const { user: supaUser, token: tokenA } = await createRealSupabaseUser();

        // 2. Link User A to "Main Account" in DB (Manually seeding DB to match Supabase User)
        await db.insert(schema.users).values({
            id: existingAccountId,
            displayName: 'Main Account',
            supabaseUserId: supaUser!.id,
            isRegistered: true,
            streak: 100,
            email: supaUser!.email
        });

        // 3. Setup Temp Anon User (Current Browser)
        await db.insert(schema.users).values({
            id: currentAnonId,
            displayName: 'Temp Anon',
            isRegistered: false,
            streak: 0
        });

        // 4. Simulate sending request (User A logs in)
        const headers = {
            Authorization: `Bearer ${tokenA}`,
            Cookie: `borderline_user_id=${currentAnonId}`
        };

        const res = await linkHandler(mockEvent('POST', headers), mockContext);

        expect(res?.statusCode).toBe(200);
        const body = JSON.parse(res?.body || '{}');

        // Verify Switch occurred
        expect(body.id).toBe(existingAccountId);
        expect(body.displayName).toBe('Main Account');

        // Verify Cookie set to Main Account
        const setCookie = String(res?.headers?.['Set-Cookie'] || '');
        expect(setCookie).toContain(`borderline_user_id=${existingAccountId}`);
    });

    // Flow 4: Logged In -> Logout -> New Anon
    it('Flow 4: Logged In User -> Logout -> Creates New Anonymous User', async () => {
        // Logout logic is purely backend cookie clearing, so it doesn't strictly depend on Supabase,
        // but we verify the full chain of endpoints.

        // 1. Call Logout
        const logoutRes = await logoutHandler(mockEvent('POST'), mockContext);
        expect(logoutRes?.statusCode).toBe(200);
        const logoutCookie = String(logoutRes?.headers?.['Set-Cookie'] || '');
        expect(logoutCookie).toContain('Max-Age=0');

        // 2. Call Identity
        const identityRes = await identityHandler(mockEvent('POST', {}, { timezone: 'UTC' }), mockContext);
        expect(identityRes?.statusCode).toBe(201);

        const newAnonBody = JSON.parse(identityRes?.body || '{}');
        expect(newAnonBody.isRegistered).toBe(false);
    });

});
