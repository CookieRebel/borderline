import { type ReactNode } from 'react';
import { UserProvider } from './UserContext';
import { DifficultyProvider } from '../hooks/useDifficulty';

export const AppProvider = ({ children }: { children: ReactNode }) => {
    return (
        <UserProvider>
            <DifficultyProvider>
                {children}
            </DifficultyProvider>
        </UserProvider>
    );
};
