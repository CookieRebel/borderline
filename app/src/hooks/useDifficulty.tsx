import { createContext, useContext, useState, type ReactNode } from 'react';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

const STORAGE_KEY = 'borderline_difficulty';

interface DifficultyContextType {
    difficulty: Difficulty;
    setDifficulty: (d: Difficulty) => void;
}

const DifficultyContext = createContext<DifficultyContextType | null>(null);

export const DifficultyProvider = ({ children }: { children: ReactNode }) => {
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

    return (
        <DifficultyContext.Provider value= {{ difficulty, setDifficulty }
}>
    { children }
    </DifficultyContext.Provider>
    );
};

export const useDifficulty = () => {
    const context = useContext(DifficultyContext);
    if (!context) {
        throw new Error('useDifficulty must be used within a DifficultyProvider');
    }
    return context;
};
