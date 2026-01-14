import { chromium } from 'playwright';

async function checkDesktop() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: '/root/eleven-views-platform/screenshots/desktop-1920x1080.png',
    fullPage: false
  });

  console.log('Desktop screenshot saved to screenshots/desktop-1920x1080.png');

  // Check for any visible issues
  const issues = await page.evaluate(() => {
    const problems: string[] = [];

    // Check decorative elements are visible on desktop
    const blurElements = document.querySelectorAll('.blur-\\[150px\\], .blur-\\[120px\\]');
    blurElements.forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.display === 'none') {
        problems.push('Decorative blur element hidden on desktop');
      }
    });

    // Check text sizes are correct (should be small on desktop)
    const smallTexts = document.querySelectorAll('.sm\\:text-\\[10px\\], .sm\\:text-xs');
    smallTexts.forEach(el => {
      const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
      if (fontSize > 14) {
        problems.push(`Text should be small on desktop but is ${fontSize}px`);
      }
    });

    // Check buttons don't have min-height on desktop
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      const minHeight = window.getComputedStyle(btn).minHeight;
      if (minHeight !== '0px' && minHeight !== 'auto' && minHeight !== 'none') {
        problems.push(`Button has min-height ${minHeight} on desktop`);
      }
    });

    return problems;
  });

  if (issues.length === 0) {
    console.log('✓ Desktop view verified - no issues found');
  } else {
    console.log('Desktop issues found:');
    issues.forEach(i => console.log(`  - ${i}`));
  }

  await browser.close();
}

checkDesktop().catch(console.error);
