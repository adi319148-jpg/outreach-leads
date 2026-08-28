import nodemailer from 'nodemailer';
import axios from 'axios';
import { getSetting } from './settingsService';

export interface EmailSendResult {
  success: boolean;
  message: string;
  messageId?: string;
  provider?: 'resend' | 'smtp';
}

export async function getEmailTransporter(customConfig?: {
  host?: string;
  port?: string | number;
  user?: string;
  pass?: string;
}) {
  const host = customConfig?.host || (await getSetting('smtpHost')) || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(String(customConfig?.port || (await getSetting('smtpPort')) || process.env.SMTP_PORT || '465'), 10);
  const user = customConfig?.user || (await getSetting('smtpUser')) || process.env.SMTP_USER || '';
  const pass = customConfig?.pass || (await getSetting('smtpPass')) || process.env.SMTP_PASS || '';
  const secure = port === 465;

  if (!user || !pass) {
    throw new Error('Email credentials are not configured. Please enter Resend API Key or Gmail/SMTP credentials in Settings.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendDirectEmail(
  to: string,
  subject: string,
  body: string
): Promise<EmailSendResult> {
  if (!to || !to.includes('@')) {
    return { success: false, message: `Invalid recipient email address: ${to}` };
  }

  const resendApiKey = (await getSetting('resendApiKey')) || process.env.RESEND_API_KEY;
  const resendFrom = (await getSetting('resendFromEmail')) || 'onboarding@resend.dev';

  // 1. Priority 1: High-Speed Resend API
  if (resendApiKey && resendApiKey.trim()) {
    try {
      console.log(`[EmailService] Dispatching email to ${to} via Resend API...`);
      const fromAddress = resendFrom.includes('<') ? resendFrom : `Outreach Engine <${resendFrom}>`;
      
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromAddress,
          to: [to.trim()],
          subject,
          text: body,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${body}</div>`,
        },
        {
          headers: {
            Authorization: `Bearer ${resendApiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        }
      );

      const msgId = response.data?.id;
      console.log(`[EmailService] ✅ Resend email dispatched successfully to ${to}! MessageId: ${msgId}`);

      return {
        success: true,
        message: `Email dispatched successfully to ${to} via Resend API!`,
        messageId: msgId,
        provider: 'resend',
      };
    } catch (err: any) {
      console.error('[EmailService] Resend API error:', err.response?.data || err.message);
      const errMsg = err.response?.data?.message || err.message || 'Resend email dispatch failed';
      
      // If SMTP is not configured, return Resend error
      const smtpUser = await getSetting('smtpUser');
      if (!smtpUser) {
        return { success: false, message: `Resend error: ${errMsg}` };
      }
    }
  }

  // 2. Priority 2: Nodemailer SMTP
  const fromEmail = (await getSetting('smtpFrom')) || (await getSetting('smtpUser')) || process.env.SMTP_USER;
  try {
    const transporter = await getEmailTransporter();

    const info = await transporter.sendMail({
      from: fromEmail ? `"Outreach Engine" <${fromEmail}>` : undefined,
      to: to.trim(),
      subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${body}</div>`,
    });

    console.log(`[EmailService] Email sent successfully to ${to} via SMTP. MessageId: ${info.messageId}`);

    return {
      success: true,
      message: `Email dispatched successfully to ${to} via SMTP!`,
      messageId: info.messageId,
      provider: 'smtp',
    };
  } catch (err: any) {
    console.error(`[EmailService] SMTP error sending email to ${to}:`, err.message || err);
    return {
      success: false,
      message: err.message || 'Failed to send email via Resend or SMTP.',
    };
  }
}

export async function testResendConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
  const key = apiKey || (await getSetting('resendApiKey')) || process.env.RESEND_API_KEY;
  if (!key || !key.trim()) {
    return { success: false, message: 'Resend API Key is required.' };
  }

  try {
    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: 'Outreach Engine <onboarding@resend.dev>',
        to: ['delivered@resend.dev'],
        subject: 'Resend API Verification Ping',
        text: 'Your Resend API Key is active and verified for cold email outreach.',
      },
      {
        headers: {
          Authorization: `Bearer ${key.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.id) {
      return {
        success: true,
        message: '✅ Resend API Key verified & 100% active! (Ready for background cold emails)',
      };
    }

    return { success: true, message: 'Resend API Key accepted!' };
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'Resend verification failed';
    return { success: false, message: `Resend verification error: ${msg}` };
  }
}

export async function testSmtpConnection(customConfig?: {
  host?: string;
  port?: string | number;
  user?: string;
  pass?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = await getEmailTransporter(customConfig);
    await transporter.verify();
    return { success: true, message: 'SMTP credentials verified! Email sending is 100% active.' };
  } catch (err: any) {
    return {
      success: false,
      message: `SMTP verification failed: ${err.message || 'Check host, port and password'}`,
    };
  }
}
