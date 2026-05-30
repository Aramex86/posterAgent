# LinkedIn Auto-Posting Feature — Implementation Plan

## Overview

Extend the PosterAgent LangGraph workflow to automatically generate a code snippet image from the approved post, upload it to Supabase Storage, and post to LinkedIn via the Zernio API. Add Telegram bot integration for notifications and approval.

---

## Architecture

### New Flow (after existing `save` node)

```
save → generate_image → upload_to_supabase → telegram_notify → approve_posting → post_to_linkedin → END
```

### Dual Entry Points

| Channel      | Trigger                       | Approval Method                                    |
| ------------ | ----------------------------- | -------------------------------------------------- |
| **Web UI**   | `POST /start-agent` with URL  | Web buttons → `POST /validate-post`                |
| **Telegram** | Send `/generate <url>` to bot | Inline keyboard buttons → `POST /telegram/approve` |

Both channels execute the **same graph**. The graph stores `telegramChatId` in state to know where to send notifications.

---

## Step 1: Environment Variables

Add to `backend/.env`:

```env
# Cloudinary (image storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=your-upload-preset

# Zernio (LinkedIn API)
ZERNIO_API_KEY=your-zernio-api-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

Update `backend/env.ts`:

```typescript
const envSchema = z.object({
  // ... existing vars ...
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_UPLOAD_PRESET: z.string().min(1),
  ZERNIO_API_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
});
```

---

## Step 2: Update GraphState

Add new fields to `backend/state.ts`:

```typescript
export const GraphState = Annotation.Root({
  // ... existing fields ...
  imageUrl: Annotation<string>, // Public URL of generated image
  telegramMessageId: Annotation<number>, // Telegram message ID for editing
  telegramChatId: Annotation<number>, // Telegram chat ID for notifications
  isPosted: Annotation<boolean>, // Did LinkedIn posting succeed?
  postingError: Annotation<string | null>, // Error message if posting failed
  isPostingApproved: Annotation<boolean>, // Second approval gate
});
```

---

## Step 3: Install Dependencies

```bash
cd backend
npm install grammy playwright @supabase/supabase-js
```

Also install Playwright browsers:

```bash
npx playwright install chromium
```

---

## Step 4: Create `generateImageNode.ts`

**Purpose**: Use Playwright to render the post's `codeExample` as a syntax-highlighted image.

**Location**: `backend/nodes/generateImageNode.ts`

**Logic**:

1. Check if `state.post.codeExample` exists
2. Create an HTML template with:
   - Dark theme background (e.g., `#1e1e1e`)
   - Syntax highlighting via Prism.js or highlight.js (inline CSS)
   - Monospace font (Fira Code or JetBrains Mono)
   - Padding and rounded corners
   - Window chrome (macOS-style dots)
3. Launch Playwright Chromium
4. Set viewport to image dimensions (e.g., 1200x800)
5. Set page content to the HTML template
6. Take screenshot of the code block element
7. Save to `./generated-images/` folder
8. Return `{ imagePath: "...", status: "IMAGE_GENERATED" }`

**Retry logic**:

- If Playwright fails, retry once
- On second failure, return `{ status: "IMAGE_FAILED", imageUrl: "" }` and let downstream nodes handle fallback

