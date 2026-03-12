const dns = require("node:dns").promises;
const nodemailer = require("nodemailer");

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || user;
  if (!host || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

async function sendViaResend({ to, subject, html, text }) {
  const cfg = getResendConfig();
  if (!cfg) return { sent: false, reason: "resend_not_configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: cfg.from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      sent: false,
      reason: "resend_error",
      status: response.status,
      details: body,
    };
  }

  return { sent: true, provider: "resend" };
}

async function sendEmail({ to, subject, html, text }) {
  // Prefer HTTPS email API in production-like environments where SMTP egress may be blocked.
  const resendResult = await sendViaResend({ to, subject, html, text });
  if (resendResult.sent) return resendResult;

  const cfg = getMailerConfig();
  if (!cfg) {
    return {
      sent: false,
      reason: resendResult.reason === "resend_not_configured" ? "smtp_not_configured" : resendResult.reason,
      details: resendResult.details,
    };
  }

  let host = cfg.host;
  try {
    const ipv4 = await dns.resolve4(cfg.host);
    if (Array.isArray(ipv4) && ipv4.length > 0) {
      host = ipv4[0];
    }
  } catch {
    host = cfg.host;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: cfg.port,
    secure: cfg.port === 465,
    family: 4,
    name: cfg.host,
    tls: {
      servername: cfg.host,
    },
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });
  return { sent: true, provider: "smtp" };
}

module.exports = { sendEmail, getMailerConfig, getResendConfig };
