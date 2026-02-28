import nodemailer from 'nodemailer';

// Display name shown in recipient's inbox (e.g. "Craftly" instead of raw email)
const CRAFTLY_SENDER = `"Craftly" <${process.env.GMAIL_USER}>`;

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
    from: CRAFTLY_SENDER,
    to: email,
    subject: 'Reset your Craftly password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #D97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">Craftly</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 13px;">Handcrafted goods from Dagupan</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1a1a1a;">Password Reset Request</h2>
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
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 3px solid #D97706;">
          <p style="margin: 0;">&copy; 2026 Craftly &mdash; Dagupan, Pangasinan, Philippines</p><p style="margin: 4px 0 0 0;">You received this because you have an account on Craftly.</p>
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
    from: CRAFTLY_SENDER,
    to: email,
    subject: 'Your Craftly password reset code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #D97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">Craftly</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 13px;">Handcrafted goods from Dagupan</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1a1a1a;">Password Reset Code</h2>
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
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 3px solid #D97706;">
          <p style="margin: 0;">&copy; 2026 Craftly &mdash; Dagupan, Pangasinan, Philippines</p><p style="margin: 4px 0 0 0;">You received this because you have an account on Craftly.</p>
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
    from: CRAFTLY_SENDER,
    to: email,
    subject: 'Two-factor authentication enabled on your Craftly account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #D97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">Craftly</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 13px;">Handcrafted goods from Dagupan</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1a1a1a;">Two-Factor Authentication Enabled</h2>
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
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 3px solid #D97706;">
          <p style="margin: 0;">&copy; 2026 Craftly &mdash; Dagupan, Pangasinan, Philippines</p><p style="margin: 4px 0 0 0;">You received this because you have an account on Craftly.</p>
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
 * Send email verification code
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit verification code
 */
export const sendEmailVerificationCode = async (email, code) => {
  const mailOptions = {
    from: CRAFTLY_SENDER,
    to: email,
    subject: 'Verify your Craftly email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #D97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">Craftly</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 13px;">Handcrafted goods from Dagupan</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1a1a1a;">Verify Your Email</h2>
          <p>Thank you for registering with Craftly. Enter this code to complete your account setup:</p>

          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center;">
            <p style="color: #1976d2; margin: 0; font-size: 12px;">Your verification code (expires in 2 minutes):</p>
            <p style="color: #1565c0; margin: 10px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">${code}</p>
          </div>

          <p style="color: #666;">This code is valid for 2 minutes. If you didn't register, you can safely ignore this email.</p>
        </div>
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 3px solid #D97706;">
          <p style="margin: 0;">&copy; 2026 Craftly &mdash; Dagupan, Pangasinan, Philippines</p><p style="margin: 4px 0 0 0;">You received this because you have an account on Craftly.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email verification code sent to', email);
    return { success: true, message: 'Verification code sent', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending verification code:', error);
    throw new Error(`Failed to send verification code: ${error.message}`);
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
    from: CRAFTLY_SENDER,
    to: email,
    subject: 'Your Craftly backup codes',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #D97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">Craftly</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 13px;">Handcrafted goods from Dagupan</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1a1a1a;">Your Backup Codes</h2>
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
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 3px solid #D97706;">
          <p style="margin: 0;">&copy; 2026 Craftly &mdash; Dagupan, Pangasinan, Philippines</p><p style="margin: 4px 0 0 0;">You received this because you have an account on Craftly.</p>
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

/**
 * Send seller application approval email
 * @param {string} email - Recipient email
 * @param {string} shopName - Seller's shop name
 */
export const sendSellerApprovalEmail = async (email, shopName) => {
  const dashboardLink = `${process.env.FRONTEND_URL}/dashboard`;

  const mailOptions = {
    from: CRAFTLY_SENDER,
    to: email,
    subject: `Your shop "${shopName}" is approved — welcome to Craftly!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #D97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">Craftly</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 13px;">Handcrafted goods from Dagupan</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #2e7d32;">Congratulations!</h2>
          <p>Great news! Your seller application for <strong>"${shopName}"</strong> has been approved. Your shop is now live!</p>

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #2e7d32; margin-top: 0;">📊 Platform Commission: 5%</h3>
            <p style="color: #333; margin: 10px 0;">We charge <strong>5%</strong> commission on all your sales as a platform fee.</p>
            <p style="color: #666; font-size: 13px; margin: 0;">Example: Sale ₱10,000 → You earn ₱9,500 (5% = ₱500 goes to platform)</p>
          </div>

          <h3 style="color: #333;">🚀 Get Started:</h3>
          <p>
            <a href="${dashboardLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Go to Your Dashboard
            </a>
          </p>
          <ul style="color: #666;">
            <li>Upload your products</li>
            <li>Set product prices and descriptions</li>
            <li>Start receiving orders from customers</li>
          </ul>

          <p style="color: #666;">Questions? Feel free to reply to this email or visit our help center.</p>

          <p style="color: #999; font-size: 12px; margin-top: 20px;">Thank you for joining the Craftly community!</p>
        </div>
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 3px solid #D97706;">
          <p style="margin: 0;">&copy; 2026 Craftly &mdash; Dagupan, Pangasinan, Philippines</p><p style="margin: 4px 0 0 0;">You received this because you have an account on Craftly.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Seller approval email sent to', email);
    return { success: true, message: 'Approval email sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending seller approval email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send seller application rejection email
 * @param {string} email - Recipient email
 * @param {string} shopName - Seller's shop name
 * @param {string} rejectionReason - Reason for rejection
 */
export const sendSellerRejectionEmail = async (email, shopName, rejectionReason) => {
  const reapplyLink = `${process.env.FRONTEND_URL}/profile`;

  const mailOptions = {
    from: CRAFTLY_SENDER,
    to: email,
    subject: `Update on your Craftly seller application`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #D97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Georgia, serif; letter-spacing: 1px;">Craftly</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 13px;">Handcrafted goods from Dagupan</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1a1a1a;">Application Update</h2>
          <p>Thank you for applying to become a seller on Craftly.</p>

          <div style="background-color: #fff3e0; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #f57f17; margin: 0; font-weight: bold;">❌ Unfortunately, your application was not approved at this time.</p>
          </div>

          <h3 style="color: #333;">Feedback:</h3>
          <p style="background-color: #f5f5f5; padding: 12px; border-left: 4px solid #ff9800; color: #333;">
            ${rejectionReason || 'Please review your application and try again.'}
          </p>

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #1976d2; margin-top: 0;">💡 Platform Commission: 5%</h3>
            <p style="color: #333; margin: 0;">Just so you know—once approved, sellers pay <strong>5%</strong> commission on all sales.</p>
          </div>

          <h3 style="color: #333;">Try Again:</h3>
          <p>We encourage you to submit another application with updated information. You can reapply anytime from your profile.</p>
          <p>
            <a href="${reapplyLink}" style="background-color: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Go to Profile & Reapply
            </a>
          </p>

          <p style="color: #666;">If you have questions about the feedback, feel free to contact us.</p>

          <p style="color: #999; font-size: 12px; margin-top: 20px;">We hope to see you back soon!</p>
        </div>
        <div style="background-color: #1a1a1a; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 3px solid #D97706;">
          <p style="margin: 0;">&copy; 2026 Craftly &mdash; Dagupan, Pangasinan, Philippines</p><p style="margin: 4px 0 0 0;">You received this because you have an account on Craftly.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Seller rejection email sent to', email);
    return { success: true, message: 'Rejection email sent successfully', messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending seller rejection email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export default transporter;
