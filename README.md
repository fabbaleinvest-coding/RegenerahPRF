# OzoPet Salus Medica — REGENERAH

Sito web della clinica veterinaria **OzoPet Salus Medica — REGENERAH** (Verbania, VB),
specializzata in **ozonoterapia** (protocolli SIOOT · tecnologia MULTIOSSIGEN) e
**medicina rigenerativa PRF** (protocolli REGENERAH) per **cani e gatti**.

Single‑page, estetica premium ispirata ai migliori siti verticali (apple.com):
tipografia ampia, whitespace generoso, motivi‑firma (molecola O₃ e mesh di fibrina) e
soggetti in trasparenza che “galleggiano” su aloni salvia. Front‑end statico +
back‑end Node.js **a zero dipendenze** per la raccolta dei contatti.

---

## 📁 Struttura

```
ozopet/
├─ server.js              # Server HTTP Node.js (zero dipendenze) — locale/VPS
├─ package.json           # script: start / dev
├─ vercel.json            # config per deploy statico + serverless (opzionale)
├─ api/
│  └─ contact.js          # Endpoint serverless del form (Vercel/Netlify)
├─ data/
│  └─ contacts.json       # Lead salvati dal server locale (ignorato da git)
└─ public/
   ├─ index.html          # Pagina completa · 7 sezioni
   ├─ css/styles.css      # Design system completo, responsive
   ├─ js/main.js          # Nav, scroll‑reveal, bolle, invio form
   └─ assets/img/
      └─ (qui vanno le 7 foto trasparenti — vedi sotto)
   └─ js/logos.js            # I due loghi sono INCORPORATI qui come data-URI
```

## 🗂 Le 7 sezioni

1. **Chi Siamo** · 2. **Ozonoterapia** · 3. **PRF** ·
4. **Patologie Trattate** (suddivise in *ozono* / *PRF* / *entrambi*) ·
5. **Prevenzione & Longevità** (infiammatoria sistemica · virale · batterica/AMR · longevità) ·
6. **Protocolli** (SIOOT + MULTIOSSIGEN per l'ozono · REGENERAH per il PRF) ·
7. **Contatti** (modulo cattura‑contatti + recapiti).

---

## 🖼️ Inserire le fotografie (drop‑in)

Il sito è già completo e bello **senza foto**: ogni slot mostra un alone con il
motivo‑firma SVG. Quando aggiungi una foto, questa appare *sopra* l'alone (effetto
“soggetto che galleggia”). Le 7 immagini sono state generate con **Higgsfield ·
Nano Banana Pro (1k)**, su fondo bianco.

**Procedura:**
1. apri ciascun widget Higgsfield e **scarica il PNG**; se disponibile, usa
   l'esportazione **con sfondo rimosso** (trasparente) per la resa migliore;
2. rinomina il file e salvalo in `public/assets/img/` secondo questa tabella:

| Sezione del sito        | Soggetto generato                         | Nome file da salvare              |
|-------------------------|-------------------------------------------|-----------------------------------|
| Hero (in alto)          | cane + gatto sereni insieme               | `public/assets/img/hero.png`         |
| 01 · Chi siamo          | cane e gatto in salute                    | `public/assets/img/chisiamo.png`     |
| 02 · Ozonoterapia       | labrador sereno                           | `public/assets/img/ozonoterapia.png` |
| 03 · PRF                | gatto vitale                              | `public/assets/img/prf.png`          |
| 04 · Patologie          | border collie attivo                      | `public/assets/img/patologie.png`*   |
| 05 · Prevenzione        | cane anziano + gattino                    | `public/assets/img/prevenzione.png`* |
| 06 · Protocolli         | mani con provetta PRF                     | `public/assets/img/protocolli.png`*  |
| 07 · Contatti           | cane + gatto                              | `public/assets/img/contatti.png`*    |

\* Gli slot 04/06/07 nella versione attuale usano motivi grafici; per mostrarvi una
foto basta aggiungere un `<img class="figure-photo" …>` come negli altri (vedi i
commenti in `index.html`). Hero, Chi siamo, Ozonoterapia e PRF hanno già lo slot pronto.

> Nessuna foto è obbligatoria: se un file manca, il sito mostra automaticamente
> l'alone con il motivo SVG (nessuna immagine rotta).

---

## ▶️ Avvio in locale (con back‑end)

Richiede **Node.js 18+** (nessun `npm install`).

```bash
cd ozopet
node server.js
# → http://localhost:3000
```

Il form invia in `POST /api/contact`; i lead vengono salvati in `data/contacts.json`.
Per consultarli via API imposta un token e chiama l'endpoint protetto:

```bash
ADMIN_TOKEN="scegli-un-token" node server.js
curl -H "Authorization: Bearer scegli-un-token" http://localhost:3000/api/contacts
```

## ☁️ Deploy

**A) VPS / server proprio** — esegui `node server.js` dietro un reverse proxy
(nginx) con HTTPS. È l'opzione che salva i lead su file.

**B) Vercel / Netlify (statico + serverless)** — pubblica la cartella `public/`
come sito statico; `api/contact.js` diventa la funzione del form. Variabili
d'ambiente opzionali:
- `CONTACT_WEBHOOK_URL` — inoltra ogni lead a un webhook (Zapier/Make/Slack…)
- `RESEND_API_KEY` + `CONTACT_TO` (+ `CONTACT_FROM`) — invia il lead via email (Resend)

Se non configuri nulla, il form funziona comunque: in mancanza di back‑end il
JavaScript apre il client di posta dell'utente come fallback (mailto).

---

## 🚀 Pubblicare su GitHub

Il repository è già inizializzato con un primo commit. Per caricarlo sul **tuo**
account GitHub:

```bash
cd ozopet

# 1) crea un repo vuoto su github.com (es. "ozopet-salus-medica")
# 2) collega il remote e fai push:
git remote add origin https://github.com/<tuo-utente>/ozopet-salus-medica.git
git branch -M main
git push -u origin main
```

> Il push richiede le **tue credenziali GitHub** (token/login): per questo va
> eseguito da te. Tutto il resto è già pronto al commit.

---

## ⚖️ Note

- Contenuti a finalità informativa/divulgativa: non sostituiscono la visita
  veterinaria. Ogni trattamento è valutato e prescritto individualmente.
- Marchi citati a scopo descrittivo: **SIOOT**, **MULTIOSSIGEN S.p.A.**, **REGENERAH**.
- Inserire **P.IVA**, eventuale **email** ufficiale (in `js/main.js`, costante
  `CLINIC_EMAIL`) e i dati privacy/cookie prima della pubblicazione.
