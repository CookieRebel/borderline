import { useState, useEffect } from 'react';

const usernameWords = {
    first: [
        "borderline",
        "geo",
        "map",
        "world",
        "earth",
        "globe",
        "quiz",
        "brain",
        "smart",
        "wild",
    ],
    second: [
        "brain",
        "pro",
        "boss",
        "nerd",
        "whiz",
        "kid",
        "legend",
        "champ",
        "hero",
        "wizard",
    ]
};

const generateUsername = (): string => {
    const first = usernameWords.first[Math.floor(Math.random() * usernameWords.first.length)];
    const second = usernameWords.second[Math.floor(Math.random() * usernameWords.second.length)];
    const number = Math.floor(Math.random() * 90) + 10; // 10-99
    return `${first}${second}${number}`;
};

export const useUsername = () => {
    const [username, setUsername] = useState<string>('');

    useEffect(() => {
        const stored = localStorage.getItem('borderline_username');
        if (stored) {
            setUsername(stored);
        } else {
            const newUsername = generateUsername();
            localStorage.setItem('borderline_username', newUsername);
            setUsername(newUsername);
        }
    }, []);

    const updateUsername = (newUsername: string) => {
        const trimmed = newUsername.trim();
        if (trimmed) {
            localStorage.setItem('borderline_username', trimmed);
            setUsername(trimmed);
        }
    };

    return { username, updateUsername };
};
