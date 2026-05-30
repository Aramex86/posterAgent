import { chromium } from "playwright";
import { StateType } from "../state";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const IMAGES_DIR = join(process.cwd(), "generated-images");

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightCode(code: string): string {
  let html = escapeHtml(code);
  // Keywords
  const keywords = [
    "const",
    "let",
    "var",
    "function",
    "return",
    "import",
    "from",
    "export",
    "default",
    "async",
    "await",
    "if",
    "else",
    "for",
    "while",
    "try",
    "catch",
    "new",
    "this",
    "class",
    "extends",
    "super",
    "static",
    "typeof",
    "instanceof",
    "true",
    "false",
    "null",
    "undefined",
  ];
  keywords.forEach((kw) => {
    html = html.replace(
      new RegExp(`\\b${kw}\\b`, "g"),
      `<span style="color:#ff7b72">${kw}</span>`,
    );
  });
  // Functions / Hooks
  html = html.replace(
    /\b(use[A-Z][a-zA-Z]+|[A-Z][a-zA-Z]+)\b/g,
    '<span style="color:#d2a8ff">$1</span>',
  );
  // Strings
  html = html.replace(
    /(&quot;.*?&quot;|&#039;.*?&#039;|`.*?`)/g,
    '<span style="color:#a5d6ff">$1</span>',
  );
  // Numbers
  html = html.replace(/\b(\d+)\b/g, '<span style="color:#79c0ff">$1</span>');
  // Comments
  html = html.replace(
    /(\/\/.*$)/gm,
    '<span style="color:#8b949e;font-style:italic">$1</span>',
  );
  // JSX tags
  html = html.replace(
    /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)/g,
    '$1<span style="color:#7ee787">$2</span>',
  );
  return html;
}

function generateRaySoStyleHtml(title: string, code: string): string {
  const highlighted = highlightCode(code);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1200px;
  background: #0f0f0f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.card {
  background: #181818;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  width: 100%;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  background: #1e1e1e;
  border-bottom: 1px solid #2a2a2a;
}
.dot { width: 14px; height: 14px; border-radius: 50%; }
.dot-red { background: #ff5f57; }
.dot-yellow { background: #febc2e; }
.dot-green { background: #28c840; }
.title-bar {
  margin-left: 12px;
  font-size: 15px;
  color: #888;
  font-family: 'SF Mono', Monaco, monospace;
}
.code-area {
  padding: 32px 36px;
  background: #0d1117;
}
pre {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
  font-size: 20px;
  line-height: 1.7;
  color: #c9d1d9;
  white-space: pre-wrap;
  word-break: break-word;
}
.footer {
  margin-top: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0 10px;
}
.brand {
  font-size: 16px;
  color: #666;
  font-weight: 500;
  letter-spacing: 2px;
}
.topic {
  font-size: 16px;
  color: #58a6ff;
  font-weight: 500;
}
</style>
</head>
<body>
<div class="card">
  <div class="card-header">
    <div class="dot dot-red"></div>
    <div class="dot dot-yellow"></div>
    <div class="dot dot-green"></div>
    <div class="title-bar">${escapeHtml(title.slice(0, 40))}</div>
  </div>
  <div class="code-area">
    <pre><code>${highlighted}</code></pre>
  </div>
</div>
<div class="footer">
  <div class="topic">#React #JavaScript</div>
  <div class="brand">POSTERAGENT</div>
</div>
</body>
</html>`;
}

async function generateRaySoStyleImage(
  title: string,
  code: string,
  outputPath: string,
): Promise<boolean> {
  console.log("🚀 Launching Chromium for fast local render...");
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    console.log("✅ Chromium launched");
  } catch (launchError: any) {
    console.error("❌ Chromium launch failed:", launchError.message);
    throw launchError;
  }

  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
    });
    console.log("📄 Page created (1200x800 @ 2x)");

    const html = generateRaySoStyleHtml(title, code);
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    console.log("📸 Taking screenshot...");
    await page.screenshot({ path: outputPath, type: "png", fullPage: true });
    console.log("✅ Screenshot saved to", outputPath);
    return true;
  } catch (error: any) {
    console.error("❌ Image generation error:", error.message);
    throw error;
  } finally {
    await browser.close();
    console.log("🔒 Browser closed");
  }
}

export async function generateImageNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- 🎨 EXECUTING IMAGE GENERATION NODE (Ray.so Style) ---");

  const codeExample = state.post?.codeExample;
  const postTitle = state.post?.postTitle;

  if (!codeExample || codeExample.trim() === "") {
    console.log("⚠️ No codeExample found. Skipping image generation.");
    return { imageUrl: "", status: "IMAGE_SKIPPED_NO_CODE" };
  }

  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const safeTitle = postTitle
    ? postTitle
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 20)
    : "post";
  const fileName = `snippet_${safeTitle}_${timestamp}.png`;
  const filePath = join(IMAGES_DIR, fileName);

  let attempts = 0;
  const maxAttempts = 2;
  let success = false;

  while (attempts < maxAttempts && !success) {
    attempts++;
    try {
      console.log(`🖼️ Image generation attempt ${attempts}/${maxAttempts}...`);
      success = await generateRaySoStyleImage(
        postTitle || "React Code Snippet",
        codeExample,
        filePath,
      );
      if (success) {
        console.log(`✅ Image captured: ${filePath}`);
      }
    } catch (error: any) {
      console.error(`❌ Attempt ${attempts} failed:`, error.message);
      if (attempts >= maxAttempts) {
        return {
          imageUrl: "",
          status: "IMAGE_FAILED",
          error: `Image generation failed: ${error.message}`,
        };
      }
    }
  }

  return {
    imageUrl: filePath,
    status: "IMAGE_GENERATED",
    error: null,
  };
}
