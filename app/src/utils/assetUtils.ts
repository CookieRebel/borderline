export const getAssetUrl = (path: string) => {
    // Development: Force fetch from App Server (5174) to allow embedding in Website (8080)
    if (import.meta.env.DEV) {
        return `http://localhost:5174${path}`;
    }
    // Production: Relative path based on Vite, which serves 'public' at the root of 'base'
    // 'base' is configured as '/assets/app/' in vite.config.ts
    // So '/data/foo.json' becomes '/assets/app/data/foo.json'
    return `/assets/app${path}`;
};
