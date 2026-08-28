import nodemailer from 'nodemailer';
import { getSetting } from './settingsService';
import { run } from '../db/database';

export interface EmailSendResult {
  success: boolean;
  message: string;
  messageId?: string;
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
    throw new Error('Email SMTP credentials are not configured. Please enter your Gmail/SMTP credentials in Settings.');
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
  const fromEmail = (await getSetting('smtpFrom')) || (await getSetting('smtpUser')) || process.env.SMTP_USER;

  if (!to || !to.includes('@')) {
    return { success: false, message: `Invalid recipient email address: ${to}` };
  }

  try {
    const transporter = await getEmailTransporter();

    const info = await transporter.sendMail({
      from: fromEmail ? `"Outreach Engine" <${fromEmail}>` : undefined,
      to,
      subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${body}</div>`,
    });

    console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);

    return {
      success: true,
      message: `Email dispatched successfully to ${to}!`,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error(`[EmailService] Error sending email to ${to}:`, err.message || err);
    return {
      success: false,
      message: err.message || 'Failed to send email via SMTP.',
    };
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
