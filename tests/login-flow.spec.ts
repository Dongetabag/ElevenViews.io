import { test, expect } from '@playwright/test';

const BASE_URL = 'http://72.61.72.94:3003';

test('Complete login flow - register, logout, login', async ({ page }) => {
  const timestamp = Date.now();
  const testPassword = 'testpass123';
  const testName = `Test User ${timestamp}`;
  const testEmail = `testuser${timestamp}@example.com`;

  console.log('=== STEP 1: Create new account ===');

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Click CREATE ACCOUNT
  const createBtn = page.locator('button:has-text("CREATE ACCOUNT")');
  await expect(createBtn).toBeVisible({ timeout: 10000 });
  await createBtn.click();
  await page.waitForTimeout(1000);

  console.log('Opened registration modal');

  // Fill registration form
  await page.locator('input[name="name"]').fill(testName);
  console.log('Filled name:', testName);

  await page.locator('input[name="email"]').fill(testEmail);
  console.log('Filled email:', testEmail);

  await page.locator('input[name="password"]').fill(testPassword);
  console.log('Filled password');

  await page.locator('input[name="agencyCoreCompetency"]').fill('Test Agency');
  console.log('Filled agency specialty');

  // Submit
  const finishBtn = page.locator('button:has-text("FINISH SETUP")');
  await expect(finishBtn).toBeVisible();
  await finishBtn.click();
  await page.waitForTimeout(3000);

  console.log('Submitted registration');

  // Verify we're on dashboard
  const sidebar = page.locator('aside').first();
  await expect(sidebar).toBeVisible({ timeout: 10000 });
  console.log('Dashboard loaded - registration successful!');

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/login-01-registered.png' });

  console.log('Using email:', testEmail);

  console.log('\n=== STEP 2: Logout ===');

  // Find and click logout button - it's at the bottom of sidebar
  const logoutBtn = page.locator('aside button:has-text("Logout"), aside button:has-text("Log Out")').first();
  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutBtn.click();
    await page.waitForTimeout(2000);
    console.log('Clicked logout');
  } else {
    // Try the last button in sidebar (usually logout)
    const allSidebarButtons = page.locator('aside button');
    const count = await allSidebarButtons.count();
    console.log('Found', count, 'sidebar buttons');

    // Click the last one which is typically logout
    if (count > 0) {
      const lastBtn = allSidebarButtons.nth(count - 1);
      const btnText = await lastBtn.textContent();
      console.log('Last button text:', btnText);
      await lastBtn.click();
      await page.waitForTimeout(2000);
    }
  }

  // Verify we're back on landing page
  const signInBtn = page.locator('button:has-text("SIGN IN")');
  await expect(signInBtn).toBeVisible({ timeout: 10000 });
  console.log('Back on landing page - logout successful!');

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/login-02-logged-out.png' });

  console.log('\n=== STEP 3: Login with existing account ===');

  // Click SIGN IN
  await signInBtn.click();
  await page.waitForTimeout(1000);
  console.log('Opened login modal');

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/login-03-login-modal.png' });

  // Fill login form
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await emailInput.fill(testEmail);
  console.log('Filled email:', testEmail);

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(testPassword);
  console.log('Filled password');

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/login-04-filled-form.png' });

  // Submit login - find the button inside the modal
  const loginModal = page.locator('[class*="fixed"]').filter({ hasText: 'Sign In' });
  const loginSubmitBtn = loginModal.locator('button:has-text("SIGN IN")');
  await loginSubmitBtn.click();
  await page.waitForTimeout(3000);

  console.log('Submitted login');

  // Verify we're on dashboard again
  await expect(sidebar).toBeVisible({ timeout: 10000 });
  console.log('Dashboard loaded - login successful!');

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/login-05-logged-in.png' });

  console.log('\n=== TEST PASSED: Full login flow works! ===');
});
