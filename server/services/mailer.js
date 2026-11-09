/*
 * Email delivery through the Resend HTTP API (https://resend.com).
 * Needs RESEND_API_KEY and MAIL_FROM. Never throws: returns { sent, reason }.
 *
 * Note: until a domain is verified in Resend, it only delivers to the address
 * of the Resend account owner; other recipients get a 403 "validation_error".
 */
const RESEND_URL = 'https://api.resend.com/emails';

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

async function sendEmail({ to, subject, html, text }) {
  if (!isConfigured()) return { sent: false, reason: 'not_configured' };
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { sent: false, reason: 'provider_error', status: res.status, details: body.slice(0, 300) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: 'network_error', details: err.message };
  }
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function passwordResetEmail({ name, link, minutes }) {
  const who = name ? `Hola ${escapeHtml(name)},` : 'Hola,';
  const text = [
    who.replace(/&#39;/g, "'"),
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta de APP-GYM.',
    `Abre este enlace para elegir una nueva (caduca en ${minutes} minutos y solo sirve una vez):`,
    link,
    '',
    'Si no fuiste tú, ignora este correo: tu contraseña no cambiará.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#08090D;font-family:Arial,Helvetica,sans-serif;color:#e4e4e7">
  <div style="max-width:480px;margin:0 auto;background:#111216;border:1px solid #27272a;border-radius:16px;padding:28px">
    <p style="margin:0 0 4px;font-size:12px;font-weight:bold;letter-spacing:2px;color:#a3e635">APP-GYM</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff">Restablecer contraseña</h1>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.5">${who}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#a3e635;color:#09090b;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;border-radius:10px">Elegir nueva contraseña</a>
    <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa">El enlace caduca en ${minutes} minutos y solo sirve una vez. Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
  </div>
</body></html>`;

  return { subject: 'Restablece tu contraseña de APP-GYM', html, text };
}

module.exports = { sendEmail, isConfigured, passwordResetEmail };
