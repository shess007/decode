"use client";

import { useEffect, useState } from "react";
import type { HighlighterCore, ThemedToken } from "shiki";

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedLangs = new Set<string>();

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  mdx: "mdx",
  css: "css",
  scss: "css",
  html: "html",
  vue: "vue",
  svelte: "svelte",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  xml: "xml",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
  prisma: "prisma",
  env: "shellscript",
};

function getLangFromPath(filePath: string): string | null {
  const filename = filePath.split("/").pop() || "";
  const lower = filename.toLowerCase();

  // Special filenames
  if (lower === "dockerfile") return "dockerfile";
  if (lower === "makefile") return "makefile";

  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return EXT_TO_LANG[ext] || null;
}

async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighterCore } = await import("shiki");
      const { createOnigurumaEngine } = await import("shiki/engine/oniguruma");
      const engine = await createOnigurumaEngine(import("shiki/wasm"));
      const h = await createHighlighterCore({
        themes: [import("shiki/themes/github-dark-default.mjs")],
        langs: [],
        engine,
      });
      return h;
    })();
  }
  return highlighterPromise;
}

async function ensureLang(
  highlighter: HighlighterCore,
  lang: string
): Promise<boolean> {
  if (loadedLangs.has(lang)) return true;
  try {
    const langModule = await import(`shiki/langs/${lang}.mjs`);
    await highlighter.loadLanguage(langModule.default);
    loadedLangs.add(lang);
    return true;
  } catch {
    return false;
  }
}

export type TokenizedLine = ThemedToken[];

/**
 * Returns syntax-highlighted tokens for an array of code lines.
 * Falls back to null (plain text) if the language isn't supported.
 */
export function useHighlighter(
  lines: string[],
  filePath: string | null
): TokenizedLine[] | null {
  const [tokens, setTokens] = useState<TokenizedLine[] | null>(null);

  useEffect(() => {
    if (!filePath || lines.length === 0) {
      setTokens(null);
      return;
    }

    const lang = getLangFromPath(filePath);
    if (!lang) {
      setTokens(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const h = await getHighlighter();
        const loaded = await ensureLang(h, lang);
        if (!loaded || cancelled) {
          if (!cancelled) setTokens(null);
          return;
        }

        // Join all lines and tokenize as a single block for proper multi-line context
        const code = lines.join("\n");
        const result = h.codeToTokens(code, {
          lang,
          theme: "github-dark-default",
        });

        if (!cancelled) {
          setTokens(result.tokens);
        }
      } catch {
        if (!cancelled) setTokens(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lines, filePath]);

  return tokens;
}
