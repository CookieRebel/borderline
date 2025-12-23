import { createProxyMiddleware } from "http-proxy-middleware";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ public: "/" });
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  eleventyConfig.setServerOptions({
    middleware: [
      (req, res, next) => {
        if (req.url.startsWith("/api") || req.url.startsWith("/.netlify")) {
          return createProxyMiddleware({
            target: "http://localhost:9999",
            changeOrigin: true,
            pathRewrite: {
              "^/api": "/.netlify/functions",
            },
          })(req, res, next);
        }
        next();
      }
    ]
  });

  return {
    dir: {
      input: "src/pages",
      includes: "../_includes",
      output: "../dist"
    }
  };
}
