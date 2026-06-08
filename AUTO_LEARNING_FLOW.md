# PosterAgent Auto-Learning System

## Overview

The Auto-Learning System enables PosterAgent to continuously improve its LinkedIn post generation by analyzing real performance data from Zernio analytics. The system fetches post metrics, uses LLM reflection to identify successful writing patterns, and dynamically updates the generation prompts — all with human approval via Telegram.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Zernio API     │────▶│  Pattern Review  │────▶│  Admin Approval │
│  (Analytics)    │     │  (LLM Reflection)│     │  (Telegram Bot) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                               │
         │                                               ▼
         │                                        ┌─────────────┐
         │                                        │   Approve   │──▶ Apply
         │                                        │   Reject    │──▶ Discard
         │                                        └─────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Post Generation Pipeline                        │
│  ┌─────────┐   ┌───────────┐   ┌──────────┐   ┌─────────────┐ │
│  │ Scrape  │──▶│ Summarize │──▶│ Infer Topic│──▶│  Generate   │ │
│  └─────────┘   └───────────┘   └──────────┘   └─────────────┘ │
│                                                    ▲            │
│                                                    │            │
│                                         Learned Patterns        │
│                                         (learned-patterns.json) │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Pattern Learning Utility (`backend/utils/patternLearning.ts`)

The core engine for analytics fetching, LLM reflection, and pattern management.

#### Key Functions

| Function                                          | Purpose                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `fetchZernioAnalytics(daysBack, limit)`           | Fetches post performance data from Zernio API                    |
| `runPatternReview(analytics, currentPatterns)`    | Uses LLM to analyze top vs bottom posts and suggest new patterns |
| `runDailyAnalyticsReview()`                       | Orchestrates the full daily review cycle                         |
| `loadPatterns()` / `savePatterns()`               | Reads/writes approved patterns to `learned-patterns.json`        |
| `loadPendingPatterns()` / `savePendingPatterns()` | Manages patterns awaiting admin approval                         |
| `approvePendingPatterns()`                        | Promotes pending patterns to active                              |
| `rejectPendingPatterns()`                         | Discards pending patterns                                        |

#### Data Structures

```typescript
interface LearnedPatterns {
  version: number; // Incremented on each review
  lastUpdated: string; // ISO timestamp
  lastReviewDate: string; // When review was run
  reviewStatus: "approved" | "pending";
  globalPatterns: string[]; // Patterns that apply to all topics
  topicPatterns: Record<string, string[]>; // Topic-specific patterns
}
```

#### Default Patterns

The system starts with these baseline patterns:

- Use hook-style headlines under 8 words
- Include a practical, runnable code example
- Keep paragraphs under 3 lines for scannability
- Add a brief challenge at the end to reinforce learning
- Return ONLY valid JSON without markdown formatting

---

### 2. Topic Inference Node (`backend/nodes/inferTopicNode.ts`)

Classifies the article's primary technology topic from the scraped summary.

**Flow:**

1. Receives `state.summary` from the summarize node
2. Sends summary to LLM with a constrained prompt
3. Returns a single lowercase topic word (e.g., `react`, `javascript`, `docker`)
4. Falls back to `software` if inference fails

**Supported topics include:** react, javascript, typescript, css, html, python, nodejs, nextjs, vue, angular, docker, kubernetes, aws, database, ai, ml, webperformance, accessibility, testing, security, graphql, rust, go, java, dotnet

---

### 3. Dynamic Post Generation (`backend/nodes/generate_node.ts`)

Generates LinkedIn posts with learned patterns injected into the system prompt.

**Key behaviors:**

- Loads `learned-patterns.json` **fresh from disk on every run** (ensures latest patterns are used)
- Looks up topic-specific patterns using `state.topic`
- Combines global + topic patterns into the system message
- Uses the combined patterns to guide the LLM's writing style

**System message template:**

```
You are an expert {topic} developer and a popular tech blogger...

LEARNED WRITING PATTERNS (based on past post analytics):
- Use hook-style headlines under 8 words
- Include a practical, runnable code example
- ... (topic-specific patterns)
```

---

### 4. Graph Workflow Update (`backend/graph.ts`)

The LangGraph workflow now includes the `infer_topic` node between `summarize` and `generate_content`:

```
START → scrape → summarize → infer_topic → generate_content → discuss → ...
```

---

### 5. Telegram Admin Approval (`backend/routes/telegramBotRoute.ts`)

The Telegram bot handles admin approval of new patterns.

