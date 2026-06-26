/**
 * Serverless contact handler (Vercel) — OzoPet Salus Medica · REGENERAH
 * --------------------------------------------------------------------
 * Riceve i dati del form (POST JSON) e li INOLTRA al nostro backend/database
 * (app triage -> Supabase) tramite l'endpoint /api/lead: salvataggio della
 * richiesta + iscrizione automatica al nurturing. Tutte le automazioni sono
 * gestite dal nostro database: NIENTE Zapier, niente fogli esterni.
 *
 * Nessuna dipendenza esterna (usa fetch globale, Node 18+).
 * Variabili d'ambiente (Vercel → Settings → Environment Variables):
 *   NURTURE_LEAD_URL   (opzionale) URL dell'endpoint /api/lead dell'app triage.
 *                      Default: https://ozo-pet-medical-triage-agent-i9i4.vercel.app/api/lead
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
    // Tutte le automazioni passano dal nostro backend/database (niente piu' Zapier).
    const LEAD_URL = process.env.NURTURE_LEAD_URL || "https://ozo-pet-medical-triage-agent-i9i4.vercel.app/api/lead";
    const r = await fetch(LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: lead.nome,
        email: lead.email,
        telefono: lead.telefono,
        specie: lead.animale,
        interesse: lead.interesse,
        messaggio: lead.messaggio,
        patologia: lead.messaggio || lead.interesse || lead.animale || null,
        source: "sito-vetrina",
      }),
    });
    console.log(`[lead->db] ${lead.createdAt} ${lead.nome} <${lead.email}> ${lead.animale}/${lead.interesse} status=${r.status}`);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, message: "Richiesta ricevuta." }));
  } catch (e) {
    console.error("contact error", e);
    return fail(502, "Errore nell'inoltro della richiesta. Riprova o chiamaci.");
  }
};
