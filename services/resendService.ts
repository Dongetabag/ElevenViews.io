// Resend Email Service for Eleven Views Platform
// Handles email confirmations and password reset emails

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const APP_URL = import.meta.env.VITE_APP_URL || 'https://elevenviews.io';
const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Send email via Resend API
const sendEmail = async ({ to, subject, html, from }: SendEmailParams): Promise<EmailResponse> => {
  if (!RESEND_API_KEY) {
    console.error('Resend API key not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'Eleven Views <noreply@elevenviews.io>',
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    return { success: true, messageId: data.id };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: 'Failed to send email' };
  }
};

// Email template for welcome/confirmation
const getWelcomeEmailTemplate = (userName: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #12121a 0%, #1a1a2e 100%); border-radius: 24px; border: 1px solid rgba(212, 175, 55, 0.2); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #d4af37 0%, #f5d77a 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px;">✓</span>
              </div>
              <h1 style="color: #d4af37; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: 2px;">WELCOME TO ELEVEN VIEWS</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 20px; line-height: 1.6;">
                Hi ${userName},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; margin: 0 0 30px; line-height: 1.6;">
                Your account has been successfully created. Welcome to the Eleven Views platform - your hub for creative excellence and marketing innovation.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f5d77a 100%); color: #000000; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 40px; border-radius: 12px; letter-spacing: 1px;">
                      ACCESS YOUR DASHBOARD
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="color: #666666; font-size: 12px; margin: 0; text-align: center;">
                © 2025 Eleven Views. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

// Email template for password reset with link
const getPasswordResetLinkEmailTemplate = (userName: string, resetLink: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #12121a 0%, #1a1a2e 100%); border-radius: 24px; border: 1px solid rgba(212, 175, 55, 0.2); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #d4af37 0%, #f5d77a 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px;">🔑</span>
              </div>
              <h1 style="color: #d4af37; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: 2px;">PASSWORD RESET</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 20px; line-height: 1.6;">
                Hi ${userName},
              </p>
              <p style="color: #a0a0a0; font-size: 16px; margin: 0 0 30px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f5d77a 100%); color: #000000; font-size: 14px; font-weight: 700; text-decoration: none; padding: 18px 48px; border-radius: 12px; letter-spacing: 1px;">
                      RESET MY PASSWORD
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #666666; font-size: 14px; margin: 30px 0 0; line-height: 1.6; text-align: center;">
                This link expires in <strong style="color: #d4af37;">1 hour</strong>.<br>
                If you didn't request this reset, you can safely ignore this email.
              </p>
              <p style="color: #444444; font-size: 12px; margin: 20px 0 0; line-height: 1.6; text-align: center; word-break: break-all;">
                Or copy this link: ${resetLink}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="color: #666666; font-size: 12px; margin: 0; text-align: center;">
                © 2025 Eleven Views. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

// Send welcome/confirmation email
export const sendWelcomeEmail = async (email: string, userName: string): Promise<EmailResponse> => {
  const html = getWelcomeEmailTemplate(userName);
  return sendEmail({
    to: email,
    subject: 'Welcome to Eleven Views!',
    html,
    from: 'Eleven Views <welcome@elevenviews.io>',
  });
};

// Request password reset - gets token from MCP and sends email with link
export const sendPasswordResetEmail = async (
  email: string,
  userName: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> => {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
  const html = getPasswordResetLinkEmailTemplate(userName || 'User', resetLink);

  const result = await sendEmail({
    to: email,
    subject: 'Reset Your Eleven Views Password',
    html,
    from: 'Eleven Views <security@elevenviews.io>',
  });

  return { success: result.success, error: result.error };
};

export default {
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