**HTML Template Example**:

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        margin: 0;
        background: #1e1e1e;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
      }
      .window {
        background: #2d2d2d;
        border-radius: 12px;
        padding: 24px;
        width: 800px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      .chrome {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .red {
        background: #ff5f56;
      }
      .yellow {
        background: #ffbd2e;
      }
      .green {
        background: #27c93f;
      }
      pre {
        margin: 0;
        font-family: "Fira Code", monospace;
        font-size: 14px;
        line-height: 1.6;
        color: #abb2bf;
      }
      .keyword {
        color: #c678dd;
      }
      .string {
        color: #98c379;
      }
      .function {
        color: #61afef;
      }
    </style>
  </head>
  <body>
    <div class="window">
      <div class="chrome">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
      </div>
      <pre><code>{{CODE}}</code></pre>
    </div>
  </body>
</html>
```

---

## Step 5: Create `uploadImageNode.ts`

**Purpose**: Upload the generated image to Cloudinary and get a public CDN URL.

**Location**: `backend/nodes/uploadImageNode.ts`

**Logic**:

1. Check if `state.imagePath` exists (from `generateImageNode`)
2. Initialize Cloudinary client with env vars
3. Upload image file using unsigned preset or signed upload:

   ```typescript
   import { v2 as cloudinary } from "cloudinary";

   cloudinary.config({
     cloud_name: env.CLOUDINARY_CLOUD_NAME,
     api_key: env.CLOUDINARY_API_KEY,
     api_secret: env.CLOUDINARY_API_SECRET,
   });

   const result = await cloudinary.uploader.upload(state.imagePath, {
     upload_preset: env.CLOUDINARY_UPLOAD_PRESET,
     folder: "posteragent",
   });
   ```

4. Get public URL: `result.secure_url`
5. Clean up local file (optional)
6. Return `{ imageUrl: result.secure_url, status: "IMAGE_UPLOADED" }`

**Fallback**: If no image was generated (or generation failed), skip upload and return `{ imageUrl: "", status: "IMAGE_SKIPPED" }`

**Cloudinary Setup Required**:

- Sign up at [cloudinary.com](https://cloudinary.com)
- Go to Settings → Upload → Add upload preset
- Set "Signing Mode" to "Unsigned" (for simple uploads)
- Note your cloud name, API key, API secret, and upload preset name

---

## Step 6: Create `telegramNotifyNode.ts`

**Purpose**: Send a Telegram message with the post preview and approval buttons.

**Location**: `backend/nodes/telegramNotifyNode.ts`

**Logic**:

1. Check if `state.telegramChatId` exists
2. Format message:

   ```
   📝 Post Ready for LinkedIn

   Title: {post.postTitle}

   {post.contentPreview}

   {imageUrl ? "📎 Image attached" : "⚠️ No image generated"}

   Approve to post to LinkedIn?
   ```

3. Send message with inline keyboard:
   ```
   [✅ Post to LinkedIn] [❌ Skip]
   ```
   Callback data: `approve_post:{thread_id}` and `skip_post:{thread_id}`
4. Store `telegramMessageId` in state for later editing
5. Return `{ status: "TELEGRAM_NOTIFIED" }`

**Bot Setup**:

- Create bot via @BotFather on Telegram
- Get token
- Set webhook URL: `https://api.telegram.org/bot{token}/setWebhook?url=https://your-domain.com/telegram/webhook`
- For local dev, use ngrok to expose localhost

---

## Step 7: Create `approvePostingNode.ts`

**Purpose**: Second human-in-the-loop approval gate before posting to LinkedIn.

**Location**: `backend/nodes/approvePostingNode.ts`

**Logic**:

```typescript
export async function approvePostingNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- ⏸️ ENTERING POSTING APPROVAL GATE ---");

  const response = interrupt({
    message: "Ready to post to LinkedIn?",
    postPreview: state.post,
    imageUrl: state.imageUrl,
  }) as { approved: boolean };

  return {
    isPostingApproved: response.approved,
    status: response.approved ? "POSTING_APPROVED" : "POSTING_REJECTED",
  };
}
```

This works identically to the first `approveNode`, but uses `isPostingApproved` instead of `isApproved`.

---

## Step 8: Create `postToLinkedInNode.ts`

**Purpose**: Call Zernio API to post to LinkedIn.

**Location**: `backend/nodes/postToLinkedInNode.ts`

**Logic**:

1. Format post text from `state.post`:

   ```
   {post.postTitle}

   {post.content}

   {post.challenge}

   {post.hashtags}
   ```

2. Call Zernio API:
   ```typescript
   const response = await fetch("https://zernio.com/api/v1/posts", {
     method: "POST",
     headers: {
       Authorization: `Bearer ${env.ZERNIO_API_KEY}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       text: formattedText,
       platforms: ["linkedin"],
       mediaUrls: state.imageUrl ? [state.imageUrl] : [],
     }),
   });
   ```
3. If success: return `{ isPosted: true, status: "POSTED_TO_LINKEDIN" }`
4. If failure: return `{ isPosted: false, postingError: error.message, status: "POSTING_FAILED" }`
5. Edit Telegram message to show result (success or failure)

---

## Step 9: Update `graph.ts`

Add new nodes and edges after `save`:

```typescript
import { generateImageNode } from "./nodes/generateImageNode";
import { uploadImageNode } from "./nodes/uploadImageNode";
import { telegramNotifyNode } from "./nodes/telegramNotifyNode";
import { approvePostingNode } from "./nodes/approvePostingNode";
import { postToLinkedInNode } from "./nodes/postToLinkedInNode";

