import { chromium } from "playwright";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://ray.so", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const codeInput = page.locator('textarea, [role="textbox"]').first();
  await codeInput.waitFor({ state: "visible" });
  await codeInput.click();
  await codeInput.fill(`import { useCallback } from "react";

export default function ProductPage({ productId, referrer })
{
  const handleSubmit = useCallback(
    (orderDetails) => {
      post("/product/" + productId + "/buy", { referrer,
orderDetails });
    },
    [productId, referrer],
  );

  return <ShippingForm onSubmit={handleSubmit} />;
}`);
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    document.body.style.zoom = "2";
  });
  await page.waitForTimeout(500);

  const window = page
    .locator('[class*="DefaultFrame-module"][class*="window"]')
    .first();
  const bbox = await window.boundingBox();

  if (bbox) {
    await page.screenshot({
      path: "generated-images/ray_so_window_test.png",
      clip: bbox,
    });
    console.log("✅ Screenshot saved:", bbox);
  }

  await browser.close();
}

test().catch(console.error);
