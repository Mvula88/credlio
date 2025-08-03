// Email Templates for all Credlio emails
// These templates are used with Resend API for custom emails

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
  .header h1 { margin: 0; font-size: 28px; }
  .content { background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .button { display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
  .button:hover { opacity: 0.9; }
  .alert-box { background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0; }
  .success-box { background-color: #D1FAE5; border: 1px solid #10B981; padding: 15px; border-radius: 8px; margin: 20px 0; }
  .info-box { background-color: #E0E7FF; border: 1px solid #6366F1; padding: 15px; border-radius: 8px; margin: 20px 0; }
  .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; text-align: center; }
  .receipt-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  .receipt-table th { background-color: #f3f4f6; padding: 10px; text-align: left; }
  .receipt-table td { padding: 10px; border-bottom: 1px solid #e5e5e5; }
  .code-box { background: #f3f4f6; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 24px; text-align: center; letter-spacing: 4px; }
`

// 1. Welcome Email (sent after email confirmation)
export function getWelcomeEmail(username: string, role: 'lender' | 'borrower'): string {
  const roleSpecificContent = role === 'lender' 
    ? `
      <h3>As a Lender, you can:</h3>
      <ul>
        <li>✅ Verify borrower creditworthiness instantly</li>
        <li>📊 Access detailed credit reports and risk assessments</li>
        <li>🔐 Make informed lending decisions with confidence</li>
        <li>📈 Track your lending portfolio performance</li>
      </ul>
    `
    : `
      <h3>As a Borrower, you can:</h3>
      <ul>
        <li>🌟 Build your reputation score over time</li>
        <li>💰 Access loans from verified lenders</li>
        <li>📱 Manage all your loan requests in one place</li>
        <li>🏆 Earn badges for good repayment history</li>
      </ul>
    `

  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Credlio! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hello, ${username}!</h2>
          <p>Your account has been successfully verified and you're all set to start using Credlio.</p>
          
          ${roleSpecificContent}
          
          <div class="success-box">
            <strong>Quick Start Tips:</strong>
            <ul style="margin: 10px 0;">
              <li>Complete your profile for better visibility</li>
              <li>Verify your identity for higher trust scores</li>
              <li>Read our guidelines for safe lending/borrowing</li>
            </ul>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Go to Dashboard</a>
          </p>
          
          <div class="footer">
            <p>Need help? Contact us at support@credlio.com</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// 2. Login Alert Email
export function getLoginAlertEmail(username: string, loginDetails: {
  ip: string,
  location: string,
  device: string,
  time: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Security Alert</h1>
        </div>
        <div class="content">
          <h2>New Login Detected</h2>
          <p>Hello ${username},</p>
          <p>We detected a new login to your Credlio account:</p>
          
          <div class="alert-box">
            <strong>Login Details:</strong>
            <ul style="margin: 10px 0;">
              <li><strong>Time:</strong> ${loginDetails.time}</li>
              <li><strong>Location:</strong> ${loginDetails.location}</li>
              <li><strong>IP Address:</strong> ${loginDetails.ip}</li>
              <li><strong>Device:</strong> ${loginDetails.device}</li>
            </ul>
          </div>
          
          <p><strong>Was this you?</strong></p>
          <p>If you recognize this activity, you can safely ignore this email.</p>
          
          <p><strong>Not you?</strong></p>
          <p>If you don't recognize this activity, please secure your account immediately:</p>
          
          <p style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password" class="button">Change Password</a>
          </p>
          
          <div class="footer">
            <p>This is an automated security alert from Credlio</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// 3. Security Alert Email (password/email changed)
export function getSecurityAlertEmail(username: string, changeType: 'password' | 'email', newValue?: string): string {
  const changeMessage = changeType === 'password' 
    ? 'Your password has been successfully changed.'
    : `Your email has been changed to: <strong>${newValue}</strong>`

  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Account Update</h1>
        </div>
        <div class="content">
          <h2>Your ${changeType} has been changed</h2>
          <p>Hello ${username},</p>
          
          <div class="info-box">
            <p>${changeMessage}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p><strong>Did you make this change?</strong></p>
          <p>If yes, you can safely ignore this email.</p>
          
          <p><strong>Didn't make this change?</strong></p>
          <p>If you didn't make this change, your account may be compromised. Please:</p>
          <ol>
            <li>Reset your password immediately</li>
            <li>Review your recent account activity</li>
            <li>Contact support if you need assistance</li>
          </ol>
          
          <p style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/support" class="button">Contact Support</a>
          </p>
          
          <div class="footer">
            <p>Security notification from Credlio</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// 4. Subscription Receipt Email
export function getSubscriptionReceiptEmail(username: string, receipt: {
  planName: string,
  amount: string,
  date: string,
  invoiceId: string,
  nextBillingDate: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Payment Receipt</h1>
        </div>
        <div class="content">
          <h2>Thank you for your payment!</h2>
          <p>Hello ${username},</p>
          <p>Your subscription payment has been successfully processed.</p>
          
          <table class="receipt-table">
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
            <tr>
              <td>${receipt.planName}</td>
              <td>${receipt.amount}</td>
            </tr>
            <tr>
              <td colspan="2" style="text-align: right; font-weight: bold;">
                Total: ${receipt.amount}
              </td>
            </tr>
          </table>
          
          <div class="info-box">
            <p><strong>Invoice ID:</strong> ${receipt.invoiceId}</p>
            <p><strong>Payment Date:</strong> ${receipt.date}</p>
            <p><strong>Next Billing Date:</strong> ${receipt.nextBillingDate}</p>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/billing" class="button">View Billing History</a>
          </p>
          
          <div class="footer">
            <p>This receipt is for your records</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// 5. Trial Ending Reminder
export function getTrialEndingEmail(username: string, daysLeft: number, planName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Trial Ending Soon</h1>
        </div>
        <div class="content">
          <h2>Your free trial ends in ${daysLeft} days</h2>
          <p>Hello ${username},</p>
          <p>Your free trial of <strong>${planName}</strong> will end in ${daysLeft} days.</p>
          
          <div class="alert-box">
            <p><strong>Don't lose access to premium features!</strong></p>
            <p>Subscribe now to continue enjoying:</p>
            <ul style="margin: 10px 0;">
              <li>Unlimited credit checks</li>
              <li>Advanced risk analytics</li>
              <li>Priority support</li>
              <li>API access</li>
            </ul>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" class="button">Subscribe Now</a>
          </p>
          
          <p style="text-align: center; color: #666;">
            No action needed if you want to continue with the free plan after your trial ends.
          </p>
          
          <div class="footer">
            <p>Questions? Contact support@credlio.com</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// 6. Account Deletion Confirmation
export function getAccountDeletionEmail(username: string, deletionToken: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Account Deletion Request</h1>
        </div>
        <div class="content">
          <h2>Confirm Account Deletion</h2>
          <p>Hello ${username},</p>
          <p>You've requested to delete your Credlio account.</p>
          
          <div class="alert-box">
            <p><strong>Warning:</strong> This action is permanent and cannot be undone.</p>
            <p>Deleting your account will:</p>
            <ul style="margin: 10px 0;">
              <li>Remove all your data permanently</li>
              <li>Cancel any active subscriptions</li>
              <li>Delete your transaction history</li>
              <li>Remove your reputation score and badges</li>
            </ul>
          </div>
          
          <p>If you're sure you want to delete your account, click the button below:</p>
          
          <p style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/delete-confirm?token=${deletionToken}" 
               class="button" style="background: #DC2626;">
              Confirm Deletion
            </a>
          </p>
          
          <p style="text-align: center; color: #666;">
            This link will expire in 24 hours for security reasons.
          </p>
          
          <p>If you didn't request this, please ignore this email and your account will remain active.</p>
          
          <div class="footer">
            <p>We're sorry to see you go</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// 7. Export Ready Notification
export function getExportReadyEmail(username: string, downloadLink: string, expiryDate: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Your Export is Ready</h1>
        </div>
        <div class="content">
          <h2>Your data export is ready for download</h2>
          <p>Hello ${username},</p>
          <p>Your requested data export has been completed and is ready for download.</p>
          
          <div class="success-box">
            <p><strong>Export Details:</strong></p>
            <ul style="margin: 10px 0;">
              <li>Format: CSV/JSON</li>
              <li>Generated: ${new Date().toLocaleString()}</li>
              <li>Expires: ${expiryDate}</li>
            </ul>
          </div>
          
          <p style="text-align: center;">
            <a href="${downloadLink}" class="button">Download Export</a>
          </p>
          
          <p style="text-align: center; color: #666;">
            This link will expire on ${expiryDate}
          </p>
          
          <div class="footer">
            <p>Data export from Credlio</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// 8. Invite User Email (Lender inviting Borrower)
export function getInviteEmail(inviterName: string, inviteLink: string, message?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🤝 You're Invited to Credlio</h1>
        </div>
        <div class="content">
          <h2>${inviterName} has invited you to join Credlio</h2>
          
          ${message ? `
            <div class="info-box">
              <p><strong>Message from ${inviterName}:</strong></p>
              <p>${message}</p>
            </div>
          ` : ''}
          
          <p>Credlio is a trusted platform for secure lending and borrowing with:</p>
          <ul>
            <li>✅ Verified credit checks</li>
            <li>🔐 Secure transactions</li>
            <li>📊 Reputation-based lending</li>
            <li>🌍 Global reach</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="${inviteLink}" class="button">Accept Invitation</a>
          </p>
          
          <p style="text-align: center; color: #666;">
            This invitation link will expire in 7 days
          </p>
          
          <div class="footer">
            <p>Join thousands of users on Credlio</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

// 9. Two-Factor Authentication Code
export function getTwoFactorEmail(username: string, code: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><style>${baseStyles}</style></head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Verification Code</h1>
        </div>
        <div class="content">
          <h2>Your verification code</h2>
          <p>Hello ${username},</p>
          <p>Here's your verification code to complete sign in:</p>
          
          <div class="code-box">
            ${code}
          </div>
          
          <div class="alert-box">
            <p><strong>⚠️ Security Notice:</strong></p>
            <ul style="margin: 10px 0;">
              <li>This code expires in 10 minutes</li>
              <li>Never share this code with anyone</li>
              <li>Credlio staff will never ask for this code</li>
            </ul>
          </div>
          
          <p>If you didn't request this code, please change your password immediately.</p>
          
          <div class="footer">
            <p>Security code from Credlio</p>
            <p>© ${new Date().getFullYear()} Credlio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}