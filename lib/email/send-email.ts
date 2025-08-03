import { Resend } from 'resend'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// This is only used for custom emails (like username recovery)
// Password reset is handled by Supabase Auth
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.warn('⚠️ Resend is not configured. Please set RESEND_API_KEY environment variable.')
      console.log('📧 Email that would be sent:', {
        to: options.to,
        subject: options.subject,
        preview: options.html.substring(0, 100) + '...'
      })
      return
    }

    // In development, log the email details
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Sending email:', {
        to: options.to,
        subject: options.subject,
        preview: options.html.substring(0, 100) + '...'
      })
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Credlio <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    })

    if (error) {
      console.error('Failed to send email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('✅ Email sent successfully:', data?.id)
  } catch (error) {
    console.error('Email sending error:', error)
    // In development, don't throw - just log
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Email sending failed in development - email content was logged above')
    } else {
      throw error
    }
  }
}

// Template functions for common emails
export function getUsernameRecoveryEmail(username: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Username Recovery</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You requested your username for Credlio. Your username is:</p>
          <h2 style="color: #4F46E5;">${username}</h2>
          <p>You can now sign in using this username.</p>
          <p style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/signin" class="button">Sign In</a>
          </p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function getPasswordResetEmail(resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
        .warning { background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 10px; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You requested to reset your password for Credlio. Click the button below to set a new password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </p>
          <div class="warning">
            <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            If you didn't request this password reset, please ignore this email. Your password won't be changed.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}