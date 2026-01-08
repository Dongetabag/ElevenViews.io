import { test, expect } from '@playwright/test';

const BASE_URL = 'http://72.61.72.94:3003';

test.describe('Recipe Labs Navigation Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Go to the app
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Landing page loads correctly', async ({ page }) => {
    // Check landing page elements
    await expect(page.locator('text=RECIPELABS')).toBeVisible({ timeout: 10000 });
    console.log('Landing page loaded successfully');
  });

  test('Login flow and dashboard access', async ({ page }) => {
    // Click login/initialize button
    const loginButton = page.locator('button:has-text("CREATE ACCOUNT"), button:has-text("INITIALIZE LAB"), button:has-text("Enter"), button:has-text("Get Started")');

    if (await loginButton.isVisible()) {
      await loginButton.first().click();
      await page.waitForTimeout(1000);
      console.log('Login button clicked');
    }

    // Check if intake modal or dashboard appears
    const intakeModal = page.locator('[class*="modal"], [class*="Modal"]');
    const dashboard = page.locator('text=Systems Overview, text=Dashboard');

    if (await intakeModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Intake modal appeared');

      // Fill intake form if present
      const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]');
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Test User');
      }

      // Look for submit button
      const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Continue"), button:has-text("Start")');
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('Test all sidebar navigation items', async ({ page }) => {
    // First login
    const loginButton = page.locator('button:has-text("CREATE ACCOUNT")');
    if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForTimeout(500);

      // Quick fill intake if shown - name
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Test User');
      }

      // Fill email
      const emailInput = page.locator('input[name="email"]').first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('navtest@example.com');
      }

      // Fill password
      const passwordInput = page.locator('input[name="password"]').first();
      if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await passwordInput.fill('test123');
      }

      // Fill competency
      const competencyInput = page.locator('input[name="agencyCoreCompetency"]').first();
      if (await competencyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await competencyInput.fill('Marketing');
      }

      // Find and click FINISH SETUP
      const finishButton = page.locator('button:has-text("FINISH SETUP")');
      if (await finishButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await finishButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Wait for dashboard
    await page.waitForTimeout(2000);

    // Test sidebar navigation
    const navItems = [
      { name: 'dashboard', selector: 'text=Dashboard, [data-module="dashboard"]' },
      { name: 'leads', selector: 'text=Leads, [data-module="leads"]' },
      { name: 'clients', selector: 'text=Clients, [data-module="clients"]' },
      { name: 'campaigns', selector: 'text=Campaigns, [data-module="campaigns"]' },
      { name: 'ai-tools', selector: 'text=AI Tools, [data-module="ai-tools"]' },
      { name: 'media', selector: 'text=Media, [data-module="media"]' },
      { name: 'team', selector: 'text=Team, [data-module="team"]' },
      { name: 'reports', selector: 'text=Reports, [data-module="reports"]' },
      { name: 'integrations', selector: 'text=Integrations, [data-module="integrations"]' },
      { name: 'settings', selector: 'text=Settings, [data-module="settings"]' },
    ];

    for (const item of navItems) {
      const navLink = page.locator(`button:has-text("${item.name}"), a:has-text("${item.name}"), [class*="sidebar"] >> text=${item.name}`).first();
      if (await navLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`Testing navigation to: ${item.name}`);
        await navLink.click();
        await page.waitForTimeout(1000);

        // Check for errors
        const errorText = page.locator('text=Error, text=undefined, text=Cannot read');
        if (await errorText.isVisible({ timeout: 500 }).catch(() => false)) {
          console.error(`ERROR on page: ${item.name}`);
        } else {
          console.log(`${item.name} page loaded OK`);
        }
      } else {
        console.log(`Nav item not found: ${item.name}`);
      }
    }
  });
});

test('Debug: Capture page state and errors', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Listen for console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Click CREATE ACCOUNT
  const loginButton = page.locator('button:has-text("CREATE ACCOUNT")');
  if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await loginButton.click();
    await page.waitForTimeout(3000);
  }

  // Take screenshot
  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/debug-screenshot.png', fullPage: true });

  // Log page content
  const content = await page.content();
  console.log('Page HTML length:', content.length);

  // Log errors
  if (errors.length > 0) {
    console.log('Console errors:', errors);
  }

  // Check for visible elements
  const sidebar = page.locator('[class*="sidebar"], aside');
  console.log('Sidebar visible:', await sidebar.isVisible().catch(() => false));

  const mainContent = page.locator('main, [class*="main"]');
  console.log('Main content visible:', await mainContent.isVisible().catch(() => false));
});
