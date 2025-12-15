import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Difficulty } from './useDifficulty';

const usernameWords = {
    first: [
        "borderline", "geo", "map", "world", "earth",
        "charming", "crazy", "juicy", "smart", "wild",
    ],
    second: [
        "brain", "pro", "boss", "nerd", "whiz",
        "kid", "legend", "champ", "hero", "wizard",
    ]
};

const generateUsername = (): string => {
    const first = usernameWords.first[Math.floor(Math.random() * usernameWords.first.length)];
    const second = usernameWords.second[Math.floor(Math.random() * usernameWords.second.length)];
    const number = Math.floor(Math.random() * 90) + 10;
    return `${first}${second}${number}`;
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
    const [loading, setLoading] = useState(true);

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

            try {
                // Try to get existing user
                const response = await fetch(`/api/user/${storedId}`);

                if (response.ok) {
                    const user = await response.json();
                    setUsername(user.displayName || user.display_name);
                    setStreak(user.streak || 0);
                    setHighScores({
                        easy: user.easyHighScore || user.easy_high_score || 0,
                        medium: user.mediumHighScore || user.medium_high_score || 0,
                        hard: user.hardHighScore || user.hard_high_score || 0,
                        extreme: user.extremeHighScore || user.extreme_high_score || 0,
                    });
                    setPlayedToday(user.playedToday || false);
                    setTodayScore(user.todayScore || 0);
                    setBestDayScore(user.bestDayScore || 0);
                } else if (response.status === 404) {
                    // User doesn't exist, create new one
                    let attempts = 0;
                    let created = false;

                    while (!created && attempts < 5) {
                        const newUsername = generateUsername();
                        const createResponse = await fetch('/api/user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: storedId, display_name: newUsername }),
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
            } catch (error) {
                console.error('Failed to fetch user:', error);
            } finally {
                setLoading(false);
            }
        };

        initUser();
    }, []);

    // Refetch user data (call after game ends to update scores)
    const refetchUser = useCallback(async () => {
        if (!userId) return;

        try {
            const response = await fetch(`/api/user/${userId}`);
            if (response.ok) {
                const user = await response.json();
                setStreak(user.streak || 0);
                setHighScores({
                    easy: user.easyHighScore || user.easy_high_score || 0,
                    medium: user.mediumHighScore || user.medium_high_score || 0,
                    hard: user.hardHighScore || user.hard_high_score || 0,
                    extreme: user.extremeHighScore || user.extreme_high_score || 0,
                });
                setTodayScore(user.todayScore || 0);
                setBestDayScore(user.bestDayScore || 0);
            }
        } catch (error) {
            console.error('Failed to refetch user:', error);
        }
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

    return { userId, username, updateUsername, loading, streak, playedToday, highScores, todayScore, bestDayScore, refetchUser };
};
