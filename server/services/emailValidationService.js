const dns = require("node:dns").promises;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const BLOCKED_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "sharklasers.com",
  "discard.email",
]);

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs),
    ),
  ]);
}

async function validateEmailReal(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, reason: "Formato de correo invalido." };
  }

  const domain = normalized.split("@")[1];
  if (!domain) return { valid: false, reason: "Dominio de correo invalido." };
  if (BLOCKED_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "No se permiten correos temporales o desechables.",
    };
  }

  try {
    const records = await withTimeout(dns.resolveMx(domain), 4000);
    if (!Array.isArray(records) || records.length === 0) {
      return {
        valid: false,
        reason: "El dominio del correo no acepta mensajes.",
      };
    }
    return { valid: true };
  } catch {
    return {
      valid: false,
      reason:
        "No pudimos validar el correo. Verifica que el dominio exista y reciba emails.",
    };
  }
}

module.exports = { validateEmailReal };

