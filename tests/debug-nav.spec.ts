import { test, expect } from '@playwright/test';

const BASE_URL = 'http://72.61.72.94:3003';

test('Complete login and test all navigation', async ({ page }) => {
  // Capture all console messages
  const logs: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });

  // Go to app
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  console.log('Step 1: Landing page loaded');
  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/01-landing.png' });

  // Click CREATE ACCOUNT button
  const initButton = page.locator('button:has-text("CREATE ACCOUNT")');
  await expect(initButton).toBeVisible({ timeout: 10000 });
  await initButton.click();
  await page.waitForTimeout(1000);

  console.log('Step 2: Clicked CREATE ACCOUNT');
  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/02-after-init-click.png' });

  // Check for intake modal
  const modal = page.locator('[class*="fixed"][class*="z-"]').first();
  const isModalVisible = await modal.isVisible().catch(() => false);
  console.log('Modal visible:', isModalVisible);

  // Find and fill the name input (required field)
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameInput.fill('Test User');
    console.log('Filled name input');
  } else {
    // Try finding any visible text input
    const inputs = page.locator('input[type="text"], input:not([type])');
    const inputCount = await inputs.count();
    console.log(`Found ${inputCount} text inputs`);

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const placeholder = await input.getAttribute('placeholder');
        const name = await input.getAttribute('name');
        console.log(`Input ${i}: name="${name}", placeholder="${placeholder}"`);

        if (name === 'name' || placeholder?.toLowerCase().includes('name')) {
          await input.fill('Test User');
          console.log('Filled name input');
          break;
        }
      }
    }
  }

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/03-after-name.png' });

  // Find and fill email (required field)
  const emailInput = page.locator('input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill('testuser@example.com');
    console.log('Filled email input');
  }

  // Find and fill password (required field)
  const passwordInput = page.locator('input[name="password"]').first();
  if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await passwordInput.fill('test123');
    console.log('Filled password input');
  }

  // Find and fill agencyCoreCompetency (required field)
  const competencyInput = page.locator('input[name="agencyCoreCompetency"], textarea[name="agencyCoreCompetency"]').first();
  if (await competencyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await competencyInput.fill('Digital Marketing');
    console.log('Filled agencyCoreCompetency');
  } else {
    // Look for any input/textarea that might be the competency field
    const allInputs = page.locator('input, textarea');
    const allCount = await allInputs.count();
    for (let i = 0; i < allCount; i++) {
      const el = allInputs.nth(i);
      if (await el.isVisible()) {
        const name = await el.getAttribute('name');
        const placeholder = await el.getAttribute('placeholder');
        if (name === 'agencyCoreCompetency' || placeholder?.toLowerCase().includes('competency') || placeholder?.toLowerCase().includes('core')) {
          await el.fill('Digital Marketing');
          console.log('Filled competency field');
          break;
        }
      }
    }
  }

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/04-after-competency.png' });

  // Find and click FINISH SETUP button
  const finishSetupButton = page.locator('button:has-text("FINISH SETUP")');
  if (await finishSetupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found FINISH SETUP button, clicking...');
    await finishSetupButton.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('FINISH SETUP button not found, listing all buttons...');
    const buttons = page.locator('button');
    const btnCount = await buttons.count();
    console.log(`Found ${btnCount} buttons`);
    for (let i = 0; i < btnCount; i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const text = await btn.textContent();
        console.log(`Button ${i}: "${text}"`);
      }
    }
  }

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/05-after-submit.png' });

  // Wait for dashboard to load
  await page.waitForTimeout(2000);

  console.log('Step 3: After form submission');

  // Check if we're now on the dashboard
  const sidebar = page.locator('aside, [class*="sidebar"]');
  const sidebarVisible = await sidebar.first().isVisible().catch(() => false);
  console.log('Sidebar visible:', sidebarVisible);

  const mainContent = page.locator('main');
  const mainVisible = await mainContent.isVisible().catch(() => false);
  console.log('Main content visible:', mainVisible);

  // Get current page content
  const bodyContent = await page.locator('body').textContent();
  console.log('Page text includes "Dashboard":', bodyContent?.includes('Dashboard'));
  console.log('Page text includes "Systems":', bodyContent?.includes('Systems'));
  console.log('Page text includes "Leads":', bodyContent?.includes('Leads'));

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/06-final-state.png', fullPage: true });

  // If sidebar is visible, test navigation
  if (sidebarVisible) {
    const navItems = ['Dashboard', 'Leads', 'Clients', 'Campaigns', 'AI Tools', 'Media', 'Team', 'Reports', 'Integrations', 'Settings'];

    for (const item of navItems) {
      const navLink = page.locator(`aside button:has-text("${item}"), aside a:has-text("${item}"), [class*="sidebar"] button:has-text("${item}")`).first();
      if (await navLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        await navLink.click();
        await page.waitForTimeout(500);
        console.log(`Navigated to: ${item}`);
        await page.screenshot({ path: `/root/recipe-labs-new-app/test-results/nav-${item.toLowerCase().replace(' ', '-')}.png` });

        // Check for errors
        const errorIndicator = page.locator('text=/error|undefined|cannot read/i');
        if (await errorIndicator.isVisible({ timeout: 500 }).catch(() => false)) {
          console.error(`ERROR on ${item} page!`);
        }
      } else {
        console.log(`Nav item not visible: ${item}`);
      }
    }
  }

  // Log all console errors
  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    errors.forEach(e => console.log(e));
  }

  // Log key console messages
  const importantLogs = logs.filter(l => l.includes('error') || l.includes('Error') || l.includes('failed') || l.includes('undefined'));
  if (importantLogs.length > 0) {
    console.log('\n=== IMPORTANT LOGS ===');
    importantLogs.forEach(l => console.log(l));
  }
});
