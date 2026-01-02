import { describe, it, expect, beforeEach } from 'vitest';
import { db, schema } from '../src/db';
import { handler as identityHandler } from '../netlify/functions/identity';
import { handler as meHandler } from '../netlify/functions/me';
import type { HandlerEvent, HandlerContext } from '@netlify/functions';
import { parse } from 'cookie';
import { eq } from 'drizzle-orm';
import { setupTestDb } from './test_utils';

const mockContext = {} as HandlerContext;
const mockEvent = (method: string, body: any = {}, headers: any = {}): HandlerEvent => ({
    body: JSON.stringify(body),
    headers,
    httpMethod: method,
    isBase64Encoded: false,
    path: '',
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    rawUrl: '',
    rawQuery: '',
} as any);

describe('Identity Flow (Cookie Auth)', () => {

    beforeEach(async () => {
        await setupTestDb();
    });

    it('POST /api/identity should create new user and return cookie', async () => {
        const res = await identityHandler(mockEvent('POST', { timezone: 'Australia/Sydney' }), mockContext);
        expect(res?.statusCode).toBe(201);

        const body = JSON.parse(res?.body || '{}');
        expect(body.id).toBeDefined();
        expect(body.displayName).toBeDefined();
        expect(body.timezone).toBe('Australia/Sydney');

        const setCookieHeader = String(res?.headers?.['Set-Cookie'] || '');
        const cookies = parse(setCookieHeader);
        expect(cookies.borderline_user_id).toBe(body.id);
        expect(setCookieHeader).toContain('HttpOnly'); // Check specific flag
        expect(setCookieHeader).toContain('Path=/');
    });

    it('POST /api/identity should return 400 if timezone is missing', async () => {
        const res = await identityHandler(mockEvent('POST', {}), mockContext);
        expect(res?.statusCode).toBe(400);
        const body = JSON.parse(res?.body || '{}');
        expect(body.error).toMatch(/Timezone is required/i);
    });

    it('POST /api/identity should return existing user if cookie is present', async () => {
        // Create user first
        const initRes = await identityHandler(mockEvent('POST', { timezone: 'Australia/Sydney' }), mockContext);
        const userId = JSON.parse(initRes?.body || '{}').id;
        const cookieVal = `borderline_user_id=${userId}`;

        // Call again with cookie
        const res = await identityHandler(mockEvent('POST', { timezone: 'Australia/Sydney' }, { cookie: cookieVal }), mockContext);
        expect(res?.statusCode).toBe(200);
        const body = JSON.parse(res?.body || '{}');
        expect(body.id).toBe(userId);
    });

    it('POST /api/identity should migrate legacy_id if cookie missing', async () => {
        // Create manual legacy user
        const [dirUser] = await db.insert(schema.users).values({ displayName: 'LegacyUser' }).returning();

        const res = await identityHandler(mockEvent('POST', { legacy_id: dirUser.id, timezone: 'Australia/Sydney' }), mockContext);
        expect(res?.statusCode).toBe(200);

        const body = JSON.parse(res?.body || '{}');
        expect(body.id).toBe(dirUser.id);

        // Should set cookie
        const cookies = parse(String(res?.headers?.['Set-Cookie'] || ''));
        expect(cookies.borderline_user_id).toBe(dirUser.id);
    });

    it('POST /api/identity should IGNORE userId passed in body (Negative Test)', async () => {
        // Only legacy_id triggers migration, 'id' or 'userId' should be ignored
        const fakeId = 'bad-uuid-1234';
        const res = await identityHandler(mockEvent('POST', { id: fakeId, timezone: 'Australia/Sydney' }), mockContext);

        expect(res?.statusCode).toBe(201); // Created NEW user
        const body = JSON.parse(res?.body || '{}');
        expect(body.id).not.toBe(fakeId);
    });
});

describe('Me Endpoint (/api/me)', () => {

    beforeEach(async () => {
        await setupTestDb();
    });

    it('GET /api/me should return user for valid cookie', async () => {
        const [user] = await db.insert(schema.users).values({ displayName: 'MeTester' }).returning();
        const cookieVal = `borderline_user_id=${user.id}`;

        const res = await meHandler(mockEvent('GET', {}, { cookie: cookieVal }), mockContext);
        expect(res?.statusCode).toBe(200);
        expect(JSON.parse(res?.body || '{}').id).toBe(user.id);
    });

    it('GET /api/me should return 401 if cookie missing (Bootstrapping Removed)', async () => {
        const res = await meHandler(mockEvent('GET'), mockContext);
        expect(res?.statusCode).toBe(401);
    });

    it('PATCH /api/me should update displayName and timezone', async () => {
        const [user] = await db.insert(schema.users).values({ displayName: 'OldName' }).returning();
        const cookieVal = `borderline_user_id=${user.id}`;

        const res = await meHandler(mockEvent('PATCH', { displayName: 'NewName', timezone: 'UTC' }, { cookie: cookieVal }), mockContext);
        expect(res?.statusCode).toBe(200);
        const body = JSON.parse(res?.body || '{}');
        expect(body.displayName).toBe('NewName');
        expect(body.timezone).toBe('UTC');

        // Verify DB
        const dbUser = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
        expect(dbUser?.displayName).toBe('NewName');
    });

    it('PATCH /api/me should return 401 if no cookie', async () => {
        const res = await meHandler(mockEvent('PATCH', { displayName: 'Hacker' }), mockContext);
        expect(res?.statusCode).toBe(401);
    });

    it('PATCH /api/me should reject updates to restricted fields (Negative Test)', async () => {
        const [user] = await db.insert(schema.users).values({ displayName: 'SafeUser' }).returning();
        const cookieVal = `borderline_user_id=${user.id}`;

        const res = await meHandler(mockEvent('PATCH', { id: 'new-id', score: 9999 }, { cookie: cookieVal }), mockContext);
        expect(res?.statusCode).toBe(403);
    });
});
