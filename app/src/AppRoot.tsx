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

// Once we continue working on Clerk
// import { ClerkProvider } from '@clerk/clerk-react'

// Import your publishable key
// const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// if (!PUBLISHABLE_KEY) {
//   throw new Error("Missing Publishable Key")
// }

// <StrictMode>
//   <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
//   <DifficultyProvider>
//     <App />
//   {/* </DifficultyProvider> */}
//   {/* </ClerkProvider> */}
// </StrictMode>,
