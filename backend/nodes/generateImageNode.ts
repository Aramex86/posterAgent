import { chromium } from "playwright";
import { StateType } from "../state";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const IMAGES_DIR = join(process.cwd(), "generated-images");

/**
 * Generate a beautiful code snippet image using ray.so
 * Opens ray.so in a headless browser, pastes the code,
 * and captures a high-resolution screenshot of the code card
 */
async function generateRaySoImage(
  code: string,
  outputPath: string,
): Promise<boolean> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  try {
    const page = await browser.newPage();

    // Navigate to ray.so
    await page.goto("https://ray.so", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Find and fill the code input
    const codeInput = page.locator('textarea, [role="textbox"]').first();
    await codeInput.waitFor({ state: "visible" });
    await codeInput.click();
    await codeInput.fill(code);
    await page.waitForTimeout(1500);

    // Find the inner window element (the actual code card with dark background)
    const window = page
      .locator('[class*="DefaultFrame-module"][class*="window"]')
      .first();

    // Wait for the window to be visible
    await window.waitFor({ state: "visible" });

    // Screenshot just the window element (clean, no surrounding UI)
    await window.screenshot({
      path: outputPath,
      type: "png",
    });

    return true;
  } finally {
    await browser.close();
  }
}

export async function generateImageNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- 🎨 EXECUTING IMAGE GENERATION NODE (ray.so) ---");

  // Check if we have code to render
  const codeExample = state.post?.codeExample;
  if (!codeExample || codeExample.trim() === "") {
    console.log("⚠️ No codeExample found in post. Skipping image generation.");
    return {
      imageUrl: "",
      status: "IMAGE_SKIPPED_NO_CODE",
    };
  }

  // Ensure output directory exists
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

  // Try generation with retry
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
          error: `ray.so image generation failed after ${maxAttempts} attempts: ${error.message}`,
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
