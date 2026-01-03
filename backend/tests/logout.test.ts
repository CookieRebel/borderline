import { describe, it, expect } from 'vitest';
import { handler } from '../netlify/functions/logout';
import { parse } from 'cookie';

const mockEvent = (method: string) => ({
    httpMethod: method,
    headers: {},
    body: '',
    rawUrl: '',
    rawQuery: '',
    path: '',
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
} as any);

const mockContext: any = {};

describe('Logout Endpoint (POST /api/logout)', () => {
    it('should return 200 and clear cookie', async () => {
        const res = await handler(mockEvent('POST'), mockContext);

        expect(res?.statusCode).toBe(200);

        const setCookie = String(res?.headers?.['Set-Cookie'] || '');
        const cookies = parse(setCookie);

        // Value should be empty
        expect(cookies.borderline_user_id).toBe('');

        // Max-Age should be 0 (expired)
        expect(setCookie).toContain('Max-Age=0');
        expect(setCookie).toContain('HttpOnly');
    });

    it('should return 405 for Non-POST method', async () => {
        const res = await handler(mockEvent('GET'), mockContext);
        expect(res?.statusCode).toBe(405);
    });
});
