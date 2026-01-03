import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import type { Session } from '@supabase/supabase-js';
import type { HighScores } from '../hooks/useUsername';

// Duplicate types locally or export from a shared types file would be better, 
// but for now I'll adhere to the pattern.
// actually HighScores is exported from useUsername. 

interface UserContextType {
    userId: string;
    username: string;
    updateUsername: (newUsername: string) => Promise<boolean | 'taken'>;
    userIsLoading: boolean;
    streak: number;
    playedToday: boolean;
    highScores: HighScores;
    todayScore: number;
    bestDayScore: number;
    refetchUser: () => Promise<void>;
    email: string | null;
    setEmail: (email: string | null) => void;
    isLinked: boolean;
    timezone: string | null;
    isAdmin: boolean;
    isLoggedIn: boolean;
    session: Session | null;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const defaultHighScores: HighScores = { easy: 0, medium: 0, hard: 0, extreme: 0 };

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [userId, setUserId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [streak, setStreak] = useState<number>(0);
    const [playedToday, setPlayedToday] = useState<boolean>(false);
    const [highScores, setHighScores] = useState<HighScores>(defaultHighScores);
    const [todayScore, setTodayScore] = useState<number>(0);
    const [bestDayScore, setBestDayScore] = useState<number>(0);
    const [email, setEmail] = useState<string | null>(null);
    const [timezone, setTimezone] = useState<string | null>(null);
    const [isLinked, setIsLinked] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [userIsLoading, setUserIsLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);

    // Auth Session Listener (Global)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Initialize user on mount (ONCE per app load)
    useEffect(() => {
        const initUser = async () => {
            try {
                // Check if we have a legacy ID to migrate
                const legacyId = localStorage.getItem('borderline_user_id');
                const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

                // Call Identity Endpoint (Legacy Migration / Cookie check)
                const res = await fetch('/api/identity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        legacy_id: legacyId || undefined,
                        timezone: currentTimezone
                    })
                });

                if (res.ok) {
                    const userData = await res.json();

                    // Populate State
                    setUserId(userData.id);
                    setUsername(userData.displayName);
                    setStreak(userData.streak || 0);
                    setHighScores({
                        easy: userData.easyHighScore || 0,
                        medium: userData.mediumHighScore || 0,
                        hard: userData.hardHighScore || 0,
                        extreme: userData.extremeHighScore || 0,
                    });
                    setPlayedToday(userData.playedToday || false);
                    setTodayScore(userData.todayScore || 0);
                    setBestDayScore(userData.bestDayScore || 0);
                    setEmail(userData.email || null);
                    setTimezone(userData.timezone || null);
                    setIsLinked(userData.isRegistered || false);
                    setIsAdmin(userData.isAdmin || false);

                    // If migration happened or we just logged in, clear legacy storage
                    if (legacyId) {
                        localStorage.removeItem('borderline_user_id');
                    }
                } else {
                    console.error('Identity bootstrap failed');
                }
            } catch (e) {
                console.error('Identity init error', e);
            } finally {
                setUserIsLoading(false);
            }
        };

        initUser();
    }, []);

    // Refetch user data
    const refetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/me');
            if (res.ok) {
                const userData = await res.json();
                setUserId(userData.id); // Sync ID in case it changed (Account Wins)
                setUsername(userData.displayName);
                setStreak(userData.streak || 0);
                setHighScores({
                    easy: userData.easyHighScore || 0,
                    medium: userData.mediumHighScore || 0,
                    hard: userData.hardHighScore || 0,
                    extreme: userData.extremeHighScore || 0,
                });
                setPlayedToday(userData.playedToday || false);
                setTodayScore(userData.todayScore || 0);
                setBestDayScore(userData.bestDayScore || 0);
                setTimezone(userData.timezone || null);
                setIsLinked(userData.isRegistered || false);
                setIsAdmin(userData.isAdmin || false);
            }
        } catch (e) {
            console.error('Refetch user failed', e);
        }
    }, []);

    // Update username
    const updateUsername = useCallback(async (newUsername: string): Promise<boolean | 'taken'> => {
        const trimmed = newUsername.trim();
        if (!trimmed || !userId) return false;

        const previousName = username;
        setUsername(trimmed); // Optimistic update

        try {
            const res = await fetch('/api/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName: trimmed }),
            });

            if (res.status === 409) {
                setUsername(previousName);
                return 'taken';
            }

            if (!res.ok) {
                setUsername(previousName);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Failed to update username:', error);
            setUsername(previousName);
            return false;
        }
    }, [userId, username]);

    // Logout and create new anonymous user
    const logout = useCallback(async () => {
        try {
            setUserIsLoading(true);

            // 1. Supabase Sign Out (Frontend)
            await supabase.auth.signOut();

            // 2. Clear Backend Cookie
            await fetch('/api/logout', { method: 'POST' });

            // 3. Create NEW Anonymous User immediately
            const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await fetch('/api/identity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timezone: currentTimezone }) // No legacy_id, forces new user
            });

            if (res.ok) {
                const userData = await res.json();

                // Update State with new anonymous user
                setUserId(userData.id);
                setUsername(userData.displayName);
                setStreak(0); // Reset stats for new user
                setHighScores(defaultHighScores);
                setPlayedToday(false);
                setTodayScore(0);
                setBestDayScore(0);
                setEmail(null);
                setTimezone(userData.timezone);
                setIsLinked(false);
                setIsAdmin(false); // Reset admin status
            } else {
                console.error('Failed to create new anonymous identity after logout');
            }
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            setUserIsLoading(false);
        }
    }, []);

    const value = {
        userId,
        username,
        updateUsername,
        userIsLoading,
        streak,
        playedToday,
        highScores,
        todayScore,
        bestDayScore,
        refetchUser,
        email,
        setEmail,
        isLinked,
        timezone,
        isAdmin,
        logout,
        session,
        isLoggedIn: !!session
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};
