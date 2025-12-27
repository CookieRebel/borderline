import { createProxyMiddleware } from "http-proxy-middleware";
import pluginSitemap from "@quasibit/eleventy-plugin-sitemap";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ public: "/" });
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  eleventyConfig.addPlugin(pluginSitemap, {
    sitemap: {
      hostname: "https://borderlinequiz.com",
    },
  });
  eleventyConfig.addGlobalData("site", {
    url: "https://borderlinequiz.com",
  });
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
