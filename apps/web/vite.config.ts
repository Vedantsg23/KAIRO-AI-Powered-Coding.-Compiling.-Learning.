/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The API runs on :8000 during development; Vite proxies /api (REST and
// WebSocket) so the browser talks to a single origin and no CORS is needed.
const apiTarget = process.env.CC_API_URL ?? "http://127.0.0.1:8000";
const proxy = { "/api": { target: apiTarget, ws: true } };

// In GitHub Codespaces the page is opened through a forwarded address such as
// https://<name>-5173.app.github.dev. Vite answers only localhost by default
// (a protection against DNS rebinding), so allow that one domain there.
const forwarded = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const allowedHosts = forwarded ? [`.${forwarded}`] : undefined;

// monaco-vim (the Vim Keymap extension) imports Monaco's files by their older
// paths, monaco-editor/esm/vs/...; this Monaco version exports the same files
// as monaco-editor/..., so point the old paths at them (one Monaco, not two).
const monacoEsm = fileURLToPath(new URL("./node_modules/monaco-editor/esm/vs/", import.meta.url));
// Its "browser" build is a UMD file with a copy of parts of an old Monaco; use the ES module build.
const monacoVim = fileURLToPath(new URL("./node_modules/monaco-vim/dist/index.mjs", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^monaco-editor\/esm\/vs\/(.*)$/, replacement: `${monacoEsm}$1` },
      { find: /^monaco-vim$/, replacement: monacoVim },
    ],
  },
  // Packages that are loaded only when a feature is first used (Vim keys, Emmet,
  // formatting, the live check, the preview, accounts): bundle them when the dev
  // server starts, so switching a feature on never makes it re-bundle and reload the page.
  optimizeDeps: {
    include: [
      "monaco-vim",
      "emmet-monaco-es",
      "prettier/standalone",
      "prettier/plugins/babel",
      "prettier/plugins/estree",
      "prettier/plugins/typescript",
      "prettier/plugins/html",
      "prettier/plugins/postcss",
      "web-tree-sitter",
      "sucrase",
      "@supabase/supabase-js",
    ],
  },
  server: { port: 5173, proxy, allowedHosts },
  preview: { port: 4173, proxy, allowedHosts },
  build: {
    chunkSizeWarningLimit: 4500, // the lazily loaded Monaco chunk is large by nature
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
