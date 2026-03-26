/**
 * Filters low-value files from PR diffs to reduce AI token costs.
 *
 * Removes: lockfiles, generated code, minified bundles, binary assets,
 * IDE configs, source maps, and other noise that doesn't help comprehension.
 */

/** Files to exclude entirely — matched against the full file path */
const EXCLUDED_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "Gemfile.lock",
  "Pipfile.lock",
  "poetry.lock",
  "Cargo.lock",
  "go.sum",
  "flake.lock",
  ".DS_Store",
  "Thumbs.db",
]);

/** Path patterns to exclude — tested as regex against the full path */
const EXCLUDED_PATTERNS: RegExp[] = [
  // Generated / built output
  /\bdist\//,
  /\bbuild\//,
  /\bout\//,
  /\.next\//,
  /\.nuxt\//,
  /\.output\//,

  // Minified files
  /\.min\.(js|css)$/,
  /\.bundle\.(js|css)$/,

  // Source maps
  /\.map$/,

  // Binary / media assets
  /\.(png|jpe?g|gif|ico|svg|webp|avif|mp4|webm|mp3|woff2?|ttf|eot|otf|pdf|zip|tar|gz)$/i,

  // IDE / editor configs
  /\.idea\//,
  /\.vscode\//,
  /\.vs\//,

  // Auto-generated
  /\/generated\//,
  /\.generated\./,
  /\.g\.(ts|dart)$/,
  /swagger\.json$/,
  /openapi\.json$/,

  // Database migrations (keep in diffstat, but truncate diff — handled separately)
  // We don't exclude these entirely since they matter for review order

  // Snapshots / fixtures
  /__snapshots__\//,
  /\.snap$/,
];

/** Max diff lines per individual file before truncation */
const MAX_LINES_PER_FILE = 300;

function getFilename(path: string): string {
  return path.split("/").pop() || path;
}

export function shouldExcludeFile(filePath: string): boolean {
  const filename = getFilename(filePath);

  if (EXCLUDED_FILENAMES.has(filename)) return true;
  if (EXCLUDED_PATTERNS.some((p) => p.test(filePath))) return true;

  return false;
}

export interface FilterStats {
  totalFiles: number;
  includedFiles: number;
  excludedFiles: number;
  excludedPaths: string[];
  truncatedFiles: string[];
  originalDiffLines: number;
  filteredDiffLines: number;
}

/**
 * Filter diffstat entries, removing low-value files.
 */
export function filterDiffstat<
  T extends { path: string },
>(items: T[]): { included: T[]; excluded: T[] } {
  const included: T[] = [];
  const excluded: T[] = [];

  for (const item of items) {
    if (shouldExcludeFile(item.path)) {
      excluded.push(item);
    } else {
      included.push(item);
    }
  }

  return { included, excluded };
}

/**
 * Filter a full unified diff string:
 * 1. Remove sections for excluded files entirely
 * 2. Truncate individual file diffs that exceed MAX_LINES_PER_FILE
 *
 * Returns the filtered diff and stats.
 */
export function filterDiff(fullDiff: string): {
  filteredDiff: string;
  stats: FilterStats;
} {
  const sections = fullDiff.split(/^(?=diff --git )/m);
  const kept: string[] = [];
  const truncatedFiles: string[] = [];
  let originalLines = 0;
  let filteredLines = 0;
  let excludedCount = 0;
  const excludedPaths: string[] = [];

  for (const section of sections) {
    if (!section.trim()) continue;

    const sectionLines = section.split("\n");
    originalLines += sectionLines.length;

    // Extract file path from "diff --git a/... b/..."
    const gitMatch = section.match(/^diff --git a\/.+ b\/(.+)$/m);
    const filePath = gitMatch?.[1];

    if (filePath && shouldExcludeFile(filePath)) {
      excludedCount++;
      excludedPaths.push(filePath);
      continue;
    }

    // Truncate long file diffs
    if (sectionLines.length > MAX_LINES_PER_FILE) {
      const truncated = sectionLines.slice(0, MAX_LINES_PER_FILE);
      truncated.push(
        `\n... (truncated: ${sectionLines.length - MAX_LINES_PER_FILE} more lines)`
      );
      kept.push(truncated.join("\n"));
      filteredLines += MAX_LINES_PER_FILE + 1;
      if (filePath) truncatedFiles.push(filePath);
    } else {
      kept.push(section);
      filteredLines += sectionLines.length;
    }
  }

  return {
    filteredDiff: kept.join(""),
    stats: {
      totalFiles: sections.filter((s) => s.trim()).length,
      includedFiles: kept.length,
      excludedFiles: excludedCount,
      excludedPaths,
      truncatedFiles,
      originalDiffLines: originalLines,
      filteredDiffLines: filteredLines,
    },
  };
}
