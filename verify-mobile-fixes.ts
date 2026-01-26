import { chromium, devices } from '@playwright/test';
import * as fs from 'fs';

async function verifyMobileFixes() {
  const browser = await chromium.launch();

  const mobileDevices = [
    'iPhone 14',
    'iPhone SE',
    'Pixel 7',
    'Galaxy S9+'
  ];

  const allResults: any[] = [];

  for (const deviceName of mobileDevices) {
    console.log(`\n=== Testing ${deviceName} ===`);
    const device = devices[deviceName];
    const context = await browser.newContext({
      ...device,
    });
    const page = await context.newPage();

    try {
      // Navigate to local dev server
      await page.goto('http://localhost:3001/portal/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({
        path: `./screenshots/mobile-fix-${deviceName.replace(/\s+/g, '-')}.png`,
        fullPage: true
      });

      // Audit mobile issues
      const issues = await page.evaluate(() => {
        const problems: any[] = [];
        const MIN_TOUCH_SIZE = 44;

        // Check touch targets
        const buttons = document.querySelectorAll('button, a[href], [role="button"]');
        buttons.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const text = el.textContent?.trim().slice(0, 30) || el.tagName;
          
          if (rect.width > 0 && rect.height > 0 && (rect.width < MIN_TOUCH_SIZE || rect.height < MIN_TOUCH_SIZE)) {
            problems.push({
              type: 'touch-target',
              element: el.tagName.toLowerCase(),
              details: `Touch target too small (${Math.round(rect.width)}x${Math.round(rect.height)}px). Min recommended: ${MIN_TOUCH_SIZE}x${MIN_TOUCH_SIZE}px. Text: "${text}"`,
              severity: 'medium'
            });
          }
        });

        // Check for horizontal overflow
        if (document.body.scrollWidth > window.innerWidth) {
          problems.push({
            type: 'overflow',
            element: 'body',
            details: `Horizontal overflow: ${document.body.scrollWidth}px > ${window.innerWidth}px`,
            severity: 'high'
          });
        }

        // Check for elements positioned off-screen
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
          
          // Skip invisible elements
          if (rect.width === 0 || rect.height === 0 || styles.display === 'none') return;

          // Check if element extends beyond left edge
          if (rect.left < -5) {
            const className = el.className?.toString().slice(0, 50) || '';
            problems.push({
              type: 'position',
              element: el.tagName.toLowerCase(),
              details: `Element positioned ${Math.abs(Math.round(rect.left))}px off left edge. Class: ${className}`,
              severity: 'medium'
            });
          }

          // Check if element extends beyond right edge
          if (rect.right > window.innerWidth + 5) {
            const className = el.className?.toString().slice(0, 50) || '';
            problems.push({
              type: 'position',
              element: el.tagName.toLowerCase(),
              details: `Element extends ${Math.round(rect.right - window.innerWidth)}px beyond right edge. Class: ${className}`,
              severity: 'medium'
            });
          }
        });

        // Group by type for easier analysis
        const grouped: any = {};
        problems.forEach(p => {
          if (!grouped[p.type]) grouped[p.type] = [];
          grouped[p.type].push(p);
        });

        return { problems, grouped };
      });

      const result = {
        device: deviceName,
        viewport: device.viewport,
        issues: issues.problems,
        grouped: issues.grouped
      };

      allResults.push(result);

      console.log(`✓ Found ${issues.problems.length} issues`);
      if (issues.grouped['touch-target']) {
        console.log(`  - Touch target issues: ${issues.grouped['touch-target'].length}`);
      }
      if (issues.grouped['position']) {
        console.log(`  - Position issues: ${issues.grouped['position'].length}`);
      }
      if (issues.grouped['overflow']) {
        console.log(`  - Overflow issues: ${issues.grouped['overflow'].length}`);
      }

    } catch (error) {
      console.error(`Error testing ${deviceName}:`, error);
    } finally {
      await context.close();
    }
  }

  // Save results
  fs.writeFileSync(
    './mobile-verification-results.json',
    JSON.stringify(allResults, null, 2)
  );

  console.log('\n=== Summary ===');
  console.log('Results saved to mobile-verification-results.json');
  console.log('Screenshots saved to ./screenshots/');
  
  // Print comparison
  console.log('\n=== Comparison with Previous Audit ===');
  allResults.forEach(result => {
    const touchIssues = result.grouped['touch-target']?.length || 0;
    const positionIssues = result.grouped['position']?.length || 0;
    console.log(`\n${result.device}:`);
    console.log(`  Touch target issues: ${touchIssues} (previously: 4+)`);
    console.log(`  Position issues: ${positionIssues} (previously: 1-2 on small screens)`);
  });

  await browser.close();
}

verifyMobileFixes().catch(console.error);
