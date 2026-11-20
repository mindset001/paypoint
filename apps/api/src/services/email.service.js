const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

const sendOtpEmail = async (to, code, { heading = 'Your verification code' } = {}) => {
  await transporter.sendMail({
    from: `Paycen <${env.EMAIL_FROM}>`,
    to,
    subject: `${code} is your Paycen code`,
    text: `${heading}: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <p style="color:#6b7280;font-size:14px;margin:0 0 8px">${heading}</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:4px;color:#2563eb;margin:0 0 16px">${code}</p>
        <p style="color:#9ca3af;font-size:12px;margin:0">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };
