/**
 * Serverless contact handler (Vercel / Netlify Functions compatible).
 * ------------------------------------------------------------------
 * Use this when the site is deployed as static hosting WITHOUT the
 * Node server (server.js). The front-end posts to /api/contact either way.
 *
 * Behaviour:
 *   - validates the payload
 *   - if CONTACT_WEBHOOK_URL is set (e.g. a Zapier/Make/Slack webhook or
 *     your own endpoint), it forwards the lead there
 *   - if RESEND_API_KEY + CONTACT_TO are set, it sends an email via Resend
 *   - otherwise it simply logs and returns ok (so the form still succeeds)
 *
 * No external dependencies — uses the global fetch (Node 18+).
 */

function clean(s, max) {
  return String(s == null ? "" : s).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max || 2000);
}
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;            // Vercel parsed
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise((resolve) => {                                    // raw stream
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  const data = await readBody(req);
  const lead = {
    name: clean(data.name, 120),
    phone: clean(data.phone, 40),
    email: clean(data.email, 160),
    pet: clean(data.pet, 40),
    therapy: clean(data.therapy, 60),
    message: clean(data.message, 4000),
    consent: data.consent === true,
    createdAt: new Date().toISOString(),
    source: "ozopetsalusmedica.it",
  };

  const fail = (code, msg) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error: msg })); };

  if (!lead.name || !lead.phone || !lead.email || !lead.message) return fail(422, "Compila tutti i campi obbligatori.");
  if (!isEmail(lead.email)) return fail(422, "Indirizzo email non valido.");
  if (!lead.consent) return fail(422, "Consenso al trattamento dati obbligatorio.");

  try {
    // 1) forward to a generic webhook if configured
    if (process.env.CONTACT_WEBHOOK_URL) {
      await fetch(process.env.CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    }

    // 2) or send an email via Resend if configured
    if (process.env.RESEND_API_KEY && process.env.CONTACT_TO) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.RESEND_API_KEY },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM || "OzoPet <onboarding@resend.dev>",
          to: [process.env.CONTACT_TO],
          subject: `Nuova richiesta — ${lead.name} (${lead.pet})`,
          text:
            `Nome: ${lead.name}\nTelefono: ${lead.phone}\nEmail: ${lead.email}\n` +
            `Animale: ${lead.pet}\nInteresse: ${lead.therapy}\n\n${lead.message}\n\n` +
            `Ricevuto: ${lead.createdAt}`,
        }),
      });
    }

    console.log(`[lead] ${lead.createdAt} — ${lead.name} <${lead.email}> (${lead.pet}/${lead.therapy})`);
    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, message: "Richiesta ricevuta." }));
  } catch (e) {
    console.error("contact error", e);
    return fail(500, "Errore interno. Riprova più tardi.");
  }
};
