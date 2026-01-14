import { chromium, devices } from 'playwright';

async function auditMobileUI() {
  const browser = await chromium.launch({ headless: true });

  // Test multiple mobile devices
  const mobileDevices = [
    { name: 'iPhone 14', device: devices['iPhone 14'] },
    { name: 'iPhone SE', device: devices['iPhone SE'] },
    { name: 'Pixel 7', device: devices['Pixel 7'] },
    { name: 'Galaxy S9+', device: devices['Galaxy S9+'] }
  ];

  const allResults: any[] = [];

  for (const { name: deviceName, device } of mobileDevices) {
    const context = await browser.newContext({
      ...device,
    });
    const page = await context.newPage();

    console.log(`\n=== Testing ${deviceName} (${device.viewport.width}x${device.viewport.height}) ===`);

    try {
      // Load dev server
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for React to render
      await page.waitForTimeout(3000);

      // Take full page screenshot
      await page.screenshot({
        path: `/root/eleven-views-platform/screenshots/${deviceName.replace(/\s+/g, '-')}-home.png`,
        fullPage: true
      });

      // Analyze viewport issues
      const issues = await page.evaluate(() => {
        const problems: { type: string; element: string; details: string; severity: string }[] = [];

        // Check for horizontal overflow
        if (document.body.scrollWidth > window.innerWidth) {
          problems.push({
            type: 'overflow',
            element: 'body',
            details: `Horizontal overflow: body width ${document.body.scrollWidth}px > viewport ${window.innerWidth}px`,
            severity: 'high'
          });
        }

        // Check all elements
        const allElements = document.querySelectorAll('*');
        const checkedClasses = new Set<string>();

        allElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
          const className = el.className?.toString() || '';

          // Skip if we've already checked this class pattern
          const classKey = className.slice(0, 30);
          if (checkedClasses.has(classKey)) return;

          // Elements extending beyond viewport
          if (rect.right > window.innerWidth + 5 && rect.width > 0) {
            checkedClasses.add(classKey);
            const tag = el.tagName.toLowerCase();
            problems.push({
              type: 'overflow',
              element: `<${tag}>`,
              details: `Element extends ${Math.round(rect.right - window.innerWidth)}px beyond viewport. Class: ${className.slice(0, 60)}`,
              severity: 'high'
            });
          }

          // Text too small on mobile
          const fontSize = parseFloat(styles.fontSize);
          if (fontSize > 0 && fontSize < 14 && el.textContent?.trim().length > 5) {
            if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && !el.closest('script') && !el.closest('style')) {
              problems.push({
                type: 'typography',
                element: el.tagName.toLowerCase(),
                details: `Text size ${fontSize}px is small for mobile. Content: "${el.textContent?.slice(0, 40)}..."`,
                severity: 'medium'
              });
            }
          }

          // Touch targets too small (should be at least 44x44 on mobile)
          if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button' || styles.cursor === 'pointer') {
            if ((rect.width > 0 && rect.width < 44) || (rect.height > 0 && rect.height < 44)) {
              if (rect.width > 10 && rect.height > 10) { // Ignore tiny/hidden elements
                problems.push({
                  type: 'touch-target',
                  element: el.tagName.toLowerCase(),
                  details: `Touch target too small (${Math.round(rect.width)}x${Math.round(rect.height)}px). Min recommended: 44x44px. Text: "${el.textContent?.slice(0, 30) || 'icon'}"`,
                  severity: 'medium'
                });
              }
            }
          }

          // Padding/margin issues causing overflow
          if (rect.left < 0) {
            problems.push({
              type: 'position',
              element: el.tagName.toLowerCase(),
              details: `Element positioned ${Math.abs(Math.round(rect.left))}px off left edge. Class: ${className.slice(0, 40)}`,
              severity: 'medium'
            });
          }

          // Fixed elements covering content
          if (styles.position === 'fixed' && rect.height > window.innerHeight * 0.3) {
            problems.push({
              type: 'fixed-element',
              element: el.tagName.toLowerCase(),
              details: `Fixed element takes ${Math.round((rect.height / window.innerHeight) * 100)}% of viewport height`,
              severity: 'low'
            });
          }

          // Grid/flex with bad mobile sizing
          if (styles.display.includes('grid') || styles.display.includes('flex')) {
            const children = el.children;
            if (children.length > 3) {
              const firstChild = children[0] as HTMLElement;
              const childRect = firstChild?.getBoundingClientRect();
              if (childRect && childRect.width < 80) {
                problems.push({
                  type: 'layout',
                  element: 'grid/flex container',
                  details: `Grid items may be too narrow (${Math.round(childRect.width)}px) for mobile. Consider stacking. Class: ${className.slice(0, 40)}`,
                  severity: 'low'
                });
              }
            }
          }
        });

        // Check spacing issues
        const headings = document.querySelectorAll('h1, h2, h3');
        headings.forEach(h => {
          const styles = window.getComputedStyle(h);
          const paddingLeft = parseFloat(styles.paddingLeft);
          const marginLeft = parseFloat(styles.marginLeft);
          if (paddingLeft > 40 || marginLeft > 40) {
            problems.push({
              type: 'spacing',
              element: h.tagName.toLowerCase(),
              details: `Large left spacing (${paddingLeft + marginLeft}px) may push content on small screens`,
              severity: 'low'
            });
          }
        });

        return problems.slice(0, 50); // Limit results
      });

      // Group by type
      const grouped: Record<string, typeof issues> = {};
      issues.forEach(issue => {
        if (!grouped[issue.type]) grouped[issue.type] = [];
        grouped[issue.type].push(issue);
      });

      console.log(`Found ${issues.length} issues on ${deviceName}:`);
      Object.entries(grouped).forEach(([type, items]) => {
        console.log(`\n  ${type.toUpperCase()} (${items.length}):`);
        items.slice(0, 5).forEach(item => {
          console.log(`    [${item.severity}] ${item.details.slice(0, 100)}`);
        });
        if (items.length > 5) console.log(`    ... and ${items.length - 5} more`);
      });

      allResults.push({ device: deviceName, viewport: device.viewport, issues, grouped });

    } catch (error) {
      console.error(`Error testing ${deviceName}:`, error);
    }

    await context.close();
  }

  await browser.close();

  // Write detailed results
  const fs = await import('fs');
  fs.writeFileSync(
    '/root/eleven-views-platform/mobile-audit-results.json',
    JSON.stringify(allResults, null, 2)
  );

  // Generate summary
  const summary = allResults.map(r => {
    const high = r.issues.filter((i: any) => i.severity === 'high').length;
    const medium = r.issues.filter((i: any) => i.severity === 'medium').length;
    const low = r.issues.filter((i: any) => i.severity === 'low').length;
    return `${r.device} (${r.viewport.width}x${r.viewport.height}): ${high} high, ${medium} medium, ${low} low`;
  }).join('\n');

  console.log('\n\n=== SUMMARY ===');
  console.log(summary);
  console.log('\nDetailed results saved to mobile-audit-results.json');
}

auditMobileUI().catch(console.error);
