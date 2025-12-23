export default {
    isDevelopmentMode: process.env.ELEVENTY_ENV === "development",
    buildId:
        process.env.COMMIT_REF ||            // Netlify production + previews
        process.env.DEPLOY_ID ||              // Netlify fallback
        String(Date.now())                    // local dev safety net
};
