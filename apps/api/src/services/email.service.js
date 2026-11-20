const axios = require('axios');
const env = require('../config/env');

const sendOtpEmail = async (to, code, { heading = 'Your verification code' } = {}) => {
  await axios.post('https://api.resend.com/emails', {
    from: `Paycen <${env.EMAIL_FROM}>`,
    to: [to],
    subject: `${code} is your Paycen code`,
    text: `${heading}: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <p style="color:#6b7280;font-size:14px;margin:0 0 8px">${heading}</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:4px;color:#2563eb;margin:0 0 16px">${code}</p>
        <p style="color:#9ca3af;font-size:12px;margin:0">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  }, {
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 10000,
  });
};

module.exports = { sendOtpEmail };
