import { Handler } from '@netlify/functions';
import { clearUserIdCookie } from '../../src/utils/auth';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    return {
        statusCode: 200,
        headers: {
            'Set-Cookie': clearUserIdCookie(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Logged out' })
    };
};
