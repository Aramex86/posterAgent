import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "../env";
import { getModel } from "./model";

const PATTERNS_FILE = join(process.cwd(), "learned-patterns.json");
const PENDING_FILE = join(process.cwd(), "learned-patterns-pending.json");

const ZERNIO_BASE_URL = "https://zernio.com/api/v1";

export interface LearnedPatterns {
  version: number;
  lastUpdated: string;
  lastReviewDate: string;
  reviewStatus: "approved" | "pending";
  globalPatterns: string[];
  topicPatterns: Record<string, string[]>;
}

export const DEFAULT_PATTERNS: LearnedPatterns = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  lastReviewDate: new Date().toISOString(),
  reviewStatus: "approved",
  globalPatterns: [
    "Use hook-style headlines under 8 words",
    "Include a practical, runnable code example",
    "Keep paragraphs under 3 lines for scannability",
    "Add a brief challenge at the end to reinforce learning",
    "Return ONLY valid JSON without markdown formatting",
  ],
  topicPatterns: {},
};

export function loadPatterns(): LearnedPatterns {
  if (!existsSync(PATTERNS_FILE)) {
    savePatterns(DEFAULT_PATTERNS);
    return DEFAULT_PATTERNS;
  }
  try {
    const raw = readFileSync(PATTERNS_FILE, "utf-8");
    return JSON.parse(raw) as LearnedPatterns;
  } catch {
    return DEFAULT_PATTERNS;
  }
}

export function savePatterns(patterns: LearnedPatterns): void {
  writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2), "utf-8");
}

export function loadPendingPatterns(): LearnedPatterns | null {
  if (!existsSync(PENDING_FILE)) return null;
  try {
    const raw = readFileSync(PENDING_FILE, "utf-8");
    return JSON.parse(raw) as LearnedPatterns;
  } catch {
    return null;
  }
}

export function savePendingPatterns(patterns: LearnedPatterns): void {
  writeFileSync(PENDING_FILE, JSON.stringify(patterns, null, 2), "utf-8");
}

export function clearPendingPatterns(): void {
  if (existsSync(PENDING_FILE)) {
    writeFileSync(PENDING_FILE, JSON.stringify({}, null, 2), "utf-8");
  }
}

export function approvePendingPatterns(): boolean {
  const pending = loadPendingPatterns();
  if (!pending) return false;
  pending.reviewStatus = "approved";
  pending.lastUpdated = new Date().toISOString();
  savePatterns(pending);
  clearPendingPatterns();
  return true;
}

export function rejectPendingPatterns(): boolean {
  const pending = loadPendingPatterns();
  if (!pending) return false;
  clearPendingPatterns();
  return true;
}

interface ZernioAnalyticsItem {
  postId: string;
  content: string;
  analytics: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    views: number;
    engagementRate: number;
  };
  platformAnalytics?: Array<{
    platform: string;
    analytics: {
      impressions: number;
      reach: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      clicks: number;
      views: number;
      engagementRate: number;
    };
  }>;
}

interface ZernioAnalyticsResponse {
  data?: ZernioAnalyticsItem[];
  posts?: ZernioAnalyticsItem[];
  analytics?: ZernioAnalyticsItem[];
}

