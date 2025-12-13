import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const usernameWords = {
    first: [
        "borderline", "geo", "map", "world", "earth",
        "globe", "quiz", "brain", "smart", "wild",
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

export const useUsername = () => {
    const [userId, setUserId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [streak, setStreak] = useState<number>(0);
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
                } else if (response.status === 404) {
                    // User doesn't exist, create new one
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
                    }
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
                // Fallback to local generation if API fails
                const fallbackName = localStorage.getItem('borderline_username_fallback') || generateUsername();
                localStorage.setItem('borderline_username_fallback', fallbackName);
                setUsername(fallbackName);
            } finally {
                setLoading(false);
            }
        };

        initUser();
    }, []);

    // Update username in database
    const updateUsername = useCallback(async (newUsername: string) => {
        const trimmed = newUsername.trim();
        if (!trimmed || !userId) return;

        setUsername(trimmed); // Optimistic update

        try {
            await fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, display_name: trimmed }),
            });
        } catch (error) {
            console.error('Failed to update username:', error);
        }
    }, [userId]);

    return { userId, username, updateUsername, loading, streak };
};
