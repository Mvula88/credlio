// Email Service - Centralized email sending functions
// Use these functions throughout the app to send emails

interface EmailResponse {
  success: boolean
  error?: string
}

// Base function to call email API endpoints
async function sendEmailRequest(endpoint: string, data: any): Promise<EmailResponse> {
  try {
    const response = await fetch(`/api/emails/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email')
    }
    
    return { success: true }
  } catch (error: any) {
    console.error(`Email service error (${endpoint}):`, error)
    return { success: false, error: error.message }
  }
}

// 1. Send Welcome Email (after email confirmation)
export async function sendWelcomeEmail(
  email: string, 
  username: string, 
  role: 'lender' | 'borrower'
): Promise<EmailResponse> {
  return sendEmailRequest('welcome', { email, username, role })
}

// 2. Send Login Alert
export async function sendLoginAlert(
  userId: string,
  loginDetails: {
    ip: string
    location: string
    device: string
    time: string
  }
): Promise<EmailResponse> {
  return sendEmailRequest('security-alert', {
    userId,
    alertType: 'login',
    details: loginDetails
  })
}

// 3. Send Security Alert (password/email change)
export async function sendSecurityAlert(
  userId: string,
  changeType: 'password_changed' | 'email_changed',
  newValue?: string
): Promise<EmailResponse> {
  return sendEmailRequest('security-alert', {
    userId,
    alertType: changeType,
    details: { newEmail: newValue }
  })
}

// 4. Send Subscription Receipt
export async function sendSubscriptionReceipt(
  userId: string,
  receipt: {
    planName: string
    amount: string
    date: string
    invoiceId: string
    nextBillingDate: string
  }
): Promise<EmailResponse> {
  return sendEmailRequest('subscription-receipt', { userId, receipt })
}

// 5. Send Trial Ending Reminder
export async function sendTrialEndingReminder(
  email: string,
  username: string,
  daysLeft: number,
  planName: string
): Promise<EmailResponse> {
  return sendEmailRequest('trial-reminder', {
    email,
    username,
    daysLeft,
    planName
  })
}

// 6. Send Account Deletion Confirmation
export async function sendAccountDeletionConfirmation(
  email: string,
  username: string,
  deletionToken: string
): Promise<EmailResponse> {
  return sendEmailRequest('account-deletion', {
    email,
    username,
    deletionToken
  })
}

// 7. Send Export Ready Notification
export async function sendExportReadyNotification(
  email: string,
  username: string,
  downloadLink: string,
  expiryDate: string
): Promise<EmailResponse> {
  return sendEmailRequest('export-ready', {
    email,
    username,
    downloadLink,
    expiryDate
  })
}

// 8. Send Invite Email
export async function sendInviteEmail(
  recipientEmail: string,
  inviterName: string,
  inviteCode: string,
  message?: string
): Promise<EmailResponse> {
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup/borrower?invitation=${inviteCode}&email=${encodeURIComponent(recipientEmail)}`
  
  return sendEmailRequest('invite', {
    email: recipientEmail,
    inviterName,
    inviteLink,
    message
  })
}

// 9. Send Two-Factor Code
export async function sendTwoFactorCode(
  email: string,
  username: string,
  code: string
): Promise<EmailResponse> {
  return sendEmailRequest('two-factor', {
    email,
    username,
    code
  })
}

// Utility function to check if email service is configured
export function isEmailServiceConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}