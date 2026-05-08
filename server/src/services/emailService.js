const nodemailer = require('nodemailer');

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

const normalizeBaseUrl = (value, fallback) => String(value || fallback || '').replace(/\/+$/, '');

const buildPasswordResetUrl = (token) => {
  const baseUrl = normalizeBaseUrl(
    process.env.PASSWORD_RESET_BASE_URL,
    process.env.CLIENT_URL || 'http://localhost:5173'
  );

  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
};

let transporter;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: parseBoolean(process.env.SMTP_SECURE, port === 465),
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

const getFromAddress = () =>
  process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@vetconnect.local';

const sendPasswordResetEmail = async ({ email, name, token }) => {
  const resetUrl = buildPasswordResetUrl(token);
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.log(`[password-reset] Reset link for ${email}: ${resetUrl}`);

    return {
      delivery: 'console',
      resetUrl,
    };
  }

  await activeTransporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: 'VetConnect password reset request',
    text: [
      `Hi ${name || 'there'},`,
      '',
      'We received a request to reset your VetConnect password.',
      `Open this link to choose a new password: ${resetUrl}`,
      '',
      'This link expires in 30 minutes and can only be used once.',
      'If you did not request this reset, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="color: #002045;">VetConnect password reset</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your VetConnect password.</p>
        <p>
          <a
            href="${resetUrl}"
            style="display: inline-block; background: #002045; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 700;"
          >
            Reset password
          </a>
        </p>
        <p>If the button does not work, copy and paste this URL into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 30 minutes and can only be used once.</p>
        <p>If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
  });

  return {
    delivery: 'email',
    resetUrl,
  };
};

module.exports = {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
};