export async function fetchZernioAnalytics(
  daysBack: number = 90,
  limit: number = 20,
): Promise<ZernioAnalyticsItem[]> {
  if (!env.ZERNIO_API_KEY) {
    console.warn("⚠️ No ZERNIO_API_KEY, skipping analytics fetch");
    return [];
  }

  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const url = new URL(`${ZERNIO_BASE_URL}/analytics`);
  url.searchParams.set("platform", "linkedin");
  url.searchParams.set("sortBy", "engagement");
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fromDate", fromDate);
  url.searchParams.set("toDate", toDate);

  console.log("📊 Fetching Zernio analytics...");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${env.ZERNIO_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zernio analytics error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as ZernioAnalyticsResponse;
  const items = json.data || json.posts || json.analytics || [];
  console.log(`📊 Fetched ${items.length} posts from Zernio analytics`);
  return items;
}

export interface PatternReviewResult {
  reviewSummary: string;
  globalPatterns: string[];
  topicPatterns: Record<string, string[]>;
  droppedPatterns: string[];
}

export async function runPatternReview(
  analytics: ZernioAnalyticsItem[],
  currentPatterns: LearnedPatterns,
): Promise<PatternReviewResult> {
  if (analytics.length === 0) {
    console.warn("⚠️ No analytics data, skipping pattern review");
    return {
      reviewSummary: "No analytics data available.",
      globalPatterns: currentPatterns.globalPatterns,
      topicPatterns: currentPatterns.topicPatterns,
      droppedPatterns: [],
    };
  }

  const topPosts = analytics.slice(0, 5);
  const bottomPosts = analytics.slice(-5);

  const analyticsContext = `
TOP PERFORMING POSTS (by engagement rate):
${topPosts
  .map(
    (p, i) =>
      `${i + 1}. Engagement: ${p.analytics.engagementRate}% | Likes: ${p.analytics.likes} | Comments: ${p.analytics.comments} | Shares: ${p.analytics.shares}
Content: ${p.content.slice(0, 300)}`,
  )
  .join("\n---\n")}

LOWEST PERFORMING POSTS:
${bottomPosts
  .map(
    (p, i) =>
      `${i + 1}. Engagement: ${p.analytics.engagementRate}% | Likes: ${p.analytics.likes} | Comments: ${p.analytics.comments} | Shares: ${p.analytics.shares}
Content: ${p.content.slice(0, 300)}`,
  )
  .join("\n---\n")}

CURRENT PATTERNS:
Global: ${currentPatterns.globalPatterns.join("; ")}
Topic-specific: ${Object.entries(currentPatterns.topicPatterns)
    .map(([k, v]) => `${k}: ${v.join("; ")}`)
    .join(" | ")}
`;

  const reviewAgent = await getModel({
    provider: "ollama",
    model: "gemma4:31b-cloud",
    temperature: 0.2,
  });

  const systemPrompt = `You are an expert content strategist. Your job is to analyze LinkedIn post performance data and extract actionable writing patterns.

CRITICAL INSTRUCTIONS:
1. Compare the top-performing posts vs the lowest-performing posts.
2. Identify what the top posts have in common (style, structure, length, tone, code examples, hooks, etc.).
3. Identify what the bottom posts are doing wrong or missing.
4. Review the CURRENT PATTERNS and decide which to keep, which to drop, and which new ones to add.
5. Return ONLY valid JSON matching the required output schema. No markdown, no extra text.

OUTPUT SCHEMA:
{
  "reviewSummary": "Brief summary of findings",
  "globalPatterns": ["pattern 1", "pattern 2", ...],
  "topicPatterns": {"topicName": ["pattern 1", ...]},
  "droppedPatterns": ["old pattern that no longer works"]
}`;

  const response = await reviewAgent.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: analyticsContext },
  ]);

  const content = response.content as string;
  let parsed: PatternReviewResult;
  try {
    parsed = JSON.parse(content) as PatternReviewResult;
  } catch {
    // Try to extract JSON from markdown code block
    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      parsed = JSON.parse(match[1]) as PatternReviewResult;
    } else {
      throw new Error("Failed to parse pattern review response as JSON");
    }
  }

  return parsed;
}

export async function runDailyAnalyticsReview(): Promise<{
  success: boolean;
  hasPending: boolean;
  summary: string;
}> {
  try {
    const currentPatterns = loadPatterns();
    const analytics = await fetchZernioAnalytics(90, 20);

    if (analytics.length === 0) {
      return {
        success: true,
        hasPending: false,
        summary: "No analytics data.",
      };
    }

    const review = await runPatternReview(analytics, currentPatterns);

    const pending: LearnedPatterns = {
      version: currentPatterns.version + 1,
      lastUpdated: new Date().toISOString(),
      lastReviewDate: new Date().toISOString(),
      reviewStatus: "pending",
      globalPatterns: review.globalPatterns,
      topicPatterns: review.topicPatterns,
    };

    savePendingPatterns(pending);

    return {
      success: true,
      hasPending: true,
      summary: review.reviewSummary,
    };
  } catch (error: any) {
    console.error("❌ Daily analytics review failed:", error.message);
    return { success: false, hasPending: false, summary: error.message };
  }
}