const workflow = new StateGraph(GraphState)
  // ... existing nodes ...
  .addNode("generate_image", generateImageNode)
  .addNode("upload_image", uploadImageNode)
  .addNode("telegram_notify", telegramNotifyNode)
  .addNode("approve_posting", approvePostingNode)
  .addNode("post_to_linkedin", postToLinkedInNode);

// ... existing edges ...

// After save, continue to image generation
workflow.addEdge("save", "generate_image");

workflow.addConditionalEdges(
  "generate_image",
  (state) => (state.error ? "fail" : "continue"),
  { fail: "upload_image", continue: "upload_image" }, // Always continue, even if image failed
);

workflow.addEdge("upload_image", "telegram_notify");
workflow.addEdge("telegram_notify", "approve_posting");

workflow.addConditionalEdges(
  "approve_posting",
  (state) => {
    if (state.error) return "fail";
    return state.isPostingApproved ? "post" : "skip";
  },
  {
    post: "post_to_linkedin",
    skip: END,
    fail: END,
  },
);

workflow.addEdge("post_to_linkedin", END);
```

---

## Step 10: Create Telegram Bot Route

**Location**: `backend/routes/telegramBotRoute.ts`

**Logic**:

1. Initialize Grammy bot with `TELEGRAM_BOT_TOKEN`
2. Handle `/start` command:
   ```
   Welcome! Send me a URL to generate a LinkedIn post.
   Example: /generate https://react.dev/docs/hooks
   ```
3. Handle `/generate <url>` command:
   - Extract URL
   - Call `appGraph.invoke({ url }, { configurable: { thread_id: uuid() } })`
   - Store `telegramChatId` in initial state
4. Handle callback queries (inline buttons):
   - Parse `approve_post:{thread_id}` or `skip_post:{thread_id}`
   - Call `appGraph.invoke(new Command({ resume: { approved: true/false } }), { configurable: { thread_id } })`
   - Answer callback query to remove loading state
5. Register Fastify webhook route:
   ```typescript
   fastify.post("/telegram/webhook", webhookCallback(bot, "fastify"));
   ```

---

## Step 11: Create `/telegram/approve` Endpoint

**Location**: `backend/routes/telegramApproveRoute.ts`

**Logic**:

```typescript
fastify.post("/telegram/approve", async (request, reply) => {
  const { thread_id, approved } = request.body as {
    thread_id: string;
    approved: boolean;
  };

  const config = { configurable: { thread_id } };

  await appGraph.invoke(new Command({ resume: { approved } }), config);

  return reply
    .code(200)
    .send({ status: approved ? "POSTING_APPROVED" : "POSTING_REJECTED" });
});
```

This is called by the Telegram bot webhook handler when user clicks inline buttons.

---

## Step 12: Update `app.ts`

Register new routes:

```typescript
import { telegramBotRoute } from "./routes/telegramBotRoute.js";
import { telegramApproveRoute } from "./routes/telegramApproveRoute.js";

