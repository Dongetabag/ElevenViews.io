import { chromium, devices } from 'playwright';

async function checkLive() {
  const browser = await chromium.launch();

  // Desktop
  const desktop = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto('https://elevenviews.io/portal/', { waitUntil: 'networkidle', timeout: 30000 });
  await desktopPage.waitForTimeout(3000);
  await desktopPage.screenshot({ path: '/root/eleven-views-platform/screenshots/live-desktop.png', fullPage: true });
  console.log('Live desktop screenshot saved');
  await desktop.close();

  // Mobile
  const mobile = await browser.newContext({ ...devices['iPhone 14'] });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto('https://elevenviews.io/portal/', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ path: '/root/eleven-views-platform/screenshots/live-mobile.png', fullPage: true });
  console.log('Live mobile screenshot saved');
  await mobile.close();

  await browser.close();
}

checkLive().catch(console.error);
