const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "";
const SMTP_SERVICE = process.env.SMTP_SERVICE || "";

let transporterPromise = null;

async function sendMfaCodeEmail({ to, username, code, expiresInMinutes }) {
  if (!to) {
    throw new Error("User email address is missing.");
  }

  const subject = "Your GamersHub verification code";
  const text = [
    `Hi ${username || "Player"},`,
    "",
    `Your GamersHub verification code is: ${code}`,
    "",
    `This code will expire in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.`,
    "If you did not try to sign in, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <p>Hi ${escapeHtml(username || "Player")},</p>
      <p>Your GamersHub verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0;">${escapeHtml(code)}</p>
      <p>This code will expire in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.</p>
      <p>If you did not try to sign in, you can ignore this email.</p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    console.info(`[GamersHub MFA] Email transport not configured. Verification code for ${to}: ${code}`);
    return { mode: "console" };
  }

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  return { mode: "smtp" };
}

async function sendPasswordResetEmail({ to, username, code, expiresInMinutes }) {
  if (!to) {
    throw new Error("User email address is missing.");
  }

  const subject = "Reset your GamersHub password";
  const text = [
    `Hi ${username || "Player"},`,
    "",
    `Your GamersHub password reset code is: ${code}`,
    "",
    `This code will expire in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.`,
    "If you did not request a password reset, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <p>Hi ${escapeHtml(username || "Player")},</p>
      <p>You requested a password reset for your GamersHub account.</p>
      <p>Your reset code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0;">${escapeHtml(code)}</p>
      <p>This code will expire in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    console.info(`[GamersHub Password Reset] Email transport not configured. Reset code for ${to}: ${code}`);
    return { mode: "console" };
  }

  const transporter = await getTransporter();
  await transporter.sendMail({ from: SMTP_FROM, to, subject, text, html });
  return { mode: "smtp" };
}

function isSmtpConfigured() {
  return Boolean(SMTP_FROM && SMTP_USER && SMTP_PASS && (SMTP_SERVICE || SMTP_HOST));
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }

  return transporterPromise;
}

async function createTransporter() {
  const transportOptions = SMTP_SERVICE
    ? {
        service: SMTP_SERVICE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      }
    : {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      };

  const transporter = nodemailer.createTransport(transportOptions);
  await transporter.verify();
  return transporter;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  sendMfaCodeEmail,
  sendPasswordResetEmail,
  isSmtpConfigured,
};
