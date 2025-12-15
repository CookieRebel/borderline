import { useState } from 'react';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

const STORAGE_KEY = 'borderline_difficulty';

export const useDifficulty = () => {
    const [difficulty, setDifficultyState] = useState<Difficulty>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved === 'easy' || saved === 'medium' || saved === 'hard' || saved === 'extreme')
            ? saved
            : 'easy';
    });

    const setDifficulty = (d: Difficulty) => {
        setDifficultyState(d);
        localStorage.setItem(STORAGE_KEY, d);
    };

    return { difficulty, setDifficulty };
};
