/*
 * Email delivery over HTTPS (no SMTP: many hosts, Render included, restrict it).
 * Never throws: returns { sent, provider, reason, status, details }.
 *
 * Providers, in order of preference:
 *   - Brevo   (BREVO_API_KEY): works with a single verified sender address,
 *             no domain needed. https://www.brevo.com
 *   - Resend  (RESEND_API_KEY): needs a verified domain to send to anyone;
 *             without one it only delivers to the Resend account owner.
 *
 * MAIL_FROM is the sender, e.g. "TEMPLE <gymtemple4@gmail.com>". With Brevo it
 * must be a sender verified in the Brevo account.
 */
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const RESEND_URL = 'https://api.resend.com/emails';

/* "Name <email>" or "email" → { name, email } */
function parseFrom(value) {
  const raw = String(value || '').trim();
  const m = raw.match(/^(.*)<([^>]+)>$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, '') || undefined, email: m[2].trim() };
  return { email: raw };
}

function activeProvider() {
  if (!process.env.MAIL_FROM) return null;
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

function isConfigured() {
  return Boolean(activeProvider());
}

async function post(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status, details: (await res.text().catch(() => '')).slice(0, 300) };
}

async function sendEmail({ to, subject, html, text }) {
  const provider = activeProvider();
  if (!provider) return { sent: false, reason: 'not_configured' };
  try {
    let result;
    if (provider === 'brevo') {
      const sender = parseFrom(process.env.MAIL_FROM);
      result = await post(BREVO_URL, { 'api-key': process.env.BREVO_API_KEY }, {
        sender,
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      });
    } else {
      result = await post(RESEND_URL, { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, {
        from: process.env.MAIL_FROM,
        to: [to],
        subject,
        html,
        text,
      });
    }
    return result.ok
      ? { sent: true, provider }
      : { sent: false, provider, reason: 'provider_error', status: result.status, details: result.details };
  } catch (err) {
    return { sent: false, provider, reason: 'network_error', details: err.message };
  }
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function passwordResetEmail({ name, link, minutes }) {
  const greeting = name ? `Hola ${name},` : 'Hola,';
  const text = [
    greeting,
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta de TEMPLE.',
    `Abre este enlace para elegir una nueva (caduca en ${minutes} minutos y solo sirve una vez):`,
    link,
    '',
    'Si no fuiste tú, ignora este correo: tu contraseña no cambiará.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#08090D;font-family:Arial,Helvetica,sans-serif;color:#e4e4e7">
  <div style="max-width:480px;margin:0 auto;background:#111216;border:1px solid #27272a;border-radius:16px;padding:28px">
    <p style="margin:0 0 4px;font-size:12px;font-weight:bold;letter-spacing:2px;color:#a3e635">TEMPLE</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff">Restablecer contraseña</h1>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.5">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#a3e635;color:#09090b;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;border-radius:10px">Elegir nueva contraseña</a>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa">El enlace caduca en ${minutes} minutos y solo sirve una vez. Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
  </div>
</body></html>`;

  return { subject: 'Restablece tu contraseña de TEMPLE', html, text };
}

module.exports = { sendEmail, isConfigured, passwordResetEmail, parseFrom };
