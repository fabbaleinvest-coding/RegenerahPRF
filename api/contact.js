/**
 * Serverless contact handler (Vercel) — OzoPet Salus Medica · REGENERAH
 * --------------------------------------------------------------------
 * Riceve i dati del form (POST JSON) e:
 *   1. valida i campi obbligatori e il consenso GDPR
 *   2. INOLTRA il lead a un webhook (Zapier "Catch Hook") se è impostata
 *      la variabile d'ambiente CONTACT_WEBHOOK_URL  ← da Zapier salva su Excel
 *   3. (opzionale) invia anche una email via Resend se configurato
 *   4. risponde JSON al browser
 *
 * Nessuna dipendenza esterna (usa fetch globale, Node 18+).
 * Variabili d'ambiente (Vercel → Settings → Environment Variables):
 *   CONTACT_WEBHOOK_URL   URL del Catch Hook di Zapier (consigliato)
 *   RESEND_API_KEY        (opzionale) per invio email
 *   CONTACT_TO            (opzionale) destinatario email
 *   CONTACT_FROM          (opzionale) mittente email verificato su Resend
 */

function clean(s, max) {
  return String(s == null ? "" : s).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max || 2000);
}
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return await new Promise((resolve) => {
    let raw = ""; req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
  });
}

module.exports = async function handler(req, res) {
  // CORS (utile se il form è servito da un dominio diverso)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ error: "Method Not Allowed" })); }

  const data = await readBody(req);
  const now = new Date();
  const lead = {
    nome: clean(data.name, 120),
    telefono: clean(data.phone, 40),
    email: clean(data.email, 160),
    animale: clean(data.pet, 40),
    interesse: clean(data.therapy, 60),
    messaggio: clean(data.message, 4000),
    consenso: data.consent === true ? "Sì" : "No",
    data: now.toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
    createdAt: now.toISOString(),
    fonte: "ozopetsalusmedica – sito",
  };

  const fail = (code, msg) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error: msg })); };
  if (!lead.nome || !lead.telefono || !lead.email || !lead.messaggio) return fail(422, "Compila tutti i campi obbligatori.");
  if (!isEmail(lead.email)) return fail(422, "Indirizzo email non valido.");
  if (lead.consenso !== "Sì") return fail(422, "Consenso al trattamento dati obbligatorio.");

  try {
    if (process.env.CONTACT_WEBHOOK_URL) {
      // -> Zapier Catch Hook -> Microsoft Excel (Add Row)
      await fetch(process.env.CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    }
    if (process.env.RESEND_API_KEY && process.env.CONTACT_TO) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.RESEND_API_KEY },
        body: JSON.stringify({
          from: process.env.CONTACT_FROM || "OzoPet <onboarding@resend.dev>",
          to: [process.env.CONTACT_TO],
          subject: `Nuova richiesta — ${lead.nome} (${lead.animale})`,
          text: `Nome: ${lead.nome}\nTelefono: ${lead.telefono}\nEmail: ${lead.email}\nAnimale: ${lead.animale}\nInteresse: ${lead.interesse}\n\n${lead.messaggio}\n\nRicevuto: ${lead.data}`,
        }),
      });
    }
    console.log(`[lead] ${lead.createdAt} ${lead.nome} <${lead.email}> ${lead.animale}/${lead.interesse}`);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, message: "Richiesta ricevuta." }));
  } catch (e) {
    console.error("contact error", e);
    return fail(502, "Errore nell'inoltro della richiesta. Riprova o chiamaci.");
  }
};
