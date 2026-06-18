/**
 * OzoPet Salus Medica – REGENERAH
 * Zero-dependency Node.js server.
 *
 *   - Serves the static front-end from /public
 *   - POST /api/contact   → validates and stores a lead in /data/contacts.json
 *   - GET  /api/contacts  → returns stored leads (protected by ADMIN_TOKEN)
 *
 * Run:  node server.js   (Node 18+ recommended)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "contacts.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ""; // set to enable GET /api/contacts

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

/* ----------------------------- storage ----------------------------- */
function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");
}
function readLeads() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function saveLead(lead) {
  ensureStore();
  const leads = readLeads();
  leads.push(lead);
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), "utf8");
}

/* ----------------------------- helpers ----------------------------- */
function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}
function clean(s, max) {
  return String(s == null ? "" : s).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max || 2000);
}
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

const security = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

/* -------------------------- static serving ------------------------- */
function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // prevent path traversal
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", ...security });
      return res.end("<h1>404 — Pagina non trovata</h1>");
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream", ...security };
    if (ext !== ".html") headers["Cache-Control"] = "public, max-age=86400";
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ------------------------------ routes ----------------------------- */
const server = http.createServer((req, res) => {
  // --- POST /api/contact ---
  if (req.method === "POST" && req.url === "/api/contact") {
    let raw = "";
    let tooBig = false;
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 20000) { tooBig = true; req.destroy(); }
    });
    req.on("end", () => {
      if (tooBig) return sendJSON(res, 413, { error: "Richiesta troppo grande." });
      let data;
      try { data = JSON.parse(raw || "{}"); }
      catch { return sendJSON(res, 400, { error: "Dati non validi." }); }

      const lead = {
        id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString("hex"),
        name: clean(data.name, 120),
        phone: clean(data.phone, 40),
        email: clean(data.email, 160),
        pet: clean(data.pet, 40),
        therapy: clean(data.therapy, 60),
        message: clean(data.message, 4000),
        consent: data.consent === true,
        createdAt: new Date().toISOString(),
        ip: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0]
      };

      if (!lead.name || !lead.phone || !lead.email || !lead.message)
        return sendJSON(res, 422, { error: "Compila tutti i campi obbligatori." });
      if (!isEmail(lead.email))
        return sendJSON(res, 422, { error: "Indirizzo email non valido." });
      if (!lead.consent)
        return sendJSON(res, 422, { error: "Consenso al trattamento dati obbligatorio." });

      try {
        saveLead(lead);
        console.log(`[lead] ${lead.createdAt} — ${lead.name} <${lead.email}> (${lead.pet}/${lead.therapy})`);
        return sendJSON(res, 201, { ok: true, message: "Richiesta ricevuta." });
      } catch (e) {
        console.error("save error", e);
        return sendJSON(res, 500, { error: "Errore interno. Riprova più tardi." });
      }
    });
    return;
  }

  // --- GET /api/contacts (admin) ---
  if (req.method === "GET" && req.url.split("?")[0] === "/api/contacts") {
    if (!ADMIN_TOKEN) return sendJSON(res, 403, { error: "Accesso non configurato." });
    const auth = req.headers["authorization"] || "";
    if (auth !== "Bearer " + ADMIN_TOKEN) return sendJSON(res, 401, { error: "Non autorizzato." });
    return sendJSON(res, 200, { count: readLeads().length, leads: readLeads() });
  }

  // --- health check ---
  if (req.method === "GET" && req.url === "/health") {
    return sendJSON(res, 200, { status: "ok", time: new Date().toISOString() });
  }

  // --- static files ---
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);

  res.writeHead(405, { "Content-Type": "text/plain", ...security });
  res.end("Method Not Allowed");
});

ensureStore();
server.listen(PORT, () => {
  console.log(`\n  OzoPet Salus Medica – REGENERAH`);
  console.log(`  Server attivo → http://localhost:${PORT}\n`);
});