export async function app(fastify: FastifyInstance) {
  await startAgentRoute(fastify);
  await validatePostRoute(fastify);
  await getAgentUpdatesRoute(fastify);
  await telegramBotRoute(fastify);
  await telegramApproveRoute(fastify);
}
```

---

## Step 13: Update Web UI for Second Approval

**File**: `client/post-agent/src/Entities/LinkedInPostCard.tsx`

Add a second approval section that appears after the post is saved:

1. Show generated image (if available)
2. Show "Post to LinkedIn" and "Skip" buttons
3. On click, call `POST /validate-post` with `thread_id` and empty feedback (for approve) or feedback text (for skip)
4. The backend needs to distinguish first approval from second approval

**Alternative**: Create a new endpoint `POST /approve-posting` that specifically handles the second approval gate.

---

## Implementation Status

### ✅ Completed

- [x] Step 1: Environment variables added to `.env` and `env.ts`
- [x] Step 2: GraphState updated with new fields
- [x] Step 3: Dependencies installed (`grammy`, `playwright`, `cloudinary`)
- [x] Step 4: `generateImageNode.ts` — Playwright renders code snippet as image
- [x] Step 5: `uploadImageNode.ts` — Uploads image to Cloudinary
- [x] Step 6: `telegramNotifyNode.ts` — Sends Telegram message with inline keyboard
- [x] Step 7: `postToLinkedInNode.ts` — Calls Zernio API to post
- [x] Step 8: `approvePostingNode.ts` — Second interrupt for posting approval
- [x] Step 9: `graph.ts` updated with new nodes and edges
- [x] Step 10: Telegram bot route and webhook handler created
- [x] Step 11: `/telegram/approve` endpoint created
- [x] Step 12: `app.ts` updated to register new routes
- [x] Step 13: `codeExample` field added to `OutputSchema`

### ⏳ Remaining

- [ ] Step 14: Set up Telegram webhook (via ngrok for local dev)
- [ ] Step 15: Update web UI (`LinkedInPostCard.tsx`) for second approval
- [ ] Step 16: Test the full flow end-to-end

---

## Next Steps

1. **Set up Telegram webhook for local development:**

   ```bash
   npx ngrok http 5000
   ```

   Then set webhook:

   ```bash
   curl -X POST "https://api.telegram.org/bot7700881961:AAEQwmAdSfkzZrHrpNaMIl2ZY4oeotdJdqw/setWebhook?url=https://YOUR_NGROK_URL/telegram/webhook"
   ```

2. **Update web UI** to show second approval buttons after post is saved

3. **Test the flow:**
   - Web flow: Start agent → Approve content → Approve posting → Check LinkedIn
   - Telegram flow: Send `/generate <url>` → Click approve buttons → Check LinkedIn

4. **Deploy** and update webhook URL to production domain

### Web Flow

```
User enters URL in browser
  → POST /start-agent
    → Graph: scrape → summarize → generate → approve (interrupt)
      → User clicks Approve in web UI
        → POST /validate-post (resume)
          → Graph: save → generate_image → upload_to_supabase → telegram_notify → approve_posting (interrupt)
            → User clicks "Post to LinkedIn" in web UI
              → POST /validate-post or /approve-posting (resume)
                → Graph: post_to_linkedin → END
```

### Telegram Flow

```
User sends /generate <url> to bot
  → Bot calls appGraph.invoke()
    → Graph: scrape → summarize → generate → approve (interrupt)
      → Bot sends message: "Post ready. Approve?"
        → User clicks ✅ in Telegram
          → Callback → POST /telegram/approve (resume)
            → Graph: save → generate_image → upload_to_supabase → telegram_notify → approve_posting (interrupt)
              → Bot sends message: "Ready to post to LinkedIn?"
                → User clicks ✅ in Telegram
                  → Callback → POST /telegram/approve (resume)
                    → Graph: post_to_linkedin → END
                      → Bot edits message: "✅ Posted to LinkedIn!"
```

---

## Error Handling

| Failure                | Behavior                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Image generation fails | Retry once, then fallback to text-only post. Notify user: "Image failed, posting text only." |
| Supabase upload fails  | Skip image, continue with text-only. Log error.                                              |
| Zernio API fails       | Set `postingError`, notify Telegram/web: "Posting failed: {error}". End graph.               |
| Telegram bot fails     | Fallback to web UI approval. If web also fails, graph errors out.                            |
| User rejects posting   | Graph ends gracefully. Post is saved but not published.                                      |

---

## Files to Create/Modify

### New Files

- `backend/nodes/generateImageNode.ts`
- `backend/nodes/uploadImageNode.ts`
- `backend/nodes/telegramNotifyNode.ts`
- `backend/nodes/approvePostingNode.ts`
- `backend/nodes/postToLinkedInNode.ts`
- `backend/routes/telegramBotRoute.ts`
- `backend/routes/telegramApproveRoute.ts`

### Modified Files

- `backend/env.ts` — Add new env vars
- `backend/state.ts` — Add new state fields
- `backend/graph.ts` — Add nodes and edges
- `backend/app.ts` — Register new routes
- `backend/package.json` — Add dependencies
- `client/post-agent/src/Entities/LinkedInPostCard.tsx` — Add second approval UI

---

## Next Steps

1. Set up Supabase project and storage bucket
2. Create Zernio account and get API key
3. Create Telegram bot via @BotFather
4. Install dependencies (`grammy`, `playwright`, `@supabase/supabase-js`)
5. Implement nodes one by one (start with `generateImageNode`)
6. Update graph and test locally
7. Set up ngrok for Telegram webhook testing
8. Deploy and set production webhook URL
