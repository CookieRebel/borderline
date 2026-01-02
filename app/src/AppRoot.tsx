import { StrictMode } from "react";
import App from "./App";
import { AppProvider } from "./context/AppProvider";

export default function AppRoot() {
    return (
        <StrictMode>
            <AppProvider>
                <App />
            </AppProvider>
        </StrictMode>
    );
}

