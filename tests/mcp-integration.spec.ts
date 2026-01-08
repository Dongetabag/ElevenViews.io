import { test, expect } from '@playwright/test';

const BASE_URL = 'http://72.61.72.94:3003';

test('AI Tools - Executive Assistant with MCP', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Go to app
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Login flow - Click CREATE ACCOUNT
  const initButton = page.locator('button:has-text("CREATE ACCOUNT")');
  await expect(initButton).toBeVisible({ timeout: 10000 });
  await initButton.click();
  await page.waitForTimeout(1000);

  // Fill intake form
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameInput.fill('Executive User');
  }

  // Fill email
  const emailInput = page.locator('input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill('executive@example.com');
  }

  // Fill password
  const passwordInput = page.locator('input[name="password"]').first();
  if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await passwordInput.fill('test123');
  }

  const competencyInput = page.locator('input[name="agencyCoreCompetency"], textarea[name="agencyCoreCompetency"]').first();
  if (await competencyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await competencyInput.fill('Strategic Marketing');
  }

  // Click FINISH SETUP
  const finishButton = page.locator('button:has-text("FINISH SETUP")');
  if (await finishButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await finishButton.click();
    await page.waitForTimeout(3000);
  }

  console.log('Dashboard loaded');
  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/exec-01-dashboard.png' });

  // Navigate to AI Tools
  const aiToolsNav = page.locator('button:has-text("AI Tools"), aside button:has-text("AI Tools")').first();
  if (await aiToolsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await aiToolsNav.click();
    await page.waitForTimeout(2000);
    console.log('Navigated to AI Tools');
  }

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/exec-02-ai-tools.png' });

  // Check for Executive Assistant
  const execAssistant = page.locator('text=Executive Assistant').first();
  const execAssistantVisible = await execAssistant.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Executive Assistant visible:', execAssistantVisible);

  // Check for "25 Years at Recipe Labs"
  const yearsText = page.locator('text=25 Years at Recipe Labs').first();
  const yearsVisible = await yearsText.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('25 Years text visible:', yearsVisible);

  // Check for Quick Start templates
  const quickStart = page.locator('text=Quick Start').first();
  const quickStartVisible = await quickStart.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Quick Start visible:', quickStartVisible);

  // Check for Recipe Labs Systems (MCP)
  const systemsPanel = page.locator('text=Recipe Labs Systems').first();
  const systemsVisible = await systemsPanel.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Recipe Labs Systems visible:', systemsVisible);

  // Check for "How can I help you today?"
  const helpText = page.locator('text=How can I help you today').first();
  const helpVisible = await helpText.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Help prompt visible:', helpVisible);

  // Check for suggestion buttons
  const pitchButton = page.locator('button:has-text("Prepare a pitch")').first();
  const pitchVisible = await pitchButton.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Pitch button visible:', pitchVisible);

  await page.screenshot({ path: '/root/recipe-labs-new-app/test-results/exec-03-final.png', fullPage: true });

  // Log MCP connection
  const mcpLogs = logs.filter(l => l.toLowerCase().includes('mcp'));
  if (mcpLogs.length > 0) {
    console.log('\n=== MCP LOGS ===');
    mcpLogs.forEach(l => console.log(l));
  }

  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log(e));
  }

  // Verify Executive Assistant UI is present
  expect(execAssistantVisible).toBe(true);
});
