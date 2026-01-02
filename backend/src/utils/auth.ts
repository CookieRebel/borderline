import { parse, serialize } from 'cookie';
import type { HandlerEvent } from '@netlify/functions';

const COOKIE_NAME = 'borderline_user_id';
const IS_PROD = process.env.NODE_ENV === 'production';

export const getUserId = (event: HandlerEvent): string | null => {
    const cookieHeader = event.headers.cookie || event.headers.Cookie || event.headers.COOKIE || '';
    const cookies = parse(cookieHeader);
    return cookies[COOKIE_NAME] || null;
};

export const setUserIdCookie = (userId: string): string => {
    return serialize(COOKIE_NAME, userId, {
        httpOnly: true,
        secure: IS_PROD, // Secure in production
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
    });
}
