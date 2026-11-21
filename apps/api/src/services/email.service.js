const axios = require('axios');
const env = require('../config/env');

const send = ({ to, subject, text, html }) =>
  axios.post('https://api.resend.com/emails', {
    from: `Paycen <${env.EMAIL_FROM}>`,
    to: [to],
    subject,
    text,
    html,
  }, {
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 10000,
  });

const sendOtpEmail = async (to, code, { heading = 'Your verification code' } = {}) => {
  await send({
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

// Generic ops alert (e.g. low provider balance) — no code/expiry framing.
const sendAlertEmail = async (to, { subject, heading, message }) => {
  await send({
    to,
    subject,
    text: `${heading}\n\n${message}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <p style="font-size:18px;font-weight:800;color:#111827;margin:0 0 12px">${heading}</p>
        <p style="color:#374151;font-size:14px;line-height:1.5;margin:0">${message}</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail, sendAlertEmail };
