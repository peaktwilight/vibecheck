import { chromium } from "playwright";

export interface Screenshots {
  viewport: Buffer;
}

/**
 * Capture a viewport screenshot of a URL.
 */
export async function captureScreenshots(url: string): Promise<Screenshots> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  // Wait a beat for animations / lazy images
  await page.waitForTimeout(1500);

  const viewport = await page.screenshot({ type: "png" });

  await browser.close();

  return { viewport };
}
