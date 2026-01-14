import { chromium, devices } from 'playwright';

async function auditMobileUI() {
  const browser = await chromium.launch();

  // Test multiple mobile devices
  const mobileDevices = [
    'iPhone 14',
    'iPhone SE',
    'Pixel 7',
    'Galaxy S9+'
  ];

  const results: string[] = [];

  for (const deviceName of mobileDevices) {
    const device = devices[deviceName];
    const context = await browser.newContext({
      ...device,
    });
    const page = await context.newPage();

    console.log(`\n=== Testing ${deviceName} (${device.viewport.width}x${device.viewport.height}) ===`);

    // Load local dev server or built files
    await page.goto('file:///root/eleven-views-complete-site/portal/index.html', { waitUntil: 'networkidle' });

    // Wait for React to render
    await page.waitForTimeout(2000);

    // Take screenshot of landing page
    await page.screenshot({
      path: `/root/eleven-views-platform/screenshots/${deviceName.replace(/\s+/g, '-')}-landing.png`,
      fullPage: true
    });

    // Analyze viewport issues
    const issues = await page.evaluate(() => {
      const problems: string[] = [];

      // Check for horizontal overflow
      if (document.body.scrollWidth > window.innerWidth) {
        problems.push(`Horizontal overflow: body width ${document.body.scrollWidth}px > viewport ${window.innerWidth}px`);
      }

      // Check all elements for overflow
      const allElements = document.querySelectorAll('*');
      allElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        // Elements extending beyond viewport
        if (rect.right > window.innerWidth + 10) {
          const tag = el.tagName.toLowerCase();
          const className = el.className?.toString().slice(0, 50) || '';
          problems.push(`Element overflow: <${tag} class="${className}"> extends ${Math.round(rect.right - window.innerWidth)}px beyond viewport`);
        }

        // Text too small
        const fontSize = parseFloat(styles.fontSize);
        if (fontSize < 12 && el.textContent?.trim() && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          problems.push(`Small text (${fontSize}px): "${el.textContent?.slice(0, 30)}..."`);
        }

        // Touch targets too small
        if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
          if (rect.width < 44 || rect.height < 44) {
            problems.push(`Small touch target (${Math.round(rect.width)}x${Math.round(rect.height)}): ${el.textContent?.slice(0, 20) || el.tagName}`);
          }
        }

        // Fixed positioning issues
        if (styles.position === 'fixed' && rect.width > window.innerWidth) {
          problems.push(`Fixed element wider than viewport: ${el.className}`);
        }
      });

      // Check for proper viewport meta tag
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        problems.push('Missing viewport meta tag');
      }

      // Check grid/flex issues
      const grids = document.querySelectorAll('[class*="grid"]');
      grids.forEach((grid) => {
        const rect = grid.getBoundingClientRect();
        if (rect.width > window.innerWidth) {
          problems.push(`Grid overflow: ${grid.className?.toString().slice(0, 50)}`);
        }
      });

      return [...new Set(problems)].slice(0, 30); // Dedupe and limit
    });

    console.log(`Found ${issues.length} issues on ${deviceName}:`);
    issues.forEach(issue => console.log(`  - ${issue}`));
    results.push(`\n${deviceName}:\n${issues.map(i => `  - ${i}`).join('\n')}`);

    await context.close();
  }

  await browser.close();

  // Write results to file
  const fs = await import('fs');
  fs.writeFileSync('/root/eleven-views-platform/mobile-audit-results.txt', results.join('\n\n'));
  console.log('\n\nResults saved to mobile-audit-results.txt');
}

auditMobileUI().catch(console.error);
