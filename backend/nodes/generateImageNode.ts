import { chromium } from "playwright";
import { StateType } from "../state";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const IMAGES_DIR = join(process.cwd(), "generated-images");

/**
 * Generate a beautiful code snippet image using ray.so
 * Encodes code in the URL, navigates directly, clicks Export → PNG,
 * and intercepts the downloaded image
 */
async function generateRaySoImage(
  code: string,
  outputPath: string,
): Promise<boolean> {
  console.log("🚀 Launching Chromium for ray.so export...");
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
    console.log("✅ Chromium launched successfully");
  } catch (launchError: any) {
    console.error("❌ Failed to launch Chromium:", launchError.message);
    throw launchError;
  }

  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });
    console.log("📄 New page created");

    // Base64 encode the code and construct ray.so URL directly
    const encodedCode = Buffer.from(code).toString("base64");
    const raySoUrl = `https://ray.so/#width=750&code=${encodeURIComponent(encodedCode)}&language=javascript&background=true&darkMode=true&lineNumbers=true&padding=64&theme=openai`;

    console.log("🌐 Navigating to ray.so with pre-encoded code...");
    await page.goto(raySoUrl, { waitUntil: "networkidle" });
    console.log("✅ ray.so loaded");
    await page.waitForTimeout(3000);

    // Click "Export" button and intercept the download
    console.log("🖼️ Clicking Export button and intercepting download...");

    // Wait for UI to fully render
    await page.waitForTimeout(2000);

    // Find the Export button
    const exportSelectors = [
      'button:has-text("Export")',
      'button:has-text("PNG")',
      'button[aria-label*="export" i]',
      'button[aria-label*="download" i]',
    ];

    let exportBtn = null;
    for (const sel of exportSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ state: "visible", timeout: 3000 });
        exportBtn = el;
        console.log(`✅ Found Export button with selector: ${sel}`);
        break;
      } catch {
        console.log(`⚠️ Selector failed: ${sel}`);
      }
    }

    if (!exportBtn) {
      throw new Error("Could not find Export button");
    }

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      exportBtn.click(),
    ]);

    console.log("📥 Download started:", download.suggestedFilename());
    await download.saveAs(outputPath);
    console.log("✅ ray.so PNG exported to", outputPath);

    return true;
  } catch (error: any) {
    console.error("❌ Error during ray.so export:", error.message);
    throw error;
  } finally {
    await browser.close();
    console.log("🔒 Browser closed");
  }
}

export async function generateImageNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- 🎨 EXECUTING IMAGE GENERATION NODE (ray.so URL) ---");

  const codeExample = state.post?.codeExample;
  if (!codeExample || codeExample.trim() === "") {
    console.log("⚠️ No codeExample found. Skipping image generation.");
    return {
      imageUrl: "",
      status: "IMAGE_SKIPPED_NO_CODE",
    };
  }

  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const safeTitle = state.post.postTitle
    ? state.post.postTitle
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
      console.log(
        `🖼️ ray.so image generation attempt ${attempts}/${maxAttempts}...`,
      );
      success = await generateRaySoImage(codeExample, filePath);
      if (success) {
        console.log(`✅ ray.so image captured: ${filePath}`);
      }
    } catch (error: any) {
      console.error(`❌ ray.so attempt ${attempts} failed:`, error.message);
      if (attempts >= maxAttempts) {
        return {
          imageUrl: "",
          status: "IMAGE_FAILED",
          error: `ray.so image generation failed: ${error.message}`,
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
