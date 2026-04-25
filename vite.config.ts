import { sveltekit } from "@sveltejs/kit/vite";
import { jazzSvelteKit } from "jazz-tools/dev/sveltekit";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import { defineConfig } from "vite";

export default defineConfig({
  // jazzSvelteKit must come before sveltekit so that it populates
  // process.env.PUBLIC_JAZZ_* before SvelteKit's plugin captures the
  // public env for $env/dynamic/public.
  plugins: [
    jazzSvelteKit(),
    sveltekit(),
    SvelteKitPWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      manifest: {
        name: "Tasks",
        short_name: "Tasks",
        description: "A personal task board",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/favicon-maskable.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
    }),
  ],
  server: {
    fs: {
      allow: ["../.."],
    },
  },
});
