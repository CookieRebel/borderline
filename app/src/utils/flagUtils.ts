import * as ct from 'countries-and-timezones';

/**
 * Converts an ISO Alpha-2 country code to an emoji flag.
 * @param alpha2 The 2-letter country code (e.g., 'AU', 'US').
 * @returns The emoji flag string, or an empty string if invalid.
 */
export const getFlag = (alpha2: string | undefined): string => {
    if (!alpha2 || alpha2.length !== 2) return '';
    return String.fromCodePoint(
        ...alpha2.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
};

/**
 * Gets the country code for a given IANA timezone string.
 * @param timezone The IANA timezone string (e.g., 'Australia/Melbourne').
 * @returns The ISO Alpha-2 country code (e.g., 'AU'), or null if not found.
 */
export const getCountryFromTimezone = (timezone: string): string | null => {
    if (!timezone) return null;

    // First, try direct lookup via library
    const tzData = ct.getTimezone(timezone);
    if (tzData?.countries && tzData.countries.length > 0) {
        return tzData.countries[0]; // Return the first matching country
    }

    // Fallback? Currently the library is comprehensive enough.
    return null;
};

/**
 * Gets the flag emoji directly from a timezone string.
 * @param timezone The IANA timezone string.
 * @returns The emoji flag, or empty string.
 */
export const getFlagFromTimezone = (timezone: string): string => {
    const countryCode = getCountryFromTimezone(timezone);
    return getFlag(countryCode || undefined);
};
