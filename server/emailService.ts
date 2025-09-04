import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface ForgotPasswordEmailParams {
  to: string;
  firstName: string;
  loginLink: string;
}

export async function sendForgotPasswordEmail(params: ForgotPasswordEmailParams): Promise<boolean> {
  const { to, firstName, loginLink } = params;
  
  const emailContent = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'support@danonano.com',
        name: process.env.SENDGRID_FROM_NAME || 'ForeScore Support'
      },
      subject: 'Reset Your ForeScore Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your ForeScore Password</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #059669;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
              border: 1px solid #e5e7eb;
            }
            .reset-button {
              background-color: #dc2626;
              color: #ffffff !important;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              display: inline-block;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏌️ ForeScore</h1>
            <p>Password Reset Request</p>
          </div>
          
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            
            <p>We received a request to reset your ForeScore password. Click the button below to securely reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${loginLink}" class="reset-button" style="background-color:#dc2626;color:#ffffff !important;text-decoration:none !important;display:inline-block;padding:12px 24px;border-radius:6px;font-weight:bold;">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              This link will expire in 30 minutes for your security. If you don't reset your password within this time, you'll need to request a new reset link.
            </div>
            
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p>For security reasons, this link can only be used once. After you reset your password, this link will no longer work.</p>
          </div>
          
          <div class="footer">
            <p><strong>Need help?</strong> Contact our support team at support@danonano.com</p>
            <p>If this link doesn't work, you can copy and paste this URL into your browser: ${loginLink}</p>
            <p>This email was sent from ForeScore, owned and operated by danoNano, LLC.</p>
            <p><small>Please do not reply to this automated email.</small></p>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${firstName}!

We received a request to reset your ForeScore password. Click the link below to securely reset your password:

${loginLink}

This link will expire in 30 minutes for your security.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

For security reasons, this link can only be used once.

Need help? Contact our support team at support@danonano.com

This email was sent from ForeScore, owned and operated by danoNano, LLC.
      `
    };

  try {
    await mailService.send(emailContent);
    console.log(`Password reset email sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid send error', {
      message: error?.message,
      code: error?.code,
      statusCode: error?.response?.statusCode,
      body: error?.response?.body ? JSON.stringify(error.response.body, null, 2) : undefined,
      headers: error?.response?.headers,
      context: {
        from: emailContent.from?.email,
        to: emailContent.to,
        subject: emailContent.subject,
      },
    });
    return false;
  }
}