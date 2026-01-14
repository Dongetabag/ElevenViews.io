import { chromium, devices } from 'playwright';

async function testFunctionality() {
  const browser = await chromium.launch({ headless: true });

  // Test desktop
  console.log('=== Testing Desktop ===');
  const desktopContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const desktopPage = await desktopContext.newPage();

  await desktopPage.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);

  // Take desktop landing screenshot
  await desktopPage.screenshot({
    path: '/root/eleven-views-platform/screenshots/test-desktop-landing.png',
    fullPage: true
  });

  // Check if buttons exist and are clickable
  const joinButton = await desktopPage.$('button:has-text("Join the Views")');
  const loginButton = await desktopPage.$('button:has-text("Crew Login")');

  console.log('Join button exists:', !!joinButton);
  console.log('Login button exists:', !!loginButton);

  // Test clicking login button
  if (loginButton) {
    await loginButton.click();
    await desktopPage.waitForTimeout(1000);

    // Check if login modal appeared
    const loginModal = await desktopPage.$('text=Sign in to your account');
    console.log('Login modal appeared:', !!loginModal);

    await desktopPage.screenshot({
      path: '/root/eleven-views-platform/screenshots/test-desktop-login-modal.png',
    });

    // Close modal
    const closeButton = await desktopPage.$('[class*="absolute top-4 right-4"]');
    if (closeButton) await closeButton.click();
    await desktopPage.waitForTimeout(500);
  }

  // Test clicking register button
  if (joinButton) {
    await joinButton.click();
    await desktopPage.waitForTimeout(1000);

    // Check if intake modal appeared
    const intakeModal = await desktopPage.$('text=Member Application');
    console.log('Intake modal appeared:', !!intakeModal);

    await desktopPage.screenshot({
      path: '/root/eleven-views-platform/screenshots/test-desktop-intake-modal.png',
    });
  }

  await desktopContext.close();

  // Test mobile
  console.log('\n=== Testing Mobile (iPhone 14) ===');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 14'],
  });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);

  // Take mobile landing screenshot
  await mobilePage.screenshot({
    path: '/root/eleven-views-platform/screenshots/test-mobile-landing.png',
    fullPage: true
  });

  // Check buttons on mobile
  const mobileJoinButton = await mobilePage.$('button:has-text("Join the Views")');
  const mobileLoginButton = await mobilePage.$('button:has-text("Crew Login")');

  console.log('Mobile Join button exists:', !!mobileJoinButton);
  console.log('Mobile Login button exists:', !!mobileLoginButton);

  // Test mobile login
  if (mobileLoginButton) {
    await mobileLoginButton.click();
    await mobilePage.waitForTimeout(1000);

    const mobileLoginModal = await mobilePage.$('text=Sign in');
    console.log('Mobile login modal appeared:', !!mobileLoginModal);

    await mobilePage.screenshot({
      path: '/root/eleven-views-platform/screenshots/test-mobile-login-modal.png',
    });
  }

  await mobileContext.close();

  // Test live site
  console.log('\n=== Testing Live Site ===');
  const liveContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const livePage = await liveContext.newPage();

  try {
    await livePage.goto('https://elevenviews.io/portal/', { waitUntil: 'networkidle', timeout: 30000 });
    await livePage.waitForTimeout(3000);

    await livePage.screenshot({
      path: '/root/eleven-views-platform/screenshots/test-live-landing.png',
      fullPage: true
    });

    const liveJoinButton = await livePage.$('button:has-text("Join the Views")');
    const liveLoginButton = await livePage.$('button:has-text("Crew Login")');

    console.log('Live Join button exists:', !!liveJoinButton);
    console.log('Live Login button exists:', !!liveLoginButton);

    if (liveLoginButton) {
      await liveLoginButton.click();
      await livePage.waitForTimeout(1500);

      await livePage.screenshot({
        path: '/root/eleven-views-platform/screenshots/test-live-login-modal.png',
      });
    }
  } catch (e) {
    console.log('Live site test error:', e);
  }

  await browser.close();
  console.log('\nScreenshots saved to /root/eleven-views-platform/screenshots/');
}

testFunctionality().catch(console.error);
