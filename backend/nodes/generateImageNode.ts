import { chromium } from "playwright";
import { StateType } from "../state";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const IMAGES_DIR = join(process.cwd(), "generated-images");

/**
 * Generate a beautiful code snippet image using carbon.now.sh
 * Opens carbon in a headless browser, pastes the code,
 * clicks Export → PNG, and captures the downloaded image
 */
async function generateCarbonImage(
  code: string,
  outputPath: string,
): Promise<boolean> {
  console.log("🚀 Launching Chromium for carbon.now.sh...");
  let browser;
  try {
    browser = await chromium.launch({
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

    // Navigate to carbon.now.sh with Night Owl theme, no line numbers, 2x export
    const carbonUrl =
      "https://carbon.now.sh/?bg=rgba(171,184,195,1)&t=night-owl&wt=none&l=auto&width=680&ds=true&dsyoff=20px&dsblur=68px&wc=true&wa=true&pv=56px&ph=56px&ln=false&fl=1&fm=Hack&fs=14px&lh=133%25&si=false&es=2x&wm=false";
    console.log("🌐 Navigating to carbon.now.sh...");
    await page.goto(carbonUrl, { waitUntil: "networkidle" });
    console.log("✅ carbon.now.sh loaded");
    await page.waitForTimeout(3000);

    // Find and fill the code editor
    console.log("⌨️ Looking for code editor...");
    const editor = page.locator('textarea, [contenteditable="true"]').first();
    await editor.waitFor({ state: "visible" });
    console.log("✅ Code editor found");

    // Clear existing content and paste new code
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await editor.fill(code);
    console.log("✅ Code pasted into carbon");
    await page.waitForTimeout(2000);

    // Click the Export button (the download/export icon button)
    console.log("🖼️ Clicking Export button...");
    const exportBtn = page
      .locator(
        'button:has-text("Export"), button[aria-label*="export"], button[aria-label*="download"]',
      )
      .first();
    await exportBtn.waitFor({ state: "visible" });
    await exportBtn.click();
    console.log("✅ Export dropdown opened");
    await page.waitForTimeout(1000);

    // Click PNG option
    console.log("💾 Selecting PNG export...");
    const pngOption = page.locator('button:has-text("PNG")').first();
    await pngOption.waitFor({ state: "visible" });

    // Handle the download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      pngOption.click(),
    ]);

    await download.saveAs(outputPath);
    console.log("✅ carbon PNG exported to", outputPath);

    return true;
  } catch (error: any) {
    console.error("❌ Error during carbon image generation:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  } finally {
    await browser.close();
    console.log("🔒 Browser closed");
  }
}

export async function generateImageNode(
  state: StateType,
): Promise<Partial<StateType>> {
  console.log("--- 🎨 EXECUTING IMAGE GENERATION NODE (carbon.now.sh) ---");

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
        `🖼️ carbon image generation attempt ${attempts}/${maxAttempts}...`,
      );
      success = await generateCarbonImage(codeExample, filePath);
      if (success) {
        console.log(`✅ carbon image captured: ${filePath}`);
      }
    } catch (error: any) {
      console.error(`❌ carbon attempt ${attempts} failed:`, error.message);
      if (attempts >= maxAttempts) {
        return {
          imageUrl: "",
          status: "IMAGE_FAILED",
          error: `carbon image generation failed: ${error.message}`,
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
