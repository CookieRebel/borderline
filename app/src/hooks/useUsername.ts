import { useUserContext } from '../context/UserContext';
import type { Difficulty } from './useDifficulty';

export type HighScores = Record<Difficulty, number>;

export const useUsername = () => {
    return useUserContext();
};
