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
const DNS_HARD_FAILURES = new Set([
  "ENOTFOUND",
  "ENODATA",
  "ENONAME",
  "NOTFOUND",
  "NXDOMAIN",
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
      try {
        const fallback =
          (await withTimeout(dns.resolve4(domain), 3000).catch(() => []))
          || (await withTimeout(dns.resolve6(domain), 3000).catch(() => []));
        if (!Array.isArray(fallback) || fallback.length === 0) {
          return {
            valid: false,
            reason: "El dominio del correo no parece existir o no recibe mensajes.",
          };
        }
      } catch {
        return { valid: true, skippedReason: "dns_fallback_unavailable" };
      }
    }
    return { valid: true };
  } catch (err) {
    const code = String(err?.code || err?.message || "").toUpperCase();
    if ([...DNS_HARD_FAILURES].some((hard) => code.includes(hard))) {
      return {
        valid: false,
        reason: "El dominio del correo no parece existir.",
      };
    }
    return {
      valid: true,
      skippedReason: "dns_lookup_unavailable",
    };
  }
}

module.exports = { validateEmailReal };
