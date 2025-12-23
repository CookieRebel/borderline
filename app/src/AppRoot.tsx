import { StrictMode } from "react";
import App from "./App";
import { DifficultyProvider } from "./hooks/useDifficulty";

export default function AppRoot() {
    return (
        <StrictMode>
            <DifficultyProvider>
                <App />
            </DifficultyProvider>
        </StrictMode>
    );
}
