// utils/mailer.js — sends OTP emails via SMTP
const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

async function sendOTP(email, code) {
  const expiry = process.env.OTP_EXPIRY_MINUTES || '10';
  const mail = {
    from:    `"PromptCloud" <${process.env.SMTP_USER || 'noreply@promptcloud.io'}>`,
    to:      email,
    subject: `${code} — Your PromptCloud verification code`,
    text:    `Your PromptCloud verification code is: ${code}\n\nThis code expires in ${expiry} minutes.\n\nIf you didn't request this, ignore this email.`,
    html:    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07040f;color:#e0e0ff;border-radius:16px;">
        <h2 style="color:#a855f7;margin-bottom:8px;">PromptCloud</h2>
        <p style="color:#a0a0c0;margin-bottom:24px;">Your verification code for Telegram bot access:</p>
        <div style="background:#1a1030;border:1px solid #3b1f6b;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#e0aaff;">${code}</span>
        </div>
        <p style="color:#6060a0;font-size:13px;">Expires in ${expiry} minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  };
  const info = await getTransporter().sendMail(mail);
  console.log('[MAILER] OTP sent to', email, '- MessageId:', info.messageId);
  return info;
}

module.exports = { generateOTP, sendOTP };
