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

async function sendEmail({ to, subject, html, text }) {
  const cfg = getMailerConfig();
  if (!cfg) return { sent: false, reason: "smtp_not_configured" };

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    family: 4,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });
  return { sent: true };
}

module.exports = { sendEmail, getMailerConfig };
