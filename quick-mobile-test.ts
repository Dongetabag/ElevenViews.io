import { chromium, devices } from 'playwright';

async function quickTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 14'],
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: '/root/eleven-views-platform/screenshots/mobile-current.png',
    fullPage: true
  });

  console.log('Mobile screenshot saved');
  await browser.close();
}

quickTest().catch(console.error);
