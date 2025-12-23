import 'bootstrap/dist/css/bootstrap.min.css';
import { createRoot } from 'react-dom/client';
import AppRoot from './AppRoot.tsx';
import './index.css';

// import { ClerkProvider } from '@clerk/clerk-react'

// Import your publishable key
// const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// if (!PUBLISHABLE_KEY) {
//   throw new Error("Missing Publishable Key")
// }

createRoot(document.getElementById("root")!).render(<AppRoot />);

// <StrictMode>
//   <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
//   <DifficultyProvider>
//     <App />
//   {/* </DifficultyProvider> */}
//   {/* </ClerkProvider> */}
// </StrictMode>,
