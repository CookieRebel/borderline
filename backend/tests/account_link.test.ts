import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../netlify/functions/account_link'; // We'll need to export handler
import { db, schema } from '../src/db';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { setupTestDb } from './test_utils';

// Mock Supabase Client
const mockGetUser = vi.fn();
vi.mock('../src/utils/supabase', () => ({
    supabase: {
        auth: {
            getUser: (...args: any[]) => mockGetUser(...args)
        }
    }
}));

// Mock Netlify Context
const mockContext: any = {};
const mockEvent = (method: string, headers: any = {}) => ({
    httpMethod: method,
    headers: headers,
    body: '',
    rawUrl: '',
    rawQuery: '',
    path: '',
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
});

describe('Account Linking (POST /api/account/link)', () => {

    beforeEach(async () => {
        vi.clearAllMocks();
        await setupTestDb();
    });

    it('should return 401 if Authorization header is missing', async () => {
        const res = await handler(mockEvent('POST', {}), mockContext);
        expect(res?.statusCode).toBe(401);
        expect(res?.body).toContain('Missing Bearer Token');
    });

    it('should return 401 if token is invalid', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Bad token' } });

        const res = await handler(mockEvent('POST', { Authorization: 'Bearer invalid' }), mockContext);
        expect(res?.statusCode).toBe(401);
        expect(res?.body).toContain('Invalid Token');
    });

    it('should return 400 if no session cookie provided', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: 'supa-123', email: 'test@example.com' } },
            error: null
        });

        const res = await handler(mockEvent('POST', { Authorization: 'Bearer valid' }), mockContext);
        expect(res?.statusCode).toBe(400);
        expect(res?.body).toContain('No Session Cookie');
    });

    it('Scenario B: Should link current anonymous user if Supabase ID is new', async () => {
        const supaId = uuidv4();
        const cookieId = uuidv4();

        // Seed anonymous user
        await db.insert(schema.users).values({
            id: cookieId,
            displayName: 'Anon User',
            isRegistered: false
        });

        mockGetUser.mockResolvedValue({
            data: { user: { id: supaId, email: 'link@example.com' } },
            error: null
        });

        const headers = {
            Authorization: 'Bearer valid_token',
            Cookie: `borderline_user_id=${cookieId}`
        };

        const res = await handler(mockEvent('POST', headers), mockContext);

        expect(res?.statusCode).toBe(200);
        const body = JSON.parse(res?.body || '{}');
        expect(body.id).toBe(cookieId);
        expect(body.supabaseUserId).toBe(supaId);
        expect(body.isRegistered).toBe(true);

        // Verify DB
        const [dbUser] = await db.select().from(schema.users).where(eq(schema.users.id, cookieId));
        expect(dbUser.supabaseUserId).toBe(supaId);
    });

    it('Scenario A: Should return existing user and switch cookie if Supabase ID exists (Account Wins)', async () => {
        const supaId = uuidv4();
        const existingUserId = uuidv4();
        const currentAnonId = uuidv4();

        // 1. Existing registered user
        await db.insert(schema.users).values({
            id: existingUserId,
            displayName: 'Existing User',
            supabaseUserId: supaId,
            isRegistered: true,
            email: 'existing@example.com'
        });

        // 2. Current anonymous session (different user)
        await db.insert(schema.users).values({
            id: currentAnonId,
            displayName: 'Current Anon',
            isRegistered: false
        });

        mockGetUser.mockResolvedValue({
            data: { user: { id: supaId, email: 'existing@example.com' } },
            error: null
        });

        const headers = {
            Authorization: 'Bearer valid_token',
            Cookie: `borderline_user_id=${currentAnonId}`
        };

        const res = await handler(mockEvent('POST', headers), mockContext);

        expect(res?.statusCode).toBe(200);
        const body = JSON.parse(res?.body || '{}');

        // Should return the EXISTING user account, not the anonymous one
        expect(body.id).toBe(existingUserId);
        expect(body.displayName).toBe('Existing User');

        // Should set cookie to the existing user
        // Should set cookie to the existing user
        const setCookie = String(res?.multiValueHeaders?.['Set-Cookie']?.[0] || '');
        expect(setCookie).toContain(`borderline_user_id=${existingUserId}`);
    });
});
