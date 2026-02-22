import nodemailer from 'nodemailer';

// Create transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use Gmail App Password (not your regular password)
  },
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email service verification failed:', error);
  } else {
    console.log('✅ Email service ready');
  }
});

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Full reset link URL
 */
export const sendPasswordResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Craftly - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333;">Craftly</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>We received a request to reset your password. Click the link below to proceed:</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">Or copy this link: <br/><code style="background-color: #f0f0f0; padding: 5px; word-break: break-all;">${resetLink}</code></p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">This link expires in 24 hours.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; 2024 Craftly. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to', email);
    return { success: true, message: 'Email sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send password reset code via email
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit reset code
 */
export const sendPasswordResetCode = async (email, code) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Craftly - Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333;">Craftly</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #333;">Password Reset Code</h2>
          <p>We received a request to reset your password. Use this code to proceed:</p>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center;">
            <p style="color: #1976d2; margin: 0; font-size: 12px;">Your reset code (expires in 15 minutes):</p>
            <p style="color: #1565c0; margin: 10px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">${code}</p>
          </div>

          <p style="color: #666;">Enter this code in the password reset form to continue.</p>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #e65100; margin: 0; font-size: 12px;">⚠️ Security Note:</p>
            <p style="color: #bf360c; margin: 5px 0 0 0; font-size: 12px;">Never share this code with anyone. We will never ask for it.</p>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email and your account is safe.</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; 2024 Craftly. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset code email sent to', email);
    return { success: true, message: 'Email sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset code email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send TOTP setup confirmation email
 * @param {string} email - Recipient email
 * @param {string} appName - App name
 */
export const sendTotpSetupEmail = async (email, appName = 'Craftly') => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Craftly - Two-Factor Authentication Enabled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333;">Craftly</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #333;">Two-Factor Authentication Enabled</h2>
          <p>Your two-factor authentication has been successfully set up. You'll now need to enter a code from your authenticator app when signing in.</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #2e7d32; margin-top: 0;">✓ Security Improved</h3>
            <p style="color: #2e7d32;">Your account is now more secure with two-factor authentication.</p>
          </div>

          <h3 style="color: #333;">What to do next:</h3>
          <ul style="color: #666;">
            <li>Keep your authenticator app safe and secure</li>
            <li>Save your backup codes in a secure location</li>
            <li>Never share your codes with anyone</li>
          </ul>

          <p style="color: #999; font-size: 12px; margin-top: 20px;">For security questions, visit your account settings.</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; 2024 Craftly. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ TOTP setup confirmation email sent to', email);
    return { success: true, message: 'Email sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending TOTP setup email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send backup codes email
 * @param {string} email - Recipient email
 * @param {array} backupCodes - Array of backup codes
 */
export const sendBackupCodesEmail = async (email, backupCodes) => {
  const codesHTML = backupCodes
    .map((code, idx) => `<div style="padding: 5px 10px; margin: 5px 0; background-color: #f0f0f0; font-family: monospace;">${idx + 1}. ${code}</div>`)
    .join('');

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Craftly - Backup Codes for Two-Factor Authentication',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333;">Craftly</h1>
        </div>
        <div style="padding: 20px;">
          <h2 style="color: #333;">Your Backup Codes</h2>
          <p style="color: #d32f2f; font-weight: bold;">⚠️ Important: Keep these codes safe and private</p>
          
          <p>Each code can be used once if you lose access to your authenticator app. Save them in a secure location.</p>
          
          <div style="margin: 20px 0; border: 2px solid #ffc107; padding: 15px; background-color: #fffde7; border-radius: 4px;">
            <p style="color: #f57f17; margin: 0 0 10px 0; font-weight: bold;">Your Backup Codes:</p>
            ${codesHTML}
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            If you didn't request this email, your account may have been compromised. Please secure your account immediately.
          </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; 2024 Craftly. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Backup codes email sent to', email);
    return { success: true, message: 'Email sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending backup codes email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export default transporter;
