import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DecodeInput, DecodeReport } from "./types";

export type AIModel = "sonnet" | "gemini";

const SYSTEM_PROMPT = `You are Decode, a PR comprehension assistant. Your job is to help a code reviewer UNDERSTAND a pull request — not to review it yourself. You never judge code quality or suggest improvements. Instead, you explain what changed, why it likely changed, how changes connect, and what order a reviewer should read the files in.

You are speaking to an experienced developer. Be concise and technical, but explain non-obvious things. Assume they know the language and framework but may not know this specific codebase area well.

Respond ONLY with valid JSON matching the schema below. No markdown, no preamble, no explanation outside the JSON.

Schema:
{
  "overview": {
    "goal": "string (1-3 sentences: what this PR achieves)",
    "approach": "string (1-3 sentences: strategy the author took)",
    "keyDecisions": ["string (notable choices, max 5)"],
    "scopeAssessment": "string (one sentence: focused vs broad)"
  },
  "reviewOrder": {
    "phases": [{
      "label": "string (e.g. 'Start here — data model changes')",
      "description": "string (why read these first)",
      "files": ["string (file paths in reading order)"]
    }],
    "reasoning": "string (brief explanation of the ordering logic)"
  },
  "fileAnnotations": [{
    "filePath": "string",
    "roleInPR": "string (one sentence)",
    "whatChanged": "string (2-5 sentences)",
    "payAttentionTo": "string (non-obvious things, edge cases)",
    "changeType": "core-logic | api-change | config | types | tests | refactor | new-file | deletion | styling | dependency",
    "complexity": "trivial | moderate | complex"
  }],
  "crossFileMap": {
    "groups": [{
      "label": "string",
      "files": ["string"],
      "connection": "string"
    }],
    "dataFlows": [{
      "description": "string",
      "files": ["string"]
    }]
  }
}`;

function buildUserMessage(input: DecodeInput): string {
  const parts: string[] = [];

  parts.push(`# Pull Request: ${input.pr.title}`);
  parts.push(`**Author:** ${input.pr.author}`);
  parts.push(
    `**Branch:** ${input.pr.sourceBranch} → ${input.pr.destinationBranch}`
  );

  if (input.pr.description) {
    parts.push(`\n## PR Description\n${input.pr.description}`);
  }

  if (input.pr.commitMessages.length > 0) {
    parts.push(`\n## Commit Messages`);
    input.pr.commitMessages.forEach((msg) => parts.push(`- ${msg.trim()}`));
  }

  parts.push(`\n## Diffstat (${input.diffstat.length} files)`);
  input.diffstat.forEach((d) => {
    parts.push(
      `- ${d.path} [${d.status}] (+${d.linesAdded} -${d.linesRemoved})`
    );
  });

  parts.push(`\n## Full Diff\n\`\`\`\n${input.diff}\n\`\`\``);

  return parts.join("\n");
}

function parseJsonResponse(text: string): DecodeReport {
  // Strip markdown code fences if present
  const jsonStr = text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  return JSON.parse(jsonStr) as DecodeReport;
}

// ── Anthropic (Sonnet) ──────────────────────────────────────────

async function generateWithSonnet(input: DecodeInput): Promise<DecodeReport> {
  const client = new Anthropic();
  const userMessage = buildUserMessage(input);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 12000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return parseJsonResponse(text);
}

// ── Google (Gemini Pro) ─────────────────────────────────────────

async function generateWithGemini(input: DecodeInput): Promise<DecodeReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro-preview-06-05",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 12000,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const userMessage = buildUserMessage(input);
  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  return parseJsonResponse(text);
}

// ── Public API ──────────────────────────────────────────────────

export async function generateReport(
  input: DecodeInput,
  aiModel: AIModel = "gemini"
): Promise<DecodeReport> {
  console.log(`[ai] Using model: ${aiModel}`);

  if (aiModel === "sonnet") {
    return generateWithSonnet(input);
  }
  return generateWithGemini(input);
}
