import { parse, serialize } from 'cookie';
import type { HandlerEvent } from '@netlify/functions';

const COOKIE_NAME = 'borderline_user_id';
// Secure by default (Prod), unless explicitly in Netlify Dev mode
const IS_DEV = process.env.NETLIFY_DEV === 'true';
const USE_SECURE_COOKIES = !IS_DEV;

export const getUserId = (event: HandlerEvent): string | null => {
    const cookieHeader = event.headers.cookie || event.headers.Cookie || event.headers.COOKIE || '';
    const cookies = parse(cookieHeader);
    return cookies[COOKIE_NAME] || null;
};

export const setUserIdCookie = (userId: string): string => {
    return serialize(COOKIE_NAME, userId, {
        httpOnly: true,
        secure: USE_SECURE_COOKIES, // Secure in production (default)
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
    });
}

export const clearUserIdCookie = (): string => {
    return serialize(COOKIE_NAME, '', {
        httpOnly: true,
        secure: USE_SECURE_COOKIES,
        sameSite: 'lax',
        path: '/',
        maxAge: 0, // Expire immediately
    });
}