#### Commands

| Command           | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `/start`          | Welcome message                                          |
| `/help`           | Show all commands                                        |
| `/myid`           | Get your Telegram chat ID (for `TELEGRAM_ADMIN_CHAT_ID`) |
| `/generate <url>` | Generate a LinkedIn post from a URL                      |

#### Callback Handlers

| Callback           | Action                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `approve_patterns` | Calls `approvePendingPatterns()` → saves to `learned-patterns.json` |
| `reject_patterns`  | Calls `rejectPendingPatterns()` → discards pending changes          |

---

### 6. Daily Cron Job (`backend/index.ts`)

Scheduled review runs every day at **08:00 UTC**.

**Requirements:**

- `TELEGRAM_ADMIN_CHAT_ID` must be set in environment variables
- `ZERNIO_API_KEY` must be set to fetch analytics

**Cron flow:**

1. Fetch last 90 days of analytics from Zernio (top 20 posts by engagement)
2. Run LLM pattern review comparing top 5 vs bottom 5 posts
3. Save proposed patterns to `learned-patterns-pending.json`
4. Send Telegram message to admin with summary and approve/reject buttons
5. If approved: pending patterns become active
6. If rejected: pending patterns are discarded

---

## File Storage

| File                            | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `learned-patterns.json`         | Active approved patterns used by generation node |
| `learned-patterns-pending.json` | Patterns awaiting admin approval                 |

Both files are stored in the backend working directory and persist across deployments.

---

## Environment Variables

| Variable                 | Required               | Description                                           |
| ------------------------ | ---------------------- | ----------------------------------------------------- |
| `ZERNIO_API_KEY`         | Yes (for analytics)    | API key for Zernio LinkedIn analytics                 |
| `TELEGRAM_BOT_TOKEN`     | Yes                    | Bot token from @BotFather                             |
| `TELEGRAM_ADMIN_CHAT_ID` | Yes (for daily review) | Your Telegram user/chat ID for approval notifications |

---

## Complete User Flow

### 1. Daily Auto-Review (08:00 UTC)

```
Cron triggers → Fetch Zernio analytics (90 days, top 20)
    ↓
LLM analyzes top 5 vs bottom 5 posts
    ↓
Proposes new global + topic-specific patterns
    ↓
Saves to learned-patterns-pending.json
    ↓
Telegram notification sent to admin:
    "📊 Daily Analytics Review
     Summary: [findings]
     [✅ Approve Patterns] [❌ Reject Patterns]"
```

### 2. Admin Approval (via Telegram)

**Approve:**

- Pending patterns → `learned-patterns.json`
- Version number increments
- Future posts immediately use new patterns

**Reject:**

- Pending patterns discarded
- Current patterns remain unchanged

### 3. Post Generation (on demand)

```
User sends URL → Scrape → Summarize → Infer Topic → Generate
                                              ↑
                                    Load learned-patterns.json
                                    Inject topic-specific patterns
                                    into system prompt
```

### 4. Pattern Evolution Over Time

```
Week 1: Baseline patterns (default)
Week 2: Analytics review → discovers "code examples get 2x engagement"
         → New pattern: "Always include a runnable code snippet"
Week 3: Analytics review → discovers "React posts perform better with hooks"
         → New topic pattern for "react": "Focus on hooks and modern patterns"
Week 4: Analytics review → discovers "long posts underperform"
         → New pattern: "Keep total length under 150 words"
```

---

## Topic-Agnostic Design

The system is **not hardcoded to React**. It dynamically adapts to any technology topic:

1. **Topic inference** extracts the subject from the article summary
2. **Topic-specific patterns** are stored under keys like `react`, `python`, `docker`
3. **Global patterns** apply to all topics regardless of subject
4. The LLM receives the topic name and writes as an expert in that domain

---

## Deployment Notes

- The system uses **croner** for scheduled jobs (runs in the same Node.js process)
- The Telegram bot uses **webhooks** in production (requires public URL)
- Pattern files are stored on disk and persist across container restarts
- For Railway deployment: set `TELEGRAM_ADMIN_CHAT_ID` in the Variables tab

---

## Future Enhancements

- [ ] Store patterns in a database instead of JSON files
- [ ] Track pattern effectiveness over time (which patterns correlate with higher engagement)
- [ ] Auto-approve patterns after N days if admin doesn't respond
- [ ] Multi-admin support with voting on pattern changes
- [ ] A/B test patterns by applying them to a subset of posts
