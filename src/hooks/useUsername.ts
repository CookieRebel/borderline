import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Difficulty } from './useDifficulty';
// import { useUser } from '@clerk/clerk-react';

const usernameWords = {
    first: [

        "charming", "crazy", "juicy", "smart", "wild",
        "mysterious", "nostalgic", "cryptic", "enigmatic", "cosmic",
        "shadowy", "secret", "silent", "phantom", "misty",
        "velvet", "brave",
        "rogue", "quirky", "lucky", "neon", "dreamy", "heroic",
        "victorious", "glorious", "mighty", "fearless", "savage",
        "fierce", "tactical", "grand", "elite", "iron"
    ],
    second: [
        "voyager", "nomad", "maverick", "titan", "phoenix",
        "cipher", "glitch", "wraith", "spectre", "viper",
        "samurai", "ronin", "viking", "pirate", "rebel",
        "outlaw", "pioneer", "drifter", "seeker", "hunter",
        "slayer", "warrior", "guardian", "sentry", "oracle",
        "tempest", "cyclone", "thunder", "shadow", "spirit",
        "falcon", "wolf", "dragon", "kraken", "cobra"
    ]
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const generateUsername = (): string => {
    const first = usernameWords.first[Math.floor(Math.random() * usernameWords.first.length)];
    const second = usernameWords.second[Math.floor(Math.random() * usernameWords.second.length)];
    const number = Math.floor(Math.random() * 90) + 10;
    return `${capitalize(first)}${capitalize(second)}${number}`;
};

export type HighScores = Record<Difficulty, number>;

const defaultHighScores: HighScores = { easy: 0, medium: 0, hard: 0, extreme: 0 };

export const useUsername = () => {
    const [userId, setUserId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [streak, setStreak] = useState<number>(0);
    const [playedToday, setPlayedToday] = useState<boolean>(false);
    const [highScores, setHighScores] = useState<HighScores>(defaultHighScores);
    const [todayScore, setTodayScore] = useState<number>(0);
    const [bestDayScore, setBestDayScore] = useState<number>(0);
    const [email, setEmail] = useState<string | null>(null);
    const [isLinked] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    // const { user, isSignedIn } = useUser();

    // Initialize user on mount
    useEffect(() => {
        const initUser = async () => {
            let storedId = localStorage.getItem('borderline_user_id');

            if (!storedId) {
                // Generate new user ID and username
                storedId = uuidv4();
                localStorage.setItem('borderline_user_id', storedId);
            }

            setUserId(storedId);

            // If already signed in, we might need to verify if the stored ID is the correct one
            // But usually the merge logic below handles the "transition"
            // For now, let's load whatever ID we have.

            await fetchUserData(storedId);
        };

        initUser();
    }, []);

    const fetchUserData = async (id: string) => {
        try {
            // Try to get existing user
            const response = await fetch(`/api/user/${id}`);

            if (response.ok) {
                const userData = await response.json();
                setUsername(userData.displayName || userData.display_name);
                setStreak(userData.streak || 0);
                setHighScores({
                    easy: userData.easyHighScore || userData.easy_high_score || 0,
                    medium: userData.mediumHighScore || userData.medium_high_score || 0,
                    hard: userData.hardHighScore || userData.hard_high_score || 0,
                    extreme: userData.extremeHighScore || userData.extreme_high_score || 0,
                });
                setPlayedToday(userData.playedToday || false);
                setTodayScore(userData.todayScore || 0);
                setBestDayScore(userData.bestDayScore || 0);
                setEmail(userData.email || null);
                // setIsLinked(!!userData.clerkId || !!userData.clerk_id);
            } else if (response.status === 404) {
                // User doesn't exist, create new one
                // ONLY create if valid ID format (uuid)
                // If we are looking for a user and 404, we create.
                await createUser(id);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        } finally {
            setLoading(false);
        }
    }

    const createUser = async (id: string) => {
        let attempts = 0;
        let created = false;

        while (!created && attempts < 5) {
            const newUsername = generateUsername();
            const createResponse = await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, display_name: newUsername }),
            });

            if (createResponse.ok) {
                const newUser = await createResponse.json();
                setUsername(newUser.displayName || newUser.display_name);
                setStreak(newUser.streak || 0);
                setHighScores(defaultHighScores);
                created = true;
            } else if (createResponse.status === 409) {
                // Name taken, retry
                attempts++;
            } else {
                // Other error
                break;
            }
        }
    }

    // Merge Logic: Watch for Sign In
    // useEffect(() => {
    //     const handleMerge = async () => {
    //         if (isSignedIn && user && userId) {
    //             // We have a logged in Clerk user AND a local user ID.
    //             // Trigger merge.
    //             try {
    //                 const res = await fetch('/api/merge_user', {
    //                     method: 'POST',
    //                     headers: { 'Content-Type': 'application/json' },
    //                     body: JSON.stringify({ anonymousId: userId, clerkId: user.id })
    //                 });

    //                 if (res.ok) {
    //                     const data = await res.json();
    //                     // If the server says "Use this ID instead", we update.
    //                     if (data.userId && data.userId !== userId) {
    //                         console.log('Switching to merged user ID:', data.userId);
    //                         setUserId(data.userId);
    //                         localStorage.setItem('borderline_user_id', data.userId);
    //                         // Reload data for the new ID
    //                         setLoading(true);
    //                         await fetchUserData(data.userId);
    //                     }
    //                 }
    //             } catch (e) {
    //                 console.error("Merge failed", e);
    //             }
    //         }
    //     }

    //     handleMerge();
    // }, [isSignedIn, user, userId]); // Dependencies: if user signs in, or userId changes initially.

    // Refetch user data (call after game ends to update scores)
    const refetchUser = useCallback(async () => {
        if (!userId) return;
        await fetchUserData(userId);
    }, [userId]);

    // Update username in database
    const updateUsername = useCallback(async (newUsername: string): Promise<boolean | 'taken'> => {
        const trimmed = newUsername.trim();
        if (!trimmed || !userId) return false;

        const previousName = username;
        setUsername(trimmed); // Optimistic update

        try {
            const res = await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, display_name: trimmed }),
            });

            if (res.status === 409) {
                // Name taken
                setUsername(previousName); // Revert
                return 'taken';
            }

            if (!res.ok) {
                setUsername(previousName); // Revert
                return false;
            }

            return true;
        } catch (error) {
            console.error('Failed to update username:', error);
            setUsername(previousName); // Revert
            return false;
        }
    }, [userId, username]);

    return { userId, username, updateUsername, loading, streak, playedToday, highScores, todayScore, bestDayScore, refetchUser, email, setEmail, isLinked };
};
