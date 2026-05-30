import { chromium } from "playwright";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const IMAGES_DIR = join(process.cwd(), "generated-images");

/**
 * Generate a beautiful code snippet image using ray.so
 * This opens ray.so in a headless browser, pastes the code,
 * and screenshots the code card (since ray.so's export uses
 * client-side canvas generation that doesn't trigger downloads)
 */
export async function generateRaySoImage(
  code: string,
  outputPath?: string,
): Promise<string> {
  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const finalPath = outputPath || join(IMAGES_DIR, `ray_so_${Date.now()}.png`);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    // Navigate to ray.so
    await page.goto("https://ray.so", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Find and click the code input area
    const codeInput = page.locator('textarea, [role="textbox"]').first();
    await codeInput.waitFor({ state: "visible" });

    // Clear existing code and type new code
    await codeInput.click();
    await codeInput.fill(code);
    await page.waitForTimeout(1000);

    // Find the code preview card bounding box
    const bbox = await page.evaluate(() => {
      // The preview card has class containing "Frame-module"
      const frames = document.querySelectorAll('[class*="Frame-module"]');
      for (const frame of frames) {
        const rect = frame.getBoundingClientRect();
        if (rect.width > 200 && rect.height > 200) {
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }
      }
      return null;
    });

    if (!bbox) {
      throw new Error("Could not find ray.so code card");
    }

    // Screenshot just the code card
    await page.screenshot({
      path: finalPath,
      clip: bbox,
    });

    console.log(`✅ ray.so image captured: ${finalPath}`);
    return finalPath;
  } finally {
    await browser.close();
  }
}

// Example usage:
// const imagePath = await generateRaySoImage(`
// import { useState } from "react";
// export default function App() {
//   const [count, setCount] = useState(0);
//   return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
// }
// `);
