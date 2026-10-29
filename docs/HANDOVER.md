# Handover: Employee Relations Automation

**For:** a developer rebuilding the Claude prototype as their own app in VS Code
**Prepared:** 26 October 2026

## Artifacts covered

There is one artifact, and this document covers it in full:

1. **Employee Relations Automation** (published as a single-page Claude artifact). It covers the staff ESS Portal experience and every team workspace: Employee Relations, Director's Approvals, D&G Committee, Compliance, Talent Acquisition and the Office of the Chief.

> **Confidential data.** Every person, staff ID and personal detail in this codebase is a **sample placeholder**. Names are "Sample Staff 01" to "Sample Staff 23", staff IDs are "EMP-NNNNN", and NIC numbers, phone numbers and addresses are dummy values ("A000000", "7000000", "[Sample address]"). Team accounts are shown by role only (ER Lead, ER Manager and so on). Replace `data/sample-data.js` with real data only inside the Bank's approved environment.

---

## 1. Overview

### What the app does

Employee Relations Automation takes the Bank's employee relations processes off paper and email and onto one workflow. It runs inside the OneUI ESS Portal look and feel.

- **The disciplinary process runs end to end.** A line manager's concern, an investigation or a PIP outcome opens a case. The employee is questioned by show cause notice or by a meeting with minutes. The ER Lead proposes an action, the ER Manager reviews it and the right approver decides. Routing follows the Disciplinary Procedure:
  - Head of Total Rewards & Employee Relations for staff below Head level
  - People & Culture Director for Head level and above
  - D&G Committee for 3.1 Serious/Gross Misconduct and dismissal
- **Notices are generated, not written.** Cautionary Notices, Final Warning Notices and preliminary decisions are built from the action, reason and clauses. Staff receive them electronically, and the received date and time are recorded. Notices can be exported to PDF.
- **Verbal Advice** is given by line managers. It is recorded separately because it is not a disciplinary action.
- **Meeting minutes** are signed in order: employee, then ER Lead, then the attendees the ER Lead selects. The employee can request an amendment instead of signing. The ER Lead approves it (and edits the minutes) or declines it with a reason, and the employee then signs.
- **PIPs** follow the Managers' Guide.
  - The line manager drafts the plan and the ER Lead approves it. The manager then holds the meeting and the employee signs.
  - Monthly check-ins include self-assessment and manager rating. At the final outcome, a not-met PIP leads to PIP 2 or to an ER case.
  - The ER Lead can send year-end Poor ratings to line managers to start PIPs.
- **EmployeeVoice** has five channels:
  - Formal grievance
  - Harassment complaint
  - Gender discrimination complaint
  - Share with People & Culture (anonymous allowed)
  - Share with the Chief (anonymous allowed)

  Submissions are tracked with replies. Formal complaints get a decision (ER Lead proposes, ER Manager recommends, PCD approves). Anonymous senders stay hidden from reviewers but can still follow their own submissions.
- **PM Appeals** run in a window the ER Lead opens for a performance year, with one appeal per staff member. The ER Lead checks each appeal and sends it to the Review Committee. The ER Manager records the committee's decision, which staff see as the "Review Panel Decision · Decision by Review Committee".
- **Records checks:** Talent Acquisition submits UIDs and gets Yes/No for disciplinary action in the last 12 months, after ER Lead approval.
- **Investigations:** the ER Lead requests investigations from Compliance and receives the findings. Compliance can also refer concerns.
- **Records:** every workspace, team and staff member has a filterable register of everything they are allowed to see, with CSV export. Staff can export each of their records to PDF.
- **Dashboard:** the ER Lead, ER Manager, ER Head and PCD share an ER dashboard.
- **Claude assist (optional):** in the ER workspace, Claude can summarise, check a case against the procedure, and draft show cause notices, proposals, recommendations, replies and decisions. Nothing is applied until the user chooses "Use this".

### Who uses it

| Test user (dropdown) | Role in the app | Main screens |
|---|---|---|
| Staff | Any employee | EmployeeVoice, Disciplinary History (Disciplinary Actions, Verbal Advice, Disciplinary Proceedings), PM Appeals, My PIP, My Records |
| People Manager | Line manager | Submit a Staff Concern, Submit a Staff PIP, Give Verbal Advice, Team Records |
| ER Lead | Employee Relations Lead | ER Workspace: Dashboard, Disciplinary cases, PIPs, EmployeeVoice, Investigations, Records checks, PM Appeals; Records |
| ER Manager | Employee Relations Manager | Approve show cause notices, review proposals, recommend grievance decisions, record Review Committee decisions |
| ER Head | Head of Total Rewards & Employee Relations | Approvals for staff below Head level; dashboard |
| PCD | People & Culture Director | Approvals for Head level and above; grievance decisions |
| D&G Committee Secretary | D&G Committee | Record committee decisions and minutes |
| Compliance | Compliance | Investigation requests and findings; refer concerns |
| Talent Acquisition | Talent Acquisition | Records checks (Yes/No only) |
| Office of the Chief | Office of the Chief | Reply to "Share with the Chief" submissions |

The dropdown is a **test sign-in only**. A production build should take the user and role from the Bank's single sign-on (see section 7).

---

## 2. Folder structure

```
employee-relations-automation/
├── index.html              Page shell: header, sign-in switcher, app mount point, script tags
├── css/
│   └── styles.css          All styles. Design tokens (colours, fonts, spacing) at the top
├── js/
│   ├── config.js           Branding, roles, clauses, actions, statuses, test users, TODAY
│   ├── platform.js         Standard replacements for the Claude artifact runtime
│   └── app.js              Screens, workflows, documents, PDFs, records, Claude assist
├── data/
│   └── sample-data.js      Sample employees and records (all placeholders)
├── server.js               Optional Express server: static hosting + /api/assist
├── package.json            npm scripts and the one dependency (express)
├── .env.example            Template for ANTHROPIC_API_KEY (copy to .env)
├── .gitignore
├── .vscode/
│   ├── extensions.json     Recommends the Live Server extension
│   └── settings.json       Live Server port and root
└── README.md               Short run and customise guide
```

Scripts load in this order (set in `index.html`): `config.js`, then `sample-data.js`, then `platform.js`, then `app.js`. They are classic scripts sharing one global scope, so the order matters.

---

## 3. Every file in full

### `index.html`

````html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Employee Relations Automation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Lexend:wght@500;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="brand">
      <span class="eyebrow">Bank of Maldives · Employee Relations</span><!-- branding: also change BRAND in js/config.js -->
      <h1>Employee Relations Automation</h1>
    </div>
    <div class="topright"><span class="proto">PROTOTYPE · sample data only</span><button type="button" class="btn sm" id="resetData" title="Clear saved changes and reload the sample data">Reset sample data</button></div>
  </header>

  <section class="rolebar" aria-label="Switch role">
    <span class="eyebrow">Viewing as (prototype sign-in)</span>
    <div class="roles" id="roles"></div>
    <div class="who-line" id="whoLine"></div>
  </section>

  <div id="main"></div>

</div>

<!-- jsPDF builds the notice and record PDFs in the browser -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<!-- Load order matters: config, then data, then platform services, then the app -->
<script src="js/config.js"></script>
<script src="data/sample-data.js"></script>
<script src="js/platform.js"></script>
<script src="js/app.js"></script>
</body>
</html>
````

### `css/styles.css`

````css
/* =====================================================================
   DESIGN TOKENS · change colours, fonts and spacing here
   Light theme values on :root; dark theme values follow (used when the
   device is in dark mode, or when <html data-theme="dark"> is set).
   ===================================================================== */
:root{
  /* Fonts (loaded from Google Fonts in index.html) */
  --sans:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
  /* Spacing (gaps between items) */
  --space-xs:6px; --space-sm:8px; --space-md:12px; --space-lg:16px; --space-xl:18px;
  /* Corner radius */
  --radius-sm:8px; --radius-md:10px; --radius-lg:14px; --radius-pill:999px;
  /* Surfaces and text */
  --bg:#f6f5f4; --surface:#ffffff; --sunk:#f1efed; --line:#e7e4e1; --line-strong:#d3cfcb; --fg:#1f1d1b; --muted:#6b6560; --faint:#948d87;
  /* Brand accent (BML red) */
  --accent:#b8141f; --accent-ink:#ffffff; --accent-soft:#fbeaea;
  /* Status colours */
  --ok:#1f6b45; --ok-soft:#e3f2ea; --warn:#8a5a00; --warn-soft:#fbf0d9; --bad:#a3141d; --bad-soft:#fbe5e6; --info:#1f4f86; --info-soft:#e4edf8;
  /* ESS Portal shell */
  --ess-bg:#ffffff; --ess-side:#f6f5f4; --ess-line:#e7e4e1; --ess-fg:#1f1d1b; --ess-muted:#6b6560; --ess-hover:#efedeb; --ess-blue:#b8141f; --ess-blue-soft:#fbeaea; --ess-orange:#ea580c; --ess-orange-soft:#fff7ed; --ess-green:#16a34a; --ess-green-soft:#f0fdf4; --ess-page:#f6f5f4; --ess-sunk:#f3f1ef;
  /* EmployeeVoice channel tints */
  --t-teal:#0f766e; --t-teal-bg:#e3f4f1; --t-gold:#a16207; --t-gold-bg:#fbf1d6; --t-rose:#b04a5a; --t-rose-bg:#fbebee; --t-plum:#86307a; --t-plum-bg:#f5e7f2; --t-indigo:#4338ca; --t-indigo-bg:#ebeafc;
  /* Decorative (unused glow, kept for reference) */
  --glow-a:rgba(246,196,208,.55); --glow-b:rgba(203,190,250,.45);
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
    /* Surfaces and text */
    --bg:#151413; --surface:#1d1c1b; --sunk:#242220; --line:#2f2c2a; --line-strong:#45413e; --fg:#f2f0ee; --muted:#a8a29e; --faint:#7d7772;
    /* Brand accent (BML red) */
    --accent:#f0717b; --accent-ink:#1a0505; --accent-soft:#3a1c1f;
    /* Status colours */
    --ok:#6cc596; --ok-soft:#1b2e24; --warn:#e3b45a; --warn-soft:#30260f; --bad:#f07a80; --bad-soft:#3a1c1e; --info:#86b2e6; --info-soft:#1a2636;
    /* ESS Portal shell */
    --ess-bg:#1d1c1b; --ess-side:#151413; --ess-line:#2f2c2a; --ess-fg:#f2f0ee; --ess-muted:#a8a29e; --ess-hover:#262422; --ess-blue:#f0717b; --ess-blue-soft:#3a1c1f; --ess-orange:#fb923c; --ess-orange-soft:#2a1a0e; --ess-green:#4ade80; --ess-green-soft:#0f2a1a; --ess-page:#151413; --ess-sunk:#242220;
    /* EmployeeVoice channel tints */
    --t-teal:#5eead4; --t-teal-bg:#123330; --t-gold:#fcd34d; --t-gold-bg:#33290f; --t-rose:#f4a3b0; --t-rose-bg:#3a1f25; --t-plum:#e9a5dc; --t-plum-bg:#351c31; --t-indigo:#a5b4fc; --t-indigo-bg:#211f45;
    /* Decorative (unused glow, kept for reference) */
    --glow-a:rgba(120,40,60,.35); --glow-b:rgba(70,55,140,.35);
    color-scheme:dark}}
:root[data-theme="dark"]{
  /* Surfaces and text */
  --bg:#151413; --surface:#1d1c1b; --sunk:#242220; --line:#2f2c2a; --line-strong:#45413e; --fg:#f2f0ee; --muted:#a8a29e; --faint:#7d7772;
  /* Brand accent (BML red) */
  --accent:#f0717b; --accent-ink:#1a0505; --accent-soft:#3a1c1f;
  /* Status colours */
  --ok:#6cc596; --ok-soft:#1b2e24; --warn:#e3b45a; --warn-soft:#30260f; --bad:#f07a80; --bad-soft:#3a1c1e; --info:#86b2e6; --info-soft:#1a2636;
  /* ESS Portal shell */
  --ess-bg:#1d1c1b; --ess-side:#151413; --ess-line:#2f2c2a; --ess-fg:#f2f0ee; --ess-muted:#a8a29e; --ess-hover:#262422; --ess-blue:#f0717b; --ess-blue-soft:#3a1c1f; --ess-orange:#fb923c; --ess-orange-soft:#2a1a0e; --ess-green:#4ade80; --ess-green-soft:#0f2a1a; --ess-page:#151413; --ess-sunk:#242220;
  /* EmployeeVoice channel tints */
  --t-teal:#5eead4; --t-teal-bg:#123330; --t-gold:#fcd34d; --t-gold-bg:#33290f; --t-rose:#f4a3b0; --t-rose-bg:#3a1f25; --t-plum:#e9a5dc; --t-plum-bg:#351c31; --t-indigo:#a5b4fc; --t-indigo-bg:#211f45;
  /* Decorative (unused glow, kept for reference) */
  --glow-a:rgba(120,40,60,.35); --glow-b:rgba(70,55,140,.35);
  color-scheme:dark}
/* ===================================================================== */
/* Layout: role bar on top, then case queue left and working pane right; staff portal uses tabs; stacks on phones */
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font:15px/1.5 var(--sans);padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 48px}
h1,h2,h3{margin:0;text-wrap:balance}
.wrap{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:var(--space-lg)}
header.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:var(--space-md);border-bottom:2px solid var(--accent);padding-bottom:12px}
.brand{display:flex;flex-direction:column;gap:2px}
.eyebrow{font:500 11px/1.2 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
h1{font-size:24px;font-weight:700;letter-spacing:-.01em}
.proto{font:500 11px var(--mono);background:var(--warn-soft);color:var(--warn);padding:4px 8px;border-radius:4px}
.rolebar{display:flex;flex-direction:column;gap:var(--space-xs)}
.usersel{width:auto;max-width:100%;min-width:min(420px,100%);font-weight:600;font-size:15px;padding:9px 12px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.roles{display:flex;flex-wrap:wrap;gap:var(--space-xs)}
.rolebtn{font:600 13px var(--sans);border:1px solid var(--line-strong);background:var(--surface);color:var(--fg);border-radius:var(--radius-sm);padding:8px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:var(--space-sm)}
.rolebtn:hover{background:var(--sunk)}
.rolebtn[aria-pressed="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.badge{font:600 11px/1 var(--sans);background:var(--accent);color:var(--accent-ink);border-radius:var(--radius-pill);padding:3px 6px;min-width:18px;text-align:center}
.who-line{font-size:13px;color:var(--muted);display:flex;flex-wrap:wrap;gap:var(--space-sm);align-items:center}
.who-line select{width:auto;max-width:100%}
.grid{display:grid;grid-template-columns:340px minmax(0,1fr);gap:var(--space-xl);align-items:start}
@media (max-width:900px){.grid{grid-template-columns:1fr}}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md)}
.reg-head{display:flex;justify-content:space-between;align-items:center;padding:14px 14px 10px;gap:var(--space-sm)}
.reg-head h2{font-size:15px}
.list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.list .grp{font:500 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:10px 14px 6px;background:var(--sunk);border-bottom:1px solid var(--line)}
.list li button{all:unset;box-sizing:border-box;display:grid;grid-template-columns:1fr auto;gap:2px 8px;width:100%;padding:11px 14px;border-bottom:1px solid var(--line);cursor:pointer}
.list li button:hover{background:var(--sunk)}
.list li button[aria-current="true"]{background:var(--accent-soft);box-shadow:inset 3px 0 0 var(--accent)}
.list li button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.l-name{font-weight:600;font-size:14px}
.l-meta{grid-column:1/-1;font-size:12px;color:var(--muted)}
.l-ref{font:12px var(--mono);color:var(--faint)}
.pill{display:inline-flex;align-items:center;gap:5px;font:600 11px/1.15 var(--sans);padding:4px 8px;border-radius:var(--radius-pill);max-width:200px;text-align:right}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.t-warn{background:var(--warn-soft);color:var(--warn)}
.t-info{background:var(--info-soft);color:var(--info)}
.t-ok{background:var(--ok-soft);color:var(--ok)}
.t-bad{background:var(--bad-soft);color:var(--bad)}
.btn{font:600 14px var(--sans);border-radius:7px;padding:9px 14px;cursor:pointer;border:1px solid var(--line-strong);background:var(--surface);color:var(--fg)}
.btn:hover{background:var(--sunk)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.btn.primary:hover{filter:brightness(1.08)}
.btn.sm{font-size:12px;padding:6px 10px}
.btn.link{border:0;background:none;color:var(--accent);padding:4px 0}
.btn:focus-visible,.rolebtn:focus-visible,.tab:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.btn:disabled{opacity:.45;cursor:not-allowed}
.pane{padding:20px;display:flex;flex-direction:column;gap:var(--space-xl);min-width:0}
.pane-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:flex-start}
.pane-head h2{font-size:20px}
.sub{color:var(--muted);font-size:13px}
.split{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:var(--space-xl);align-items:start}
@media (max-width:1100px){.split{grid-template-columns:1fr}}
.col{display:flex;flex-direction:column;gap:var(--space-xl);min-width:0}
fieldset{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--space-md);min-width:0}
legend{font:500 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;padding:0}
.form{display:flex;flex-direction:column;gap:22px;min-width:0}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-md)}
label.f,.f{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600}
.f span.h{font-weight:400;color:var(--muted);font-size:12px}
input,select,textarea{font:14px var(--sans);color:var(--fg);background:var(--surface);border:1px solid var(--line-strong);border-radius:7px;padding:8px 10px;width:100%;min-width:0}
textarea{min-height:64px;resize:vertical}
.checks{display:flex;flex-direction:column;gap:var(--space-xs);font-size:13px}
.checks label{display:flex;gap:var(--space-sm);align-items:flex-start;font-weight:400}
.checks input{width:auto;margin-top:3px}
.seg{display:flex;flex-wrap:wrap;gap:var(--space-xs)}
.seg label{display:flex;align-items:center;gap:var(--space-xs);font-size:13px;border:1px solid var(--line-strong);border-radius:7px;padding:8px 12px;cursor:pointer;font-weight:500}
.seg input{width:auto;margin:0}
.seg label:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}
.qrow{display:grid;grid-template-columns:28px minmax(0,1fr);gap:var(--space-sm);align-items:start}
.qrow .n{font:500 12px var(--mono);color:var(--muted);padding-top:9px}
.mrow{display:grid;grid-template-columns:28px minmax(0,1fr);gap:var(--space-sm);align-items:start;padding:10px 0;border-top:1px dashed var(--line)}
.mrow .pair{display:flex;flex-direction:column;gap:var(--space-xs);min-width:0}
.route{position:sticky;top:max(16px,env(safe-area-inset-top,0px));background:var(--sunk);border:1px solid var(--line);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:var(--space-md)}
.route .who{font-size:18px;font-weight:700;line-height:1.25}
.route .why{font-size:13px;color:var(--muted)}
.flags{display:flex;flex-direction:column;gap:var(--space-sm);list-style:none;margin:0;padding:0}
.flag{font-size:13px;padding:8px 10px;border-radius:7px;border-left:3px solid currentColor;margin:0}
.flag strong{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px}
.f-block{background:var(--bad-soft);color:var(--bad)}
.f-warn{background:var(--warn-soft);color:var(--warn)}
.f-info{background:var(--info-soft);color:var(--info)}
.f-ok{background:var(--ok-soft);color:var(--ok)}
.flag span{color:var(--fg)}
.history{display:flex;flex-direction:column;gap:var(--space-xs)}
.hist-item{font-size:12px;display:grid;grid-template-columns:auto 1fr;gap:2px 8px;padding:7px 9px;background:var(--surface);border:1px solid var(--line);border-radius:6px}
.hist-item .d{font-family:var(--mono);color:var(--muted)}
.stagebars{display:flex;flex-direction:column;gap:var(--space-md)}
.stagebar{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;align-items:start}
.stagebar .eyebrow{padding-top:12px}
@media (max-width:560px){.stagebar{grid-template-columns:1fr;gap:2px}.stagebar .eyebrow{padding-top:0}}
.steps{display:flex;list-style:none;margin:0;padding:0;overflow-x:auto}
.steps li{flex:1;min-width:96px;font-size:12px;color:var(--faint);padding-top:10px;border-top:3px solid var(--line);margin-right:4px}
.steps li small{display:block;font-size:11px;color:var(--faint);font-weight:400}
.steps li.done{color:var(--fg);border-color:var(--ok)}
.steps li.now{color:var(--fg);border-color:var(--accent);font-weight:600}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px 18px;margin:0}
.facts div{display:flex;flex-direction:column;gap:2px;min-width:0}
.facts dt{font:500 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.facts dd{margin:0;font-size:14px;overflow-wrap:anywhere}
.task{border:1px solid var(--accent);background:var(--accent-soft);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:var(--space-md)}
.task h3{font-size:15px}
.task.passive{border-color:var(--line);background:var(--sunk)}
.actions{display:flex;flex-wrap:wrap;gap:var(--space-sm);align-items:center}
.doc-wrap{border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden}
.doc-bar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:var(--space-sm);padding:10px 14px;background:var(--sunk);border-bottom:1px solid var(--line)}
.doc-bar h3{font-size:14px}
.doc{background:#fff;color:#1d1a1a;padding:28px;font-size:14px;position:relative;overflow-x:auto}
@media (max-width:560px){.doc{padding:18px}}
.doc .lh{display:flex;justify-content:space-between;gap:var(--space-md);flex-wrap:wrap;border-bottom:3px solid #b8141f;padding-bottom:10px;margin-bottom:16px}
.doc .lh b{color:#b8141f;font-size:15px;letter-spacing:.02em}
.doc .ref{font:12px var(--mono);color:#6b6362;text-align:right}
.doc h4{font-size:17px;margin:0 0 4px}
.doc table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13.5px}
.doc th{text-align:left;vertical-align:top;width:32%;padding:8px 10px;background:#f6f4f4;border:1px solid #e0dbda;font-weight:600}
.doc td{padding:8px 10px;border:1px solid #e0dbda;vertical-align:top}
.doc .foot{font-size:12px;color:#6b6362;margin-top:14px;border-top:1px solid #e0dbda;padding-top:10px}
.doc .stamp{position:absolute;top:18px;right:50%;transform:translateX(50%) rotate(-6deg);font:700 13px var(--mono);letter-spacing:.2em;color:#b8141f;border:2px solid #b8141f;padding:3px 10px;opacity:.55}
.doc ol.qa{padding-left:20px;margin:10px 0;display:flex;flex-direction:column;gap:var(--space-md)}
.doc ol.qa .a{margin-top:4px;padding:8px 10px;background:#f6f4f4;border-left:3px solid #c9c2c0}
.doc ol.qa .a.empty{color:#958d8c;font-style:italic}
.doc .sigs{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-top:18px}
.doc .sig{border-top:1px solid #1d1a1a;padding-top:6px;font-size:12.5px}
.doc .sig .s{font:12px var(--mono);margin-top:2px}
.doc .sig .s.ok{color:#1f6b45}.doc .sig .s.wait{color:#8a5a00}
.trail{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.trail li{display:grid;grid-template-columns:86px 1fr;gap:10px;font-size:13px;padding:8px 0;border-bottom:1px dashed var(--line)}
.trail li:last-child{border-bottom:0}
.trail .d{font:12px var(--mono);color:var(--muted)}
.trail .by{font-weight:600}
.trail .q{color:var(--muted);display:block}
.empty{padding:40px 20px;text-align:center;color:var(--muted)}
.toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--fg);color:var(--bg);padding:9px 16px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;z-index:20;max-width:calc(100% - 32px)}
.note{font-size:12px;color:var(--muted)}
.matrix{width:100%;border-collapse:collapse;font-size:13px}
.matrix th,.matrix td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.matrix th{font:500 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.scroll{overflow-x:auto}
details.rules{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);padding:12px 16px}
details.rules summary{cursor:pointer;font-weight:600;font-size:14px}
details.rules[open] summary{margin-bottom:10px}
.cpick{display:flex;flex-direction:column;gap:var(--space-sm);min-width:0}
.cbox{max-height:240px;overflow-y:auto;border:1px solid var(--line-strong);border-radius:7px;padding:4px 10px 8px;background:var(--surface)}
.cbox .g{font:500 11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px 0 4px;position:sticky;top:0;background:var(--surface)}
.cbox label{display:flex;gap:var(--space-sm);align-items:flex-start;font-size:13px;padding:3px 0;font-weight:400;cursor:pointer}
.cbox input,.cpick .oth input[type=checkbox]{width:auto;margin-top:3px;flex:none}
.cbox .k{font:500 12px var(--mono);min-width:62px;flex:none}
.cpick .oth{display:flex;gap:var(--space-sm);align-items:flex-start;font-size:13px;font-weight:600}
/* staff portal */
.portal{display:grid;grid-template-columns:240px minmax(0,1fr);gap:var(--space-xl);align-items:start}
@media (max-width:820px){.portal{grid-template-columns:1fr}}
.portal-nav{display:flex;flex-direction:column;gap:4px;padding:14px}
.portal-nav .eyebrow{padding:8px 4px 4px}
.tab{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;gap:var(--space-sm);padding:9px 12px;border-radius:7px;font-size:14px;font-weight:500;cursor:pointer}
.tab:hover{background:var(--sunk)}
.tab[aria-selected="true"]{background:var(--accent-soft);color:var(--fg);font-weight:600;box-shadow:inset 3px 0 0 var(--accent);border-radius:0 7px 7px 0}
@media (max-width:820px){.portal-nav{flex-direction:row;flex-wrap:wrap;gap:var(--space-xs)}.portal-nav .eyebrow{width:100%;padding:4px 0 0}.tab{border:1px solid var(--line-strong)}.tab[aria-selected="true"]{box-shadow:none;border-color:var(--accent);border-radius:7px}}
.stack{display:flex;flex-direction:column;gap:var(--space-xl)}
.card{border:1px solid var(--line);border-radius:var(--radius-md);padding:14px 16px;display:flex;flex-direction:column;gap:var(--space-xs)}
.card .top{display:flex;justify-content:space-between;gap:var(--space-sm);flex-wrap:wrap;align-items:center}
.card .ref{font:12px var(--mono);color:var(--faint)}
.sec{font-size:15px;padding-bottom:6px;border-bottom:1px solid var(--line)}
/* OneUI ESS shell (staff portal) */
.ess{--accent:var(--ess-blue);--accent-soft:var(--ess-blue-soft);--accent-ink:#fff;--surface:var(--ess-bg);--line:var(--ess-line);--fg:var(--ess-fg);--muted:var(--ess-muted);--sunk:var(--ess-side);
  display:grid;grid-template-columns:232px minmax(0,1fr);border:1px solid var(--ess-line);border-radius:12px;overflow:hidden;background:var(--ess-bg);color:var(--ess-fg);font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;min-height:620px}
@media (max-width:820px){.ess{grid-template-columns:1fr}}
.ess-side{background:var(--ess-side);border-right:1px solid var(--ess-line);padding:14px 10px;display:flex;flex-direction:column;gap:2px}
@media (max-width:820px){.ess-side{border-right:0;border-bottom:1px solid var(--ess-line)}}
.ess-brand{display:flex;gap:10px;align-items:center;padding:2px 6px 14px}
.ess-logo{width:30px;height:30px;border-radius:var(--radius-sm);background:var(--ess-blue);color:#fff;display:grid;place-items:center;flex:none}
.ess-brand b{font-size:13px;font-weight:600;display:block;line-height:1.2}.ess-brand b span{color:var(--ess-blue)}
.ess-brand small{font-size:11px;color:var(--ess-muted)}
.ess-grp{font-size:11px;color:var(--ess-muted);padding:12px 8px 4px;font-weight:500}
.ess-item{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:9px;padding:7px 8px;border-radius:6px;font-size:13px;cursor:pointer;color:var(--ess-fg)}
.ess-item:hover{background:var(--ess-hover)}
.ess-item[aria-current="page"]{background:var(--ess-hover);font-weight:600}
.ess-item:focus-visible{outline:2px solid var(--ess-blue);outline-offset:1px}
.ess-item .grow{flex:1;min-width:0}
.ess-item svg{flex:none;color:var(--ess-muted)}
.ess-item[aria-current="page"] svg{color:var(--ess-fg)}
.ess-new{font-size:10px;font-weight:600;color:var(--ess-blue);background:var(--ess-blue-soft);border-radius:4px;padding:1px 5px}
.ess-cnt{font-size:11px;font-weight:600;color:#fff;background:var(--ess-orange);border-radius:var(--radius-pill);padding:1px 6px}
.ess-main{display:flex;flex-direction:column;min-width:0}
.ess-top{display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid var(--ess-line);font-size:13px}
.ess-top .crumb{color:var(--ess-muted)}.ess-top .crumb b{color:var(--ess-fg);font-weight:500}
.ess-top .sp{flex:1}.ess-top svg{color:var(--ess-muted)}
.ess-body{padding:22px 24px 28px;display:flex;flex-direction:column;gap:var(--space-xl);min-width:0}
@media (max-width:560px){.ess-body{padding:16px}}
.ess-h h2{font-size:19px;font-weight:600}.ess-h p{margin:2px 0 0;font-size:13px;color:var(--ess-muted)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
@media (max-width:900px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kpi{border:1px solid var(--ess-line);border-radius:var(--radius-md);padding:14px;display:flex;flex-direction:column;gap:4px;position:relative}
.kpi .l{display:flex;gap:7px;align-items:center;font-size:12.5px;color:var(--ess-muted)}
.kpi .v{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums}
.kpi small{font-size:11px;color:var(--ess-muted)}
.kpi::after{content:"";position:absolute;top:16px;right:14px;width:6px;height:6px;border-radius:50%;background:var(--dot,var(--ess-muted))}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-lg)}
@media (max-width:900px){.two{grid-template-columns:1fr}}
.ess-card{border:1px solid var(--ess-line);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:var(--space-md);min-width:0}
.ess-card h3{font-size:14px;font-weight:600}.ess-card h3+p{margin:-10px 0 0;font-size:12.5px;color:var(--ess-muted)}
.act{display:flex;gap:10px;align-items:flex-start}
.act .ico{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;flex:none}
.act b{font-size:13px;font-weight:500;display:block}.act span{font-size:12px;color:var(--ess-muted);display:block}
.qa-btn{all:unset;box-sizing:border-box;display:flex;gap:10px;align-items:flex-start;border:1px solid var(--ess-line);border-radius:var(--radius-sm);padding:11px 12px;cursor:pointer}
.qa-btn:hover{background:var(--ess-hover)}.qa-btn:focus-visible{outline:2px solid var(--ess-blue)}
.qa-btn b{font-size:13px;font-weight:500;display:block}.qa-btn span{font-size:12px;color:var(--ess-muted)}
.ess-alert{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1px solid var(--ess-orange);background:var(--ess-orange-soft);border-radius:var(--radius-md);padding:12px 14px;font-size:13px}
.ess-alert .grow{flex:1;min-width:200px}
.subtabs{display:flex;gap:4px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.subtab{all:unset;cursor:pointer;padding:8px 12px;font-size:13px;font-weight:500;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;display:inline-flex;gap:var(--space-xs);align-items:center}
.subtab[aria-selected="true"]{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}
.subtab:focus-visible{outline:2px solid var(--accent)}
.chips{display:flex;flex-wrap:wrap;gap:var(--space-xs)}
.chip{font-size:12px;border:1px solid var(--line-strong);border-radius:var(--radius-pill);padding:3px 9px;background:var(--surface)}
.chip.bad{border-color:var(--bad);color:var(--bad)}
.rows{display:flex;flex-direction:column;gap:var(--space-sm)}
.r2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-sm)}
.r3{display:grid;grid-template-columns:120px minmax(0,1fr) minmax(0,2fr);gap:var(--space-sm)}
.r4{display:grid;grid-template-columns:70px minmax(0,2fr) 140px 140px;gap:var(--space-sm)}
@media (max-width:700px){.r2,.r3,.r4{grid-template-columns:1fr}}
.yes{color:var(--bad);font-weight:600}
.mono{font-family:var(--mono);font-size:13px}
.tagrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:14px}
@media (max-width:700px){.tagrid{grid-template-columns:1fr}}
.tapre{border:1px solid var(--line);border-radius:7px;min-height:220px;max-height:320px;overflow:auto;padding:4px 10px;font-weight:400}
.tat{width:100%;border-collapse:collapse;font-size:14px}
.tat th{text-align:left;font-size:12px;font-weight:600;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line-strong);vertical-align:bottom}
.tat th small{font-weight:400}
.tat td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:middle}
.tat td small{display:block;font-size:12px;color:var(--muted)}
.tat tr.bad td{color:var(--bad)}
.tapre .tat td{padding:6px 4px}
.yn{display:inline-block;min-width:44px;text-align:center;font-size:12.5px;font-weight:600;border-radius:var(--radius-pill);padding:3px 10px}
.yn.yes{background:var(--bad-soft);color:var(--bad)}.yn.no{background:var(--ok-soft);color:var(--ok)}
.tasum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.tasum div{border:1px solid var(--line);border-radius:var(--radius-md);padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.tasum b{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}.tasum span{font-size:12px;color:var(--muted)}
.req{color:var(--bad)}
/* EmployeeVoice landing: large title, protection banner, coloured channel cards */
.ev{--ev-mag:#e6007e;--accent:#d11a5b;--accent-soft:#fde8ef;display:flex;flex-direction:column;gap:var(--space-lg)}
.ev-land{max-width:720px;width:100%;margin:0 auto;gap:var(--space-xl)}
.ev-title{text-align:center}
.ev-title h2{font:800 clamp(34px,6vw,52px)/1.05 "Lexend",var(--sans);letter-spacing:-.02em;color:var(--fg)}
.ev-title p{margin:6px 0 0;font-size:18px;color:var(--muted)}
.ev-safe{display:flex;gap:10px;align-items:center;padding:14px 18px;border-radius:12px;background:#e8f3ee;border:1px solid #b9dccb;color:#1f5f45;font-size:14.5px}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .ev-safe{background:#14281f;border-color:#2b5442;color:#9fdcbf}}
:root[data-theme="dark"] .ev-safe{background:#14281f;border-color:#2b5442;color:#9fdcbf}
.ev-intro{margin:0;font-size:15px;line-height:1.6;color:var(--fg);text-align:center;text-wrap:pretty}
.ev-grp{display:flex;flex-direction:column;gap:10px}
.ev-card,.ev-strip{all:unset;box-sizing:border-box;display:grid;grid-template-columns:52px minmax(0,1fr) 24px;align-items:center;gap:var(--space-lg);padding:20px 22px;border-radius:16px;box-shadow:0 6px 16px -10px rgba(0,0,0,.35);cursor:pointer;transition:transform .12s, box-shadow .12s}
.ev-strip{grid-template-columns:52px minmax(0,1fr);cursor:default;box-shadow:none}
.ev-card:hover{transform:translateY(-1px);box-shadow:0 10px 22px -10px rgba(0,0,0,.4)}
.ev-card:focus-visible{outline:3px solid var(--fg);outline-offset:3px}
.ev-ic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.28)}
.ev-ct{display:flex;flex-direction:column;gap:2px;min-width:0}.ev-ct b{font-size:19px;font-weight:700}.ev-ct small{font-size:14px;opacity:.9}
.ev-card.teal,.ev-strip.teal,.ev-dot.teal{background:linear-gradient(180deg,#2fd0c3,#1fafa4);color:#063b37}
.ev-card.yellow,.ev-strip.yellow,.ev-dot.yellow{background:linear-gradient(180deg,#ffd93b,#f3be1a);color:#3f2c00}
.ev-card.red,.ev-strip.red,.ev-dot.red{background:linear-gradient(180deg,#ea3f4a,#c9232f);color:#fff}
.ev-card.plum,.ev-strip.plum,.ev-dot.plum{background:linear-gradient(180deg,#c2378f,#9b2272);color:#fff}
.ev-card.indigo,.ev-strip.indigo,.ev-dot.indigo{background:linear-gradient(180deg,#5b6ee8,#3f4fc4);color:#fff}
.prow .pic.ev-dot{border-radius:50%}
@media (max-width:560px){.ev-card{grid-template-columns:44px minmax(0,1fr) 20px;padding:16px;gap:var(--space-md)}.ev-ic{width:44px;height:44px}.ev-ct b{font-size:16px}.ev-ct small{font-size:13px}}
.ev-help{margin:0;text-align:center;font-size:14px;color:var(--muted)}.ev-help b{color:var(--fg)}
.ev-links{display:flex;justify-content:center}
.ev-links .btn.link{color:var(--fg);border-bottom:2px solid #f08a4b;border-radius:0;padding:2px 0;font-size:14.5px}
.infocard{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 20px;margin:0;padding:16px 18px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
@media (max-width:640px){.infocard{grid-template-columns:repeat(2,minmax(0,1fr))}}
.infocard div{display:flex;flex-direction:column;gap:3px;min-width:0}
.infocard dt{font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.infocard dd{margin:0;font-size:14px;font-weight:600;color:var(--fg);overflow-wrap:anywhere}
.dgmin,.decbox{border:1px solid var(--line);border-radius:var(--radius-md);padding:14px;display:flex;flex-direction:column;gap:var(--space-xs);background:var(--surface)}
.dgmin p,.decbox p{margin:0;font-size:14px}
.decsteps{list-style:none;margin:4px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-xs)}
.decsteps li{border-top:3px solid var(--line);padding-top:6px;font-size:12.5px;color:var(--faint);display:flex;flex-direction:column}
.decsteps li small{font-size:11.5px}.decsteps li.done{border-color:var(--ok);color:var(--fg)}.decsteps li.now{border-color:var(--accent);color:var(--fg)}
.dkpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
@media (max-width:1000px){.dkpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.dk{border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:2px}
.dk b{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums}.dk span{font-size:13px;font-weight:600}.dk small{font-size:12px;color:var(--muted)}
.bars{display:flex;flex-direction:column;gap:var(--space-sm)}
.bar{display:grid;grid-template-columns:150px minmax(0,1fr) 28px;gap:10px;align-items:center;font-size:13px}
.bar .bt{height:10px;background:var(--sunk);border-radius:var(--radius-pill);overflow:hidden}.bar .bt span{display:block;height:100%;background:var(--accent);border-radius:var(--radius-pill)}
.bar b{text-align:right;font-variant-numeric:tabular-nums}
@media (max-width:560px){.bar{grid-template-columns:110px minmax(0,1fr) 24px}}
.home{display:flex;flex-direction:column;gap:var(--space-xl);padding-top:6px}
.home h2{font-size:22px;font-weight:700}
.wtiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.wtile{all:unset;box-sizing:border-box;cursor:pointer;position:relative;display:flex;flex-direction:column;gap:var(--space-xs);padding:22px 20px;border:1px solid var(--line);border-radius:16px;background:var(--surface);min-height:150px;transition:border-color .12s, transform .12s}
.wtile:hover{border-color:var(--accent);transform:translateY(-1px)}
.wtile:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wtile .wic{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:var(--sunk);color:var(--muted);margin-bottom:6px}
.wtile.has .wic{background:var(--accent-soft);color:var(--accent)}
.wtile b{font-size:17px;font-weight:700}.wtile small{font-size:13px;color:var(--muted)}
.wtile.has small{color:var(--accent);font-weight:600}
.wtile .wn{position:absolute;top:16px;right:16px;min-width:26px;height:26px;padding:0 8px;border-radius:var(--radius-pill);background:var(--accent);color:var(--accent-ink);font-size:13px;font-weight:700;display:grid;place-items:center}
.crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-xs);font-size:13px;color:var(--muted)}
.crumbs button{all:unset;cursor:pointer;color:var(--accent);font-weight:600}.crumbs button:hover{text-decoration:underline}
.crumbs button:focus-visible{outline:2px solid var(--accent)}.crumbs .sep{color:var(--faint)}
.wl-wrap{display:flex;flex-direction:column;gap:var(--space-md)}
.wl .pane-head{align-items:center}
.prow.dim{opacity:.7}
.vtrack{display:flex;flex-direction:column;gap:14px}
.vsteps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-xs)}
.vsteps li{display:flex;flex-direction:column;align-items:center;gap:var(--space-xs);font-size:12.5px;color:var(--muted);text-align:center;position:relative}
.vsteps li::before{content:"";position:absolute;top:14px;left:-50%;width:100%;height:2px;background:var(--line);z-index:0}
.vsteps li:first-child::before{display:none}
.vsteps li.done::before,.vsteps li.now::before{background:#1f8a5b}
.vsteps .vd{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--sunk);border:2px solid var(--line);font-weight:600;position:relative;z-index:1}
.vsteps li.done .vd{background:#1f8a5b;border-color:#1f8a5b;color:#fff}
.vsteps li.now{color:var(--fg);font-weight:600}.vsteps li.now .vd{border-color:#1f8a5b;color:#1f8a5b;background:var(--surface)}
.vthread{list-style:none;margin:0;padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--sunk);border-radius:12px}
.vthread .sys{display:flex;justify-content:center;gap:var(--space-sm);font-size:12px;color:var(--muted);text-align:center;flex-wrap:wrap}
.vthread .sys.out{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);padding:8px 12px;color:var(--fg);font-size:13px}
.vthread .msg{display:flex}.vthread .msg.mine{justify-content:flex-end}
.vthread .bub{max-width:min(520px,85%);background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg) 14px 14px 4px;padding:10px 12px;display:flex;flex-direction:column;gap:3px}
.vthread .mine .bub{background:#fde8ef;border-color:#f6c3d4;border-radius:var(--radius-lg) 14px 4px 14px;color:#3b0d1f}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .vthread .mine .bub{background:#3a1626;border-color:#5a2238;color:#fbe3ee}}
:root[data-theme="dark"] .vthread .mine .bub{background:#3a1626;border-color:#5a2238;color:#fbe3ee}
.vthread .bub b{font-size:12px}.vthread .bub p{margin:0;font-size:14px;line-height:1.5}.vthread time{font-size:11.5px;color:var(--muted)}
.vreply{display:flex;flex-direction:column;gap:10px}
.ev-done{text-align:center;display:flex;flex-direction:column;align-items:center;gap:var(--space-md);padding:28px 12px}
.ev-done .ev-ic{background:#1f8a5b;color:#fff}.ev-done h2{font:700 28px "Lexend",var(--sans)}.ev-done p{margin:0;max-width:52ch;color:var(--muted)}
.ev-code{display:flex;gap:10px;align-items:center}.ev-code code{font:600 22px var(--mono);letter-spacing:.06em;padding:10px 16px;border:2px dashed var(--line-strong);border-radius:var(--radius-md)}
.ev-trackform{border-top:1px solid var(--line);padding-top:16px;display:flex;flex-direction:column;gap:var(--space-sm)}
.ev-trackform input{max-width:240px}
.ev-sechead h2{font-size:19px;font-weight:600}
.ev .btn.primary,.ess .ev .btn.primary{background:#d11a5b;border-color:#d11a5b;color:#fff}
.ev-tag{text-align:center;font-size:13px;margin:4px 0 0;color:var(--fg)}.ev-tag span{color:var(--muted)}.ev-tag b{color:#2e3a9f}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .ev-tag b{color:#9fb0ff}}
:root[data-theme="dark"] .ev-tag b{color:#9fb0ff}
input[readonly]{background:var(--sunk);color:var(--muted)}
.anon{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line-strong);border-radius:var(--radius-md);padding:12px;cursor:pointer;font-size:14px}
.anon input{width:auto;margin-top:3px}.anon span{display:flex;flex-direction:column;gap:2px}.anon small{font-size:12px;color:var(--muted)}
.anon:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}
.review{display:flex;flex-direction:column;gap:var(--space-md)}
.review .ph{display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-sm)}.review h4{margin:0;font-size:15px}
.pertabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-sm)}
.pertabs button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--radius-md)}
.pertabs button b{font-size:14px;font-weight:600}.pertabs button small{font-size:12px;color:var(--muted)}
.pertabs button .pill{align-self:flex-start;margin-top:3px}
.pertabs button[aria-selected="true"]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.pertabs button:disabled{opacity:.5;cursor:not-allowed}.pertabs button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.perbody{display:flex;flex-direction:column;gap:10px}
.gcard{border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden}
.ghead{display:flex;gap:10px;align-items:flex-start;padding:12px;font-size:14px;font-weight:500;background:var(--sunk)}
.ghead .qn{width:24px;height:24px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:12px;font-weight:600;display:grid;place-items:center;flex:none}
.gcols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.gcols>div{padding:12px;display:flex;flex-direction:column;gap:var(--space-sm);min-width:0}
.gcols>div+div{border-left:1px solid var(--line)}
@media (max-width:640px){.gcols{grid-template-columns:1fr}.gcols>div+div{border-left:0;border-top:1px solid var(--line)}}
.gcols p{margin:0;font-size:13.5px}
.rate{align-self:flex-start;font-size:12px;font-weight:600;border-radius:var(--radius-pill);padding:3px 10px}
.r-met{background:var(--ok-soft);color:var(--ok)}.r-partial{background:var(--warn-soft);color:var(--warn)}.r-not{background:var(--bad-soft);color:var(--bad)}
.rseg{display:flex;flex-wrap:wrap;gap:var(--space-xs)}
.rseg label{display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;border:1px solid var(--line-strong);border-radius:var(--radius-pill);padding:5px 10px;cursor:pointer}
.rseg input{width:auto;margin:0}.rseg label:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}
.revsum{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-md);align-items:start;background:var(--sunk);border-radius:var(--radius-md);padding:12px 14px}
.revsum p{margin:4px 0 0;font-size:14px}.revsum>div:last-child{display:flex;flex-direction:column;gap:4px;align-items:flex-start}
@media (max-width:560px){.revsum{grid-template-columns:1fr}}
.goallist{margin:6px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:var(--space-xs);font-size:14px}
.plist{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.plist li+li{border-top:1px solid var(--line)}
.prow{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:36px minmax(0,1fr) auto 18px;align-items:center;gap:var(--space-md);width:100%;padding:12px 14px}
.prow:hover{background:var(--sunk)}.prow:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.prow .pic{width:34px;height:34px;border-radius:9px;background:var(--sunk);display:grid;place-items:center;color:var(--muted)}
.prow .pic.done{background:var(--ok-soft);color:var(--ok)}
.ta-page{max-width:1000px;width:100%;margin:0 auto}
.prow .pic.todo{background:var(--ess-orange-soft);color:var(--ess-orange)}
.prow .pmain{display:flex;flex-direction:column;min-width:0}.prow .pmain b{font-size:14px;font-weight:600}
.prow .pmain small{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prow .chev{color:var(--muted)}
@media (max-width:560px){.prow{grid-template-columns:34px minmax(0,1fr) 16px}.prow .pill{grid-column:2;grid-row:2;justify-self:start}.prow .chev{grid-row:1/3;grid-column:3}}
.back{align-self:flex-start;font-size:13px}
.kindseg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-sm)}
@media (max-width:560px){.kindseg{grid-template-columns:1fr}}
.kindseg button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:var(--space-sm);padding:12px 14px;border:1px solid var(--line);border-radius:var(--radius-md);font-size:14px;font-weight:600;flex-wrap:wrap}
.kindseg button:hover{background:var(--sunk)}
.kindseg button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}
.kindseg button:focus-visible,.fseg button:focus-visible,.pitem:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.kindseg .kc{font-size:12px;font-weight:500;color:var(--muted);margin-right:auto}
.proc{display:grid;grid-template-columns:280px minmax(0,1fr);gap:var(--space-lg);align-items:start}
@media (max-width:900px){.proc{grid-template-columns:1fr}}
.proc-list{display:flex;flex-direction:column;gap:10px;position:sticky;top:12px}
@media (max-width:900px){.proc-list{position:static}}
.proc-list ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--space-sm)}
.fseg{display:inline-flex;background:var(--sunk);border-radius:var(--radius-sm);padding:3px;gap:2px;align-self:flex-start}
.fseg button{all:unset;cursor:pointer;font-size:12.5px;font-weight:500;padding:5px 10px;border-radius:6px;color:var(--muted)}
.fseg button[aria-pressed="true"]{background:var(--surface);color:var(--fg);box-shadow:0 0 0 1px var(--line)}
.pitem{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:4px;width:100%;padding:12px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface)}
.pitem:hover{border-color:var(--line-strong)}
.pitem[aria-current="true"]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.pitem .pt{display:flex;justify-content:space-between;align-items:center;gap:var(--space-sm);font-size:14px}
.pitem .ps{font-size:12px;color:var(--muted)}
.pitem .pill{align-self:flex-start}
.dot{width:8px;height:8px;border-radius:50%;flex:none;background:currentColor;padding:0}
.proc-detail{border:1px solid var(--line);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:var(--space-xl);min-width:0}
@media (max-width:560px){.proc-detail{padding:14px}}
.proc-head h3{font-size:18px;margin-top:4px}
.pmeta{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px 16px;margin:12px 0 0}
.pmeta div{display:flex;flex-direction:column;gap:3px;min-width:0}
.pmeta dt{font-size:11.5px;color:var(--muted)}.pmeta dd{margin:0;font-size:14px;overflow-wrap:anywhere}
.allegation{background:var(--sunk);border-radius:var(--radius-md);padding:14px;display:flex;flex-direction:column;gap:var(--space-xs)}
.allegation p{margin:0;font-size:14.5px;line-height:1.55}
.qa-form{display:flex;flex-direction:column;gap:10px}
.qa-form .ph{display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-sm);flex-wrap:wrap}
.qa-form h4{margin:0;font-size:15px}
.qcard{display:grid;grid-template-columns:28px minmax(0,1fr);gap:6px 10px;padding:12px;border:1px solid var(--line);border-radius:var(--radius-md);font-weight:400}
.qcard .qn{width:24px;height:24px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:12px;font-weight:600;display:grid;place-items:center}
.qcard .qt{font-size:14px;font-weight:500;align-self:center}
.qcard textarea,.qcard .ans{grid-column:2}
.qcard .ans{margin:0;font-size:14px;color:var(--fg);background:var(--sunk);border-radius:var(--radius-sm);padding:8px 10px}
.qcard.corr{border-color:var(--warn)}
.qcard.corr .qn{background:var(--warn-soft);color:var(--warn)}
.sigtrack{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden}
.sigtrack li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
.sigtrack li:last-child{border-bottom:0}
.sigtrack .av{width:30px;height:30px;border-radius:50%;background:var(--sunk);display:grid;place-items:center;font-size:11px;font-weight:600;flex:none}
.sigtrack li.ok .av{background:var(--ess-green-soft);color:var(--ess-green)}
.sigtrack .who{flex:1;min-width:0;display:flex;flex-direction:column}.sigtrack .who b{font-size:13.5px;font-weight:600}.sigtrack .who small{font-size:12px;color:var(--muted)}
.sigtrack .when{font-size:12.5px;color:var(--warn);display:flex;align-items:center;gap:4px;white-space:nowrap}
.sigtrack li.ok .when{color:var(--ess-green)}
.docdet{border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden}
.docdet summary{cursor:pointer;padding:10px 14px;font-size:13px;font-weight:500;background:var(--sunk)}
.docdet[open] summary{border-bottom:1px solid var(--line)}
#main{display:flex;flex-direction:column;gap:14px}
.ltabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-sm)}
@media (max-width:1000px){.ltabs{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:700px){.ltabs{grid-template-columns:1fr}}
.ltab{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:2px;padding:12px 14px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface)}
.ltab:hover{border-color:var(--line-strong)}
.ltab[aria-selected="true"]{border-color:var(--accent);box-shadow:inset 0 -3px 0 var(--accent)}
.ltab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.lt-t{font-weight:600;font-size:15px;display:flex;gap:var(--space-sm);align-items:center}
.lt-s{font-size:12px;color:var(--muted)}
.list .sgrp{font-size:12px;font-weight:600;color:var(--accent);padding:10px 14px 4px;border-bottom:1px solid var(--line)}
.ess .btn.primary{background:var(--ess-blue);border-color:var(--ess-blue)}
.ess .task{border-color:var(--ess-blue)}
@media (prefers-reduced-motion:no-preference){.list li button,.btn,.rolebtn,.tab,.ess-item,.qa-btn{transition:background .15s}}
/* ===== Employee experience refresh ===== */
.ess{min-height:680px}
.ess-body{gap:20px}
.top-name{font-weight:600;color:var(--ess-fg)}
.motion{all:unset;cursor:pointer;display:grid;place-items:center;width:34px;height:34px;border-radius:var(--radius-sm);color:var(--ess-muted)}
.motion:hover{background:var(--ess-hover)}.motion[aria-pressed="true"]{background:var(--ess-blue-soft);color:var(--ess-blue)}
.motion:focus-visible{outline:2px solid var(--ess-blue)}
/* hero with gentle motion */
.hero{position:relative;overflow:hidden;border-radius:20px;color:#fff;padding:30px 30px 28px;background:linear-gradient(125deg,#1e3a8a 0%,#2563eb 48%,#0e7490 100%);isolation:isolate}
.hero .blob{position:absolute;border-radius:50%;filter:blur(36px);opacity:.55;z-index:-1}
.hero .b1{width:260px;height:260px;background:#60a5fa;top:-90px;right:8%}
.hero .b2{width:200px;height:200px;background:#22d3ee;bottom:-90px;right:30%}
.hero .b3{width:160px;height:160px;background:#a78bfa;top:20%;left:-50px;opacity:.35}
@media (prefers-reduced-motion:no-preference){:root:not(.calm) .hero .blob{animation:drift 16s ease-in-out infinite alternate}:root:not(.calm) .hero .b2{animation-duration:20s;animation-delay:-6s}:root:not(.calm) .hero .b3{animation-duration:24s}}
@keyframes drift{to{transform:translate(60px,30px) scale(1.18)}}
.hero-in{display:flex;flex-direction:column;gap:var(--space-xs);max-width:640px}
.hero .hello{font-size:15px;opacity:.85}
.hero h2{font:700 clamp(28px,4.4vw,40px)/1.05 "Lexend",var(--sans);color:#fff;letter-spacing:-.01em}
.hero p{margin:4px 0 10px;font-size:15.5px;opacity:.92}.hero p b{font-weight:700}
.hero-btn{background:#fff;color:#1e3a8a;border-color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:var(--space-xs);min-height:44px;padding:0 18px;border-radius:var(--radius-pill)}
.hero-btn:hover{background:#eef4ff}
.hero-ghost{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.45);min-height:44px;border-radius:var(--radius-pill);padding:0 16px}
.hero-ghost:hover{background:rgba(255,255,255,.22)}
.hero .btn:focus-visible{outline:3px solid #fff;outline-offset:2px}
/* page header */
.phero{border-radius:16px;padding:20px 22px;background:linear-gradient(120deg,var(--ess-blue-soft),var(--ess-bg) 70%);border:1px solid var(--ess-line);display:flex;justify-content:space-between;align-items:center;gap:var(--space-md);flex-wrap:wrap}
.phero h2{font:700 22px/1.2 "Lexend",var(--sans)}.phero p{margin:4px 0 0;font-size:14px;color:var(--ess-muted)}
/* dashboard */
.dgrid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:20px;align-items:start}
@media (max-width:980px){.dgrid{grid-template-columns:1fr}}
.dcol{display:flex;flex-direction:column;gap:20px;min-width:0}
.dsec{display:flex;flex-direction:column;gap:10px}
.dsec h3{font-size:15px;font-weight:700}
.dsec-h{display:flex;justify-content:space-between;align-items:center}
.dsec-h .btn.link{color:var(--ess-blue);font-size:13px}
.tcards,.rcards{display:flex;flex-direction:column;gap:10px}
.tcard,.rcard,.ucard,.qtile,.schip{all:unset;box-sizing:border-box;cursor:pointer;transition:transform .12s, box-shadow .12s, border-color .12s}
.tcard{display:grid;grid-template-columns:42px minmax(0,1fr) 18px;align-items:center;gap:var(--space-md);padding:14px 16px;border-radius:var(--radius-lg);background:var(--ess-bg);border:1px solid var(--ess-line);border-left:4px solid var(--ess-orange)}
.tcard .tic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--ess-orange-soft);color:var(--ess-orange)}
.tt{display:flex;flex-direction:column;gap:2px;min-width:0}.tt b{font-size:14.5px;font-weight:600}.tt small{font-size:12.5px;color:var(--ess-muted)}
.tcard .chev,.rcard .chev{color:var(--ess-muted)}
.tcard:hover,.rcard:hover,.ucard:hover,.qtile:hover{transform:translateY(-1px);box-shadow:0 8px 20px -14px rgba(15,23,42,.45);border-color:var(--ess-blue)}
.tcard:focus-visible,.rcard:focus-visible,.ucard:focus-visible,.qtile:focus-visible,.schip:focus-visible{outline:2px solid var(--ess-blue);outline-offset:2px}
.rcard{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:6px 12px;padding:14px 16px;border-radius:var(--radius-lg);background:var(--ess-bg);border:1px solid var(--ess-line)}
.rcard .ess-cnt{grid-column:1/-1;justify-self:start}
.mini{display:flex;gap:3px}.mini i{width:16px;height:5px;border-radius:3px;background:var(--ess-line)}.mini i.on{background:var(--ess-blue)}
@media (max-width:560px){.rcard{grid-template-columns:minmax(0,1fr)}.mini{order:3}}
.ucards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ucard{display:flex;gap:var(--space-md);align-items:center;padding:12px 14px;border-radius:var(--radius-lg);border:1px solid var(--ess-line);background:var(--ess-bg);font-size:13.5px;font-weight:500}
.ucard .ud{width:46px;height:50px;border-radius:12px;background:var(--ess-blue-soft);color:var(--ess-blue);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none}
.ucard .ud b{font-size:18px;line-height:1}.ucard .ud small{font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.qtiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
@media (max-width:560px){.qtiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
.qtile{display:flex;flex-direction:column;gap:var(--space-sm);padding:14px;border-radius:var(--radius-lg);border:1px solid var(--ess-line);background:var(--ess-bg);font-size:13px;font-weight:600;min-height:86px}
.qtile span{width:36px;height:36px;border-radius:var(--radius-md);display:grid;place-items:center;background:var(--ess-blue-soft);color:var(--ess-blue)}
.schip{display:inline-flex;align-items:center;gap:var(--space-xs);padding:8px 12px;border-radius:var(--radius-pill);border:1px solid var(--ess-line);font-size:12.5px;color:var(--ess-muted);min-height:36px}
.schip:hover{color:var(--ess-fg);border-color:var(--ess-blue)}
/* step forms */
.wbar{display:flex;flex-direction:column;gap:10px;padding-bottom:6px}
.wprog{list-style:none;margin:0;padding:0;display:flex;gap:var(--space-xs);flex-wrap:wrap}
.wprog li{display:flex;align-items:center;gap:var(--space-sm);font-size:13px;color:var(--muted);padding:6px 12px 6px 6px;border-radius:var(--radius-pill);background:var(--sunk)}
.wprog li span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:1px solid var(--line);font-size:12px;font-weight:700}
.wprog li b{font-weight:600}
.wprog li.now{background:var(--accent-soft);color:var(--fg)}.wprog li.now span{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.wprog li.done{color:var(--fg)}.wprog li.done span{background:#16a34a;border-color:#16a34a;color:#fff}
@media (max-width:560px){.wprog li:not(.now) b{display:none}.wprog li{padding:4px}}
.wmeter{height:4px;border-radius:var(--radius-pill);background:var(--sunk);overflow:hidden}.wmeter i{display:block;height:100%;background:var(--accent);transition:width .3s}
.wdraft{margin:0;font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:var(--space-xs);flex-wrap:wrap}
.wstep{display:flex;flex-direction:column;gap:14px;min-width:0}
.wnav{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:14px}
.wnav .sp{flex:1}.wnav .btn{min-height:42px}.wnav .wnerr{width:100%}
.wreview{display:flex;flex-direction:column;gap:10px}
.rvsec{border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:var(--space-sm)}
.rvh{display:flex;justify-content:space-between;align-items:center}.rvh b{font-size:14px}
.rvsec dl{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 16px}
.rvsec dt{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}.rvsec dd{margin:2px 0 0;font-size:13.5px;overflow-wrap:anywhere;white-space:pre-wrap}
[aria-invalid="true"]{border-color:var(--bad)!important;box-shadow:0 0 0 3px var(--bad-soft)}
.donecard{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;padding:36px 16px;border:1px solid var(--ess-line);border-radius:20px;background:var(--ess-bg)}
.donecard .dic{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#16a34a;color:#fff}
@media (prefers-reduced-motion:no-preference){:root:not(.calm) .donecard .dic{animation:pop .4s ease-out}}
@keyframes pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.donecard h3{font:700 22px "Lexend",var(--sans)}.donecard p{margin:0;max-width:52ch;color:var(--ess-muted)}
.dref{font:600 13px var(--mono);padding:4px 10px;border-radius:var(--radius-sm);background:var(--ess-hover)}
.wsbody{display:flex;flex-direction:column;gap:14px;min-width:0}
.wsbody .panel{border-radius:var(--radius-lg)}
/* touch targets + mobile navigation */
.ess-item{min-height:38px}
@media (max-width:820px){
  .ess-side{flex-direction:row;overflow-x:auto;gap:var(--space-xs);padding:10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .ess-side::-webkit-scrollbar{display:none}
  .ess-brand,.ess-grp{display:none}
  .ess-item{flex:none;min-height:44px;padding:0 14px;border:1px solid var(--ess-line);border-radius:var(--radius-pill);background:var(--ess-bg)}
  .ess-item[aria-current="page"]{background:var(--ess-blue);color:#fff;border-color:var(--ess-blue)}.ess-item[aria-current="page"] svg{color:#fff}
  .ess-item .grow{flex:none}
  .hero{padding:24px 20px}.ucards{grid-template-columns:1fr}
  .top-name{display:none}
}

/* ===== Calm BML theme for the portal and EmployeeVoice ===== */
.ess{--sunk:var(--ess-sunk);background:var(--ess-page);font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif}
.ess-main{background:var(--ess-page)}
.ess-side{background:var(--ess-side)}
.ess-top{background:var(--ess-page)}
.ess-logo{background:var(--ess-blue)}
.ess-item{color:var(--ess-fg);border:1px solid transparent}
.ess-item:hover{background:var(--ess-hover)}
.ess-item[aria-current="page"]{background:var(--ess-bg);border-color:var(--ess-line);box-shadow:inset 3px 0 0 var(--ess-blue)}
.ess-item[aria-current="page"] svg{color:var(--ess-blue)}
.ess-cnt{background:var(--ess-blue)}
.phero{background:var(--ess-bg)}
.wsbody .panel,.ess .panel{background:var(--ess-bg)}
.ess-item:focus-visible,.ess .btn:focus-visible{outline:2px solid var(--ess-blue);outline-offset:2px}
@media (max-width:820px){.ess-item[aria-current="page"]{background:var(--ess-blue);color:#fff;box-shadow:none}.ess-item[aria-current="page"] svg{color:#fff}}
/* EmployeeVoice landing */
@property --mx{syntax:"<percentage>";inherits:false;initial-value:18%}
@property --my{syntax:"<percentage>";inherits:false;initial-value:12%}
.ev{--accent:#b8141f;--accent-soft:#fbeaea;--accent-ink:#fff}
.ev .btn.primary,.ess .ev .btn.primary{background:#b8141f;border-color:#b8141f;color:#fff}
.ev-land{position:relative;isolation:isolate;max-width:760px;margin:0;gap:14px;padding:6px 0 10px}
.ev-glow{position:absolute;inset:-22px -40px;z-index:-1;pointer-events:none;border-radius:28px;
  background:radial-gradient(520px circle at var(--mx) var(--my),var(--glow-a),transparent 62%),radial-gradient(480px circle at calc(100% - var(--mx)) calc(100% - var(--my)),var(--glow-b),transparent 60%);
  transition:--mx .9s ease,--my .9s ease}
@media (prefers-reduced-motion:reduce){.ev-glow{transition:none}}
:root.calm .ev-glow{transition:none}
.evh{display:flex;align-items:center;gap:var(--space-md);flex-wrap:wrap}
.evh h2{font:700 28px/1.15 "Inter",var(--sans);letter-spacing:-.015em;color:var(--ess-fg)}
.evsubs{background:var(--ess-bg);color:var(--ess-fg);border:1px solid var(--ess-line);border-radius:var(--radius-pill);min-height:34px;padding:0 14px;display:inline-flex;align-items:center;gap:var(--space-xs);font-weight:600}
.evsubs:hover{border-color:var(--ess-blue);background:var(--ess-bg)}
.evn{font-size:11px;font-weight:600;color:var(--ess-muted);background:var(--ess-sunk);border-radius:var(--radius-pill);padding:1px 7px}
.evsub{margin:-6px 0 0;font-size:15px;color:var(--ess-muted)}
.evsafe{margin:0;display:inline-flex;align-items:center;gap:var(--space-xs);font-size:12.5px;color:var(--ess-muted)}
.evsafe svg{color:#15803d}
.evgrp{display:flex;flex-direction:column;gap:var(--space-sm);margin-top:6px}
.evgrp h3{font-size:11.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--ess-muted)}
.evlist{list-style:none;margin:0;padding:0;background:var(--ess-bg);border:1px solid var(--ess-line);border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 1px 2px rgba(28,25,23,.04)}
.evlist li+li{border-top:1px solid var(--ess-line)}
.evrow{all:unset;box-sizing:border-box;cursor:pointer;width:100%;display:grid;grid-template-columns:36px minmax(0,1fr) 18px;align-items:center;gap:14px;min-height:60px;padding:10px 16px;transition:background .15s}
.evrow:hover{background:var(--ess-hover)}
.evrow:hover .evc{color:var(--ess-blue);transform:translateX(2px)}
.evrow:focus-visible{outline:2px solid var(--ess-blue);outline-offset:-2px}
.evi{width:36px;height:36px;border-radius:var(--radius-md);display:grid;place-items:center;flex:none}
.evi.teal,.ev-strip.teal .ev-ic,.ev-dot.teal{background:var(--t-teal-bg);color:var(--t-teal)}
.evi.gold,.ev-strip.gold .ev-ic,.ev-dot.gold{background:var(--t-gold-bg);color:var(--t-gold)}
.evi.rose,.ev-strip.rose .ev-ic,.ev-dot.rose{background:var(--t-rose-bg);color:var(--t-rose)}
.evi.plum,.ev-strip.plum .ev-ic,.ev-dot.plum{background:var(--t-plum-bg);color:var(--t-plum)}
.evi.indigo,.ev-strip.indigo .ev-ic,.ev-dot.indigo{background:var(--t-indigo-bg);color:var(--t-indigo)}
.evt{display:flex;flex-direction:column;gap:1px;min-width:0}.evt b{font-size:15px;font-weight:600;color:var(--ess-fg)}.evt small{font-size:13px;color:var(--ess-muted)}
.evc{color:var(--ess-muted);display:grid;transition:transform .15s,color .15s}
@media (max-width:560px){.evrow{min-height:64px;padding:12px 14px}}
.evtrack{background:var(--ess-bg);border:1px solid var(--ess-line);border-radius:var(--radius-lg);margin-top:6px}
.evtrack summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:20px minmax(0,1fr) 18px;align-items:center;gap:var(--space-md);min-height:52px;padding:0 16px;font-size:14px;font-weight:600;color:var(--ess-fg)}
.evtrack summary::-webkit-details-marker{display:none}
.evtrack summary svg{color:var(--ess-muted)}
.evtrack summary>svg:last-child{transition:transform .15s}.evtrack[open] summary>svg:last-child{transform:rotate(90deg)}
.evtrack summary:focus-visible{outline:2px solid var(--ess-blue);outline-offset:-2px;border-radius:var(--radius-lg)}
.evtrack form{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px;padding:0 16px 16px}
.evtrack form label{flex:1;min-width:200px}
.evtrack form .flag{width:100%}
/* form and record headers: white with a tinted icon */
.ev-strip{background:var(--ess-bg)!important;color:var(--ess-fg)!important;border:1px solid var(--ess-line);border-radius:var(--radius-lg);padding:14px 18px;grid-template-columns:44px minmax(0,1fr);gap:14px}
.ev-strip .ev-ic{width:44px;height:44px;border-radius:12px}
.ev-strip .ev-ct b{font-size:17px;font-weight:700}.ev-strip .ev-ct small{font-size:13px;color:var(--ess-muted);opacity:1}
.prow .pic.ev-dot{border-radius:var(--radius-md)}
:root.calm *{transition:none!important}
[hidden]{display:none!important}
label.f{display:block}
label.f>input,label.f>select,label.f>textarea{display:block;margin-top:6px}
label.f>.h{margin-left:6px}
label.f>.req{margin-left:2px}


/* ===== One theme across the whole demo ===== */
.ess{font-family:var(--sans)}
.ev-glow{display:none}
.ev-land{padding-top:0}
/* page headers match the EmployeeVoice header on every page */
.phero{background:transparent;border:0;border-radius:0;padding:0 0 4px}
.phero h2{font:700 28px/1.15 var(--sans);letter-spacing:-.015em;color:var(--ess-fg)}
.phero p{font-size:15px;color:var(--ess-muted);margin-top:4px}
.wtile,.ltab,.ess-card,.ess .panel,.recwrap,.evlist,.evtrack{box-shadow:0 1px 2px rgba(28,25,23,.04)}
.wtile{border-radius:var(--radius-lg)}.wtile .wic{border-radius:var(--radius-md)}
.ess .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
/* records register */
.recs{display:flex;flex-direction:column;gap:var(--space-md)}
.recchips{display:flex;flex-wrap:wrap;gap:var(--space-sm)}
.recchip{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:var(--space-xs);min-height:36px;padding:0 12px;border:1px solid var(--ess-line);border-radius:var(--radius-pill);background:var(--ess-bg);font-size:13px;font-weight:600;color:var(--ess-fg)}
.recchip span{font-size:11px;font-weight:600;color:var(--ess-muted);background:var(--ess-sunk);border-radius:var(--radius-pill);padding:1px 7px}
.recchip:hover{border-color:var(--line-strong)}
.recchip[aria-pressed="true"]{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
.recchip[aria-pressed="true"] span{background:var(--ess-bg);color:var(--accent)}
.recchip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.recbar{display:flex;flex-wrap:wrap;gap:var(--space-sm);align-items:center}
.recbar select{width:auto;min-height:40px}
.recq{flex:1;min-width:220px;display:flex;align-items:center;gap:var(--space-sm);background:var(--ess-bg);border:1px solid var(--ess-line);border-radius:var(--radius-md);padding:0 12px;color:var(--ess-muted)}
.recq input{border:0;background:transparent;min-height:38px;padding:0;flex:1;outline:none;box-shadow:none}
.recq:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.recsum{margin:0;font-size:12.5px;color:var(--ess-muted)}
.recwrap{background:var(--ess-bg);border:1px solid var(--ess-line);border-radius:var(--radius-lg);overflow:auto}
.rect{width:100%;border-collapse:collapse;font-size:13.5px}
.rect th{text-align:left;font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--ess-muted);padding:10px 14px;border-bottom:1px solid var(--ess-line);background:var(--ess-sunk);white-space:nowrap}
.rect td{padding:12px 14px;border-bottom:1px solid var(--ess-line);vertical-align:top}
.rect tr:last-child td{border-bottom:0}
.rect tbody tr[data-rec]{cursor:pointer}
.rect tbody tr[data-rec]:hover{background:var(--ess-hover)}
.rect tbody tr[data-rec]:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.rect td b{font-weight:600;display:block}.rect td small{display:block;color:var(--ess-muted);font-size:12px}
.rect td.mono{font:500 12.5px var(--mono);white-space:nowrap}
.rect td:nth-child(6),.rect td:nth-child(7){white-space:nowrap;color:var(--ess-muted)}
.rect tr.none td{text-align:center;color:var(--ess-muted);padding:28px}
.rect .pill{white-space:nowrap}
.prow .pill{white-space:nowrap}
.rect.self th:nth-child(3),.rect.self td[data-l="Employee"]{display:none}
.rtype{display:inline-flex;align-items:center;gap:var(--space-xs);white-space:nowrap;color:var(--ess-muted)}
.recro{margin:0 0 10px;display:inline-flex;align-items:center;gap:var(--space-xs);font-size:12.5px;color:var(--ess-muted)}
@media (max-width:720px){
  .rect thead{display:none}
  .rect,.rect tbody,.rect tr,.rect td{display:block;width:100%}
  .rect tbody tr[data-rec]{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:12px 14px;border-bottom:1px solid var(--ess-line)}
  .rect td{border:0;padding:0}
  .rect td[data-l="Reference"]{grid-column:1}.rect td[data-l="Status"]{grid-column:2;grid-row:1;justify-self:end}
  .rect td[data-l="Type"],.rect td[data-l="Employee"],.rect td[data-l="Details"]{grid-column:1/-1}
  .rect td[data-l="Opened"]::before{content:"Opened "}.rect td[data-l="Last update"]::before{content:"Updated "}
  .rect td[data-l="Opened"],.rect td[data-l="Last update"]{font-size:12px;grid-column:auto}
}
.vthread{background:var(--ess-sunk)}
.vthread .mine .bub{background:var(--ess-bg)!important;border-color:var(--ess-line)!important;color:var(--ess-fg)!important;box-shadow:inset 3px 0 0 var(--accent)}
.ess-card{background:var(--ess-bg)}
.ev .anon,.ess .anon{background:var(--ess-bg)!important;border-color:var(--ess-line)!important}
.ev .anon:has(input:checked),.ess .anon:has(input:checked){border-color:var(--accent)!important}

/* Claude panel */
.ai{background:var(--ess-bg);border:1px solid var(--ess-line);border-radius:var(--radius-lg);padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 2px rgba(28,25,23,.04);margin-bottom:12px}
.home .ai{margin:16px 0 0}
.ai-head{display:flex;gap:10px;align-items:flex-start}.ai-head b{font-size:14px;display:block}.ai-head small{font-size:12.5px;color:var(--ess-muted)}
.ai-ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);flex:none}
.ai-chips{display:flex;flex-wrap:wrap;gap:var(--space-xs)}
.aichip{all:unset;box-sizing:border-box;cursor:pointer;min-height:34px;padding:6px 12px;line-height:1.3;border:1px solid var(--ess-line);border-radius:var(--radius-md);font-size:13px;font-weight:600;color:var(--ess-fg);display:inline-flex;align-items:center;background:var(--ess-bg)}
.aichip:hover{border-color:var(--line-strong);background:var(--ess-hover)}
.aichip.pri{border-color:var(--accent);color:var(--accent)}
.aichip.on{background:var(--accent-soft)}
.aichip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.ai-out{border-top:1px solid var(--ess-line);padding-top:10px;display:flex;flex-direction:column;gap:10px}
.ai-text{font-size:13.5px;line-height:1.55;max-height:420px;overflow:auto}
.ai-text p{margin:0 0 6px}.ai-text ul{margin:0 0 6px;padding-left:18px}.ai-text li{margin:2px 0}.ai-text h4{margin:8px 0 4px;font-size:13.5px}
.ai-think{color:var(--ess-muted);animation:aip 1.4s ease-in-out infinite}
@keyframes aip{50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){.ai-think{animation:none}}
.ai-prev{margin:0;display:flex;flex-direction:column;gap:var(--space-sm)}.ai-prev dt{font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--ess-muted)}.ai-prev dd{margin:2px 0 0;white-space:pre-line;font-size:13.5px}
.ai-foot{display:flex;flex-wrap:wrap;gap:var(--space-xs);align-items:center}.ai-note{font-size:12.5px;color:var(--ess-muted)}
.ai-ask{display:flex;gap:var(--space-xs)}.ai-ask input{flex:1;min-height:36px}

/* PM Appeals */
.apwin{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-md);background:var(--ess-bg);border:1px solid var(--ess-line);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:4px}
.apwin>div:first-of-type{flex:1;min-width:220px}.apwin b{display:block;font-size:14.5px}.apwin small{font-size:13px;color:var(--ess-muted)}
.apwin.open{box-shadow:inset 3px 0 0 var(--accent)}
.apopen{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;width:100%}.apopen .f{margin:0}
.sech{font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ess-muted);margin:8px 0 0}
.apins{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:var(--space-xs);font-size:14px}
.apmeta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px}
.apdec{background:var(--ess-bg);border:1px solid var(--ess-line);border-radius:var(--radius-lg);padding:16px;display:flex;flex-direction:column;gap:var(--space-md);box-shadow:inset 3px 0 0 var(--accent)}
.apdec-h{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}.apdec-h>div{flex:1;min-width:200px}.apdec-h b{display:block;font-size:15px}.apdec-h small{font-size:12.5px;color:var(--ess-muted)}
.apdec p{margin:0;font-size:14px;line-height:1.6}
.apgrid{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.apgrid dt{font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--ess-muted)}.apgrid dd{margin:2px 0 0;font-size:14px}
.vsteps small.apd{display:block;font-size:11.5px;color:var(--ess-muted);font-weight:400}


/* side panels move below the form on every page */
.split:has(> form){grid-template-columns:minmax(0,1fr)}
.split:has(> form) > aside.route{position:static;border:0;border-top:1px solid var(--line);padding-top:16px;background:transparent;border-radius:0;max-width:none}
.split:has(> form) > aside.route .plist,.split:has(> form) > aside.route > .card{max-width:none}
.prq table td small{display:block;color:var(--ess-muted);font-size:12px}.prq .prq-ck{width:auto}
.prq{display:flex;flex-direction:column;gap:var(--space-md);margin-bottom:12px}
.split:has(> form) > aside.route{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.split:has(> form) > aside.route > .eyebrow,.split:has(> form) > aside.route > p,.split:has(> form) > aside.route > .plist{grid-column:1/-1}
.split:has(> form) > aside.route > .card{padding:12px 14px;gap:var(--space-xs)}
.card .pill,.tat .pill{white-space:nowrap}
.amreq{margin-top:4px;border-top:1px solid var(--line);padding-top:10px}.amreq summary{cursor:pointer;font-size:13.5px;font-weight:600;color:var(--accent)}.amreq[open] summary{margin-bottom:8px}

/* Header: reset button beside the prototype badge (handover addition) */
.topright{display:flex;align-items:center;gap:var(--space-sm);flex-wrap:wrap}
````

### `js/config.js`

````javascript
/* =====================================================================
   Employee Relations Automation · configuration
   Policy lists, labels, roles and workflow statuses. Change wording and
   rules here. Loaded first; every other script reads these constants.
   ===================================================================== */

/* Branding used in the portal, notices and PDFs. */
const BRAND = {
  orgName: "Bank of Maldives",          // shown in the portal sidebar and Claude assist prompt
  legalName: "BANK OF MALDIVES PLC",    // letterhead on notices, forms and PDFs
  appName: "Employee Relations Automation",
  portalName: "OneUI ESS Portal"
};

const TODAY = new Date('2026-10-25T09:00:00');
const RANKS = ["Officer","Senior Officer","Assistant Manager","Manager","Senior Manager","Head","Director"];
const HEAD_RANK = 5;

const ROLES = {
  lead:{label:"ER Lead",full:"Employee Relations Lead",person:"ER Lead"},
  mgr:{label:"ER Manager",full:"Employee Relations Manager",person:"ER Manager"},
  head:{label:"ER Head",full:"Head of Total Rewards & Employee Relations",person:"ER Head"},
  pcd:{label:"P&C Director",full:"People & Culture Director",person:"P&C Director"},
  dg:{label:"D&G Committee Secretary",full:"D&G Committee",person:"D&G Committee Secretary"},
  comp:{label:"Compliance",full:"Compliance",person:"Compliance Officer"},
  ta:{label:"Talent Acquisition",full:"Talent Acquisition",person:"Talent Acquisition Officer"},
  chief:{label:"Office of the Chief",full:"Office of the Chief",person:"Office of the Chief"},
  staff:{label:"Staff (ESS Portal)",full:"Staff member",person:""}
};

const VERBAL_DISCLAIMER = "Verbal advice is not a disciplinary action. However, if these concerns persist or recur, a Cautionary Notice may be issued in line with the Bank\u2019s Disciplinary Procedure.";
const nowTime = () => new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});

const CLAUSES = {
  "3.1(1)":"Theft, fraud, dishonesty or behaviour that fundamentally breaches trust",
  "3.1(2)":"Violence, harassment or threatening behaviour",
  "3.1(3)":"Sexual harassment",
  "3.1(4)":"Overly physical affection or sexual gestures within office premises",
  "3.1(5)":"Insubordination: failure to comply with reasonable and lawful orders",
  "3.1(6)":"Gross neglect of duty",
  "3.1(7)":"Under the influence of illegal or intoxicating substances at work",
  "3.1(8)":"Smoking or vaping within Bank premises",
  "3.1(9)":"Act or omission leading to breach of trust and/or confidence",
  "3.1(10a)":"Unauthorised access to employee or customer information via Bank systems",
  "3.1(10b)":"Abuse of position using access rights outside job responsibilities",
  "3.1(10c)":"Sharing login credentials (usernames, passwords, OTPs)",
  "3.1(10d)":"Breach of the Conflict of Interest Policy",
  "3.1(10e)":"Foreign currency transactions with customers for personal gain",
  "3.1(11)":"Action that may lead the public to lose trust or damage the Bank's reputation",
  "3.1(12)":"Intentional or negligent act adversely affecting normal operations",
  "3.1(13)":"Unauthorised disclosure of confidential information",
  "3.1(14)":"Use of Bank facilities or position for political purposes",
  "3.1(15)":"Abandonment of post/position",
  "3.1(16)":"Conviction of a criminal offence",
  "3.1(17)":"Multiple and/or repeated misconduct",
  "3.2(1)":"Unauthorised absence or absent without leave",
  "3.2(2)":"Misuse of sick leave or other leave; attendance issues",
  "3.2(3)":"Failure to meet job responsibilities or performance standards",
  "3.2(4)":"Misuse of working hours or Bank facilities/resources",
  "3.2(5)":"Unauthorised use of the Bank's vehicles or other equipment"
};

const ACTIONS = {
  verbal:{label:"Verbal Advice",ref:"§5(1)",step:1},
  caution:{label:"Cautionary Notice",ref:"§5(2)",step:2},
  final:{label:"Final Warning Notice",ref:"§5(3)",step:3},
  dismiss:{label:"Dismissal",ref:"§5(4)",step:4}
};
const EXTRAS = {
  withhold:"Withholding of promotion, increment, bonus and credit facilities (§6(1))",
  recover:"Recovery of financial loss from salary (§6(2))",
  demote:"Demotion (§6(3))"
};
const SOURCES = {escalation:"Line manager concern",investigation:"Internal investigation",pip:"PIP outcome (underperformance)"};
const METHODS = {showcause:"Show cause notice",interview:"Meeting with minutes",verbal:"Verbal advice by line manager",pip:"PIP evidence from line manager"};
const ISSUE_TYPES = ["Attendance or absence","Conduct or behaviour","Use of Bank systems or resources","Customer complaint","Other"];
/* Employee Voice channels. "to" is who receives it; anon = anonymous submission allowed. */
const VOICE = {
  grievance:{label:"Formal grievance", title:"Formal grievance", prefix:"GRV-2026-", to:"People & Culture · Employee Relations", anon:false},
  harassment:{label:"Harassment complaint", title:"Harassment Complaint Form", prefix:"HC-2026-", to:"People & Culture · Employee Relations", anon:false},
  gender:{label:"Gender discrimination complaint", title:"Complaint Form for Gender Discrimination", prefix:"GD-2026-", to:"People & Culture · Employee Relations", anon:false},
  chief:{label:"Share with the Chief", title:"Concern or idea for the Chief", prefix:"CH-2026-", to:"Office of the Chief", anon:true},
  pc:{label:"Share with People & Culture", title:"Concern or idea for People & Culture", prefix:"PC-2026-", to:"People & Culture", anon:true}
};
const VOICE_CARD = {
  chief:{sub:"Ideas and feedback, anonymous if you prefer", icon:"bulb", cls:"teal"},
  pc:{sub:"Concerns and support, anonymous if you prefer", icon:"heart", cls:"gold"},
  grievance:{sub:"A serious issue, handled formally", icon:"scale", cls:"rose"},
  harassment:{sub:"Handled in confidence", icon:"shield", cls:"plum"},
  gender:{sub:"Unfair treatment because of gender", icon:"users", cls:"indigo"}
};
const VOICE_ORDER = ["chief","pc","grievance","harassment","gender"];
const VOICE_KINDS = {concern:"Concern", idea:"Idea or suggestion"};
const TA_PURPOSES = ["Internal vacancy","Promotion","Transfer","Secondment","Other"];
const STD_QUESTIONS = [
  "Do you admit or deny the allegation set out above?",
  "Explain the circumstances, including why this happened.",
  "Is there anything else, including any supporting documents, you want the Bank to consider before a decision is made?"
];
/* Test environment: one user per role. Staff and People Manager use the ESS Portal. */
const STAFF_USER = "EMP-11590", PM_USER = "EMP-07655";
/* Each team member's workspace, shown in their ESS Portal menu */
const WS = {
  "EMP-09120":{role:"lead",label:"Employee Relations Workspace",grp:"er"},
  "EMP-07210":{role:"mgr",label:"Employee Relations Workspace",grp:"er"},
  "EMP-04518":{role:"head",label:"Employee Relations Workspace",grp:"er"},
  "EMP-10544":{role:"comp",label:"Compliance Workspace",grp:"er"},
  "EMP-02215":{role:"pcd",label:"Director's Approvals",grp:"ws"},
  "EMP-08890":{role:"dg",label:"D&G Committee Workspace",grp:"ws"},
  "EMP-11208":{role:"ta",label:"Talent Acquisition Workspace",grp:"ws"},
  "EMP-03307":{role:"chief",label:"Office of the Chief",grp:"ws"}
};
const TEST_USERS = [[STAFF_USER,"Staff"],[PM_USER,"People Manager"],["EMP-09120","ER Lead"],["EMP-07210","ER Manager"],["EMP-04518","ER Head"],["EMP-02215","PCD"],["EMP-08890","D&G Committee Secretary"],["EMP-10544","Compliance"],["EMP-11208","Talent Acquisition"],["EMP-03307","Office of the Chief"]];
const STATUS = {
  escalated:["New concern: open case","warn"],
  sc_draft:["Show cause draft: with ER Manager","warn"], sc_returned:["Show cause returned for changes","bad"],
  sc_issued:["Show cause: awaiting staff reply","info"], sc_answered:["Reply received: propose action","warn"],
  min_staff:["Minutes: awaiting staff signature","info"], min_amend:["Minutes: amendment requested","warn"], min_lead:["Minutes: ER Lead to sign and send","warn"], min_att:["Minutes: awaiting attendee signatures","info"],
  ready:["Ready: propose action","warn"],
  review:["Awaiting ER Manager review","warn"], pending:["Awaiting approval","warn"], prelim:["Preliminary decision issued","info"],
  issued:["Notice issued","ok"], recorded:["Recorded","ok"], closed:["Closed, no action","ok"], returned:["Returned to ER Lead","bad"]
};
const PIP_STATUS = {hr_review:["With ER Lead for approval","warn"], returned:["Returned by People & Culture","bad"], meeting:["Approved: hold initial meeting","warn"], to_sign:["Awaiting employee signature","info"], active:["In progress","info"], met:["Completed: met","ok"], not_met:["Completed: not met","bad"]};
const TA_STATUS = {pending:["Awaiting ER Lead approval","warn"], approved:["Approved","ok"], rejected:["Not approved","bad"], expired:["Access expired","info"]};
const PRE = ["sc_draft","sc_returned","escalated","sc_issued","sc_answered","min_staff","min_amend","min_lead","min_att","ready"];
const HM = "EMP-10077";
````

### `data/sample-data.js`

````javascript
/* =====================================================================
   Sample data · ALL PEOPLE, IDs AND PERSONAL DETAILS ARE PLACEHOLDERS
   Names are "Sample Staff NN", UIDs are "EMP-NNNNN", NIC/phone/address
   values are dummies. Replace this file with an API call or database
   when connecting real systems (see README "Connecting real data").
   ===================================================================== */

const EMPLOYEES = [
  {uid:"EMP-07655",name:"Sample Staff 01",designation:"Head of Card Operations",dept:"Operations",rank:5,manager:"Director of Operations",doj:"2011-03-06"},
  {uid:"EMP-06120",name:"Sample Staff 02",designation:"Branch Manager",dept:"Retail Banking · Addu City Branch",rank:3,manager:"Head of Retail Branches",doj:"2009-07-12"},
  {uid:"EMP-05981",name:"Sample Staff 03",designation:"Branch Manager",dept:"Retail Banking · Malé Branch",rank:3,manager:"Head of Retail Branches",doj:"2008-01-20"},
  {uid:"EMP-13207",name:"Sample Staff 04",designation:"Teller",dept:"Retail Banking · Addu City Branch",rank:0,managerUid:"EMP-06120",doj:"2022-02-13"},
  {uid:"EMP-11590",name:"Sample Staff 05",designation:"Senior Officer, Card Operations",dept:"Operations",rank:1,managerUid:"EMP-07655",doj:"2019-05-05"},
  {uid:"EMP-10421",name:"Sample Staff 06",designation:"Teller",dept:"Retail Banking · Malé Branch",rank:0,managerUid:"EMP-05981",doj:"2018-09-02"},
  {uid:"EMP-14102",name:"Sample Staff 07",designation:"Customer Service Officer",dept:"Retail Banking · Malé Branch",rank:0,managerUid:"EMP-05981",doj:"2023-06-18"},
  {uid:"EMP-11873",name:"Sample Staff 08",designation:"Customer Service Officer",dept:"Retail Banking · Hulhumalé Branch",rank:1,manager:"Branch Manager, Hulhumalé",doj:"2020-11-01"},
  {uid:"EMP-09310",name:"Sample Staff 09",designation:"Relationship Manager",dept:"Corporate Banking",rank:3,manager:"Head of Corporate Banking",doj:"2016-04-10"},
  {uid:"EMP-12044",name:"Sample Staff 10",designation:"Employee Relations Officer",dept:"Total Rewards & Employee Relations",rank:1,manager:"Head of TR&ER",doj:"2021-08-22"},
  {uid:"EMP-08812",name:"Sample Staff 11",designation:"Senior Manager, Trade Finance",dept:"Corporate Banking",rank:4,manager:"Head of Corporate Banking",doj:"2012-10-14"},
  {uid:"EMP-10077",name:"Sample Staff 12",designation:"Investigation Officer",dept:"Internal Investigation Unit",rank:2,manager:"Head of Investigations",doj:"2017-03-26"},
  {uid:"EMP-12890",name:"Sample Staff 13",designation:"Teller",dept:"Retail Banking · Hithadhoo Branch",rank:0,manager:"Branch Manager, Hithadhoo",doj:"2021-12-05"},
  {uid:"EMP-09120",name:"ER Lead",designation:"Employee Relations Lead",dept:"Total Rewards & Employee Relations",rank:2,manager:"ER Manager",doj:"2017-08-13"},
  {uid:"EMP-07210",name:"ER Manager",designation:"Employee Relations Manager",dept:"Total Rewards & Employee Relations",rank:3,manager:"ER Head",doj:"2013-02-03"},
  {uid:"EMP-04518",name:"ER Head",designation:"Head of Total Rewards & Employee Relations",dept:"Total Rewards & Employee Relations",rank:5,manager:"P&C Director",doj:"2010-05-16"},
  {uid:"EMP-02215",name:"P&C Director",designation:"People & Culture Director",dept:"People & Culture",rank:6,manager:"Chief Executive Officer",doj:"2006-11-05"},
  {uid:"EMP-08890",name:"D&G Committee Secretary",designation:"Executive Officer, Corporate Secretariat",dept:"Corporate Secretariat",rank:2,manager:"Company Secretary",doj:"2015-09-20"},
  {uid:"EMP-10544",name:"Compliance Officer",designation:"Compliance Officer",dept:"Compliance",rank:2,manager:"Head of Compliance",doj:"2018-03-11"},
  {uid:"EMP-11208",name:"Talent Acquisition Officer",designation:"Talent Acquisition Officer",dept:"Talent Acquisition",rank:1,manager:"Head of Talent",doj:"2020-01-26"},
  {uid:"EMP-03307",name:"Office of the Chief",designation:"Executive Assistant to the Chief",dept:"Office of the Chief",rank:3,manager:"Chief Executive Officer",doj:"2012-06-03"},
  {uid:"EMP-13690",name:"Sample Staff 14",designation:"Officer, Card Operations",dept:"Operations",rank:0,managerUid:"EMP-07655",doj:"2023-03-12"},
  {uid:"EMP-12733",name:"Sample Staff 15",designation:"Teller",dept:"Retail Banking · Malé Branch",rank:0,managerUid:"EMP-05981",doj:"2021-04-18"},
  {uid:"EMP-13044",name:"Sample Staff 16",designation:"Customer Service Officer",dept:"Retail Banking · Addu City Branch",rank:0,managerUid:"EMP-06120",doj:"2022-01-09"},
  {uid:"EMP-11402",name:"Sample Staff 17",designation:"Officer, Card Operations",dept:"Operations",rank:0,managerUid:"EMP-07655",doj:"2020-09-13"},
  {uid:"EMP-10988",name:"Sample Staff 18",designation:"Senior Officer, Trade Finance",dept:"Corporate Banking",rank:1,manager:"Senior Manager, Trade Finance",doj:"2017-06-25"},
  {uid:"EMP-12215",name:"Sample Staff 19",designation:"Teller",dept:"Retail Banking · Hithadhoo Branch",rank:0,manager:"Branch Manager, Hithadhoo",doj:"2021-11-07"},
  {uid:"EMP-09877",name:"Sample Staff 20",designation:"Assistant Manager, Credit Administration",dept:"Credit",rank:2,manager:"Head of Credit Administration",doj:"2014-02-16"},
  {uid:"EMP-10633",name:"Sample Staff 21",designation:"Officer, IT Service Desk",dept:"Information Technology",rank:1,manager:"Head of IT Operations",doj:"2018-08-05"},
  {uid:"EMP-08455",name:"Sample Staff 22",designation:"Manager, Retail Lending",dept:"Retail Banking",rank:3,manager:"Head of Retail Lending",doj:"2012-05-20"},
  {uid:"EMP-13511",name:"Sample Staff 23",designation:"Customer Service Officer",dept:"Retail Banking · Kulhudhuffushi Branch",rank:0,manager:"Branch Manager, Kulhudhuffushi",doj:"2022-07-31"}
];

const ORG = {
  "EMP-07655":["Card Operations Management","Card Operations","Operations"],
  "EMP-06120":["Addu City Branch","Branch Banking (Atolls)","Retail Banking"],
  "EMP-05981":["Malé Branch","Branch Banking (Malé)","Retail Banking"],
  "EMP-13207":["Addu City Branch · Cash Counter","Branch Banking (Atolls)","Retail Banking"],
  "EMP-11590":["Card Settlements","Card Operations","Operations"],
  "EMP-10421":["Malé Branch · Cash Counter","Branch Banking (Malé)","Retail Banking"],
  "EMP-14102":["Malé Branch · Customer Service","Branch Banking (Malé)","Retail Banking"],
  "EMP-11873":["Hulhumalé Branch · Customer Service","Branch Banking (Malé)","Retail Banking"],
  "EMP-09310":["Corporate Client Coverage","Relationship Management","Corporate Banking"],
  "EMP-12044":["Employee Relations","Total Rewards & Employee Relations","People & Culture"],
  "EMP-08812":["Trade Operations","Trade Finance","Corporate Banking"],
  "EMP-10077":["Investigations","Internal Investigation","Risk"],
  "EMP-12890":["Hithadhoo Branch · Cash Counter","Branch Banking (Atolls)","Retail Banking"],
  "EMP-13511":["Kulhudhuffushi Branch · Customer Service","Branch Banking (Atolls)","Retail Banking"]
};
Object.assign(ORG,{
  "EMP-13690":["Card Settlements","Card Operations","Operations"],
  "EMP-12733":["Malé Branch · Cash Counter","Branch Banking (Malé)","Retail Banking"],
  "EMP-13044":["Addu City Branch · Customer Service","Branch Banking (Atolls)","Retail Banking"],
  "EMP-11402":["Card Settlements","Card Operations","Operations"],
  "EMP-10988":["Trade Finance","Trade Finance","Corporate Banking"],
  "EMP-12215":["Hithadhoo Branch · Cash Counter","Branch Banking (Atolls)","Retail Banking"],
  "EMP-09877":["Credit Administration","Credit Administration","Credit"],
  "EMP-10633":["IT Service Desk","IT Operations","Information Technology"],
  "EMP-08455":["Retail Lending","Retail Lending","Retail Banking"],
  "EMP-09120":["Employee Relations","Total Rewards & Employee Relations","People & Culture"],
  "EMP-07210":["Employee Relations","Total Rewards & Employee Relations","People & Culture"],
  "EMP-04518":["Total Rewards & Employee Relations","Total Rewards & Employee Relations","People & Culture"],
  "EMP-02215":["People & Culture Directorate","People & Culture","People & Culture"],
  "EMP-08890":["Corporate Secretariat","Board & Governance","Office of the Chief"],
  "EMP-10544":["Compliance Monitoring","Compliance","Risk & Compliance"],
  "EMP-11208":["Talent Acquisition","Talent","People & Culture"],
  "EMP-03307":["Office of the Chief","Office of the Chief","Office of the Chief"]});
EMPLOYEES.forEach(e=>{ const o=ORG[e.uid]||["—","—","—"]; e.unit=o[0]; e.department=o[1]; e.division=o[2]; });

const T = (on,role,text,quote,name)=>({on,role,text,quote,name});
const signed = (date,venue,entries,days,att)=>({date,venue,entries,staffSign:days[0],staffComment:"",leadSign:days[1],attendees:att,attSigns:Object.fromEntries(att.map(u=>[u,days[2]])),attComments:{}});
const sc = (allegation,issuedOn,due,answers,answeredOn)=>({allegation,issuedOn,due,questions:STD_QUESTIONS,answers,answeredOn});
const past = (id,uid,clauses,action,on,role,reason,allegation,trailNote) => ({id,uid,source:"escalation",method:action==="verbal"?"verbal":"showcause",clauses,action,proposed:action,reason,extras:[],prelim:false,status:action==="verbal"?"recorded":"issued",created:on,decidedRole:role,decidedOn:on,ackOn:on,ackAt:"10:"+String(10+on.slice(-2)%40).padStart(2,"0"),
  ...(action==="verbal"?{}:{sc:sc(allegation,on,on,["I admit it.","As explained to my manager.","No further comments."],on)}),
  trail:[T(on,role==="lead"?"lead":role, action==="verbal"?"Logged verbal advice given by line manager":"Approved"),T(on,"staff","Received notice (opened in ESS Portal)")]});

let cases = [
  {id:"DA-2026-058",uid:"EMP-12733",source:"escalation",method:"showcause",clauses:["3.2(2)"],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"sc_answered",created:"2026-10-12",escBy:"EMP-05981",
   esc:{type:"Conduct",when:"9 October 2026",details:"Shouted at a customer at the cash counter after a disputed withdrawal; the customer complained in writing.",discussed:"Not discussed"},
   sc:{allegation:"On 9 October 2026 at about 13:40 you raised your voice at a customer at the Malé Branch cash counter during a dispute about a withdrawal, which led to a written complaint.",issuedOn:"2026-10-14",due:"2026-10-19",questions:STD_QUESTIONS,answers:["I admit I raised my voice.","The customer insulted me twice and I lost my temper. I apologised the same day.","Please consider that this is the first complaint in five years."],answeredOn:"2026-10-17"},
   trail:[T("2026-10-12","line","Submitted staff concern","Shouted at a customer after a disputed withdrawal.","Branch Manager"),T("2026-10-13","lead","Drafted show cause notice"),T("2026-10-14","mgr","Approved and issued show cause notice"),T("2026-10-17","staff","Replied to show cause notice")]},
  {id:"DA-2026-059",uid:"EMP-13044",source:"escalation",method:"interview",clauses:["3.2(3)"],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"min_lead",created:"2026-10-19",escBy:"EMP-06120",
   mins:{date:"2026-10-21",venue:"Addu City Branch, manager's office",entries:[{q:"Three account opening files from 12 to 14 October had no KYC copies. Why were they processed?",a:"The scanner was down and I meant to upload them the next day."},{q:"Did you tell your supervisor?",a:"No, I forgot."}],staffSign:"2026-10-23",staffComment:"I uploaded the copies on 15 October.",leadSign:null,attendees:[],attSigns:{},attComments:{}},
   trail:[T("2026-10-19","line","Submitted staff concern","Account opening files processed without KYC copies.","Branch Manager"),T("2026-10-21","lead","Drafted meeting minutes and sent to employee to sign"),T("2026-10-23","staff","Signed minutes","I uploaded the copies on 15 October.")]},
  {id:"DA-2026-060",uid:"EMP-11402",source:"escalation",method:"interview",clauses:["3.2(1)"],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"ready",created:"2026-10-08",escBy:"EMP-07655",
   mins:signed("2026-10-10","People & Culture meeting room, 3rd floor",[{q:"You were absent on 1 and 2 October without telling your manager. Why?",a:"I was unwell and my phone was not working."},{q:"Did you submit a medical certificate?",a:"Yes, on 5 October."}],["2026-10-12","2026-10-12","2026-10-13"],[HM]),
   trail:[T("2026-10-08","line","Submitted staff concern","Absent 1 and 2 October without informing.","Head of Card Operations"),T("2026-10-10","lead","Drafted meeting minutes"),T("2026-10-12","staff","Signed minutes"),T("2026-10-12","lead","Signed and sent to attendees"),T("2026-10-13","att","Signed minutes",null,"Investigation Officer")]},
  {id:"DA-2026-061",uid:"EMP-10988",source:"escalation",method:"showcause",clauses:["3.2(4)"],action:"caution",proposed:"caution",reason:"Used Bank email to forward trade documents to a personal address on 2 October 2026.",extras:[],prelim:false,status:"returned",created:"2026-10-05",
   sc:sc("On 2 October 2026 you forwarded customer trade documents from your Bank email to a personal email address.","2026-10-07","2026-10-12",["I admit it.","I wanted to finish the file at home.","I deleted the email the next morning."],"2026-10-09"),
   trail:[T("2026-10-05","lead","Opened case from Information Security alert"),T("2026-10-07","mgr","Approved and issued show cause notice"),T("2026-10-09","staff","Replied to show cause notice"),T("2026-10-14","lead","Proposed Cautionary Notice"),T("2026-10-16","mgr","Returned to ER Lead","Data leakage may fall under 3.1 confidentiality. Check the Information Security policy and reconsider the clause.")]},
  {id:"DA-2026-062",uid:"EMP-12215",source:"escalation",method:"showcause",clauses:["3.2(1)"],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"sc_returned",created:"2026-10-20",
   sc:{allegation:"You were late on several days in October.",issuedOn:null,due:"2026-10-29",questions:STD_QUESTIONS,answers:null,answeredOn:null},
   trail:[T("2026-10-20","lead","Drafted show cause notice"),T("2026-10-22","mgr","Returned show cause notice to ER Lead","List the exact dates and arrival times from the attendance log. 'Several days' is not specific enough.")]},
  {id:"DA-2026-063",uid:"EMP-09877",source:"investigation",method:"showcause",clauses:["3.2(3)"],action:"final",proposed:"final",reason:"Approved two credit facilities on 3 and 9 September 2026 without the required second signatory, following a Cautionary Notice for the same issue in January 2026.",extras:["withhold"],prelim:true,status:"prelim",created:"2026-09-20",decidedRole:"head",prelimOn:"2026-10-22",
   sc:sc("On 3 and 9 September 2026 you approved two credit facilities without the second signatory required by the credit policy.","2026-09-23","2026-09-28",["I admit it.","Both files were urgent and the second signatory was on leave.","I have since set up a delegate list."],"2026-09-26"),
   trail:[T("2026-09-20","lead","Opened case from internal audit finding"),T("2026-09-23","mgr","Approved and issued show cause notice"),T("2026-09-26","staff","Replied to show cause notice"),T("2026-10-15","lead","Proposed Final Warning Notice"),T("2026-10-18","mgr","Recommended Final Warning Notice as a preliminary decision","Repeat of the January breach."),T("2026-10-22","head","Approved preliminary decision"),T("2026-10-22","system","Preliminary decision sent to staff")]},
  {id:"DA-2026-064",uid:"EMP-10633",source:"escalation",method:"showcause",clauses:["3.2(5)"],action:"final",proposed:"final",reason:"Installed unapproved remote access software on two Bank laptops on 28 August 2026, after a Cautionary Notice in March 2026 for using unapproved software.",extras:[],prelim:true,status:"prelim",created:"2026-09-01",decidedRole:"head",prelimOn:"2026-10-13",
   staffResponse:"I accept I should not have installed it. I did it to fix a branch printer faster. I ask that the decision be a Cautionary Notice instead.",staffResponseOn:"2026-10-16",
   sc:sc("On 28 August 2026 you installed unapproved remote access software on two Bank laptops at the IT Service Desk.","2026-09-03","2026-09-08",["I admit it.","It was to resolve a printer issue at a branch quickly.","No."],"2026-09-07"),
   trail:[T("2026-09-01","lead","Opened case from Information Security alert"),T("2026-09-03","mgr","Approved and issued show cause notice"),T("2026-09-07","staff","Replied to show cause notice"),T("2026-10-08","lead","Proposed Final Warning Notice"),T("2026-10-10","mgr","Recommended Final Warning Notice as a preliminary decision"),T("2026-10-13","head","Approved preliminary decision"),T("2026-10-16","staff","Responded to the preliminary decision")]},
  {id:"DA-2026-038",uid:"EMP-08455",source:"investigation",method:"interview",clauses:["3.1(1)"],action:"final",proposed:"dismiss",reason:"Approved a staff loan for a relative on 12 June 2026 without declaring the relationship, in breach of the conflict of interest policy.",extras:["withhold"],prelim:false,status:"issued",created:"2026-07-02",decidedRole:"dg",decidedOn:"2026-08-20",ackOn:"2026-08-21",ackAt:"09:12",
   mins:signed("2026-07-08","Investigation office, Head Office",[{q:"Did you approve loan RL-55821 on 12 June?",a:"Yes."},{q:"Is the borrower related to you?",a:"Yes, my cousin. I did not think it needed declaring."}],["2026-07-09","2026-07-09","2026-07-10"],[HM]),
   dgMin:{date:"2026-08-19",ref:"D&G 08/2026",members:"Chair and four members",decision:"Final Warning Notice with withholding of promotion, increment and bonus",minutes:"The Committee considered the investigation report and the employee's admission. Dismissal was proposed. Given 14 years of service with no prior record and full repayment of the loan, the Committee decided on a Final Warning Notice.",by:"dg"},
   trail:[T("2026-07-02","lead","Opened case from Internal Investigation report"),T("2026-07-08","lead","Drafted meeting minutes"),T("2026-07-09","staff","Signed minutes"),T("2026-07-09","lead","Signed and sent to attendees"),T("2026-07-10","att","Signed minutes",null,"Investigation Officer"),T("2026-07-20","lead","Proposed Dismissal"),T("2026-07-24","mgr","Recommended referral to the D&G Committee"),T("2026-08-20","dg","Recorded committee decision: Final Warning Notice"),T("2026-08-20","system","Notice issued to staff"),T("2026-08-21","staff","Received notice (opened in ESS Portal)")]},
  past("DA-2026-009","EMP-09877",["3.2(3)"],"caution","2026-01-21","head","Approved a credit facility on 8 January 2026 without the second signatory.","On 8 January 2026 you approved a credit facility without the second signatory required by the credit policy."),
  past("DA-2026-015","EMP-10633",["3.2(5)"],"caution","2026-03-17","head","Installed unapproved software on a Bank laptop on 2 March 2026.","On 2 March 2026 you installed unapproved software on a Bank laptop."),
  past("DA-2025-018","EMP-11590",["3.2(4)"],"caution","2025-05-20","head","Used working hours to run a personal online shop on several days in April 2025.","On several days in April 2025 you used working hours to run a personal online shop."),
  {id:"DA-2025-041",uid:"EMP-11590",source:"escalation",method:"interview",clauses:["3.2(5)"],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"closed",created:"2025-11-04",escBy:"EMP-07655",
   mins:signed("2025-11-06","People & Culture meeting room, 3rd floor",[{q:"A card terminal from the branch kit was found at your desk on 3 November. Why was it there?",a:"I was asked by the branch to test it after a reset. I logged it in the asset sheet."},{q:"Did you have approval to take it from the kit room?",a:"Yes, the supervisor emailed me on 2 November. I can share the email."}],["2025-11-07","2025-11-07","2025-11-08"],[HM]),
   closedNote:"Approval email confirmed. No breach found; closed with no action.",
   trail:[T("2025-11-04","line","Submitted staff concern","Card terminal found at desk without a kit-room record.","Head of Card Operations"),T("2025-11-06","lead","Drafted meeting minutes"),T("2025-11-07","staff","Signed minutes"),T("2025-11-07","lead","Signed and sent to attendees"),T("2025-11-08","att","Signed minutes",null,"Investigation Officer"),T("2025-11-10","lead","Closed with no action","Approval email confirmed. No breach found.")]},
  {id:"DA-2026-022",uid:"EMP-11590",source:"escalation",method:"verbal",clauses:["3.2(1)"],action:"verbal",proposed:"verbal",reason:"Arrived after 9:30 on 4 days in February 2026 without informing the line manager.",suggestion:"If you expect to be late, message your line manager before 8:30. Speak to us about flexible start times if the school run continues to clash.",extras:[],prelim:false,status:"recorded",created:"2026-03-10",decidedRole:"line",decidedOn:"2026-03-10",ackOn:"2026-03-10",ackAt:"15:22",
   vaResponse:"Understood. I have applied for a 9:30 start on Tuesdays and Thursdays.",vaResponseOn:"2026-03-11",
   trail:[T("2026-03-10","line","Gave verbal advice",null,"Head of Card Operations"),T("2026-03-10","system","Shared with the employee and Employee Relations"),T("2026-03-10","staff","Received notice (opened in ESS Portal)"),T("2026-03-11","staff","Added a response")]},
  {id:"DA-2026-056",uid:"EMP-11590",source:"escalation",method:"showcause",clauses:["3.2(1)"],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"sc_draft",created:"2026-10-24",escBy:"EMP-07655",
   sc:{allegation:"On 19 October 2026 you left the office at 11:00 without approval and did not return for the afternoon shift.",issuedOn:null,due:"2026-10-29",questions:STD_QUESTIONS,answers:null,answeredOn:null},
   trail:[T("2026-10-23","line","Submitted staff concern","Left at 11am on 19 Oct without telling anyone; did not return.","Sample Staff 01"),T("2026-10-24","lead","Drafted show cause notice and sent to ER Manager for approval")]},
  {id:"DA-2026-057",uid:"EMP-12890",source:"investigation",method:null,clauses:[],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"escalated",created:"2026-10-24",escBy:"compliance",
   esc:{type:"Compliance investigation finding",when:"12 October 2026",details:"Till 3 at Hithadhoo Branch was short by MVR 5,000 at close on 12 October 2026. CCTV shows the teller placing notes from the till drawer in a personal bag at 14:52. Investigation report INV-2026-003 attached.",discussed:"Not applicable"},
   trail:[T("2026-10-24","comp","Referred staff concern to Employee Relations for disciplinary action")]},
  Object.assign(past("DA-2024-088","EMP-07655",["3.2(1)"],"verbal","2024-11-10","lead","Late arrival on 6 occasions in October 2024 without notice to the line manager."),{suggestion:"Arrive by 8:30 each working day. If you expect to be late, call or message your line manager before 8:30.",vaResponse:"Understood. Traffic on the bridge has been unpredictable; I will leave earlier.",vaResponseOn:"2024-11-11"}),
  past("DA-2025-019","EMP-07655",["3.2(1)"],"caution","2025-04-15","pcd","Late arrival on 9 occasions between January and March 2025, following verbal advice for the same issue.","Attendance records show late arrival on 9 days between January and March 2025."),
  past("DA-2025-048","EMP-07655",["3.2(2)"],"final","2025-09-01","pcd","Absent on 3 and 4 August 2025 under sick leave without a medical certificate, following earlier attendance warnings.","You took sick leave on 3 and 4 August 2025 without a medical certificate."),
  past("DA-2026-012","EMP-14102",["3.2(4)"],"caution","2026-03-11","head","Used working hours for a personal online business on several days in February 2026.","On several days in February 2026 you used working hours to run a personal online business."),
  {id:"DA-2026-031",uid:"EMP-10421",source:"escalation",method:"verbal",clauses:["3.2(1)"],action:"verbal",proposed:"verbal",reason:"Absent without leave on 2 and 3 July 2026 without informing the line manager.",suggestion:"Apply for leave in advance through ESS. In an emergency, inform your line manager by phone before your shift starts.",extras:[],prelim:false,status:"recorded",created:"2026-07-12",decidedRole:"lead",decidedOn:"2026-07-12",ackOn:"2026-07-13",ackAt:"11:05",
   trail:[T("2026-07-12","lead","Logged verbal advice given by line manager"),T("2026-07-13","staff","Received notice (opened in ESS Portal)")]},
  {id:"DA-2026-044",uid:"EMP-09310",source:"pip",method:"interview",clauses:["3.2(3)"],action:"final",proposed:"final",reason:"Did not meet PIP 2 targets at the second monthly check-in: 3 of 8 portfolio reviews completed against a target of 8.",extras:[],prelim:false,status:"issued",created:"2026-09-25",decidedRole:"head",decidedOn:"2026-09-30",
   mins:signed("2026-09-25","People & Culture meeting room, 3rd floor",[{q:"Your PIP 2 required 8 portfolio reviews by 25 September. How many were completed?",a:"Three. The other five are in progress."},{q:"What prevented you from completing them?",a:"Two large clients were onboarded and took most of my time."}],["2026-09-26","2026-09-26","2026-09-28"],[HM]),
   trail:[T("2026-09-25","lead","Drafted meeting minutes"),T("2026-09-26","staff","Signed minutes"),T("2026-09-26","lead","Signed and sent to attendees"),T("2026-09-28","att","Signed minutes",null,"Investigation Officer"),T("2026-09-29","lead","Proposed Final Warning Notice"),T("2026-09-29","mgr","Recommended Final Warning Notice","Consistent with PIP 2 process, second check-in."),T("2026-09-30","head","Approved"),T("2026-09-30","system","Notice issued to staff")]},
  {id:"DA-2026-047",uid:"EMP-10421",source:"escalation",method:"showcause",clauses:["3.2(1)"],action:"caution",proposed:"caution",reason:"Absent without leave on 6, 13 and 20 October 2026 without informing the line manager, following verbal advice for the same issue.",extras:[],prelim:false,status:"review",created:"2026-10-16",escBy:"EMP-05981",
   sc:sc("You were absent from work on 6, 13 and 20 October 2026 without approved leave and without informing your line manager.","2026-10-16","2026-10-19",["I admit I was absent on those days.","My mother was unwell and I had to take her to IGMH for treatment. I did not have phone credit to call my manager.","Please consider that this was a family emergency. It will not happen again."],"2026-10-19"),
   trail:[T("2026-10-15","line","Submitted staff concern","Absent on 6, 13 and 20 Oct without calling in. Verbal advice given in July for the same.","Sample Staff 03"),T("2026-10-16","lead","Issued show cause notice"),T("2026-10-19","staff","Submitted show cause reply"),T("2026-10-22","lead","Proposed Cautionary Notice")]},
  {id:"DA-2026-049",uid:"EMP-07655",source:"investigation",method:"interview",clauses:["3.2(4)","3.2(5)"],action:"caution",proposed:"caution",reason:"Used a Bank pool vehicle and driver for personal errands on four working days in September 2026.",extras:[],prelim:false,status:"pending",created:"2026-10-15",
   mins:signed("2026-10-15","Investigation office, Head Office",[{q:"The vehicle log shows pool car P-12 booked under your name on 4, 11, 18 and 25 September. What were these trips for?",a:"Some were to collect my children from school during lunch."},{q:"Were you aware pool vehicles are for official business only?",a:"Yes. I did not think short trips would be an issue."}],["2026-10-16","2026-10-16","2026-10-18"],[HM]),
   trail:[T("2026-10-15","lead","Drafted meeting minutes"),T("2026-10-16","staff","Signed minutes"),T("2026-10-16","lead","Signed and sent to attendees"),T("2026-10-18","att","Signed minutes",null,"Investigation Officer"),T("2026-10-20","lead","Proposed Cautionary Notice"),T("2026-10-21","mgr","Recommended Cautionary Notice","First instance of vehicle misuse. Earlier actions related to attendance and the Final Warning lapsed on 1 Sep 2026.")]},
  {id:"DA-2026-050",uid:"EMP-11873",source:"investigation",method:"showcause",clauses:["3.1(10c)"],action:"final",proposed:"final",reason:"Shared T24 login credentials and an OTP with a colleague to process transactions during leave cover on 8 October 2026.",extras:["withhold"],prelim:true,status:"pending",created:"2026-10-14",
   sc:sc("On 8 October 2026 you shared your T24 username, password and a one-time password with a colleague, who used them to process transactions while you were on leave.","2026-10-14","2026-10-17",["I admit it.","The branch was short-staffed and my supervisor asked me to help the cover officer finish pending items.","I have changed my password and completed the information security refresher."],"2026-10-16"),
   trail:[T("2026-10-14","lead","Issued show cause notice"),T("2026-10-16","staff","Submitted show cause reply"),T("2026-10-21","lead","Proposed Final Warning Notice"),T("2026-10-22","mgr","Recommended Final Warning Notice with preliminary decision","No customer loss found. Employee admitted in show cause reply.")]},
  {id:"DA-2026-051",uid:"EMP-08812",source:"escalation",method:"showcause",clauses:["3.2(2)"],action:"final",proposed:"caution",reason:"Took sick leave on 1 and 2 October 2026 while posting from an overseas holiday; no medical certificate provided.",extras:[],prelim:false,status:"pending",created:"2026-10-08",
   sc:sc("You applied for sick leave on 1 and 2 October 2026. Posts on your public social media show you were travelling overseas on those dates.","2026-10-08","2026-10-13",["I deny misusing leave.","I fell ill during my trip and could not fly back on time.","I can get a letter from the clinic I visited."],"2026-10-13"),
   trail:[T("2026-10-08","lead","Issued show cause notice"),T("2026-10-13","staff","Submitted show cause reply"),T("2026-10-17","lead","Proposed Cautionary Notice"),T("2026-10-19","mgr","Changed action from Cautionary Notice to Final Warning Notice and recommended it","No clinic letter received after two reminders. Leave was falsely claimed. Final Warning as first step per §5(3).")]},
  {id:"DA-2026-052",escBy:"compliance",uid:"EMP-13207",source:"investigation",method:"showcause",clauses:["3.1(10d)","3.1(10b)"],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"sc_issued",created:"2026-10-23",
   sc:{allegation:"On 21 October 2026 you processed a cash deposit and a daily limit change on your own savings account using your teller login, in breach of the Conflict of Interest Policy.",issuedOn:"2026-10-23",due:"2026-10-27",questions:[...STD_QUESTIONS.slice(0,2),"Has anyone else asked you to process transactions on your own or related accounts?",STD_QUESTIONS[2]],answers:null,answeredOn:null},
   trail:[T("2026-10-23","lead","Issued show cause notice")]},
  {id:"DA-2026-053",uid:"EMP-11590",source:"escalation",method:"interview",clauses:["3.2(5)"],other:{text:"Took a Bank laptop home without remote access approval (Information Security Policy)",serious:false},action:null,proposed:null,reason:"",extras:[],prelim:false,status:"min_att",created:"2026-10-22",escBy:"EMP-07655",
   mins:{date:"2026-10-22",venue:"People & Culture meeting room, 3rd floor",entries:[{q:"A Bank laptop (asset BML-LT-2291) was taken home on 10 October without IT approval. Did you take it?",a:"Yes, to finish card reconciliation over the weekend."},{q:"Did you request remote access approval?",a:"No. My request from August was still pending so I went ahead."}],staffSign:"2026-10-23",staffComment:"",leadSign:"2026-10-23",attendees:[HM,"EMP-07655"],attSigns:{[HM]:"2026-10-24","EMP-07655":null},attComments:{}},
   trail:[T("2026-10-21","line","Submitted staff concern","Laptop taken home without IT approval on 10 Oct. IT flagged it on 13 Oct.","Sample Staff 01"),T("2026-10-22","lead","Drafted meeting minutes"),T("2026-10-23","staff","Signed minutes"),T("2026-10-23","lead","Signed and sent to 2 attendees"),T("2026-10-24","att","Signed minutes",null,"Investigation Officer")]},
  {id:"DA-2026-054",uid:"EMP-12044",source:"escalation",method:"interview",clauses:["3.2(2)"],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"min_amend",created:"2026-10-24",
   mins:{date:"2026-10-24",venue:"Investigation office, Head Office",entries:[{q:"Attendance records show you arrived after 9:30 on 11 days in September. Can you explain?",a:"I have been dropping my son at a new school in Hulhumalé and the ferry timing changed."},{q:"Did you discuss flexible hours with your manager?",a:"I mentioned it verbally but did not apply."}],staffSign:null,staffComment:"",leadSign:null,attendees:[HM],attSigns:{[HM]:null},attComments:{},
     amendments:[{on:"2026-10-25",text:"For question 2, I said I asked my manager twice, on 3 and 17 September, and he said to wait for the new roster. Please record that I asked twice.",status:"pending"}]},
   trail:[T("2026-10-24","lead","Drafted meeting minutes"),T("2026-10-25","staff","Requested an amendment to the minutes","For question 2, I asked my manager twice.")]},
  {id:"DA-2026-055",uid:"EMP-14102",source:"escalation",method:null,clauses:[],action:null,proposed:null,reason:"",extras:[],prelim:false,status:"escalated",created:"2026-10-24",escBy:"EMP-05981",
   esc:{type:"Customer complaint",when:"22 October 2026",details:"A customer complained that the employee was rude and refused to process a remittance 20 minutes before closing. Two colleagues witnessed the exchange.",discussed:"Informally"},
   trail:[T("2026-10-24","line","Submitted staff concern","A customer complained that the employee was rude and refused to process a remittance 20 minutes before closing.","Sample Staff 03")]}
];
cases.forEach(c=>{ c.other = c.other||null; });

/* Every submission has a tracking code. Anonymous senders use it to check updates and reply.
 * thread: {on, at, by:"staff"|"pc"|"chief"|"system", text}                                         */
let voice = [
  {id:"GD-2026-002",code:"EV-8QLM-4ZTR",type:"gender",uid:"EMP-13044",anon:false,on:"2026-09-29",at:"11:20",
   f:{cname:"Sample Staff 16",nic:"A000000",addr:"[Sample address]",contact:"7000000",paddr:"[Sample address]",cjob:"Customer Service Officer",cunit:"Retail Banking / Branch Banking (Atolls) / Addu City Branch · Customer Service",aname:"A branch supervisor",anic:"",acontact:"",acontact2:"",aemail:"",apos:"Supervisor, Addu City Branch",description:"I was told I could not join the night cash-in-transit roster because 'it is not suitable for women', although I volunteered and am trained. Male colleagues with less experience were added.",docs:"Roster email 21 Sept.pdf"},
   receivedBy:"ER Lead",receivedAt:"2026-09-30 09:00",status:"review",
   dec:{outcome:"upheld",text:"The roster decision was based on gender and is not consistent with the Bank's equal opportunity commitment. The employee will be added to the roster from November, the supervisor will complete equal opportunity training, and roster criteria will be published for all atoll branches.",on:"2026-10-20",stage:"mgr"},
   thread:[{on:"2026-09-30",at:"09:00",by:"system",text:"Received by People & Culture"},{on:"2026-10-01",at:"14:10",by:"pc",text:"Thank you for raising this. We are reviewing the roster decision and will speak with the branch."}]},
  {id:"HC-2026-006",code:"EV-2NWE-7PKJ",type:"harassment",uid:"EMP-12733",anon:false,on:"2026-10-01",at:"16:45",
   f:{cname:"Sample Staff 15",nic:"A000000",addr:"[Sample address]",contact:"7000000",paddr:"[Sample address]",cjob:"Teller",cunit:"Retail Banking / Branch Banking (Malé) / Malé Branch · Cash Counter",aname:"A senior teller",anic:"",aaddr:"",apaddr:"",acontact:"",apos:"Senior Teller, Malé Branch",witnesses:"Two tellers on the counter",where:"Malé Branch cash counter",when:"2026-09-28T10:15",other:"",description:"The senior teller has repeatedly mocked my accent in front of customers and colleagues, and did so again on 28 September after I asked him to stop."},
   receivedBy:"ER Lead",receivedAt:"2026-10-02 08:50",status:"review",
   dec:{outcome:"upheld",text:"The complaint is upheld. The senior teller will receive a Cautionary Notice through the disciplinary process, both will be scheduled on separate counters, and the branch will complete respectful workplace training.",on:"2026-10-18",mgrOn:"2026-10-20",mgrNote:"Recommend approval. Witness statements are consistent.",stage:"pcd"},
   thread:[{on:"2026-10-02",at:"08:50",by:"system",text:"Received by People & Culture"},{on:"2026-10-03",at:"10:00",by:"pc",text:"Thank you for telling us. We will speak to the witnesses this week. You can contact us at any time."}]},
  {id:"GRV-2026-005",code:"EV-5RCT-9MBA",type:"grievance",uid:"EMP-11402",anon:false,on:"2026-10-24",at:"18:05",f:{event:"Overtime claims for September, submitted 1 October",description:"My overtime claims for September have not been approved and my manager has not given a reason. Others on the same shift were paid.",previous:"I emailed my manager on 10 and 17 October."},status:"submitted",thread:[]},
  {id:"CH-2026-004",code:"EV-WQ7A-3DLE",type:"chief",uid:"EMP-10988",anon:false,on:"2026-08-11",at:"08:30",f:{kind:"idea",subject:"Digital trade document submission",details:"Customers still bring paper trade documents to Head Office. A secure upload portal would save each customer a visit."},
   receivedBy:"Office of the Chief",receivedAt:"2026-08-11 12:00",status:"closed",outcome:"Added to the 2027 digital roadmap.",
   thread:[{on:"2026-08-11",at:"12:00",by:"system",text:"Received by the Office of the Chief"},{on:"2026-08-20",at:"15:30",by:"chief",text:"Thank you. The Chief has asked Digital Banking to include this in the 2027 roadmap. We'll share updates."}]},
  {id:"PC-2026-019",code:"EV-JH4S-6XNC",type:"pc",uid:null,anon:true,on:"2026-09-18",at:"21:40",f:{kind:"concern",subject:"Workload in Trade Finance",details:"Since two resignations, the team regularly works until 9pm. People are exhausted."},
   receivedBy:"ER Lead",receivedAt:"2026-09-19 09:15",status:"closed",outcome:"Two temporary officers assigned; recruitment approved.",
   thread:[{on:"2026-09-19",at:"09:15",by:"system",text:"Received by People & Culture"},{on:"2026-09-22",at:"11:00",by:"pc",text:"Thank you for raising this. We have raised staffing with the Head of Corporate Banking."},{on:"2026-10-06",at:"10:30",by:"pc",text:"Two temporary officers join Trade Finance from 12 October, and recruitment for both roles is approved. Closing this; please raise again if things don't improve."}]},
  {id:"PC-2026-011",code:"EV-3MXQ-8TWD",type:"pc",uid:"EMP-11590",anon:false,on:"2026-06-02",at:"09:40",f:{kind:"concern",subject:"Support with a new school timetable",details:"My son's school start time changed and the ferry from Hulhumalé now arrives at 9:10. I'd like to understand the flexible start options."},
   receivedBy:"ER Lead",receivedAt:"2026-06-02 11:15",status:"closed",outcome:"Flexible start of 9:30 on two days a week agreed with the line manager.",
   thread:[{on:"2026-06-02",at:"11:15",by:"system",text:"Received by People & Culture"},{on:"2026-06-03",at:"10:05",by:"pc",text:"Thank you for raising this. Flexible start times can be agreed with your line manager for up to three days a week. We'll set up a short conversation with you both."},{on:"2026-06-03",at:"12:30",by:"staff",text:"Thank you, Tuesday or Thursday works for me."},{on:"2026-06-10",at:"16:00",by:"pc",text:"A 9:30 start on Tuesdays and Thursdays is agreed from 15 June. Closing this, and please reach out if anything changes."}]},
  {id:"HC-2025-004",code:"EV-6YHR-2KCB",type:"harassment",uid:"EMP-11590",anon:false,on:"2025-08-18",at:"14:10",
   f:{cname:"Sample Staff 05",nic:"A000000",addr:"[Sample address]",contact:"7000000",paddr:"[Sample address]",cjob:"Senior Officer, Card Operations",cunit:"Operations / Card Operations / Card Settlements",aname:"A colleague from another unit",anic:"",aaddr:"",apaddr:"",acontact:"",apos:"Officer, Card Operations",witnesses:"Two colleagues from Card Settlements",where:"Pantry, 4th floor, Head Office",when:"2025-08-14T13:20",other:"",description:"The colleague made repeated comments about my appearance over two weeks and continued after I asked him to stop."},
   receivedBy:"ER Lead",receivedAt:"2025-08-18 15:00",status:"closed",
   dec:{outcome:"upheld",text:"The complaint is upheld. The colleague has been moved to a different floor, a disciplinary case was opened, and both teams will complete respectful workplace training by 30 September.",on:"2025-09-02",mgrOn:"2025-09-03",pcdOn:"2025-09-04",stage:"done"},
   outcome:"Grievance upheld. The colleague has been moved to a different floor, a disciplinary case was opened, and both teams will complete respectful workplace training by 30 September.",
   thread:[{on:"2025-08-18",at:"15:00",by:"system",text:"Received by People & Culture"},{on:"2025-08-19",at:"10:30",by:"pc",text:"Thank you for telling us. You will not be placed near the colleague while we look into this. An ER officer will meet you this week."},{on:"2025-09-04",at:"16:20",by:"pc",text:"Decision (Grievance upheld): The colleague has been moved to a different floor, a disciplinary case was opened, and both teams will complete respectful workplace training by 30 September."},{on:"2025-09-04",at:"16:20",by:"system",text:"Decision approved by the People & Culture Director. Closed."}]},
  {id:"PC-2026-018",code:"EV-K7PM-3QXA",type:"pc",uid:"EMP-07655",anon:false,on:"2026-09-14",at:"10:20",f:{kind:"idea",subject:"Shift handover checklist for Card Operations",details:"A shared checklist would reduce missed reconciliations at the 4pm handover."},
   receivedBy:"ER Lead",receivedAt:"2026-09-15 09:10",status:"closed",outcome:"Adopted by Operations from October.",
   thread:[{on:"2026-09-15",at:"09:10",by:"system",text:"Received by People & Culture"},{on:"2026-09-22",at:"11:40",by:"pc",text:"Thank you. We have shared this with the Head of Operations, who would like to pilot it next month."},{on:"2026-09-22",at:"13:02",by:"staff",text:"Happy to help set it up."},{on:"2026-10-01",at:"10:00",by:"pc",text:"The checklist is now live in Card Operations. Closing this with thanks."}]},
  {id:"PC-2026-023",code:"EV-R2DW-8HNV",type:"pc",uid:"EMP-13207",anon:false,on:"2026-10-02",at:"14:05",f:{kind:"concern",subject:"Cash counter staffing on Thursdays",details:"Only one teller is on the counter on Thursday afternoons, so queues run past 30 minutes."},status:"submitted",thread:[]},
  {id:"PC-2026-024",code:"EV-4F7K-29QM",type:"pc",uid:null,owner:"EMP-11590",anon:true,on:"2026-10-20",at:"21:42",f:{kind:"concern",subject:"Overtime not approved in Card Settlements",details:"Staff are staying late at month-end but overtime claims are being rejected without explanation."},
   receivedBy:"ER Lead",receivedAt:"2026-10-21 08:55",status:"review",
   thread:[{on:"2026-10-21",at:"08:55",by:"system",text:"Received by People & Culture"},{on:"2026-10-22",at:"10:15",by:"pc",text:"Thank you for raising this. Could you tell us which month-end dates were affected? You can reply here without sharing your name."}]},
  {id:"GRV-2026-003",code:"EV-9BTC-6LYE",type:"grievance",uid:"EMP-11590",anon:false,on:"2026-10-21",at:"11:30",f:{event:"14 October 2026, about 3:15pm, Card Operations floor, Head Office",description:"A senior colleague from Card Settlements shouted at me in front of the team about a missed reconciliation and called me incompetent. Two colleagues saw it.",previous:"Yes. I raised it with the colleague on 15 October. He apologised, but the same thing happened on 19 October."},
   receivedBy:"ER Lead",receivedAt:"2026-10-22 09:30",status:"review",unread:true,
   thread:[{on:"2026-10-22",at:"09:30",by:"system",text:"Received by People & Culture"},{on:"2026-10-23",at:"14:20",by:"pc",text:"We have started looking into your grievance. Employee Relations Lead will contact you within 3 working days to arrange the meeting."}]},
  {id:"CH-2026-007",code:"EV-PX3N-7GRA",type:"chief",uid:null,anon:true,on:"2026-10-18",at:"19:05",f:{kind:"idea",subject:"Self-service kiosks for atoll branches",details:"Cash deposit kiosks in the larger atoll branches would cut queues on salary days."},status:"submitted",thread:[]}
];

let pips = [
  {id:"PIP-2026-007",uid:"EMP-11402",mgr:"EMP-07655",type:"PIP",basis:"poor",start:"2026-11-02",months:3,
   concerns:[{area:"Chargeback cases not closed within 10 working days",issue:"38% closed on time in Q3 against 90%"}],
   prior:[{date:"2026-07-05",area:"Chargeback turnaround",summary:"Mid-year review rated Poor; agreed daily case list"}],
   goals:["Close 90% of chargeback cases within 10 working days each month","Zero cases past the network deadline"],
   activities:[{g:"1",act:"Daily 15-minute case list review with the Senior Officer",start:"2026-11-02",end:"2027-02-01"},{g:"2",act:"Network deadline alerts set up in the case tool",start:"2026-11-02",end:"2026-11-06"}],
   support:["Chargeback rules refresher with the card network specialist"],mgrComment:"",reviews:[],status:"meeting",hrOn:"2026-10-22",hrNote:"Clear targets. Approved.",
   trail:[T("2026-10-20","line","Submitted draft PIP",null,"Head of Card Operations"),T("2026-10-22","lead","Reviewed and approved draft","Clear targets. Approved.")]},
  {id:"PIP-2026-008",uid:"EMP-12733",mgr:"EMP-05981",type:"PIP",basis:"three",start:"2026-11-09",months:3,
   concerns:[{area:"Cash counter differences",issue:"Shortages on 6 days in Q3"}],
   prior:[{date:"2026-08-04",area:"Cash differences",summary:"One-to-one after two shortages"}],
   goals:["Improve cash handling"],
   activities:[{g:"1",act:"Shadow the senior teller",start:"2026-11-09",end:"2026-11-20"}],
   support:["Cash handling refresher"],mgrComment:"",reviews:[],status:"returned",hrNote:"Make the goal measurable (for example, zero unexplained differences each month) and add a second discussion from the last 3 months as evidence.",
   trail:[T("2026-10-15","line","Submitted draft PIP",null,"Branch Manager"),T("2026-10-17","lead","Returned to line manager","Make the goal measurable and add a second discussion from the last 3 months.")]},
  {id:"PIP-2026-002",uid:"EMP-10421",mgr:"EMP-05981",type:"PIP",basis:"three",start:"2026-03-01",months:3,
   concerns:[{area:"Transaction errors at the cash counter",issue:"9 reversals in January"}],
   prior:[{date:"2025-12-02",area:"Errors",summary:"One-to-one"},{date:"2026-01-06",area:"Errors",summary:"Monthly review"},{date:"2026-02-03",area:"Errors",summary:"Monthly review; no improvement"}],
   goals:["No more than 2 reversals a month","Complete the dual-check on every transaction above MVR 50,000"],
   activities:[{g:"1",act:"Daily end-of-day self check",start:"2026-03-01",end:"2026-05-31"}],support:["Teller refresher course (March)"],mgrComment:"Capable; needs more care at peak times.",
   reviews:[{self:{ratings:["partial","met"],comments:["4 reversals.","Done every time."],overall:"Improving.",on:"2026-03-30"},mgr:{ratings:["partial","met"],comments:["4 reversals.","Confirmed."],summary:"Improving.",on:"2026-04-01"},empAck:{comment:"",on:"2026-04-02"},done:true},
            {self:{ratings:["met","met"],comments:["2 reversals.","Done."],overall:"On track.",on:"2026-04-29"},mgr:{ratings:["met","met"],comments:["2 reversals.","Confirmed."],summary:"On track.",on:"2026-05-02"},empAck:{comment:"",on:"2026-05-03"},done:true},
            {self:{ratings:["met","met"],comments:["1 reversal.","Done."],overall:"Goals met.",on:"2026-05-29"},mgr:{ratings:["met","met"],comments:["1 reversal.","Confirmed every day."],summary:"All goals met. Well done.",on:"2026-06-01"},empAck:{comment:"Thank you for the support.",on:"2026-06-02"},done:true}],
   status:"met",hrOn:"2026-02-20",meetingOn:"2026-03-01",empSign:"2026-03-01",final:{date:"2026-06-03",assessment:"All goals met. Well done.",response:"Thank you for the support.",outcome:"met"},
   trail:[T("2026-02-18","line","Submitted draft PIP",null,"Branch Manager"),T("2026-02-20","lead","Reviewed and approved draft"),T("2026-03-01","line","Held initial meeting and sent for signature"),T("2026-03-01","staff","Signed the PIP"),T("2026-06-03","line","Final outcome confirmed: met"),T("2026-06-03","system","Outcome shared with Employee Relations")]},
  {id:"PIP-2026-003",uid:"EMP-13044",mgr:"EMP-06120",type:"PIP",basis:"poor",start:"2026-05-03",months:3,
   concerns:[{area:"Account opening turnaround",issue:"Average 3 days against a 1-day standard"}],
   prior:[{date:"2026-04-15",area:"Turnaround",summary:"Year-end review rated Poor"}],
   goals:["Open 95% of accounts within 1 working day"],
   activities:[{g:"1",act:"Morning queue plan with the supervisor",start:"2026-05-03",end:"2026-08-02"}],support:["Account opening system training"],mgrComment:"",
   reviews:[{self:{ratings:["partial"],comments:["70% within a day."],overall:"",on:"2026-06-01"},mgr:{ratings:["partial"],comments:["68%."],summary:"Behind.",on:"2026-06-03"},empAck:{comment:"",on:"2026-06-04"},done:true},
            {self:{ratings:["partial"],comments:["78%."],overall:"",on:"2026-07-01"},mgr:{ratings:["not"],comments:["74%."],summary:"Not meeting requirements.",on:"2026-07-03"},empAck:{comment:"",on:"2026-07-04"},done:true},
            {self:{ratings:["partial"],comments:["82%."],overall:"I need more time.",on:"2026-08-01"},mgr:{ratings:["not"],comments:["80% against 95%."],summary:"Goal not met.",on:"2026-08-03"},empAck:{comment:"I was covering for a colleague on leave in July.",on:"2026-08-04"},done:true}],
   status:"not_met",hrOn:"2026-04-28",meetingOn:"2026-05-03",empSign:"2026-05-03",final:{date:"2026-08-05",assessment:"Goal not met.",response:"I was covering for a colleague on leave in July.",outcome:"not"},
   trail:[T("2026-04-26","line","Submitted draft PIP",null,"Branch Manager"),T("2026-04-28","lead","Reviewed and approved draft"),T("2026-05-03","staff","Signed the PIP"),T("2026-08-05","line","Final outcome confirmed: not met"),T("2026-08-05","system","Outcome shared with Employee Relations")]},
  {id:"PIP-2026-004",uid:"EMP-11590",mgr:"EMP-07655",type:"PIP",basis:"three",start:"2026-08-03",months:3,
   concerns:[{area:"Daily card settlement reconciliations not completed by 11:00",issue:"Unreconciled items carried over; two chargeback deadlines missed in June"},{area:"Exception reports submitted with errors",issue:"Rework by Senior Officer; delayed MIS to Card Operations head"}],
   prior:[{date:"2026-05-12",area:"Late reconciliations",summary:"One-to-one; walked through the reconciliation checklist"},{date:"2026-06-16",area:"Report errors",summary:"Email with examples; agreed peer review before submission"},{date:"2026-07-14",area:"Both areas",summary:"Monthly review; no sustained improvement over 3 months"}],
   goals:["Complete 100% of daily settlement reconciliations by 11:00 each working day","Submit weekly exception reports with no more than 1 correction per month","Clear all items older than 5 days from the unreconciled queue by 30 September"],
   activities:[{g:"1",act:"Follow the revised reconciliation checklist; log completion time daily",start:"2026-08-03",end:"2026-11-02"},{g:"2",act:"Peer review with Senior Officer before submission for the first 6 weeks",start:"2026-08-03",end:"2026-09-14"},{g:"3",act:"Dedicated 1 hour daily for backlog clearance",start:"2026-08-03",end:"2026-09-30"}],
   support:["Card reconciliation refresher (Learning & Development, 12 August)","Weekly 30-minute coaching with the Head of Card Operations"],
   mgrComment:"The employee has the knowledge for the role; the gap is consistency and timeliness.",
   reviews:[
     {self:{ratings:["partial","not","partial"],comments:["On time most days; late on days with month-end volumes.","Still learning the new exception template.","Cleared about half of the old items."],overall:"I need more time on the exception reports.",on:"2026-09-01"},
      mgr:{ratings:["partial","not","partial"],comments:["On time 14 of 21 days.","Two reports needed corrections.","Backlog reduced from 46 to 21 items."],summary:"Some progress, but report quality is still below the requirement.",on:"2026-09-03"},
      empAck:{comment:"Agreed. I will use the peer review every week.",on:"2026-09-04"},done:true},
     {self:{ratings:["met","partial","met"],comments:["On time every day except 3.","One correction this month.","Backlog cleared on 28 September."],overall:"Much better month.",on:"2026-10-02"},
      mgr:{ratings:["met","partial","met"],comments:["On time 19 of 22 days; the 3 late days were system outages.","One correction, within the target.","Backlog cleared ahead of the 30 September deadline."],summary:"On track. Keep the consistency going into the final month.",on:"2026-10-05"},
      empAck:{comment:"",on:"2026-10-06"},done:true}
   ],
   status:"active",hrOn:"2026-07-30",meetingOn:"2026-08-03",empSign:"2026-08-04",empComment:"I accept the plan. I would like the remote access request approved so I can complete urgent work.",
   trail:[T("2026-07-28","line","Submitted draft PIP",null,"Sample Staff 01"),T("2026-07-30","lead","Reviewed and approved draft"),T("2026-08-03","line","Held initial meeting and sent for signature",null,"Sample Staff 01"),T("2026-08-04","staff","Signed the PIP"),T("2026-09-03","line","Check-in 1: not on track",null,"Sample Staff 01"),T("2026-10-05","line","Check-in 2: on track",null,"Sample Staff 01")]},
  {id:"PIP-2026-006",uid:"EMP-14102",mgr:"EMP-05981",type:"PIP",basis:"poor",start:"2026-11-01",months:3,
   concerns:[{area:"Account opening files returned by Compliance for missing KYC documents",issue:"11 files returned in Q3; customer accounts delayed"},{area:"Queue handling time above branch standard",issue:"Average 14 minutes against 8-minute standard"}],
   prior:[{date:"2026-07-01",area:"KYC completeness",summary:"Year-end review rated Poor; discussed KYC checklist"}],
   goals:["Zero account opening files returned for missing KYC documents in each month","Average handling time at or below 9 minutes by the end of month 2 and 8 minutes by month 3"],
   activities:[{g:"1",act:"Use the KYC document checklist on every file; supervisor spot-checks 5 files a week",start:"2026-11-01",end:"2027-01-31"},{g:"2",act:"Shadow a senior CSO for 3 half-days",start:"2026-11-03",end:"2026-11-14"}],
   support:["KYC e-learning module refresher","Weekly check with the Customer Service Supervisor"],
   mgrComment:"",reviews:[],status:"hr_review",
   trail:[T("2026-10-23","line","Submitted draft PIP",null,"Sample Staff 03")]}
];

/* Investigation requests: People & Culture (ER Lead) -> Compliance -> findings back to ER */
let invs = [
  {id:"INV-2026-005",on:"2026-10-14",uid:"EMP-10988",ref:"DA-2026-061",subject:"Trade documents sent to personal email",scope:"Review the email gateway logs for the employee from 1 September to 10 October 2026 for documents sent to external personal addresses.",due:"2026-10-21",status:"done",findings:"One email on 2 October with three customer trade documents to a personal Gmail address. No other external forwarding found. The email was deleted from the sent folder on 3 October.",recommend:"action",findingsOn:"2026-10-20",ack:false},
  {id:"INV-2026-004",on:"2026-10-23",uid:"EMP-13207",ref:"DA-2026-052",subject:"Own-account transactions at Addu City Branch",scope:"Review T24 audit logs for teller ID of the employee from 1 September to 22 October 2026 for transactions on own or related accounts, and any limit changes.",due:"2026-11-02",status:"open"},
  {id:"INV-2026-002",on:"2026-10-08",uid:"EMP-07655",ref:"DA-2026-049",subject:"Pool vehicle use in Card Operations",scope:"Confirm pool car P-12 bookings and driver logs for September 2026.",due:"2026-10-14",status:"done",findings:"Vehicle log and driver statements confirm 4 personal trips on 4, 11, 18 and 25 September during working hours. No fuel card misuse found.",recommend:"action",findingsOn:"2026-10-13",ack:true}
];
let taRequests = [
  {id:"TA-2026-005",by:"Talent Acquisition Officer",on:"2026-10-02",ref:"Internal vacancy · Senior Teller",staff:["EMP-12733","EMP-10421"],status:"rejected",decidedOn:"2026-10-03",note:"Please attach the vacancy reference from the approved recruitment plan and resubmit."},
  {id:"TA-2026-003",by:"Talent Acquisition Officer",on:"2026-08-10",ref:"2026 Promotions · Operations",staff:["EMP-11590","EMP-11402"],status:"approved",decidedOn:"2026-08-11",note:""},
  {id:"TA-2026-006",by:"Talent Acquisition Officer",on:"2026-10-10",ref:"BML/IV/2026/104",staff:["EMP-07655","EMP-09310","EMP-14102","EMP-13207"],status:"approved",decidedOn:"2026-10-11",note:""},
  {id:"TA-2026-007",by:"Talent Acquisition Officer",on:"2026-10-24",ref:"2026 Promotions · Retail",staff:["EMP-10421","EMP-14102","EMP-13207","EMP-11873","EMP-12890","EMP-13511"],status:"pending"}
];


/* PM Appeals: appeal window and sample appeals */
let appealWin = {year:2025, open:true, openedOn:"2026-10-15", closes:"2026-11-12"};
let appeals = [
  {id:"PMA-2025-000", year:2025, uid:"EMP-10633", on:"2026-10-16", at:"11:00", f:{appraiser:"Head of IT Operations", rating:"Satisfactory", reasons:["discussion"], other:"", expected:"Good", justification:"My year-end discussion was 5 minutes and none of my service desk metrics were reviewed. SLA compliance was 97% against 95%.", docs:"Service desk SLA report 2025.pdf"},
   status:"decided", fwdOn:"2026-10-17", dec:{outcome:"upheld", rating:"", text:"The Committee reviewed the SLA report and the appraiser's notes. SLA compliance was met, but the rating reflects two Information Security breaches in the year, which the appraiser discussed. The original rating is upheld. The Committee asks the appraiser to hold a full PM discussion with the employee.", on:"2026-10-23", ref:"Review Committee 10/2026"}, seen:false},
  {id:"PMA-2024-007", year:2024, uid:"EMP-11590", on:"2025-02-12", at:"10:05",
   f:{appraiser:"Head of Card Operations", rating:"Satisfactory", reasons:["kpi"], other:"", expected:"Good",
      justification:"KPI 2 (settlement turnaround) was measured against a 4-hour target that was introduced in October. Before that the target was 8 hours, which I met every month from January to September.", docs:"Settlement turnaround Jan-Dec 2024.xlsx"},
   status:"decided", fwdOn:"2025-02-13", dec:{outcome:"revised", rating:"Good", text:"The Committee found that the revised 4-hour target applied only from October 2024 and should not have been applied to the full year. KPI 2 is re-rated as Met, and the overall rating is revised to Good.", on:"2025-03-04", ref:"Review Committee 02/2025"}, seen:true},
  {id:"PMA-2023-012", year:2023, uid:"EMP-11590", on:"2024-02-20", at:"14:40",
   f:{appraiser:"Head of Card Operations", rating:"Good", reasons:["overall"], other:"", expected:"Very Good",
      justification:"I led the chargeback backlog clearance in Q3, which is not reflected in the overall rating.", docs:""},
   status:"decided", fwdOn:"2024-02-21", dec:{outcome:"upheld", rating:"", text:"The Committee reviewed the KPI evidence and the appraiser's comments. The backlog work was recognised in the competency section and the overall rating of Good is consistent with the KPI results. The original rating is upheld.", on:"2024-03-12", ref:"Review Committee 03/2024"}, seen:true},
  {id:"PMA-2025-001", year:2025, uid:"EMP-14102", on:"2026-10-20", at:"09:12",
   f:{appraiser:"Branch Manager", rating:"Poor", reasons:["overall","discussion"], other:"", expected:"Satisfactory",
      justification:"My PM discussion did not take place. The rating was shared by email without the year-end review meeting, so I could not explain the KYC process changes in Q3.", docs:"Email 3 Oct 2026.pdf"},
   status:"committee", fwdOn:"2026-10-21"},
  {id:"PMA-2025-002", year:2025, uid:"EMP-09310", on:"2026-10-23", at:"16:30",
   f:{appraiser:"Head of Corporate Banking", rating:"Good", reasons:["kpi","other"], other:"Portfolio transferred mid-year", expected:"Very Good",
      justification:"KPI 1 (portfolio growth) includes four accounts transferred to me in July with negative balances. Excluding them, growth was 18% against a 12% target.", docs:"Portfolio report H2.pdf"},
   status:"submitted"}
];

/* Year-end PM results and ER Lead requests to start PIPs */
const PM_RESULTS = {year:2025, sharedOn:"2026-10-05", ratings:{"EMP-13690":"Poor","EMP-12733":"Poor","EMP-13207":"Poor","EMP-11873":"Poor","EMP-14102":"Poor","EMP-10421":"Satisfactory","EMP-11590":"Good","EMP-11402":"Poor"}};
let pipReqs = [{id:"PR-2025-001", uid:"EMP-13207", mgr:"EMP-06120", year:2025, on:"2026-10-20", due:"2026-11-03"}];
````

### `js/platform.js`

````javascript
/* =====================================================================
   Platform services
   The original prototype ran inside a Claude artifact and used the
   artifact runtime (window.claude.use(...)). This file replaces each of
   those with a standard web equivalent so the app runs anywhere.

   1. Downloads   was claude.use("downloads").save()  -> Blob + <a download>
   2. Saved data  was in-memory only                   -> localStorage
   3. Claude assist was claude.use("sample")           -> POST /api/assist on server.js
   ===================================================================== */
const Platform = (() => {

  /* 1. DOWNLOADS
     The app calls Platform.downloads.save({filename, data}) for PDFs and CSVs.
     The artifact runtime showed a confirmation; a normal browser just downloads. */
  const downloads = {
    async save({ filename, data }) {
      const type = filename.endsWith(".csv") ? "text/csv;charset=utf-8" : filename.endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
      const blob = data instanceof Blob ? data : new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { status: "saved" };
    }
  };

  /* 2. SAVED DATA
     The prototype kept everything in memory, so a reload reset it. Here every
     change is saved to this browser's localStorage after each screen update
     (app.js calls Platform.save() from render()). It is per browser only.
     For a shared, multi-user system, replace load()/save() with calls to your
     own API (for example Express + SQLite or the HR system), keeping the same
     collection names: cases, voice, pips, invs, taRequests, appeals, pipReqs. */
  const KEY = "era-data-v1";
  const collections = () => ({ cases, voice, pips, invs, taRequests, appeals, pipReqs });
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ ...collections(), appealWin })); } catch (e) { /* storage full or blocked: keep working in memory */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return;
      const saved = JSON.parse(raw);
      Object.entries(collections()).forEach(([k, arr]) => { if (Array.isArray(saved[k])) arr.splice(0, arr.length, ...saved[k]); });
      if (saved.appealWin) Object.assign(appealWin, saved.appealWin);
    } catch (e) { /* corrupt or blocked storage: fall back to sample data */ }
  }
  function reset() {
    try {
      localStorage.removeItem(KEY);
      Object.keys(localStorage).filter(k => k.startsWith("draft:")).forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    location.reload();
  }

  /* 3. CLAUDE ASSIST (optional)
     Returns a function with the same shape the app used before:
       await assist(prompt, {onText, signal}) -> {text, truncated}
       await assist.json(prompt, {signal})    -> parsed JSON
     It talks to server.js, which holds the API key. The key must never be put
     in browser code. Returns null (assist panels stay hidden) when the page is
     opened with Live Server or the server has no ANTHROPIC_API_KEY. */
  async function assist() {
    if (location.protocol === "file:") return null;   // opened as a file: no server, no assist
    try {
      const h = await fetch("/api/health").then(r => r.ok ? r.json() : null);
      if (!h || !h.assist) return null;
    } catch (e) { return null; }
    const call = async (input, opts = {}) => {
      let res;
      try {
        res = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: input }), signal: opts.signal });
      } catch (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "upstream_error", message: String(e) }; }
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw { code: e.code || "upstream_error", message: e.message || res.statusText }; }
      const { text } = await res.json();
      if (opts.onText) opts.onText({ text, delta: text });   // the server replies in one piece; no streaming
      return { text, truncated: false };
    };
    const fn = (input, opts) => call(input, opts);
    fn.json = async (input, opts) => {
      const { text } = await call(input + "\n\nReply with only the JSON value, no other text.", opts);
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      let body = fence ? fence[1] : text;
      const start = [body.indexOf("{"), body.indexOf("[")].filter(i => i >= 0);
      if (!fence && start.length) body = body.slice(Math.min(...start), Math.max(body.lastIndexOf("}"), body.lastIndexOf("]")) + 1);
      try { return JSON.parse(body); } catch (e) { throw { code: "invalid_json", text }; }
    };
    return fn;
  }

  load();   // restore saved changes before the first render
  return { downloads, save, reset, assist };
})();

document.addEventListener("click", ev => {
  if (ev.target.closest("#resetData") && confirm("Clear all saved changes and reload the sample data?")) Platform.reset();
});
````

### `js/app.js`

````javascript
const state = {staffUid:STAFF_USER, voiceTab:null, voiceSel:null, procKind:null, procSel:null, procFilter:"all", leadTab:"cases", role:"staff", staffTab:"voice", staffSub:"actions", selected:null, mode:"view", fromEsc:null, taSel:null, taNew:false, pipNew:false, pipPrefill:null};

const $ = s => document.querySelector(s);
const mainEl = () => document.getElementById("wsbody") || document.getElementById("main");
const emp = uid => EMPLOYEES.find(e=>e.uid===uid);
const managerName = e => e.managerUid ? actor(e.managerUid) : e.manager;
const reportsOf = uid => EMPLOYEES.filter(e=>e.managerUid===uid);
const isLineManager = uid => reportsOf(uid).length>0;
const esc = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt = d => { if(!d) return "—"; const x = new Date(d+"T09:00:00"); return x.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}); };
const iso = d => { const z=new Date(d.getTime()-d.getTimezoneOffset()*60000); return z.toISOString().slice(0,10); };
const addDays = (d,n)=>{const x=new Date(d); x.setDate(x.getDate()+n); return x;};
const addMonths = (d,n)=>{const x=new Date(d); x.setMonth(x.getMonth()+n); return x;};
const addWorkdays = (d,n)=>{let x=new Date(d); while(n>0){x.setDate(x.getDate()+1); const w=x.getDay(); if(w!==5 && w!==6) n--;} return x;};
const D = s => new Date(s+"T09:00:00");
const pillOf = (map,s) => `<span class="pill t-${map[s][1]}">${map[s][0]}</span>`;
const pill = s => pillOf(STATUS,s);
const actor = uid => !uid ? "" : WS[uid] ? ROLES[WS[uid].role].label : emp(uid).designation;
const escName = c => c.escBy==="compliance" ? "Compliance" : c.escBy ? "Line manager ("+actor(c.escBy)+")" : "";
const INV_STATUS = {open:["With Compliance","warn"], done:["Findings received","ok"]};
const roleName = t => t.role==="comp"?"Compliance":t.role==="system"?"System":t.role==="staff"?"Staff member":t.role==="att"?"Attendee"+(t.name?" · "+t.name:""):t.role==="line"?"Line manager":ROLES[t.role].full;
const nextId = (prefix, list) => prefix+String(Math.max(0,...list.filter(x=>x.id.startsWith(prefix)).map(x=>+x.id.slice(-3)))+1).padStart(3,"0");

const isSerious = c => c.clauses.some(k=>k.startsWith("3.1")) || !!(c.other && c.other.serious);
const hasBreach = c => (c.clauses&&c.clauses.length) || (c.other && c.other.text);
const clauseShort = c => [...c.clauses, ...(c.other?["Other"]:[])].join(", ");
const clauseLines = c => [...c.clauses.map(k=>k+" · "+CLAUSES[k]), ...(c.other?["Other ("+(c.other.serious?"treated as Serious/Gross":"treated as Other Misconduct")+") · "+c.other.text]:[])];
const overlap = (a,b) => a.clauses.filter(k=>b.clauses.includes(k));

function clausePicker(p, sel, other){
  const grp = (pre,label)=>`<div class="g">${label}</div>${Object.keys(CLAUSES).filter(k=>k.startsWith(pre)).map(k=>`<label><input type="checkbox" class="${p}-ck" value="${k}" ${sel.includes(k)?"checked":""}><span class="k">${k}</span><span>${esc(CLAUSES[k])}</span></label>`).join("")}`;
  return `<div class="cpick">
    <div class="cbox" role="group" aria-label="Clauses">${grp("3.1","3.1 Serious/Gross Misconduct")}${grp("3.2","3.2 Other Misconduct")}</div>
    <label class="oth"><input type="checkbox" id="${p}-oth" ${other?"checked":""}> Other breach not listed above</label>
    <div class="row" id="${p}-othbox" ${other?"":"hidden"}>
      <label class="f" for="${p}-otxt">Describe the breach <span class="h">e.g. the policy or rule breached</span><input id="${p}-otxt" value="${esc(other?.text||"")}"></label>
      <label class="f" for="${p}-ocat">Treat as<select id="${p}-ocat"><option value="other" ${other&&!other.serious?"selected":""}>Other Misconduct (progressive, §3.2)</option><option value="serious" ${other?.serious?"selected":""}>Serious/Gross Misconduct (D&amp;G, §3.1)</option></select></label>
    </div></div>`;
}
function readClauses(p){
  const clauses=[...document.querySelectorAll("."+p+"-ck:checked")].map(i=>i.value);
  const o = $("#"+p+"-oth")?.checked ? {text:$("#"+p+"-otxt").value.trim(), serious:$("#"+p+"-ocat").value==="serious"} : null;
  return {clauses, other:o};
}
function clauseError(d){
  if(!d.clauses.length && !d.other) return "Choose at least one clause, or describe an unlisted breach under Other.";
  if(d.other && d.other.text.length<5) return "Describe the unlisted breach under Other.";
  return null;
}
function attendeePicker(p, sel, exclude){
  return `<div class="cbox" role="group" aria-label="Attendees" style="max-height:200px">${EMPLOYEES.filter(e=>e.uid!==exclude).map(e=>`<label><input type="checkbox" class="${p}-att" value="${e.uid}" ${sel.includes(e.uid)?"checked":""}><span><strong style="font-weight:600">${esc(e.name)}</strong> · ${esc(e.designation)}</span></label>`).join("")}</div>`;
}
const readAttendees = p => [...document.querySelectorAll("."+p+"-att:checked")].map(i=>i.value);

function priorActions(uid, excludeId){
  return cases.filter(c=>c.uid===uid && c.id!==excludeId && (c.status==="issued"||c.status==="recorded") && c.action)
              .sort((a,b)=>a.decidedOn<b.decidedOn?-1:1);
}

function route(c){
  const e = emp(c.uid); const flags=[]; let role=null, why;
  if(!e || !hasBreach(c)) return {role:null, approver:null, why: c.status==="escalated" ? "Not yet assessed. The route is set once clauses are chosen." : "Choose an employee and clause to see who approves.", flags};
  const category = isSerious(c) ? "serious" : "other";
  if(c.other && !c.other.serious) flags.push({l:"info",t:"Unlisted breach treated as Other Misconduct. People & Culture decides these on severity and impact (§3.2)."});
  if(c.other && c.other.serious) flags.push({l:"info",t:"Unlisted breach treated as Serious/Gross Misconduct. The D&G Committee evaluates these on severity and impact (§3.1)."});
  if(c.clauses.length + (c.other?1:0) > 1) flags.push({l:"info",t:"Several breaches in one case. One notice lists them all; the most serious sets the route."});
  if(!c.action){
    const r = category==="serious" ? "D&G Committee" : e.rank>=HEAD_RANK||/Employee Relations/.test(e.dept) ? "People & Culture Director" : "Head of Total Rewards & Employee Relations";
    return {role:null, approver:null, why:"Action is proposed after questioning. On current facts this would go to: "+r+".", flags};
  }
  const prior = priorActions(c.uid, c.id);
  const sameIssue = prior.filter(p=>overlap(p,c).length);
  if(c.action==="verbal"){
    why="Verbal advice is given by the line manager and logged by ER. No review or approval (§5(1)).";
    if(category==="serious") flags.push({l:"block",t:"Serious/Gross Misconduct cases go to the D&G Committee, not verbal advice."});
  } else if(category==="serious" || c.action==="dismiss"){
    const s = [...c.clauses.filter(k=>k.startsWith("3.1")), ...(c.other?.serious?["the unlisted breach"]:[])].join(", ");
    role="dg"; why = category==="serious" ? "Includes Serious/Gross Misconduct ("+s+"). Decided by the committee (§2, §4(7))." : "Dismissal is referred to the committee in this prototype.";
  } else if(e.rank>=HEAD_RANK){
    role="pcd"; why=e.designation+" is Head level or above, so the People & Culture Director approves.";
  } else {
    role="head"; why=RANKS[e.rank]+" grade, below Head level, so the Head of TR&ER approves.";
    if(/Employee Relations/.test(e.dept)){ role="pcd"; flags.push({l:"warn",t:"Employee works in the TR&ER team. Escalated to the Director to avoid a conflict of interest."}); }
  }
  const dup = sameIssue.find(p=>p.action===c.action);
  if(dup) flags.push({l:"block",t:ACTIONS[c.action].label+" was already given for "+overlap(dup,c).join(", ")+" ("+dup.id+", "+fmt(dup.decidedOn)+"). The procedure allows it only once per issue."});
  const lastStep = Math.max(0,...sameIssue.map(p=>ACTIONS[p.action].step));
  if(category==="other" && !dup && ACTIONS[c.action].step>lastStep+1 && c.action!=="dismiss")
    flags.push({l:"info",t:"Skips an earlier step for this issue. Allowed where the nature of the misconduct warrants it (§5(2)–(3)). The reason should say why."});
  if(prior.length>=2) flags.push({l:"warn",t:prior.length+" prior actions on file. Consider referral as multiple/repeated misconduct (§3.1(17), §5(5))."});
  const activeFinal = prior.find(p=>p.action==="final" && addDays(D(p.decidedOn),365)>TODAY);
  if(activeFinal && c.action!=="dismiss") flags.push({l:"warn",t:"Active Final Warning ("+activeFinal.id+"). Further misconduct may warrant dismissal (§5(4))."});
  if(c.source==="pip" && !c.clauses.includes("3.2(3)")) flags.push({l:"info",t:"PIP cases normally use clause 3.2(3), failure to meet performance standards."});
  return {role, approver: role?ROLES[role].full:"Line Manager · "+managerName(e), why, flags, blocked:flags.some(f=>f.l==="block")};
}

function consequences(c){
  switch(c.action){
    case "verbal": return VERBAL_DISCLAIMER;
    case "caution": return "For one year from the date of this notice, you will not be eligible for transfers/promotions. Any further misconduct may result in additional disciplinary action in accordance with the Bank\u2019s Disciplinary Procedure.";
    case "final": return "For one year from the date of this notice, you will not be eligible for transfer/promotion, an annual increment, a performance-related bonus or employee credit facilities. Any further misconduct may result in further disciplinary action, up to and including dismissal, in accordance with the Bank\u2019s Disciplinary Procedure.";
    case "dismiss": return "Employment with the Bank is terminated. Final settlement will be processed per the employment agreement.";
  }
  return "";
}

function owner(c){
  switch(c.status){
    case "sc_issued": case "min_staff": return "staff";
    case "min_amend": return "lead";
    case "sc_draft": return "mgr";
    case "sc_returned": return "lead";
    case "escalated": case "sc_answered": case "ready": case "min_lead": case "returned": return "lead";
    case "min_att": return "att";
    case "review": return "mgr";
    case "pending": return route(c).role;
    case "prelim": return c.staffResponse ? route(c).role : "staff";
    case "issued": case "recorded": return c.ackOn ? null : "staff";
  }
  return null;
}
function visibleTo(role){
  if(role==="lead"||role==="mgr") return cases;
  return cases.filter(c=>route(c).role===role && ["pending","prelim","issued"].includes(c.status));
}
function staffTodos(uid){
  const out = [];
  cases.filter(c=>c.uid===uid && owner(c)==="staff").forEach(c=>{
    const notice = ["prelim","issued","recorded"].includes(c.status);
    let title, detail;
    if(c.status==="sc_issued"){ title="Show cause notice awaiting your reply"; detail="Reply by "+fmt(c.sc.due); }
    else if(c.status==="min_staff"){ title="Meeting minutes to review and sign"; detail="Meeting on "+fmt(c.mins.date); }
    else if(c.status==="prelim"){ title="Preliminary decision: response window open"; detail="Respond by "+fmt(iso(addWorkdays(D(c.prelimOn),5))); }
    else { title="New "+ACTIONS[c.action].label+" to open"; detail="Issued "+fmt(c.decidedOn); }
    out.push({tab:"history", sub: notice?(c.action==="verbal"?"verbal":"actions"):"minutes", pk: c.method==="showcause"?"showcause":"minutes", id:c.id, title, detail});
  });
  cases.filter(c=>c.status==="min_att" && c.mins.attSigns[uid]===null).forEach(c=>out.push({tab:"tosign",pk:"minutes",id:c.id,title:"Sign minutes as meeting attendee",detail:"Meeting on "+fmt(c.mins.date)+" · "+emp(c.uid).name}));
  voice.filter(v=>vOwner(v)===uid && v.unread).forEach(v=>out.push({tab:"voice",vsel:v.id,title:"New reply on your "+VOICE[v.type].label.toLowerCase(),detail:vTitle(v)+" · "+v.id}));
  pipReqs.filter(r=>r.mgr===uid && !reqPip(r)).forEach(r=>out.push({tab:"pip",title:"Start a PIP for "+emp(r.uid).name,detail:r.year+" year-end rating Poor · draft by "+fmt(r.due)}));
  appeals.filter(a=>a.uid===uid && a.status==="decided" && !a.seen).forEach(a=>out.push({tab:"appeal",apsel:a.id,title:"Review Committee decision on your PM appeal",detail:a.year+" performance year · "+AP_OUT[a.dec.outcome]}));
  pips.filter(p=>p.uid===uid && p.status==="to_sign").forEach(p=>out.push({tab:"mypip",pk:"mypip",id:p.id,title:"Review and sign your "+p.type,detail:"Starts "+fmt(p.start)}));
  pips.filter(p=>p.status==="active").forEach(p=>{ const cur=pipCurrent(p); if(!cur) return; const st=revState(pipRev(p,cur.i),cur.final);
    if(p.uid===uid && st==="self") out.push({tab:"mypip",pk:"mypip",id:p.id,title:p.type+" "+cur.label.toLowerCase()+": self-assessment",detail:"Due "+fmt(cur.due)});
    if(p.uid===uid && st==="ack") out.push({tab:"mypip",pk:"mypip",id:p.id,title:cur.final?"Respond to your final PIP review":"Sign off "+p.type+" "+cur.label.toLowerCase(),detail:"Reviewed by "+actor(p.mgr)});
    if(p.mgr===uid && st==="mgr") out.push({tab:"pip",title:"Review "+cur.label.toLowerCase()+": "+emp(p.uid).name,detail:p.id+" · due "+fmt(cur.due)});
    if(p.mgr===uid && st==="confirm") out.push({tab:"pip",title:"Confirm final PIP outcome: "+emp(p.uid).name,detail:p.id}); });
  pips.filter(p=>p.mgr===uid && ["returned","meeting"].includes(p.status)).forEach(p=>out.push({tab:"pip",title:p.status==="meeting"?"Hold the initial PIP meeting: "+emp(p.uid).name:"PIP returned by People & Culture: "+emp(p.uid).name,detail:p.id}));
  return out;
}
const voiceTodo = r => voice.filter(v=>reviewerOf(v)===r && (r==="chief" ? chiefTodo(v) : v.status!=="closed" && (!v.receivedBy || v.needsReply || v.dec?.stage==="lead"))).length;
const FORMAL = ["grievance","harassment","gender"];
const decAt = st => voice.filter(v=>FORMAL.includes(v.type) && v.dec?.stage===st).length;
const leadExtras = () => voiceTodo("pc") + taRequests.filter(r=>r.status==="pending").length + pips.filter(p=>p.status==="hr_review").length + invs.filter(i=>i.status==="done"&&!i.ack).length;
const actionCount = role => {
  if(role==="staff") return staffTodos(state.staffUid).length;
  if(role==="ta") return 0;
  if(role==="chief") return voiceTodo("chief");
  if(role==="comp") return invs.filter(i=>i.status==="open").length;
  const base = visibleTo(role).filter(c=>owner(c)===role).length;
  if(role==="lead") return base + leadExtras() + appeals.filter(a=>a.status==="submitted").length;
  if(role==="mgr") return base + decAt("mgr") + appeals.filter(a=>a.status==="committee").length;
  if(role==="pcd") return base + decAt("pcd");
  return base;
};

/* ---------- documents ---------- */
const letterhead = (ref,date,unit) => `<div class="lh"><div><b>${BRAND.legalName}</b><div style="font-size:12px;color:#6b6362">${unit||"People &amp; Culture · Employee Relations"}</div></div><div class="ref">Ref ${esc(ref)}<br>${date}<br>Confidential</div></div>`;
const toBlock = e => `<p style="margin:0 0 2px">To: <strong>${esc(e.name)}</strong> (${esc(e.uid)})</p><p style="margin:0 0 14px;color:#6b6362">${esc(e.designation)} · ${esc(e.dept)}</p>`;

function showCauseHTML(c){
  const e = emp(c.uid), s = c.sc;
  return `<div class="doc">${!s.issuedOn?'<span class="stamp">DRAFT</span>':""}${letterhead(c.id+"/SC",s.issuedOn?fmt(s.issuedOn):"Not yet issued")}${toBlock(e)}
    <h4>Show cause notice</h4>
    <p>The Bank has received information that may amount to misconduct under the Disciplinary Procedure.</p>
    <table><tbody><tr><th scope="row">Possible breach</th><td>${clauseLines(c).map(esc).join("<br>")}</td></tr><tr><th scope="row">Allegation</th><td>${esc(s.allegation)}</td></tr><tr><th scope="row">Reply by</th><td>${fmt(s.due)}, through the ESS Portal</td></tr></tbody></table>
    <p style="margin:0">Please answer each question below. No decision will be made before your reply is considered.</p>
    <ol class="qa">${s.questions.map((q,i)=>`<li>${esc(q)}${s.answers?`<div class="a">${esc(s.answers[i]||"No answer given.")}</div>`:`<div class="a empty">Awaiting reply</div>`}</li>`).join("")}</ol>
    ${s.answeredOn?`<p class="foot">Reply submitted electronically by ${esc(e.name)} on ${fmt(s.answeredOn)}.</p>`:s.noReply?`<p class="foot">No reply received by ${fmt(s.due)}. Case continued without a reply on ${fmt(s.noReply)}.</p>`:`<p class="foot">Issued by Employee Relations on ${fmt(s.issuedOn)}.</p>`}
  </div>`;
}
const minsComplete = m => m.staffSign && m.leadSign && m.attendees.every(u=>m.attSigns[u]);
function minutesHTML(c){
  const e = emp(c.uid), m = c.mins;
  const sig = (who,name,on)=>`<div class="sig"><div><strong>${who}</strong></div><div>${esc(name)}</div><div class="s ${on?"ok":"wait"}">${on?"Signed electronically · "+fmt(on):"Awaiting signature"}</div></div>`;
  const present = ["ER Lead", ...m.attendees.map(u=>actor(u)), e.name+" (employee)"].join(", ");
  const attC = Object.entries(m.attComments||{}).filter(([,v])=>v);
  return `<div class="doc">${!minsComplete(m)?'<span class="stamp">UNSIGNED</span>':""}${letterhead(c.id+"/MIN",fmt(m.date))}
    <h4>Minutes of disciplinary meeting</h4>
    <table><tbody>
      <tr><th scope="row">Employee</th><td>${esc(e.name)} (${esc(e.uid)}), ${esc(e.designation)}</td></tr>
      <tr><th scope="row">Date and venue</th><td>${fmt(m.date)} · ${esc(m.venue)}</td></tr>
      <tr><th scope="row">Present</th><td>${esc(present)}</td></tr>
      <tr><th scope="row">Matter</th><td>${clauseLines(c).map(esc).join("<br>")}</td></tr>
    </tbody></table>
    <ol class="qa">${m.entries.map(x=>`<li>${esc(x.q)}<div class="a">${esc(x.a)}</div></li>`).join("")}</ol>
    ${(m.amendments||[]).length?`<p style="margin:14px 0 0"><strong>Amendments requested by the employee</strong></p><table><tbody>${m.amendments.map(a=>`<tr><th scope="row">${fmt(a.on)}</th><td>${esc(a.text)}<br><span style="color:#6b6362">${a.status==="pending"?"With the ER Lead":(a.status==="approved"?"Approved":"Not approved")+" by the ER Lead · "+fmt(a.decidedOn)+(a.leadNote?" · "+esc(a.leadNote):"")}</span></td></tr>`).join("")}</tbody></table>`:""}
    ${m.staffComment||attC.length?`<table><tbody>${m.staffComment?`<tr><th scope="row">Employee's corrections</th><td>${esc(m.staffComment)}</td></tr>`:""}${attC.map(([u,v])=>`<tr><th scope="row">Comment · ${esc(emp(u).name)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>`:""}
    <div class="sigs">${sig("Employee",e.name,m.staffSign)}${sig("Employee Relations Lead","ER Lead",m.leadSign)}${m.attendees.map(u=>sig("Attendee",actor(u),m.attSigns[u])).join("")}</div>
  </div>`;
}

const pipEnd = p => iso(addMonths(D(p.start),p.months));
const pipCheckpoints = p => Array.from({length:p.months},(_,i)=>iso(addMonths(D(p.start),i+1)));
/* ---------- PIP review periods (WorkCompass-style) ----------
 * Each checkpoint is a review period. Flow per period:
 *   employee self-assessment (rating + comment per goal)  ->  line manager assessment
 *   ->  employee sign-off with comments  ->  (final review only) manager confirms outcome.
 * Interim outcome: "On track" unless any goal is rated Not met by the manager.
 * Final outcome: Met only if every goal is rated Met by the manager.            */
const RATINGS = {not:"Not met", partial:"Partially met", met:"Met"};
const pipPeriods = p => pipCheckpoints(p).map((due,i)=>({i, due, final:i===p.months-1, label: i===p.months-1 ? "Final review" : "Check-in "+(i+1)}));
const pipRev = (p,i) => { p.reviews = p.reviews||[]; return p.reviews[i] || (p.reviews[i]={}); };
const pipDone = p => (p.reviews||[]).filter(r=>r.done).length;
const pipCurrent = p => { const per = pipPeriods(p); const i = per.findIndex(x=>!(p.reviews||[])[x.i]?.done); return i<0 ? null : per[i]; };
function revState(r, final){
  if(r.done) return "done";
  if(r.mgr && final && r.empAck) return "confirm";
  if(r.mgr) return "ack";
  if(r.self) return "mgr";
  return "self";
}
const REV_STATE = {self:["Self-assessment due","warn"], mgr:["With line manager","info"], ack:["Employee sign-off","warn"], confirm:["Manager to confirm outcome","warn"], done:["Completed","ok"], locked:["Not started","info"]};
function revOutcome(r, final){
  const rt = r.mgr?.ratings||[];
  if(final) return rt.length && rt.every(x=>x==="met") ? "met" : "not";
  return rt.includes("not") ? "behind" : "track";
}
const OUTCOME_LABEL = {met:"Met: all goals achieved", not:"Not met", track:"On track", behind:"Not meeting requirements"};
const rateChip = v => v ? `<span class="rate r-${v}">${RATINGS[v]}</span>` : `<span class="note">Not rated</span>`;
const rateInput = (name, sel) => `<div class="rseg" role="radiogroup">${Object.entries(RATINGS).map(([k,l])=>`<label><input type="radio" name="${name}" value="${k}" ${sel===k?"checked":""}> ${l}</label>`).join("")}</div>`;

function pipReviewHTML(p, viewer){
  if(!["active","met","not_met"].includes(p.status)) return "";
  const per = pipPeriods(p), cur = pipCurrent(p);
  const key = p.id; state.pipPer = state.pipPer||{};
  if(state.pipPer[key]===undefined || state.pipPer[key] > (cur?cur.i:per.length-1)) state.pipPer[key] = cur ? cur.i : per.length-1;
  const sel = per[state.pipPer[key]], r = pipRev(p, sel.i), st = revState(r, sel.final);
  const tabs = `<div class="pertabs" role="tablist">${per.map(x=>{ const rr=(p.reviews||[])[x.i]||{}; const locked = cur && x.i>cur.i; const s2 = locked?"locked":revState(rr,x.final);
      return `<button type="button" role="tab" data-pper="${key}:${x.i}" aria-selected="${x.i===sel.i}" ${locked?"disabled":""}><b>${x.label}</b><small>${fmt(x.due)}</small><span class="pill t-${REV_STATE[s2][1]}">${REV_STATE[s2][0]}</span></button>`; }).join("")}</div>`;
  const me = viewer==="staff" && st==="self", mm = viewer==="mgr" && st==="mgr";
  const goals = p.goals.map((g,gi)=>{
    const sr = r.self?.ratings?.[gi], sc = r.self?.comments?.[gi], mr = r.mgr?.ratings?.[gi], mc = r.mgr?.comments?.[gi];
    const empCol = me ? `${rateInput(`rs-${key}-${gi}`, sr)}<textarea id="rsc-${key}-${gi}" placeholder="Your comments and examples"></textarea>`
      : r.self?.skipped ? `<span class="note">No self-assessment submitted</span>` : r.self ? `${rateChip(sr)}${sc?`<p>${esc(sc)}</p>`:""}` : `<span class="note">Not yet submitted</span>`;
    const mgrCol = mm ? `${rateInput(`rm-${key}-${gi}`, sr)}<textarea id="rmc-${key}-${gi}" placeholder="Evidence and feedback"></textarea>`
      : r.mgr ? `${rateChip(mr)}${mc?`<p>${esc(mc)}</p>`:""}` : `<span class="note">${viewer==="staff"&&st==="self"?"After your self-assessment":"Not yet reviewed"}</span>`;
    return `<div class="gcard"><div class="ghead"><span class="qn">${gi+1}</span><span>${esc(g)}</span></div>
      <div class="gcols"><div><span class="eyebrow">Employee</span>${empCol}</div><div><span class="eyebrow">Line manager</span>${mgrCol}</div></div></div>`;
  }).join("");
  let foot = "";
  if(me) foot = `<label class="f" for="rso-${key}">Overall comments <span class="h">Optional</span><textarea id="rso-${key}"></textarea></label>
      <p class="flag f-block" id="rserr-${key}" hidden>Rate every goal before submitting.</p>
      <div class="actions"><button class="btn primary" data-act="rvself" data-id="${p.id}">Submit self-assessment</button><span class="note">Due by ${fmt(sel.due)}. Your line manager reviews it next.</span></div>`;
  else if(mm) foot = `${r.self?.overall?`<p class="flag f-info"><strong>Employee's overall comments</strong><span>${esc(r.self.overall)}</span></p>`:""}
      <label class="f" for="rmo-${key}">Review summary <span class="h">Shared with the employee</span><textarea id="rmo-${key}"></textarea></label>
      <p class="note" style="margin:0">${sel.final?"Raise only issues already in the PIP. The PIP is met only if every goal is rated Met. The employee responds before you confirm the outcome.":"The check-in is on track unless a goal is rated Not met."+(p.type==="PIP 2"?" A check-in that is not meeting requirements sends the evidence to Employee Relations for "+(sel.i===0?"a Cautionary Notice.":"a Final Warning Notice."):"")}</p>
      <p class="flag f-block" id="rmerr-${key}" hidden>Rate every goal and add a summary.</p>
      <div class="actions"><button class="btn primary" data-act="rvmgr" data-id="${p.id}">Submit review</button></div>`;
  else if(viewer==="mgr" && st==="self") foot = `<div class="task passive"><h3>Waiting for the employee's self-assessment</h3><p class="note" style="margin:0">Due ${fmt(sel.due)}. You can review without it if the employee does not submit.</p><div class="actions"><button class="btn sm" data-act="rvskip" data-id="${p.id}">Review without self-assessment</button></div></div>`;
  else if(r.mgr){
    const out = revOutcome(r, sel.final);
    foot = `<div class="revsum"><div><span class="eyebrow">Manager's summary · ${fmt(r.mgr.on)}</span><p>${esc(r.mgr.summary)}</p></div><div><span class="eyebrow">${sel.final&&!r.done?"Proposed outcome":"Outcome"}</span><span class="pill t-${["met","track"].includes(out)?"ok":"bad"}">${OUTCOME_LABEL[out]}</span></div></div>`;
    if(viewer==="staff" && st==="ack") foot += `<div class="task"><h3>${sel.final?"Respond to your final review":"Sign off this check-in"}</h3>
        <p class="note" style="margin:0">${sel.final?"Your response is considered before your line manager confirms the outcome.":"Signing confirms you have read the review. It does not mean you agree."}</p>
        <label class="f" for="rak-${key}">Your comments <span class="h">${sel.final?"":"Optional"}</span><textarea id="rak-${key}"></textarea></label>
        <p class="flag f-block" id="rakerr-${key}" hidden>Add your response before submitting.</p>
        <div class="actions"><button class="btn primary" data-act="rvack" data-id="${p.id}">${sel.final?"Submit response":"Sign off"}</button></div></div>`;
    else if(r.empAck) foot += `<p class="flag f-info"><strong>Employee ${sel.final?"response":"sign-off"} · ${fmt(r.empAck.on)}</strong><span>${esc(r.empAck.comment||"No comments.")}</span></p>`;
    if(viewer==="mgr" && st==="confirm") foot += `<div class="task"><h3>Confirm the final outcome</h3><p class="note" style="margin:0">Based on your ratings: <strong>${OUTCOME_LABEL[out]}</strong>.${out==="not"?(p.type==="PIP"?" Verbal advice will be recorded and PIP 2 started.":" A termination recommendation goes to Employee Relations."):""}</p><div class="actions"><button class="btn primary" data-act="rvconfirm" data-id="${p.id}">Confirm outcome</button></div></div>`;
  }
  else if(viewer!=="staff" || st!=="self") foot = `<p class="note" style="margin:0">Waiting for the ${st==="self"?"employee's self-assessment":"line manager's review"}.</p>`;
  return `<section class="review"><div class="ph"><h4>Review periods</h4><span class="note">${pipDone(p)} of ${per.length} complete</span></div>${tabs}
    <div class="perbody">${goals}${foot}</div></section>`;
}

function pipHTML(p){
  const e = emp(p.uid), m = emp(p.mgr), two = p.type==="PIP 2";
  const tbl = (head, rows) => `<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${head.length}">—</td></tr>`}</tbody></table>`;
  const sig = (who,name,on)=>`<div class="sig"><div><strong>${who}</strong></div><div>${esc(name)}</div><div class="s ${on?"ok":"wait"}">${on?"Signed electronically · "+fmt(on):"Awaiting signature"}</div></div>`;
  const purpose = two ? `A performance improvement plan to address gaps in performance was initiated and the final review was completed on ${fmt(p.prevReview)}. PIP 2 is being initiated as the staff failed to meet the requirements specified in the PIP. The purpose of this PIP 2 is to document critical issues in your performance and clearly define areas that require immediate improvement, and state consequences that will follow if you fail to meet the required improvement.`
    : "The purpose of this PIP is to document the gaps in your work performance, define expectations, allow the opportunity to demonstrate improvement and commitment.";
  const timeline = two ? `Effective ${fmt(p.start)}, you are placed on a 90-day improvement plan. During this time, you will be required to address the shortcomings in your performance highlighted above. Failure to meet performance requirements will result in progressive disciplinary action leading up to termination of employment.`
    : `Effective ${fmt(p.start)}, you are placed on a ${p.months}-month performance improvement plan, ending ${fmt(pipEnd(p))}. During this time, you are required to make regular progress on the plan outlined above. Your full cooperation and commitment is required during the review period. In case of non-compliance, or where significant lapses or negligence are observed, appropriate disciplinary action will be taken.`;
  const after = two ? ["Before initiating this PIP 2, the line manager discussed the outcome of your PIP with you and recorded the discussion (verbal counselling).","If required improvement is not seen within the first month, a Cautionary Notice will be issued.","If there is no improvement after the Cautionary Notice, a Final Warning will be issued at the second review.","At the end of PIP 2 (three months), if you have not reached the desired performance level, the Bank will proceed with termination of employment with notice."]
    : ["Your manager will initiate the progressive disciplinary process.","A more targeted improvement plan (PIP 2) will be initiated for a duration of 3 months.","PIP 2 will run parallel with the progressive disciplinary process, starting with verbal advice."];
  return `<div class="doc">${["hr_review","returned","meeting"].includes(p.status)?'<span class="stamp">DRAFT</span>':""}${letterhead(p.id,fmt(p.start),"People &amp; Culture · Performance Management")}
    <h4>${two?"Targeted Performance Improvement Plan (PIP 2)":"Performance Improvement Plan (PIP)"} <span style="color:#b8141f">[Confidential]</span></h4>
    <table><tbody>
      <tr><th scope="row">Name</th><td>${esc(e.name)}</td></tr><tr><th scope="row">UID</th><td>${esc(e.uid)}</td></tr>
      <tr><th scope="row">Designation</th><td>${esc(e.designation)}</td></tr><tr><th scope="row">Section/Department</th><td>${esc(e.dept)}</td></tr>
      <tr><th scope="row">Date of joining</th><td>${fmt(e.doj)}</td></tr><tr><th scope="row">Line Manager</th><td>${esc(actor(m.uid))}</td></tr>
      <tr><th scope="row">Basis</th><td>${p.basis==="poor"?"“Poor” rating at year-end performance review":"Underperformance documented consistently over 3 months"}</td></tr>
    </tbody></table>
    <p>${esc(purpose)}</p>
    <p style="margin:12px 0 0"><strong>Areas of concern</strong>: actions (or inactions) and/or behaviours that have adversely affected job performance, colleagues and/or customers.</p>
    ${tbl(["Areas of concern","Resulting issues"], p.concerns.map(x=>[x.area,x.issue]))}
    ${two?"":`<p style="margin:12px 0 0"><strong>Observations, previous discussions or coaching sessions</strong></p>${tbl(["Date","Area of concern","Summary of how concern was addressed"], p.prior.map(x=>[fmt(x.date),x.area,x.summary]))}`}
    <p style="margin:12px 0 0"><strong>Improvement goals (SMART)</strong></p>
    ${tbl(["#","Goal"], p.goals.map((g,i)=>[String(i+1),g]))}
    <p style="margin:12px 0 0"><strong>Activities and actions to help reach goals</strong></p>
    ${tbl(["Goal #","Activities/actions","Start date","Estimated completion"], p.activities.map(a=>[a.g,a.act,fmt(a.start),fmt(a.end)]))}
    <p style="margin:12px 0 0"><strong>Resources / management support</strong></p>
    ${tbl(["#","Resource"], p.support.map((s,i)=>[String(i+1),s]))}
    <p style="margin:12px 0 0"><strong>Progress checkpoints</strong> (monthly check-in meetings with the line manager)</p>
    ${tbl(["Checkpoint","Date","Type","Progress expected"], pipCheckpoints(p).map((d,i)=>[(i===p.months-1?"Final review":"Check-in "+(i+1)), fmt(d), "Meeting (in person or Teams)", i===p.months-1?"All goals met":"Measurable progress on all goals"]))}
    <p style="margin:12px 0 0"><strong>Follow-up notes</strong></p>
    ${tbl(["Date","Review","Discussion","Progress"], pipPeriods(p).filter(x=>(p.reviews||[])[x.i]?.mgr).map(x=>{const r=p.reviews[x.i];return [fmt(r.mgr.on), x.label, r.mgr.summary+(r.empAck?.comment?" · Employee: "+r.empAck.comment:""), OUTCOME_LABEL[revOutcome(r,x.final)]];}))}
    <p style="margin:12px 0 0"><strong>Timeline for improvement</strong></p><p style="margin:4px 0">${esc(timeline)}</p>
    <p style="margin:12px 0 0"><strong>${two?"Progressive disciplinary process as part of PIP 2":"Subsequent action in case of failure to meet performance at the end of review period"}</strong></p>
    <ol style="margin:6px 0;padding-left:20px">${after.map(a=>`<li>${esc(a)}</li>`).join("")}</ol>
    <table><tbody><tr><th scope="row">Line Manager comments</th><td>${esc(p.mgrComment||"—")}</td></tr><tr><th scope="row">Employee comments</th><td>${esc(p.empComment||"—")}</td></tr>${p.hrNote?`<tr><th scope="row">People & Culture review note</th><td>${esc(p.hrNote)}</td></tr>`:""}</tbody></table>
    <div class="sigs">${sig("Employee",e.name,p.empSign)}${sig("Line Manager",actor(m.uid),p.meetingOn)}</div>
    <p class="foot">If you have any questions about this plan, please speak to your line manager or Employee Relations. We are here to support you.</p>
  </div>`;
}

function basisText(c){
  if(c.method==="showcause") return "Show cause notice dated "+fmt(c.sc.issuedOn)+(c.sc.answeredOn?"; reply received "+fmt(c.sc.answeredOn):"; no reply received by "+fmt(c.sc.due));
  if(c.method==="interview") return "Meeting on "+fmt(c.mins.date)+"; minutes signed by the employee, ER Lead and "+c.mins.attendees.length+" attendee"+(c.mins.attendees.length===1?"":"s");
  if(c.method==="pip") return "Performance Improvement Plan "+c.pipRef+"; check-ins documented by the line manager";
  return "Discussion with line manager";
}
function noticeInfo(c){
  const e = emp(c.uid);
  const d = c.status==="prelim" ? c.prelimOn : c.decidedOn;
  return [["UID",e.uid],["Name",e.name],["Unit",e.unit],["Department",e.department],["Division",e.division],["Date", d?fmt(d):"Not yet issued"]];
}
function noticeRows(c){
  const e = emp(c.uid);
  if(c.action==="verbal") return [["Concern", c.reason],["Suggestion for improvement", c.suggestion||"—"],["Impact", VERBAL_DISCLAIMER],["Issued by", managerName(e)+" (Line Manager) · "+fmt(c.decidedOn)]]; const r = route(c); const prior = priorActions(c.uid, c.id);
  const isPrelim = c.status==="prelim";
  const respondBy = c.prelimOn ? fmt(iso(addWorkdays(D(c.prelimOn),5))) : "";
  const approver = c.decidedRole ? (c.action==="verbal"?"Line Manager · "+managerName(e):ROLES[c.decidedRole].full) : r.approver;
  const lines = clauseLines(c);
  return [
    ["Action", ACTIONS[c.action].label],
    ["Category", isSerious(c)?"Serious/Gross Misconduct":"Other Misconduct"],
    [lines.length>1?"Clauses breached":"Clause breached", lines.join("\n")],
    ["Reason", c.reason],
    ["Previous actions", prior.length? prior.map(p=>ACTIONS[p.action].label+" · "+clauseShort(p)+" · "+fmt(p.decidedOn)).join("\n") : "None on record"],
    ...(c.extras.length?[["Additional action", c.extras.map(x=>EXTRAS[x]).join("\n")]]:[]),
    ["Impact", consequences(c)],
    ...(isPrelim?[["Your response", "You may respond in writing by "+respondBy+". The decision will be confirmed after your response is considered."]]:[]),
    ["Approved by", approver+" · "+(c.decidedOn?fmt(c.decidedOn):isPrelim?"preliminary, "+fmt(c.prelimOn):"pending")]
  ];
}
const noticeTitle = c => (c.status==="prelim"?"Preliminary decision: ":"")+ACTIONS[c.action].label;
const noticeFoot = c => (c.ackOn ? "Received electronically by the employee on "+fmt(c.ackOn)+(c.ackAt?" at "+c.ackAt:"")+"." : "Received electronically by the employee when opened in the ESS Portal.")+" A copy is kept on your personnel file.";
function noticeHTML(c){
  const draft = ["review","pending","returned"].includes(c.status);
  const cell = v => esc(v).replace(/\n/g,"<br>");
  return `<div class="doc">${draft?'<span class="stamp">DRAFT</span>':""}
    ${letterhead(c.id, draft?"Not yet issued":fmt(c.status==="prelim"?c.prelimOn:c.decidedOn))}
    <table><tbody>${noticeInfo(c).map(([k,v])=>`<tr><th scope="row">${k}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>
    <h4>${esc(noticeTitle(c))}</h4>
    <table><tbody>${noticeRows(c).map(([k,v])=>`<tr><th scope="row">${k}</th><td>${cell(v)}</td></tr>`).join("")}</tbody></table>
    <p class="foot">${esc(noticeFoot(c))}</p>
  </div>`;
}
function noticePDF(c){
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:"pt",format:"a4"});
  const W=595.28, H=841.89, M=48, LW=150; let y=56;
  const date = fmt(c.status==="prelim"?c.prelimOn:c.decidedOn);
  doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(184,20,31); doc.text(BRAND.legalName,M,y);
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(107,99,98); doc.text("People & Culture · Employee Relations",M,y+14);
  doc.text(["Ref "+c.id, date, "Confidential"], W-M, y-4, {align:"right"});
  doc.setDrawColor(184,20,31); doc.setLineWidth(2); doc.line(M,y+28,W-M,y+28); y+=48;
  const table = rows => { doc.setLineWidth(0.6); doc.setDrawColor(224,219,218); doc.setFontSize(10);
    rows.forEach(([k,v])=>{ const vl = doc.splitTextToSize(String(v), W-2*M-LW-16), kl = doc.splitTextToSize(k, LW-16);
      const h = Math.max(vl.length, kl.length)*13 + 12;
      if(y+h > H-70){ doc.addPage(); y=56; }
      doc.setFillColor(246,244,244); doc.rect(M,y,LW,h,"FD"); doc.rect(M+LW,y,W-2*M-LW,h,"S");
      doc.setTextColor(29,26,26); doc.setFont("helvetica","bold"); doc.text(kl, M+8, y+16);
      doc.setFont("helvetica","normal"); doc.text(vl, M+LW+8, y+16); y += h; }); };
  table(noticeInfo(c)); y+=26;
  doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(29,26,26); doc.text(noticeTitle(c), M, y); y+=14;
  table(noticeRows(c)); y+=22;
  if(y > H-80){ doc.addPage(); y=56; }
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(107,99,98);
  doc.text(doc.splitTextToSize(noticeFoot(c), W-2*M), M, y);
  return doc.output("blob");
}
async function exportPDF(c){
  if(!window.jspdf){ toast("PDF export could not load. Check your connection and try again."); return; }
  const dl = Platform.downloads /* was: window.claude.use("downloads"). See js/platform.js */;
  if(!dl){ toast("PDF export is not available in this view"); return; }
  try{ await dl.save({filename: c.id+" "+ACTIONS[c.action].label+".pdf", data: noticePDF(c)}); toast("PDF saved"); }
  catch(err){ if(err?.code!=="declined") toast(err?.code==="rate_limited"?"A save is already open. Try again in a moment.":"The PDF could not be saved here."); }
}
const pdfBtn = c => `<button class="btn sm" data-act="pdf" data-id="${c.id}" type="button">Export PDF</button>`;
const docWrap = (title, inner, noCopy, right) => `<section class="doc-wrap"><div class="doc-bar"><h3>${title}</h3><div class="actions">${right||""}${noCopy?"":`<button class="btn sm" data-act="copy" type="button">Copy text</button>`}</div></div>${inner}</section>`;
function questioningDoc(c, noCopy){
  if(c.method==="showcause") return docWrap("Show cause notice and reply", showCauseHTML(c), noCopy);
  if(c.method==="interview") return docWrap("Meeting minutes", minutesHTML(c), noCopy);
  if(c.method==="pip"){ const p=pips.find(x=>x.id===c.pipRef); return p?docWrap(p.type+" · "+p.id, pipHTML(p), noCopy):""; }
  return "";
}

/* ---------- stage bars ---------- */
function stepsHTML(c){
  const bar = (label, flow, idx) => `<div class="stagebar"><span class="eyebrow">${label}</span><ol class="steps">${flow.map(([s,w],i)=>`<li class="${i<idx?"done":i===idx?"now":""}">${s}<small>${esc(w)}</small></li>`).join("")}</ol></div>`;
  if(c.action==="verbal" && ["recorded"].includes(c.status)) return `<div class="stagebars">${bar("Verbal",[["Given","Line manager"],["Logged","ER"],["Received","Staff"]], c.ackOn?3:2)}</div>`;
  let q;
  if(c.status==="escalated"||c.status==="closed") q = bar("Questioning",[["Concern raised",c.escBy==="compliance"?"Compliance":"Line manager"],["Case opened","ER Lead"]],c.status==="closed"?2:1);
  else if(c.method==="showcause") q = bar("Questioning",[["Drafted","ER Lead"],["Approved","ER Manager"],["Reply","Staff"]], ({sc_returned:0,sc_draft:1,sc_issued:2})[c.status]??3);
  else if(c.method==="pip") q = bar("Evidence",[["PIP 2 check-in","Line manager"],["Evidence to ER","Line manager"]],2);
  else q = bar("Questioning",[["Minutes drafted","ER Lead"],["Signed","Staff"],["Signed and sent","ER Lead"],["Signed",c.mins.attendees.length+" attendee"+(c.mins.attendees.length===1?"":"s")]], ({min_staff:1,min_amend:1,min_lead:2,min_att:3})[c.status]??4);
  if(c.status==="closed") return `<div class="stagebars">${q}</div>`;
  const r = route(c);
  const flow = [["Proposed","ER Lead"],["Reviewed","ER Manager"],["Approved",ROLES[r.role]?.label||"Approver"]];
  if(c.prelim) flow.push(["Preliminary","Staff may respond"]);
  flow.push(["Issued","System"],["Received","Staff"]);
  let idx;
  if(["sc_answered","ready","returned"].includes(c.status)) idx=0;
  else if(PRE.includes(c.status)) idx=-1;
  else idx = {review:1,pending:2,prelim:3}[c.status] ?? (c.ackOn?flow.length:flow.length-1);
  return `<div class="stagebars">${q}${bar("Decision",flow,idx)}</div>`;
}

function flagsHTML(flags){
  if(!flags.length) return "";
  const lbl={block:"Stop",warn:"Check",info:"Note"};
  return `<ul class="flags">${flags.map(f=>`<li class="flag f-${f.l}"><strong>${lbl[f.l]}</strong><span>${esc(f.t)}</span></li>`).join("")}</ul>`;
}
function historyHTML(uid, excludeId){
  const p = priorActions(uid, excludeId);
  if(!p.length) return `<p class="note" style="margin:0">No previous disciplinary actions on record.</p>`;
  return `<div class="history">${p.map(x=>`<div class="hist-item"><span class="d">${fmt(x.decidedOn)}</span><span>${ACTIONS[x.action].label} · ${esc(clauseShort(x))}</span></div>`).join("")}</div>`;
}
const trailHTML = list => `<ul class="trail">${list.map(t=>`<li><span class="d">${fmt(t.on)}</span><span><span class="by">${esc(roleName(t))}</span> · ${esc(t.text)}${t.quote?`<span class="q">“${esc(t.quote)}”</span>`:""}</span></li>`).join("")}</ul>`;

/* ---------- role bar ---------- */
const personCount = uid => staffTodos(uid).length + (WS[uid] ? actionCount(WS[uid].role) : 0);
function renderRoles(){
  $("#roles").innerHTML = `<label for="userSel" class="sr">Viewing as</label><select id="userSel" class="usersel">${TEST_USERS.map(([uid,label])=>{ const n=personCount(uid); return `<option value="user:${uid}" ${state.staffUid===uid?"selected":""}>${esc(label)}${n?" ("+n+" to do)":""}</option>`; }).join("")}</select>`;
  const e = emp(state.staffUid), n = personCount(state.staffUid);
  $("#whoLine").innerHTML = `<span>${esc(e.designation)} · ${esc(e.dept)}</span>${n?`<span class="badge">${n} to do</span>`:""}`;
}

/* ---------- staff portal (OneUI ESS) ---------- */
const IC = {
  spark:`<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>`,
  archive:`<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>`,
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
  wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M7 3h10"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  euro:'<path d="M4 10h12M4 14h9M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
  coach:'<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
  monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  voice:'<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  clip:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h6"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  userplus:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  chart:'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  bulb:'<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  heart:'<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5a5.5 5.5 0 0 0-10 3.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  scale:'<path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0z"/><path d="m19 7-3 7a3 3 0 0 0 6 0z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  trend:'<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  panel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>'
};
const ic = (n,s=16)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const ESS_EXISTING = [["perdiem","Per Diem","plane"],["pf","Application of PF","wallet"],["nonbml","Non-BML Activity","briefcase"],["coi","Conflict of Interest","shield"],["fx","FX Requests","euro"],["coaching","Coaching Platform","coach",1],["coachws","Coach Workspace","monitor",1]];
const PAGE_META = {
  dashboard:["Dashboard","Overview of employee self-service portal"],
  concern:["Submit a Staff Concern","Report a conduct or attendance issue in your team to Employee Relations"],
  verbal:["Give Verbal Advice","Record advice you've discussed with a team member"],
  pip:["Submit a Staff PIP","Performance Improvement Plans for your team"],
  voice:["EmployeeVoice",""],
  history:["Disciplinary History",""],
  myrec:["My Records","Everything Employee Relations holds about you, in one place"],
  appeal:["PM Appeals","Appeal your performance rating and see Review Committee decisions"],
  mypip:["My Performance Improvement Plan","Your plan, goals and check-ins"],
  tosign:["Minutes to Sign",""]
};

function renderStaff(){
  const uid = state.staffUid, e = emp(uid), ws = WS[uid];
  const mgr = isLineManager(uid), hasPip = pips.some(p=>p.uid===uid && !["hr_review","returned"].includes(p.status));
  const todos = staffTodos(uid); const n = t => todos.filter(x=>x.tab===t).length;
  if(state.role!=="staff" && ws) state.staffTab = "ws";
  const valid = ["voice","history","appeal","myrec",...(hasPip?["mypip"]:[]),...(mgr?["concern","pip","verbal","teamrec"]:[]),...(ws?["ws","records"]:[])];
  if(!valid.includes(state.staffTab)) state.staffTab = "voice";
  const tabNow = state.staffTab;
  const item = (id,label,icon,extra="") => `<button class="ess-item" type="button" data-tab="${id}" ${tabNow===id?'aria-current="page"':""}>${ic(icon)}<span class="grow">${label}</span>${extra}</button>`;
  const cnt = k => n(k)?`<span class="ess-cnt">${n(k)}</span>`:"";
  const wsN = ws ? actionCount(ws.role) : 0;
  const wsItem = ws ? item("ws", ws.label, ws.role==="comp"?"shield":ws.grp==="er"?"users":"check", wsN?`<span class="ess-cnt">${wsN}</span>`:"") : "";
  const side = `<nav class="ess-side" aria-label="Portal menu">
      <div class="ess-brand"><span class="ess-logo">${ic("grid",16)}</span><div><b>OneUI <span>ESS Portal</span></b><small>${esc(BRAND.orgName)}</small></div></div>
      <div class="ess-grp">Employee Relations</div>
      ${item("voice","EmployeeVoice","voice",cnt("voice"))}
      ${item("history","Disciplinary History","history",cnt("history"))}${item("appeal","PM Appeals","trend",cnt("appeal"))}
      ${hasPip?item("mypip","My PIP","target",cnt("mypip")):""}${item("myrec","My Records","archive")}
      ${mgr?`<div class="ess-grp">My Team</div>${item("concern","Submit a Staff Concern","userplus")}${item("pip","Submit a Staff PIP","chart",cnt("pip"))}${item("verbal","Give Verbal Advice","voice")}${item("teamrec","Team Records","archive")}`:""}
      ${ws?`<div class="ess-grp">My Workspace</div>${wsItem}${item("records","Records","archive")}`:""}
    </nav>`;
  const ex = ESS_EXISTING.find(x=>x[0]===tabNow);
  const [title,subtitle] = tabNow==="ws" ? [ws.label, ROLES[ws.role].full] : tabNow==="records" ? ["Records", "Every "+ws.label.replace(/ Workspace$/,"")+" record, open and closed"] : tabNow==="teamrec" ? ["Team Records","Concerns, verbal advice, PIPs and outcomes for your team"] : ex ? [ex[1],"Existing ESS module"] : PAGE_META[tabNow];
  const body = tabNow==="ws" ? `<div id="wsbody" class="wsbody"></div>`
    : ex ? `<div class="ess-card"><p class="note" style="margin:0">This is an existing OneUI ESS module and is not part of this prototype.</p></div>`
    : tabNow==="records" ? staffRecords(uid,"ws") : tabNow==="myrec" ? staffRecords(uid,"self") : tabNow==="teamrec" ? staffRecords(uid,"team") : {dashboard:staffDashboard, verbal:staffVerbal, concern:staffConcern, pip:staffPIP, voice:staffVoice, history:staffHistory, appeal:staffAppeal, mypip:staffMyPIP}[tabNow](uid);
  const crumbGrp = ["concern","pip","verbal","teamrec"].includes(tabNow)?"My Team › ":["ws","records"].includes(tabNow)?"My Workspace › ":"Employee Relations › ";
  const head = ["dashboard","voice"].includes(tabNow) ? "" : `<section class="phero"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:""}</div></section>`;
  const calm = document.documentElement.classList.contains("calm");
  document.getElementById("main").innerHTML = `<div class="ess">${side}
    <div class="ess-main">
      <div class="ess-top">${ic("panel")}<span class="crumb">${crumbGrp}<b>${esc(title||"Dashboard")}</b></span><span class="sp"></span><span class="note top-name">${esc((TEST_USERS.find(x=>x[0]===uid)||[,""])[1])}</span>${ic("bell")}<button type="button" class="motion" data-act="motion" aria-pressed="${calm}" title="${calm?"Turn motion on":"Reduce motion"}" aria-label="${calm?"Turn motion on":"Reduce motion"}">${ic("sun")}</button></div>
      <main class="ess-body" aria-live="polite">${head}${body}</main>
    </div></div>`;
  if(["records","teamrec","myrec"].includes(tabNow)){ stripRec(); paintRecords(); }
}

function staffDashboard(uid){
  const e = emp(uid), ws = WS[uid], todos = staffTodos(uid), mgr = isLineManager(uid);
  const h = new Date().getHours(), greet = h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  const first = todos[0];
  const openAttr = x => `data-tab="${x.tab}" ${x.sub?`data-sub="${x.sub}"`:""} ${x.pk?`data-pk="${x.pk}" data-psel="${x.id}"`:""} ${x.vsel?`data-vopen="${x.vsel}"`:""}`;
  const wsN = ws ? actionCount(ws.role) : 0;
  const hero = `<section class="hero"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>
      <div class="hero-in"><span class="hello">${greet},</span><h2>${esc(e.name.split(" ")[0])}</h2>
      <p>${todos.length?`You have <b>${todos.length}</b> thing${todos.length===1?"":"s"} to look at.`:"You're all caught up."}${wsN?` Your workspace has <b>${wsN}</b> waiting.`:""}</p>
      <div class="actions">${first?`<button class="btn hero-btn" ${openAttr(first)}>${esc(first.title)} ${ic("chev",16)}</button>`:`<button class="btn hero-btn" data-tab="voice">Share an idea ${ic("chev",16)}</button>`}${wsN?`<button class="btn hero-ghost" data-tab="ws">Open ${esc(ws.label)}</button>`:""}</div></div></section>`;
  const tIcon = x => x.tab==="voice"?"voice":x.tab==="mypip"||x.tab==="pip"?"target":x.sub==="minutes"?"clip":"file";
  const attention = todos.length ? `<section class="dsec"><h3>Needs your attention</h3><div class="tcards">${todos.map(x=>`<button type="button" class="tcard" ${openAttr(x)}><span class="tic">${ic(tIcon(x),18)}</span><span class="tt"><b>${esc(x.title)}</b><small>${esc(x.detail)}</small></span><span class="chev">${ic("chev",16)}</span></button>`).join("")}</div></section>` : "";
  // upcoming dates
  const up = [];
  cases.filter(c=>c.uid===uid && c.status==="sc_issued").forEach(c=>up.push([c.sc.due,"Show cause reply due","history","minutes"]));
  cases.filter(c=>c.uid===uid && c.status==="prelim" && !c.staffResponse).forEach(c=>up.push([iso(addWorkdays(D(c.prelimOn),5)),"Response window closes","history","actions"]));
  pips.filter(p=>p.status==="active" && (p.uid===uid||p.mgr===uid)).forEach(p=>{ const cur=pipCurrent(p); if(cur) up.push([cur.due, (p.uid===uid?"Your ":emp(p.uid).name.split(" ")[0]+"'s ")+cur.label.toLowerCase(), p.uid===uid?"mypip":"pip"]); });
  pips.filter(p=>p.status==="to_sign" && p.uid===uid).forEach(p=>up.push([p.start,"PIP starts","mypip"]));
  up.sort((a,b)=>a[0]<b[0]?-1:1);
  const mon = d => D(d).toLocaleDateString("en-GB",{month:"short"});
  const upcoming = `<section class="dsec"><h3>Coming up</h3>${up.length?`<div class="ucards">${up.slice(0,4).map(([d,l,tab,sub])=>`<button type="button" class="ucard" data-tab="${tab}" ${sub?`data-sub="${sub}"`:""}><span class="ud"><b>${D(d).getDate()}</b><small>${mon(d)}</small></span><span>${esc(l)}</span></button>`).join("")}</div>`:`<p class="note" style="margin:0">Nothing scheduled.</p>`}</section>`;
  // requests and their status
  const mine = voice.filter(v=>vOwner(v)===uid).sort((a,b)=>a.on<b.on?1:-1).slice(0,3);
  const idx = v => V_STAGES.findIndex(x=>x[0]===vStage(v));
  const reqs = `<section class="dsec"><div class="dsec-h"><h3>Your requests</h3><button type="button" class="btn link" data-tab="voice">EmployeeVoice</button></div>${mine.length?`<div class="rcards">${mine.map(v=>`<button type="button" class="rcard" data-tab="voice" data-vopen="${v.id}"><span class="tt"><b>${esc(vTitle(v))}</b><small>${esc(VOICE[v.type].label)} · ${fmt(v.on)}</small></span><span class="mini" aria-label="${vStatus(v)[0]}">${V_STAGES.map((_,i)=>`<i class="${i<=idx(v)?"on":""}"></i>`).join("")}</span><span class="pill t-${vStatus(v)[1]}">${vStatus(v)[0]}</span>${v.unread?'<span class="ess-cnt">New reply</span>':""}</button>`).join("")}</div>`:`<p class="note" style="margin:0">No requests yet.</p>`}</section>`;
  // quick actions
  const qa = (tab,icon,label) => `<button type="button" class="qtile" data-tab="${tab}"><span>${ic(icon,20)}</span>${label}</button>`;
  const quick = `<section class="dsec"><h3>Quick actions</h3><div class="qtiles">${qa("voice","voice","EmployeeVoice")}${qa("history","history","Disciplinary History")}${pips.some(p=>p.uid===uid&&!["hr_review","returned"].includes(p.status))?qa("mypip","target","My PIP"):""}${mgr?qa("concern","userplus","Staff concern")+qa("pip","chart","Staff PIP")+qa("verbal","voice","Verbal advice"):""}${ws?qa("ws",ws.role==="comp"?"shield":"users",ws.label):""}</div></section>`;
  const other = `<section class="dsec"><h3>Other services</h3><div class="chips">${ESS_EXISTING.map(([id,l,i])=>`<button type="button" class="schip" data-tab="${id}">${ic(i,14)} ${l}</button>`).join("")}</div></section>`;
  return `${hero}<div class="dgrid"><div class="dcol">${attention}${reqs}</div><div class="dcol">${upcoming}${quick}${other}</div></div>`;
}

function staffVerbal(uid){
  if(state.vaDone){ const c=cases.find(x=>x.id===state.vaDone); return doneCard("Verbal advice recorded", `${esc(emp(c.uid).name)} can now view it in their Disciplinary History and respond.`, c.id, `<button class="btn primary" data-act="vadoneok">Done</button>`); }
  const team = reportsOf(uid);
  const given = cases.filter(c=>c.action==="verbal" && c.escBy===uid).sort((a,b)=>a.created<b.created?1:-1);
  return `<div class="split">
    <form class="form" id="vaForm" novalidate>
      <p class="note" style="margin:0">Verbal advice is not a disciplinary action. Discuss it with the employee first, then record it here. The employee can view it and respond.</p>
      <label class="f" for="va-uid">Team member<select id="va-uid"><option value="">Select…</option>${team.map(t=>`<option value="${t.uid}">${esc(t.name)} · ${esc(t.designation)}</option>`).join("")}</select></label>
      <div id="va-card"></div>
      <label class="f" for="va-date" style="max-width:220px">Date discussed<input type="date" id="va-date" value="${iso(TODAY)}"></label>
      <label class="f" for="va-concern">Concern <span class="req">*</span><span class="h">What you discussed, with dates</span><textarea id="va-concern"></textarea></label>
      <label class="f" for="va-sugg">Suggestion for improvement <span class="req">*</span><textarea id="va-sugg"></textarea></label>
      <p class="flag f-info" style="margin:0"><strong>Impact shown to the employee</strong><span>${esc(VERBAL_DISCLAIMER)}</span></p>
      <p class="flag f-block" id="va-err" hidden></p>
      <div class="actions"><button class="btn primary" type="submit">Record verbal advice</button></div>
    </form>
    <aside class="route"><span class="eyebrow">Verbal advice you have given</span>
      ${given.length?given.map(c=>`<div class="card" style="background:var(--surface)"><div class="top"><strong style="font-size:14px">${esc(emp(c.uid).name)}</strong><span class="ref">${c.id}</span></div><span class="note">${fmt(c.decidedOn)} · ${c.ackOn?"Opened by employee":"Not yet opened"}${c.vaResponse?" · employee responded":""}</span></div>`).join(""):`<p class="note" style="margin:0">None yet.</p>`}
    </aside></div>`;
}
function staffConcern(uid){
  if(state.concernDone){ const c=cases.find(x=>x.id===state.concernDone); return doneCard("Sent to Employee Relations", `Employee Relations will review your concern about ${esc(emp(c.uid).name)} and decide the next step. You'll see its status here.`, c.id, `<button class="btn primary" data-act="concerndoneok">Done</button>`); }
  const team = reportsOf(uid);
  const mine = cases.filter(c=>c.escBy===uid).sort((a,b)=>a.created<b.created?1:-1);
  const mstat = c => c.status==="escalated" ? ["Received by Employee Relations","info"] : ["issued","recorded","closed"].includes(c.status) ? ["Closed","ok"] : ["In progress with Employee Relations","warn"];
  return `<div class="split">
    <form class="form" id="escForm" novalidate>
      <p class="note" style="margin:0">Tell Employee Relations about a conduct or attendance issue in your team. ER decides whether to issue a show cause notice or hold a meeting. For performance gaps, use Submit a Staff PIP instead.</p>
      <label class="f" for="e-uid">Team member<select id="e-uid"><option value="">Select…</option>${team.map(t=>`<option value="${t.uid}">${esc(t.name)} · ${esc(t.designation)}</option>`).join("")}</select></label>
      <div class="row">
        <label class="f" for="e-type">Type of concern<select id="e-type">${ISSUE_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></label>
        <label class="f" for="e-when">When it happened<input id="e-when" placeholder="e.g. 6, 13 and 20 October 2026"></label>
      </div>
      <label class="f" for="e-details">What happened <span class="h">Facts only: what, when, who saw it, and any evidence (logs, emails).</span><textarea id="e-details" style="min-height:100px"></textarea></label>
      <label class="f" for="e-disc">Have you discussed it with the employee?<select id="e-disc"><option>No</option><option>Informally</option><option value="verbal">Yes, I gave verbal advice</option></select></label>
      <label class="f" for="e-va" id="e-vabox" hidden>Which verbal advice? <span class="h">Verbal advice you recorded for this team member</span><select id="e-va"></select></label>
      <p class="flag f-block" id="e-err" hidden></p>
      <div class="actions"><button class="btn primary" type="submit">Submit to Employee Relations</button></div>
    </form>
    <aside class="route"><span class="eyebrow">Concerns you submitted</span>
      ${mine.length?mine.map(c=>{const s=mstat(c);return `<div class="card" style="background:var(--surface)"><div class="top"><strong style="font-size:14px">${esc(emp(c.uid).name)}</strong><span class="ref">${c.id}</span></div><span class="pill t-${s[1]}" style="align-self:flex-start">${s[0]}</span><span class="note">Submitted ${fmt(c.created)}</span></div>`}).join(""):`<p class="note" style="margin:0">None yet.</p>`}
      <p class="note" style="margin:0">For confidentiality you see only whether a concern is open or closed, not the decision.</p>
    </aside></div>`;
}

/* ---------- Step-by-step forms: progress, review, save draft ----------
 * Mark a <form data-steps data-draft="key"> with child <div class="wstep" data-title="..">.
 * A step with data-review gets an automatic summary of earlier steps. Fields with data-req
 * must be filled before moving on. Drafts are kept in memory and, where allowed, the browser. */
const drafts = {};
const formEls = f => [...f.querySelectorAll("input,select,textarea")];
function saveDraft(f){ const k=f.dataset.draft; if(!k) return; const d={vals:formEls(f).map(el=>el.type==="checkbox"||el.type==="radio"?el.checked:el.type==="file"?null:el.value), step:f._step||0, at:nowTime()}; drafts[k]=d; try{ localStorage.setItem("draft:"+k, JSON.stringify(d)); }catch(e){} }
function loadDraft(k){ if(!k) return null; if(drafts[k]) return drafts[k]; try{ const v=localStorage.getItem("draft:"+k); return v?JSON.parse(v):null; }catch(e){ return null; } }
function clearDraft(k){ if(!k) return; delete drafts[k]; try{ localStorage.removeItem("draft:"+k); }catch(e){} }
function fieldLabel(el){ const l=el.closest("label"); if(l && !el.closest(".seg,.rseg,.checks")){ const t=[...l.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(" ").replace(/\s+/g," ").trim(); if(t) return t; } return el.getAttribute("aria-label")||""; }
function fieldVal(el){ if(el.tagName==="SELECT") return el.value?el.selectedOptions[0].textContent.trim():""; if(el.type==="file") return [...el.files].map(x=>x.name).join(", "); if(el.type==="radio") return el.checked?el.closest("label").textContent.trim():""; if(el.type==="checkbox") return ""; if(el.type==="date"&&el.value) return fmt(el.value); if(el.type==="datetime-local"&&el.value) return fmt(el.value.slice(0,10))+" at "+el.value.slice(11,16); return el.value.trim(); }
function initSteps(f){
  const steps=[...f.querySelectorAll(":scope > .wstep")]; if(steps.length<2) return;
  const k=f.dataset.draft, d=loadDraft(k);
  const bar=document.createElement("div"); bar.className="wbar"; f.prepend(bar);
  const nav=document.createElement("div"); nav.className="wnav"; f.append(nav);
  if(d){ const els=formEls(f); d.vals.forEach((v,i)=>{ const el=els[i]; if(!el||v===null||el.readOnly||el.disabled) return; if(el.type==="checkbox"||el.type==="radio") el.checked=v; else if(el.type!=="file") el.value=v; }); els.forEach(el=>el.dispatchEvent(new Event("change",{bubbles:true}))); }
  const review = i => { let box=steps[i].querySelector(".wreview"); if(!box){ box=document.createElement("div"); box.className="wreview"; steps[i].prepend(box); }
    box.innerHTML = steps.slice(0,i).map((st,j)=>{ const seen=new Set(); const rows=[...st.querySelectorAll("input,select,textarea")].filter(el=>!el.readOnly).map(el=>[fieldLabel(el),fieldVal(el)]).filter(([l,v])=>v && !(seen.has(l+v)) && seen.add(l+v));
      return `<section class="rvsec"><div class="rvh"><b>${esc(st.dataset.title)}</b><button type="button" class="btn link" data-wgo="${j}">Edit</button></div>${rows.length?`<dl>${rows.map(([l,v])=>`<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`:`<p class="note" style="margin:0">Nothing entered.</p>`}</section>`; }).join(""); };
  const show = i => { f._step=i; steps.forEach((st,j)=>st.hidden=j!==i);
    bar.innerHTML = `<ol class="wprog">${steps.map((st,j)=>`<li class="${j<i?"done":j===i?"now":""}"><span>${j<i?ic("check",13):j+1}</span><b>${esc(st.dataset.title)}</b></li>`).join("")}</ol><div class="wmeter" aria-hidden="true"><i style="width:${i/(steps.length-1)*100}%"></i></div>${d&&!f._dismissed?`<p class="wdraft">${ic("clock",14)} Draft restored from ${d.at}. <button type="button" class="btn link" data-wdiscard>Start again</button></p>`:""}`;
    if(steps[i].dataset.review) review(i);
    nav.innerHTML = `${i>0?`<button type="button" class="btn" data-wback>Back</button>`:""}${k?`<button type="button" class="btn link" data-wsave>Save draft</button>`:""}<span class="sp"></span>${i<steps.length-1?`<button type="button" class="btn primary" data-wnext>Next</button>`:""}<p class="flag f-block wnerr" hidden>Complete the fields marked * to continue.</p>`;
    nav.hidden = false; };
  f.addEventListener("click", ev=>{
    const b = ev.target.closest("[data-wnext],[data-wback],[data-wsave],[data-wgo],[data-wdiscard]"); if(!b) return;
    ev.preventDefault(); ev.stopPropagation(); const i=f._step||0;
    if(b.dataset.wnext!==undefined){ const miss=[...steps[i].querySelectorAll("[data-req]")].filter(el=>!el.value.trim()); steps[i].querySelectorAll("[data-req]").forEach(el=>el.setAttribute("aria-invalid", miss.includes(el)));
      if(miss.length){ nav.querySelector(".wnerr").hidden=false; miss[0].focus(); return; } show(i+1); f.scrollIntoView?.({block:"start",behavior:"smooth"}); }
    if(b.dataset.wback!==undefined) show(i-1);
    if(b.dataset.wgo!==undefined) show(+b.dataset.wgo);
    if(b.dataset.wsave!==undefined){ saveDraft(f); toast("Draft saved"); }
    if(b.dataset.wdiscard!==undefined){ clearDraft(k); f._dismissed=true; formEls(f).forEach(el=>{ if(el.readOnly||el.disabled) return; if(el.type==="checkbox"||el.type==="radio") el.checked=el.defaultChecked; else if(el.type!=="file") el.value=el.defaultValue; }); show(0); }
  }, true);
  show(Math.min(d?.step||0, steps.length-1));
}
const doneCard = (title, text, ref, btns) => `<section class="donecard"><span class="dic">${ic("check",26)}</span><h3>${esc(title)}</h3><p>${text}</p>${ref?`<span class="dref">${esc(ref)}</span>`:""}<div class="actions" style="justify-content:center">${btns||""}</div></section>`;

/* Basic information card: small uppercase labels over bold values, three columns */
function infoCard(e, extra){
  const rows = [["Name",e.name],["UID",e.uid],["Job title",e.designation],["Division",e.division],["Department",e.department],["Unit",e.unit],...(extra||[])];
  return `<dl class="infocard">${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
}
const V_STAGES = [["submitted","Submitted"],["received","Received"],["review","Under review"],["closed","Closed"]];
const vStage = v => v.status==="closed" ? "closed" : v.status==="review" ? "review" : v.receivedBy ? "received" : "submitted";
const vStatus = v => ({submitted:["Submitted","warn"], received:["Received","info"], review:["Under review","info"], closed:["Closed","ok"]})[vStage(v)];
const genCode = () => { const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789"; const r=n=>Array.from({length:n},()=>A[Math.floor(Math.random()*A.length)]).join(""); return "EV-"+r(4)+"-"+r(4); };
const vOwner = v => v.uid || v.owner || null;
const chiefTodo = v => v.status!=="closed" && (!(v.thread||[]).some(t=>t.by==="chief") || !!v.needsReply);
const reviewerOf = v => v.type==="chief" ? "chief" : "pc";
const reviewerName = v => v.type==="chief" ? "Office of the Chief" : "People & Culture";
/* thread + tracker shown to staff ("staff") or the reviewer ("pc" / "chief") */
function voiceTrackHTML(v, viewer){
  const stage = vStage(v), idx = V_STAGES.findIndex(x=>x[0]===stage);
  const steps = `<ol class="vsteps">${V_STAGES.map(([k,l],i)=>`<li class="${i<idx||stage==="closed"?"done":i===idx?"now":""}"><span class="vd">${i<idx||stage==="closed"?ic("check",14):i+1}</span><span>${l}</span></li>`).join("")}</ol>`;
  const author = t => t.by==="system" ? "" : t.by==="staff" ? (viewer==="staff"?"You":(v.anon?"Anonymous submitter":emp(v.uid).name)) : (viewer==="staff"?reviewerName(v):(t.by==="chief"?"Office of the Chief":"People & Culture")+((viewer==="pc"&&t.by==="pc")||(viewer==="chief"&&t.by==="chief")?" · you":""));
  const items = [{on:v.on,at:v.at,by:"system",text:"Submitted"+(v.anon?" anonymously":"")}, ...(v.thread||[])];
  const thread = `<ol class="vthread">${items.map(t=>t.by==="system"
      ? `<li class="sys"><span>${esc(t.text)}</span><time>${fmt(t.on)} ${t.at||""}</time></li>`
      : `<li class="msg ${t.by==="staff"?"me":"them"} ${(viewer==="staff")===(t.by==="staff")?"mine":""}"><div class="bub"><b>${esc(author(t))}</b><p>${esc(t.text)}</p><time>${fmt(t.on)} ${t.at||""}</time></div></li>`).join("")}
    ${v.status==="closed"&&v.outcome?`<li class="sys out"><span><b>Outcome:</b> ${esc(v.outcome)}</span></li>`:""}</ol>`;
  let box = "";
  if(v.status!=="closed"){
    if(viewer==="staff") box = `<div class="vreply"><label class="f" for="vr-${v.id}">Reply to ${reviewerName(v)}<textarea id="vr-${v.id}" placeholder="${v.anon?"Your reply stays anonymous":"Add information or ask a question"}"></textarea></label><p class="flag f-block" id="vrerr-${v.id}" hidden>Write a message first.</p><div class="actions"><button class="btn primary" data-act="vstaffreply" data-id="${v.id}">Send reply</button></div></div>`;
    else if((v.receivedBy && viewer==="pc") || viewer==="chief") box = `<div class="vreply"><label class="f" for="vr-${v.id}">Reply to the ${v.anon?"anonymous submitter":"employee"} <span class="h">${v.anon?"They see it in My submissions. Their identity stays hidden":"They are notified in the ESS Portal"}</span><textarea id="vr-${v.id}"></textarea></label>
        <div class="row" style="align-items:end"><label class="f" for="vs-${v.id}">Status after sending<select id="vs-${v.id}"><option value="review" ${stage!=="closed"?"selected":""}>Under review</option>${FORMAL.includes(v.type)?"":`<option value="closed">Closed (message becomes the outcome)</option>`}</select></label></div>
        <p class="flag f-block" id="vrerr-${v.id}" hidden>Write a message first.</p>
        <div class="actions"><button class="btn primary" data-act="vrevreply" data-id="${v.id}">Send</button>${viewer==="pc"&&["harassment","gender","grievance"].includes(v.type)&&!v.anon?`<button class="btn" data-act="vcase">Open disciplinary case</button>`:""}</div></div>`;
  }
  return `<section class="vtrack">${steps}${thread}${box}</section>`;
}
const vTitle = v => v.f.subject || VOICE[v.type].label;
function voiceFields(type, e){
  const fld = (id,label,opts={}) => `<label class="f" for="vf-${id}">${label}${opts.req?' <span class="req">*</span>':""}${opts.h?` <span class="h">${opts.h}</span>`:""}${opts.area?`<textarea id="vf-${id}" ${opts.req?"data-req":""} ${opts.tall?'style="min-height:110px"':""}>${esc(opts.v||"")}</textarea>`:`<input id="vf-${id}" type="${opts.type||"text"}" value="${esc(opts.v||"")}" ${opts.req?"data-req":""} ${opts.ro?"readonly":""}>`}</label>`;
  const submitRow = `<p class="flag f-block" id="v-err" hidden></p><div class="actions"><button class="btn primary" type="submit">Submit</button></div>`;
  const complainant = () => `<fieldset><legend>Information of the complainant</legend>
      <div class="row">${fld("cname","Name",{v:e.name,ro:1})}${fld("nic","NIC No",{req:1})}</div>
      <div class="row">${fld("addr","Present Address",{req:1})}${fld("contact","Contact no",{req:1,type:"tel"})}</div>
      ${fld("paddr","Permanent Address")}
      ${fld("cjob","Job title",{v:e.designation,ro:1})}
      ${fld("cunit","Division/Department/Unit",{v:e.division+" / "+e.department+" / "+e.unit,ro:1})}</fieldset>`;
  const sigBlock = withName => `<fieldset><legend>Signature</legend>
      <div class="row">${withName?fld("sname","Name of the complainant",{v:e.name,ro:1}):""}${fld("sdate","Date",{v:fmt(iso(TODAY)),ro:1})}</div>
      <div class="checks"><label><input type="checkbox" id="vf-sign"> <span><b>${withName?"Signature":"Signature of the complainant"}</b> · I confirm the information in this form is true to the best of my knowledge and sign it electronically.</span></label></div></fieldset>`;
  if(type==="grievance") return `
      <div class="wstep" data-title="What happened">${infoCard(e)}
      ${fld("event","When and where did it happen?",{req:1,area:1})}
      ${fld("description","What happened, and who was involved?",{req:1,area:1,tall:1})}</div>
      <div class="wstep" data-title="Steps taken">${fld("previous","Have you tried to resolve it already? What happened?",{req:1,area:1})}</div>
      <div class="wstep" data-title="Review" data-review="1">${submitRow}</div>`;
  if(type==="harassment") return `
      <div class="wstep" data-title="Complainant">${complainant()}</div>
      <div class="wstep" data-title="Alleged harasser"><fieldset><legend>Information of the alleged harasser</legend>
      <div class="row">${fld("aname","Name",{req:1})}${fld("anic","NIC No",{h:"If known"})}</div>
      <div class="row">${fld("aaddr","Present Address",{h:"If known"})}${fld("acontact","Contact no",{h:"If known",type:"tel"})}</div>
      ${fld("apaddr","Permanent Address",{h:"If known"})}
      ${fld("apos","Position & Place of Employment",{req:1})}</fieldset></div>
      <div class="wstep" data-title="The incident"><fieldset><legend>The incident</legend>
      ${fld("witnesses","List any witnesses who were present or provide evidence",{area:1})}
      <div class="row">${fld("where","Where did the incident occur?",{req:1})}${fld("when","Date and time of occurrence",{req:1,type:"datetime-local"})}</div>
      ${fld("other","If the harassment was towards another person, please identify that person:",{area:1,h:"Leave blank if it was towards you"})}</fieldset></div>
      <div class="wstep" data-title="Description"><fieldset><legend>Brief description of the harassment</legend>
      ${fld("description","Brief description of the harassment",{req:1,area:1,tall:1})}</fieldset></div>
      <div class="wstep" data-title="Sign & submit" data-review="1">${sigBlock(false)}${submitRow}</div>`;
  if(type==="gender") return `
      <div class="wstep" data-title="Complainant">${complainant()}</div>
      <div class="wstep" data-title="Accused"><fieldset><legend>Information of the accused</legend>
      <div class="row">${fld("aname","Name",{req:1})}${fld("anic","NIC No",{h:"If known"})}</div>
      <div class="row">${fld("acontact","Contact no",{h:"If known",type:"tel"})}${fld("acontact2","Contact no",{h:"Second number, if known",type:"tel"})}</div>
      ${fld("aemail","Email",{h:"If known",type:"email"})}
      ${fld("apos","Position & Place of Employment",{req:1})}</fieldset></div>
      <div class="wstep" data-title="Description"><fieldset><legend>Brief Description of the Complaint</legend>
      ${fld("description","Brief Description of the Complaint",{req:1,area:1,tall:1,h:"If any documents are submitted with the form, please provide details here"})}
      <label class="f" for="vf-docs">Documents submitted with the form <span class="h">Optional</span><input id="vf-docs" type="file" multiple></label></fieldset></div>
      <div class="wstep" data-title="Sign & submit" data-review="1">${sigBlock(true)}${submitRow}</div>`;
  return `<p class="note" style="margin:0">Goes to the ${VOICE[type].to}. ${type==="chief"?"People & Culture can see these to make sure each one gets a response.":""}</p>
      <div class="seg" role="radiogroup" aria-label="Type">${Object.entries(VOICE_KINDS).map(([k,l],i)=>`<label><input type="radio" name="vf-kind" value="${k}" ${i===0?"checked":""}> ${l}</label>`).join("")}</div>
      ${fld("subject","Subject",{req:1})}
      ${fld("details","Details",{req:1,area:1,tall:1})}
      <label class="anon"><input type="checkbox" id="vf-anon" checked><span><b>Submit anonymously</b><small>Reviewers won't see your name or UID. Only you can see it in My submissions.</small></span></label>`;
}
const VOICE_REQ = {
  grievance:["event","description","previous"],
  harassment:["nic","addr","contact","aname","apos","where","when","description"],
  gender:["nic","addr","contact","aname","apos","description"],
  chief:["subject","details"], pc:["subject","details"]
};
function staffVoice(uid){
  const e = emp(uid);
  const sel = voice.find(v=>v.id===state.voiceSel && vOwner(v)===uid);
  if(sel){ sel.unread=false;
    return `<div class="ev">${backBtn(state.voiceTab==="status"?"Back to my submissions":"Back")}
      <div class="ev-strip ${VOICE_CARD[sel.type].cls}"><span class="ev-ic">${ic(VOICE_CARD[sel.type].icon,22)}</span><span class="ev-ct"><b>${esc(vTitle(sel))}</b><small>${esc(VOICE[sel.type].label)} · ${sel.id}${sel.anon?" · anonymous · reference "+sel.code:""}</small></span></div>
      <div class="actions">${docPdfBtn("voice",sel.id)}</div>
      ${voiceTrackHTML(sel,"staff")}
      <details class="docdet"><summary>View your submission</summary>${voiceDocHTML(sel)}</details></div>`; }
  if(state.voiceDone){ const v = voice.find(x=>x.id===state.voiceDone);
    return `<div class="ev ev-land"><div class="ev-done"><span class="ev-ic">${ic("check",26)}</span><h2>Submitted</h2><p>${v.anon?"Your submission is anonymous. Reviewers don't see your name or UID. You can follow it and reply in My submissions.":"You can follow updates and reply in My submissions."}</p>
      ${v.anon?`<div class="ev-code"><code id="ev-code">${v.code}</code><button class="btn sm" type="button" data-act="vcopycode">Copy</button></div>`:""}
      <div class="actions" style="justify-content:center"><button class="btn primary" data-act="vopendone">View this submission</button><button class="btn" data-act="vbackland">Back to EmployeeVoice</button></div></div></div>`; }
  const tag = "";
  const subRow = v => {const st=vStatus(v);return `<li><button type="button" class="prow" data-vsel="${v.id}" style="grid-template-columns:36px minmax(0,1fr) auto 16px"><span class="pic ev-dot ${VOICE_CARD[v.type].cls}">${ic(VOICE_CARD[v.type].icon,16)}</span><span class="pmain"><b>${esc(vTitle(v))}${v.unread?' <span class="ess-cnt">New reply</span>':""}${v.anon?' <span class="evn">Anonymous</span>':""}</b><small>${esc(VOICE[v.type].label)} · ${v.id} · ${fmt(v.on)}</small></span><span class="pill t-${st[1]}">${st[0]}</span><span class="chev">${ic("chev",16)}</span></button></li>`};
  if(state.voiceTab==="status"){
    const mine = voice.filter(v=>vOwner(v)===uid).sort((a,b)=>a.on<b.on?1:-1);
    return `<div class="ev">${backBtn("Back to EmployeeVoice")}<div class="ev-sechead"><h2>My submissions</h2><p class="note" style="margin:0">Anonymous submissions show here only for you. Reviewers never see your name.</p></div>
      ${mine.length?`<ul class="plist">${mine.map(subRow).join("")}</ul>`:`<div class="empty">You have no submissions yet.</div>`}${tag}</div>`;
  }
  const tab = VOICE[state.voiceTab] ? state.voiceTab : null;
  if(!tab){
    const row = k => `<li><button type="button" class="evrow" data-vtab="${k}"><span class="evi ${VOICE_CARD[k].cls}">${ic(VOICE_CARD[k].icon,18)}</span><span class="evt"><b>${VOICE[k].label}</b><small>${VOICE_CARD[k].sub}</small></span><span class="evc">${ic("chev",18)}</span></button></li>`;
    const nMine = voice.filter(v=>vOwner(v)===uid).length, nNew = voice.filter(v=>vOwner(v)===uid&&v.unread).length;
    return `<div class="ev ev-land" id="evLand">
      <div class="ev-glow" aria-hidden="true"></div>
      <header class="evh"><h2>EmployeeVoice</h2><button type="button" class="btn sm evsubs" data-vtab="status">My submissions${nNew?` <span class="ess-cnt">${nNew}</span>`:nMine?` <span class="evn">${nMine}</span>`:""}</button></header>
      <p class="evsafe">${ic("shield",14)} Your voice is protected. No retaliation. Every submission is handled in confidence.</p>
      <section class="evgrp"><h3>Ideas &amp; support</h3><ul class="evlist">${row("chief")}${row("pc")}</ul></section>
      <section class="evgrp"><h3>Formal complaints</h3><ul class="evlist">${row("grievance")}${row("harassment")}${row("gender")}</ul></section>
    </div>`;
  }
  const c = VOICE_CARD[tab];
  const mine = voice.filter(v=>vOwner(v)===uid && v.type===tab).sort((a,b)=>a.on<b.on?1:-1);
  return `<div class="ev">${backBtn("Back to EmployeeVoice")}
    <div class="ev-strip ${c.cls}"><span class="ev-ic">${ic(c.icon,22)}</span><span class="ev-ct"><b>${VOICE[tab].label}</b><small>${c.sub} · goes to ${VOICE[tab].to}</small></span></div>
    <div class="split">
    <form class="form" id="voiceForm" data-type="${tab}" ${FORMAL.includes(tab)?`data-steps data-draft="voice:${tab}:${uid}"`:""} novalidate>
      ${voiceFields(tab,e)}
      ${FORMAL.includes(tab)?"":`<p class="flag f-block" id="v-err" hidden></p><div class="actions"><button class="btn primary" type="submit">Submit</button></div>`}
    </form>
    <aside class="route"><span class="eyebrow">Your submissions</span>
      ${mine.length?`<ul class="plist">${mine.map(subRow).join("")}</ul>`:`<p class="note" style="margin:0">None yet.</p>`}
    </aside></div>${tag}</div>`;
}
function voiceDocHTML(v){
  const e = v.uid ? emp(v.uid) : null, f = v.f, cfg = VOICE[v.type];
  const t = rows => `<table><tbody>${rows.filter(r=>r).map(([k,val])=>`<tr><th scope="row">${k}</th><td>${esc(val||"—").replace(/\n/g,"<br>")}</td></tr>`).join("")}</tbody></table>`;
  const sec = h => `<p style="margin:14px 0 0"><strong>${h}</strong></p>`;
  const comp = () => sec("Information of the complainant")+t([["Name",e.name],["NIC No",f.nic],["Present Address",f.addr],["Contact no",f.contact],["Permanent Address",f.paddr],["Job title",e.designation],["Division/Department/Unit",e.division+" / "+e.department+" / "+e.unit]]);
  let body;
  if(v.type==="grievance") body = t([["UID",e.uid],["Name",e.name],["Date, time and place of event",f.event]])+sec("Detailed description of the grievance")+t([["Description",f.description],["Previous attempts to address the issue",f.previous]]);
  else if(v.type==="harassment") body = comp()+sec("Information of the alleged harasser")+t([["Name",f.aname],["NIC No",f.anic],["Present Address",f.aaddr],["Contact no",f.acontact],["Permanent Address",f.apaddr],["Position & Place of Employment",f.apos]])
      +t([["List any witnesses who were present or provide evidence",f.witnesses],["Where did the incident occur?",f.where],["Date and time of occurrence",f.when?f.when.replace("T"," "):""],["If the harassment was towards another person, please identify that person:",f.other]])+sec("Brief description of the harassment")+t([["Description",f.description]]);
  else if(v.type==="gender") body = comp()+sec("Information of the accused")+t([["Name",f.aname],["NIC No",f.anic],["Contact no",f.acontact],["Contact no",f.acontact2],["Email",f.aemail],["Position & Place of Employment",f.apos]])
      +sec("Brief Description of the Complaint")+t([["Description",f.description],["Documents submitted",[f.docs,f.docnotes].filter(Boolean).join(" · ")]]);
  else body = t([["Submitted by", v.anon?"Anonymous":e.name+" ("+e.uid+")"],["Type",VOICE_KINDS[f.kind]],["Subject",f.subject],["Details",f.details],["Sent to",cfg.to]]);
  const signed = v.type==="harassment" ? t([["Signature of the complainant",e.name+" · signed electronically"],["Date",fmt(v.on)]])
    : v.type==="gender" ? t([["Name of the complainant",e.name],["Signature","Signed electronically"],["Date",fmt(v.on)]]) : "";
  return `<div class="doc">${letterhead(v.id, fmt(v.on)+" "+(v.at||""), "People &amp; Culture · Employee Voice")}
    <h4>${esc(cfg.title)}</h4>${body}${signed}
    ${v.type!=="chief"?`<p style="margin:16px 0 0"><strong>For Official Purpose</strong></p>${["harassment","gender"].includes(v.type)
      ? `<p style="margin:6px 0 0">Form received by:</p>`+t([["Name",v.receivedBy||"Not yet received"],["Sign",v.receivedBy?"Signed electronically":"—"],["Date & Time",v.receivedBy?fmt(v.receivedAt.slice(0,10))+" "+v.receivedAt.slice(11):"—"],...(v.outcome?[["Outcome",v.outcome]]:[])])
      : t([["Form received by", v.receivedBy?v.receivedBy+" · "+fmt(v.receivedAt.slice(0,10))+" at "+v.receivedAt.slice(11):"Not yet received"],...(v.outcome?[["Outcome",v.outcome]]:[])])}`:""}
  </div>`;
}

function staffHistory(uid){
  const todos = staffTodos(uid);
  const nA = todos.filter(x=>x.tab==="history"&&x.sub==="actions").length, nM = todos.filter(x=>x.tab==="history"&&x.sub==="minutes").length, nV = todos.filter(x=>x.tab==="history"&&x.sub==="verbal").length;
  const st = ["minutes","verbal"].includes(state.staffSub)?state.staffSub:"actions";
  const tabs = `<div class="subtabs" role="tablist">
    <button class="subtab" role="tab" type="button" data-sub="actions" aria-selected="${st==="actions"}">Disciplinary Actions${nA?` <span class="ess-cnt">${nA}</span>`:""}</button>
    <button class="subtab" role="tab" type="button" data-sub="verbal" aria-selected="${st==="verbal"}">Verbal Advice${nV?` <span class="ess-cnt">${nV}</span>`:""}</button>
    <button class="subtab" role="tab" type="button" data-sub="minutes" aria-selected="${st==="minutes"}">Disciplinary Proceedings${nM?` <span class="ess-cnt">${nM}</span>`:""}</button></div>`;
  return tabs + (st==="actions" ? historyActions(uid,false) : st==="verbal" ? historyActions(uid,true) : historyMinutes(uid));
}
function historyActions(uid, verbal){
  const mine = cases.filter(c=>c.uid===uid && ["prelim","issued","recorded"].includes(c.status) && c.action && (c.action==="verbal")===!!verbal);
  const p = priorActions(uid,null).slice().reverse().filter(x=>(x.action==="verbal")===!!verbal);
  const prelims = mine.filter(c=>c.status==="prelim").map(c=>{
    const task = !c.staffResponse ? `<div class="task"><h3>Respond to the preliminary decision</h3>
        <p class="note" style="margin:0">You have until ${fmt(iso(addWorkdays(D(c.prelimOn),5)))} to explain or add information. Your response is considered before the decision is confirmed.</p>
        <label class="f" for="resp-${c.id}">Your response<textarea id="resp-${c.id}"></textarea></label>
        <p class="flag f-block" id="err-${c.id}" hidden>Write a response before submitting, or choose "I have nothing to add".</p>
        <div class="actions"><button class="btn primary" data-act="respond" data-id="${c.id}">Submit response</button><button class="btn" data-act="noresp" data-id="${c.id}">I have nothing to add</button></div></div>`
      : `<p class="flag f-info"><strong>Response submitted</strong><span>Waiting for the final decision.</span></p>`;
    return `<article class="stack">${task}${docWrap(noticeTitle(c)+" · "+c.id, noticeHTML(c), true)}</article>`;
  });
  const unread = p.filter(x=>!x.ackOn);
  const banners = unread.map(x=>`<div class="ess-alert">${ic("file")}<span class="grow"><strong>New ${esc(ACTIONS[x.action].label)}</strong> issued on ${fmt(x.decidedOn)}. Opening it records the date and time you received it.</span><button class="btn primary sm" data-act="viewnotice" data-id="${x.id}">Open notice</button></div>`);
  const row = x => `<tr><td>${fmt(x.decidedOn)}</td><td>${ACTIONS[x.action].label}</td><td>${x.ackOn?fmt(x.ackOn)+(x.ackAt?" at "+x.ackAt:""):`<span style="color:var(--ess-orange);font-weight:600">Not yet opened</span>`}</td><td><button class="btn link" style="font-size:12px" data-act="viewnotice" data-id="${x.id}">${state.viewNotice===x.id?"Hide":"View"}</button></td></tr>`;
  const viewing = state.viewNotice && cases.find(c=>c.id===state.viewNotice && c.uid===uid && (c.action==="verbal")===!!verbal);
  const vrow = x => `<tr><td>${fmt(x.decidedOn)}</td><td>${esc(x.reason)}</td><td>${esc(managerName(emp(x.uid)))}</td><td>${x.ackOn?fmt(x.ackOn)+(x.ackAt?" at "+x.ackAt:""):`<span style="color:var(--ess-orange);font-weight:600">Not yet opened</span>`}</td><td><button class="btn link" style="font-size:12px" data-act="viewnotice" data-id="${x.id}">${state.viewNotice===x.id?"Hide":"View"}</button></td></tr>`;
  return `<div class="stack">
    ${verbal?`<p class="note" style="margin:0">Verbal advice is guidance from your line manager. It is not a disciplinary action.</p>`:""}
    ${prelims.join("")}${banners.join("")}
    <div class="actions" style="justify-content:flex-end">${p.length?docPdfBtn("history",verbal?"verbal":"actions"):""}</div>
    <div class="scroll"><table class="matrix">${verbal?`<thead><tr><th>Date</th><th>Concern</th><th>Issued by</th><th>Received</th><th></th></tr></thead><tbody>${p.length?p.map(vrow).join(""):`<tr><td colspan="5">No verbal advice on your record.</td></tr>`}</tbody>`:`<thead><tr><th>Issued date</th><th>Action</th><th>Received</th><th></th></tr></thead><tbody>${p.length?p.map(row).join(""):`<tr><td colspan="4">No disciplinary actions on your record.</td></tr>`}</tbody>`}</table></div>
    ${viewing?docWrap(ACTIONS[viewing.action].label+" · "+viewing.id, noticeHTML(viewing), true, pdfBtn(viewing)):""}
    ${viewing&&viewing.action==="verbal" ? (viewing.vaResponse
      ? `<div class="ess-card"><h3>Your response</h3><p style="margin:0;font-size:14px">${esc(viewing.vaResponse)}</p><span class="note">Submitted ${fmt(viewing.vaResponseOn)}. Shared with your line manager and Employee Relations.</span></div>`
      : `<div class="task"><h3>Respond to this verbal advice</h3><p class="note" style="margin:0">Optional. Share your view or any context. Your response is kept with the record and shared with your line manager and Employee Relations.</p>
        <label class="f" for="va-${viewing.id}">Your response<textarea id="va-${viewing.id}"></textarea></label>
        <p class="flag f-block" id="vaerr-${viewing.id}" hidden>Write a response before submitting.</p>
        <div class="actions"><button class="btn primary" data-act="varesp" data-id="${viewing.id}">Submit response</button></div></div>`) : ""}
  </div>`;
}
function procItems(uid){
  const items = [];
  cases.filter(c=>c.uid===uid && c.method==="showcause" && c.sc && c.sc.issuedOn).forEach(c=>{
    const todo = c.status==="sc_issued";
    items.push({kind:"showcause", id:c.id, c, date:c.sc.issuedOn, rel:"About you", todo,
      st: todo ? ["Reply due "+fmt(c.sc.due),"warn"] : c.sc.answeredOn ? ["Replied "+fmt(c.sc.answeredOn),"ok"] : ["No reply sent","info"]});
  });
  cases.filter(c=>c.uid===uid && c.method==="interview" && c.mins).forEach(c=>{
    const todo = c.status==="min_staff", done = minsComplete(c.mins);
    items.push({kind:"minutes", id:c.id, c, date:c.mins.date, rel:"About you", todo,
      st: todo ? ["Your signature needed","warn"] : c.status==="min_amend" ? ["Amendment with ER Lead","info"] : done ? ["All signatures complete","ok"] : ["You signed · others pending","info"]});
  });
  return items.sort((a,b)=>(b.todo-a.todo) || (a.date<b.date?1:-1));
}
function attendedItems(uid){
  return cases.filter(c=>c.method==="interview" && c.mins && c.uid!==uid && c.mins.attendees.includes(uid) && !["min_staff","min_lead"].includes(c.status)).map(c=>{
    const todo = c.mins.attSigns[uid]===null, done = minsComplete(c.mins);
    return {kind:"minutes", id:c.id, c, date:c.mins.date, rel:"You attended · "+emp(c.uid).name, todo,
      st: todo ? ["Sign as attendee","warn"] : done ? ["All signatures complete","ok"] : ["You signed · others pending","info"]};
  }).sort((a,b)=>(b.todo-a.todo) || (a.date<b.date?1:-1));
}
function procListHTML(items, empty){
  if(!items.length) return `<div class="empty" style="padding:28px 12px">${empty}</div>`;
  return `<ul class="plist">${items.map(x=>`<li><button type="button" class="prow" data-pitem="${x.id}">
      <span class="pic ${x.todo?"todo":""}">${ic(x.kind==="showcause"?"file":"clip",16)}</span>
      <span class="pmain"><b>${x.kind==="showcause"?"Show cause notice":"Meeting minutes"} · ${fmt(x.date)}</b><small>${esc(x.kind==="showcause"?(clauseLines(x.c)[0]||""):x.rel)}</small></span>
      <span class="pill t-${x.st[1]}">${x.st[0]}</span><span class="chev">${ic("chev",16)}</span></button></li>`).join("")}</ul>`;
}
const backBtn = label => `<button type="button" class="btn link back" data-pback="1">← ${label}</button>`;
function sigTracker(c){
  const m = c.mins, e = emp(c.uid);
  const people = [[e.name,"Employee",m.staffSign],["ER Lead","Employee Relations Lead",m.leadSign],...m.attendees.map(u=>[actor(u),"Attendee · "+emp(u).designation,m.attSigns[u]])];
  const ini = n => n.split(" ").map(x=>x[0]).slice(0,2).join("");
  return `<ol class="sigtrack">${people.map(([n,r,on])=>`<li class="${on?"ok":""}"><span class="av" aria-hidden="true">${esc(ini(n))}</span><span class="who"><b>${esc(n)}</b><small>${esc(r)}</small></span><span class="when">${on?ic("check",14)+" "+fmt(on):"Pending"}</span></li>`).join("")}</ol>`;
}
function procDetail(it, uid){
  const c = it.c;
  if(it.kind==="showcause"){
    const s = c.sc;
    const action = it.todo ? `<form class="qa-form" data-scform="${c.id}" onsubmit="return false">
        <div class="ph"><h4>Your reply</h4><span class="note">${s.questions.length} questions · due ${fmt(s.due)}</span></div>
        ${s.questions.map((q,i)=>`<label class="qcard" for="sca-${c.id}-${i}"><span class="qn">${i+1}</span><span class="qt">${esc(q)}</span><textarea id="sca-${c.id}-${i}" placeholder="Your answer"></textarea></label>`).join("")}
        <p class="flag f-block" id="scerr-${c.id}" hidden>Answer every question before submitting. Write "No comment" if you do not wish to answer one.</p>
        <div class="actions"><button class="btn primary" data-act="scsubmit" data-id="${c.id}">Submit reply</button><span class="note">You cannot edit your reply after submitting.</span></div></form>`
      : `<div class="qa-form"><div class="ph"><h4>Your reply</h4><span class="note">${s.answeredOn?"Submitted "+fmt(s.answeredOn):"Not submitted"}</span></div>
        ${s.questions.map((q,i)=>`<div class="qcard"><span class="qn">${i+1}</span><span class="qt">${esc(q)}</span><p class="ans">${esc(s.answers?.[i]||"No answer given.")}</p></div>`).join("")}</div>`;
    return `<div class="proc-head"><span class="eyebrow">Show cause notice · ${c.id}</span><h3>${esc(clauseLines(c)[0].split(" · ")[1]||"Show cause notice")}</h3>
      <dl class="pmeta"><div><dt>Issued</dt><dd>${fmt(s.issuedOn)}</dd></div><div><dt>Reply due</dt><dd>${fmt(s.due)}</dd></div><div><dt>Status</dt><dd><span class="pill t-${it.st[1]}">${it.st[0]}</span></dd></div></dl></div>
      <div class="allegation"><span class="eyebrow">Allegation</span><p>${esc(s.allegation)}</p><span class="note">Possible breach: ${esc(clauseLines(c).join("; "))}</span></div>
      ${action}
      <details class="docdet"><summary>View the notice as issued</summary>${showCauseHTML(c)}</details>`;
  }
  const m = c.mins, own = c.uid===uid;
  let action = "";
  const lastAm = (m.amendments||[]).slice(-1)[0];
  const amNote = lastAm && lastAm.status!=="pending" ? `<p class="flag f-${lastAm.status==="approved"?"ok":"warn"}"><strong>Amendment ${lastAm.status==="approved"?"approved":"not approved"} by the ER Lead · ${fmt(lastAm.decidedOn)}</strong><span>${lastAm.leadNote?esc(lastAm.leadNote):lastAm.status==="approved"?"The minutes below have been updated.":""}</span></p>` : "";
  if(c.status==="min_amend" && own) action = `<p class="flag f-info"><strong>Amendment requested · ${fmt(lastAm.on)}</strong><span>“${esc(lastAm.text)}” The ER Lead will review it. You'll be asked to sign once it's decided.</span></p>`;
  else if(it.todo && own) action = `${amNote}<div class="task"><h3>Review and sign</h3>
      <p class="note" style="margin:0">Read the record below. If anything is wrong or missing, request an amendment. The ER Lead reviews it before the minutes are changed.</p>
      <div class="checks"><label><input type="checkbox" id="smok-${c.id}"> I have read these minutes and confirm they are an accurate record of the meeting.</label></div>
      <p class="flag f-block" id="smerr-${c.id}" hidden>Tick the confirmation box to sign.</p>
      <div class="actions"><button class="btn primary" data-act="signstaff" data-id="${c.id}">Sign minutes</button></div>
      <details class="amreq"><summary>Request an amendment instead</summary>
        <label class="f" for="sma-${c.id}">What should be changed? <span class="h">Say which question or answer, and what it should say</span><textarea id="sma-${c.id}"></textarea></label>
        <p class="flag f-block" id="smaerr-${c.id}" hidden>Describe the amendment you are requesting.</p>
        <div class="actions"><button class="btn" data-act="amendreq" data-id="${c.id}">Send to ER Lead</button></div></details></div>`;
  else if(it.todo) action = `<div class="task"><h3>Sign as a meeting attendee</h3>
      <p class="note" style="margin:0">The employee and ER Lead have signed. Confirm the record below is accurate.</p>
      <label class="f" for="atc-${c.id}">Comment <span class="h">Optional</span><textarea id="atc-${c.id}"></textarea></label>
      <div class="checks"><label><input type="checkbox" id="atok-${c.id}"> I attended this meeting and confirm these minutes are accurate.</label></div>
      <p class="flag f-block" id="aterr-${c.id}" hidden>Tick the confirmation box to sign.</p>
      <div class="actions"><button class="btn primary" data-act="signatt" data-id="${c.id}">Sign minutes</button></div></div>`;
  return `<div class="proc-head"><span class="eyebrow">Meeting minutes · ${c.id} · ${esc(it.rel)}</span><h3>Meeting on ${fmt(m.date)}</h3>
      <dl class="pmeta"><div><dt>Employee</dt><dd>${esc(emp(c.uid).name)}</dd></div><div><dt>Venue</dt><dd>${esc(m.venue)}</dd></div><div><dt>Status</dt><dd><span class="pill t-${it.st[1]}">${it.st[0]}</span></dd></div></dl></div>
    ${action}
    <section><span class="eyebrow">Signatures</span>${sigTracker(c)}</section>
    <section class="qa-form"><div class="ph"><h4>Record of the meeting</h4><span class="note">${m.entries.length} questions · matter: ${esc(clauseShort(c))}</span></div>
      ${m.entries.map((x,i)=>`<div class="qcard"><span class="qn">${i+1}</span><span class="qt">${esc(x.q)}</span><p class="ans">${esc(x.a)}</p></div>`).join("")}
      ${m.staffComment?`<div class="qcard corr"><span class="qn">!</span><span class="qt">Employee's correction</span><p class="ans">${esc(m.staffComment)}</p></div>`:""}</section>
    <details class="docdet"><summary>View the minutes as a document</summary>${minutesHTML(c)}</details>`;
}
function historyMinutes(uid){
  const all = procItems(uid);
  const sel = all.find(x=>x.id===state.procSel);
  if(sel) return `<div class="stack">${backBtn("Back to Disciplinary Proceedings")}<div class="actions" style="justify-content:flex-end">${docPdfBtn("proc",sel.id)}</div><div class="proc-detail">${procDetail(sel,uid)}</div></div>`;
  return `<div class="stack">
    <p class="note" style="margin:0">Meetings where you were questioned and show cause notices issued to you. These come before a decision and are not disciplinary actions.</p>
    ${procListHTML(all, "No meeting minutes or show cause notices.")}
  </div>`;
}
function staffToSign(uid){
  const items = attendedItems(uid);
  const sel = items.find(x=>x.id===state.procSel);
  if(sel) return `<div class="stack">${backBtn("Back to Minutes to Sign")}<div class="proc-detail">${procDetail(sel,uid)}</div></div>`;
  return `<div class="stack"><p class="note" style="margin:0">Minutes of meetings you attended as a witness or investigator. Confirm they are accurate.</p>${procListHTML(items,"No minutes to sign.")}</div>`;
}

/* --- PIP: line manager --- */
const rowTpl = {
  concern:i=>`<div class="r2 prow" data-k="concern"><input aria-label="Area of concern ${i}" placeholder="Area of concern" class="pa"><input aria-label="Resulting issues ${i}" placeholder="Resulting issues" class="pb"></div>`,
  prior:i=>`<div class="r3 prow" data-k="prior"><input type="date" aria-label="Date ${i}" class="pa"><input aria-label="Area of concern ${i}" placeholder="Area of concern" class="pb"><input aria-label="Summary ${i}" placeholder="Summary of how concern was addressed" class="pc"></div>`,
  goal:i=>`<div class="qrow prow" data-k="goal"><span class="n">${i}.</span><input aria-label="Goal ${i}" placeholder="Specific, measurable, achievable, relevant, time-bound" class="pa"></div>`,
  act:i=>`<div class="r4 prow" data-k="act"><input aria-label="Goal number ${i}" placeholder="Goal #" class="pa"><input aria-label="Activity ${i}" placeholder="Activity or action" class="pb"><input type="date" aria-label="Start ${i}" class="pc"><input type="date" aria-label="Estimated completion ${i}" class="pd"></div>`,
  support:i=>`<div class="qrow prow" data-k="support"><span class="n">${i}.</span><input aria-label="Resource ${i}" placeholder="Training, coaching, tools or management support" class="pa"></div>`
};
const rowsBox = (k,n,max) => `<div class="rows" id="rows-${k}" data-max="${max||20}">${Array.from({length:n},(_,i)=>rowTpl[k](i+1)).join("")}</div><div><button class="btn link" type="button" data-act="addrow" data-k="${k}">+ Add row</button></div>`;

function staffPIP(uid){
  const team = reportsOf(uid);
  const mine = pips.filter(p=>p.mgr===uid).sort((a,b)=>a.id<b.id?1:-1);
  const pf = state.pipPrefill;
  const card = p => {
    const e = emp(p.uid); let task = "";
    if(p.status==="returned") task = `<div class="task"><h3>Returned by People & Culture</h3><p class="note" style="margin:0">“${esc(p.hrNote)}”</p><div class="actions"><button class="btn primary sm" data-act="pipresubmit" data-id="${p.id}">Resubmit to People & Culture</button></div></div>`;
    if(p.status==="meeting") task = `<div class="task"><h3>Hold the initial meeting</h3><p class="note" style="margin:0">People & Culture approved the draft${p.hrNote?": “"+esc(p.hrNote)+"”":""}. Meet ${esc(e.name)}, give specific examples, present the plan and agree next steps. Then send it for their signature.</p>
        <label class="f" for="pm-${p.id}" style="max-width:220px">Meeting date<input type="date" id="pm-${p.id}" value="${iso(TODAY)}"></label>
        <label class="f" for="pmc-${p.id}">Line Manager comments <span class="h">Optional, recorded on the PIP</span><textarea id="pmc-${p.id}">${esc(p.mgrComment)}</textarea></label>
        <div class="actions"><button class="btn primary sm" data-act="pipmeeting" data-id="${p.id}">Send to ${esc(e.name)} to sign</button></div></div>`;
    if(["active","met","not_met"].includes(p.status)) task = pipReviewHTML(p,"mgr");
    if(p.status==="not_met" && p.type==="PIP" && !pips.some(x=>x.from===p.id)) task += `<div class="task"><h3>Start PIP 2</h3><p class="note" style="margin:0">Verbal advice was recorded. The next step is a revised PIP 2 with clear targets and a 90-day timeline, so ${esc(e.name)} has a further chance to improve with your support.</p><div class="actions"><button class="btn primary sm" data-act="pip2start" data-id="${p.id}">Draft PIP 2</button></div></div>`;
    return `<article class="ess-card"><div class="card" style="border:0;padding:0"><div class="top"><strong style="font-size:15px">${esc(e.name)} · ${p.type}</strong>${pillOf(PIP_STATUS,p.status)}</div><span class="note">${p.id} · ${fmt(p.start)} to ${fmt(pipEnd(p))} · ${pipDone(p)} of ${p.months} reviews complete</span></div>
      ${task}
      <details><summary class="note" style="cursor:pointer">View the ${p.type} document and history</summary><div class="stack" style="margin-top:10px">${docWrap(p.type+" · "+p.id, pipHTML(p), true)}${trailHTML(p.trail)}</div></details></article>`;
  };
  const showForm = state.pipNew || !mine.length;
  const form = `<form class="form ess-card" id="pipForm" data-steps data-draft="pip:${state.staffUid}:${pf?pf.from:"new"}" novalidate>
      <h3>${pf?"Draft PIP 2 for "+esc(emp(pf.uid).name):"New Performance Improvement Plan"}</h3>
      <p class="note" style="margin:-6px 0 0">A PIP helps a team member improve when there is a pattern of underperformance, not one or two isolated events. Set out clear goals and the support you will give. The ER Lead reviews your draft before you meet the employee.</p>
      <div class="wstep" data-title="Team member"><fieldset><legend>Employee</legend>
        <label class="f" for="pp-uid">Team member<select id="pp-uid" ${pf?"disabled":"data-req"}><option value="">Select…</option>${team.map(t=>`<option value="${t.uid}" ${(pf&&pf.uid===t.uid)||(!pf&&state.pipReq===t.uid)?"selected":""}>${esc(t.name)} · ${esc(t.designation)}</option>`).join("")}</select></label>
        <div id="pp-emp"></div>
        ${pf?"":`<div class="f">Basis for the PIP</div><div class="seg" role="radiogroup"><label><input type="radio" name="pp-basis" value="three" ${state.pipReq?"":"checked"}> Underperformance documented for 3 months</label><label><input type="radio" name="pp-basis" value="poor" ${state.pipReq?"checked":""}> “Poor” rating at year-end review</label></div>`}
      </fieldset>
      </div><div class="wstep" data-title="Concerns"><fieldset><legend>Areas of concern</legend><p class="note" style="margin:-6px 0 0">Actions (or inactions) and behaviours that have adversely affected job performance, colleagues or customers.</p>${rowsBox("concern",pf?pf.concerns.length:2)}</fieldset>
      ${pf?"":`<fieldset><legend>Observations, previous discussions or coaching sessions</legend><p class="note" style="margin:-6px 0 0">Evidence of the 3-month pattern: dates the concern was raised and how.</p>${rowsBox("prior",3)}</fieldset>`}
      </div><div class="wstep" data-title="Goals"><fieldset><legend>Improvement goals (SMART)</legend><p class="note" style="margin:-6px 0 0">Clear, measurable and realistic, linked to the job description. Up to 5.</p>${rowsBox("goal",3,5)}</fieldset>
      <fieldset><legend>Activities and actions to reach the goals</legend>${rowsBox("act",2)}</fieldset>
      </div><div class="wstep" data-title="Support"><fieldset><legend>Resources / management support</legend>${rowsBox("support",2)}</fieldset>
      <fieldset><legend>Timeline</legend>
        <div class="row"><label class="f" for="pp-start">Start date<input type="date" id="pp-start" value="${iso(addDays(TODAY,7))}"></label>
        <label class="f" for="pp-months">Duration<select id="pp-months" ${pf?"disabled":""}><option value="3" selected>3 months (standard)</option><option value="4">4 months</option><option value="6">6 months</option></select></label></div>
        <p class="note" style="margin:0">${pf?"PIP 2 runs for 90 days with check-ins after month 1 and month 2.":"Ideally 3 months; longer only for the nature of the issues or pre-planned leave. Monthly check-ins are scheduled automatically."}</p>
      </fieldset>
      <label class="f" for="pp-comment">Line Manager comments <span class="h">Optional</span><textarea id="pp-comment"></textarea></label>
      </div><div class="wstep" data-title="Review" data-review="1"><p class="flag f-block" id="pp-err" hidden></p>
      <div class="actions"><button class="btn primary" type="submit">Send to ER Lead for approval</button>${mine.length?`<button class="btn" type="button" data-act="pipcancel">Cancel</button>`:""}</div>
    </div>
    </form>`;
  if(state.pipDone){ const d=pips.find(x=>x.id===state.pipDone); return `<div class="stack">${doneCard("Sent for approval", `The ER Lead will review ${esc(emp(d.uid).name)}'s plan. Once approved, you can hold the initial meeting.`, d.id, `<button class="btn primary" data-act="pipdoneok">Back to my team's PIPs</button>`)}</div>`; }
  return `<div class="stack">
    ${state.pipNew?"":pipReqTasks(uid)}
    ${showForm?form:`<div class="actions"><button class="btn primary" data-act="pipnew">+ Start a PIP</button><span class="note">For conduct or attendance issues, use Submit a Staff Concern.</span></div>`}
    ${mine.length?`<h3 class="sec">Your team's PIPs</h3>${mine.map(card).join("")}`:""}
  </div>`;
}

function myPipTodo(p){
  if(p.status==="to_sign") return true;
  const cur = p.status==="active" ? pipCurrent(p) : null; if(!cur) return false;
  return ["self","ack"].includes(revState(pipRev(p,cur.i),cur.final));
}
function staffMyPIP(uid){
  const mine = pips.filter(p=>p.uid===uid && !["hr_review","returned"].includes(p.status)).sort((a,b)=>(myPipTodo(b)-myPipTodo(a)) || (a.id<b.id?1:-1));
  const sel = mine.find(p=>p.id===state.myPipSel);
  if(!sel) return `<div class="stack"><p class="note" style="margin:0">Your Performance Improvement Plans, with goals, reviews and outcomes.</p>
    ${mine.length?`<ul class="plist">${mine.map(p=>{ const todo=myPipTodo(p), cur=p.status==="active"?pipCurrent(p):null;
      const st = todo ? [p.status==="to_sign"?"Signature needed":cur.label+": "+(revState(pipRev(p,cur.i),cur.final)==="self"?"self-assessment due":"sign-off needed"),"warn"] : PIP_STATUS[p.status];
      return `<li><button type="button" class="prow" data-mypip="${p.id}">
        <span class="pic ${todo?"todo":["met"].includes(p.status)?"done":""}">${ic("target",16)}</span>
        <span class="pmain"><b>${p.type} · ${fmt(p.start)} to ${fmt(pipEnd(p))}</b><small>${esc(actor(p.mgr))} · ${pipDone(p)} of ${p.months} reviews complete · ${p.id}</small></span>
        <span class="pill t-${st[1]}">${st[0]}</span><span class="chev">${ic("chev",16)}</span></button></li>`;}).join("")}</ul>`:`<div class="empty">No Performance Improvement Plans.</div>`}</div>`;
  return `<div class="stack">${backBtn("Back to My PIP")}${[sel].map(p=>{
    const m = emp(p.mgr);
    const head = `<div class="proc-head"><span class="eyebrow">${p.type} · ${p.id}</span><h3>${fmt(p.start)} to ${fmt(pipEnd(p))}</h3>
      <dl class="pmeta"><div><dt>Goals</dt><dd>${p.goals.length}</dd></div><div><dt>Reviews</dt><dd>${pipDone(p)} of ${p.months}</dd></div><div><dt>Status</dt><dd>${pillOf(PIP_STATUS,p.status)}</dd></div></dl></div>
      ${infoCard(emp(p.uid),[["Line manager",actor(m.uid)],["Plan period",fmt(p.start)+" to "+fmt(pipEnd(p))],["Date of joining",fmt(emp(p.uid).doj)]])}`;
    let task = "";
    if(p.status==="meeting") task = `<p class="flag f-info"><strong>Approved plan</strong><span>Your line manager will meet you to discuss this plan before you sign it.</span></p>`;
    if(p.status==="to_sign") task = `<div class="task"><h3>Review and sign your ${p.type}</h3><p class="note" style="margin:0">Your line manager discussed this plan with you on ${fmt(p.meetingOn)}. Add any comments; the plan can be adjusted after your feedback.</p>
      <label class="f" for="pe-${p.id}">Employee comments <span class="h">Optional</span><textarea id="pe-${p.id}"></textarea></label>
      <div class="checks"><label><input type="checkbox" id="pok-${p.id}"> I have read and understood this plan.</label></div>
      <p class="flag f-block" id="perr-${p.id}" hidden>Tick the box to sign.</p>
      <div class="actions"><button class="btn primary" data-act="pipsign" data-id="${p.id}">Sign</button></div></div>`;
    const goals = `<section><span class="eyebrow">Improvement goals</span><ol class="goallist">${p.goals.map(g=>`<li>${esc(g)}</li>`).join("")}</ol></section>`;
    const planOpen = ["meeting","to_sign"].includes(p.status);
    return `<article class="proc-detail"><div class="actions" style="justify-content:flex-end">${docPdfBtn("pip",p.id)}</div>${head}${task}${planOpen?"":pipReviewHTML(p,"staff")}${planOpen?goals:""}
      <details class="docdet" ${planOpen?"open":""}><summary>View the full plan</summary>${pipHTML(p)}</details></article>`;}).join("")}</div>`;
}

/* ---------- internal views ---------- */
function listItems(role){
  const items = [];
  visibleTo(role).forEach(c=>{const e=emp(c.uid); items.push({kind:"cases", done:["issued","recorded","closed"].includes(c.status), id:c.id, created:c.created, mine:owner(c)===role,
    t:e.name, m:(c.action?ACTIONS[c.action].label:c.method?METHODS[c.method]:"Staff concern"+(c.escBy==="compliance"?" from Compliance":""))+(hasBreach(c)?" · "+clauseShort(c):""), p:pill(c.status)});});
  const pipRow = (p,mine) => items.push({kind:"pips", done:!["hr_review","returned"].includes(p.status), id:p.id, created:p.trail[0].on, mine, t:emp(p.uid).name, m:p.type+" · from "+actor(p.mgr), p:pillOf(PIP_STATUS,p.status)});
  const vRow = (v,mine) => { const st=vStatus(v);
    items.push({kind:"voice", done:v.status==="closed", id:v.id, created:v.on, mine, t:VOICE[v.type].label, m:(v.anon?"Anonymous":emp(v.uid).name)+" · "+vTitle(v)+(v.needsReply?" · new reply":""), p:`<span class="pill t-${st[1]}">${st[0]}</span>`}); };
  if(role==="lead"){
    pips.forEach(p=>pipRow(p, p.status==="hr_review"));
    voice.filter(v=>v.type!=="chief").forEach(v=>vRow(v, v.status!=="closed" && (!v.receivedBy || !!v.needsReply || v.dec?.stage==="lead")));
    invs.forEach(i=>items.push({kind:"inv", done:!!i.ack, id:i.id, created:i.on, mine:i.status==="done"&&!i.ack, t:i.subject, m:(i.uid?emp(i.uid).name+" · ":"")+"due "+fmt(i.due), p:pillOf(INV_STATUS,i.status)}));
    taRequests.forEach(r=>items.push({kind:"ta", done:r.status!=="pending", id:r.id, created:r.on, mine:r.status==="pending", t:r.ref, m:r.staff.length+" staff · "+fmt(r.on), p:pillOf(TA_STATUS,taStatus(r))}));
  }
  if(role==="lead"||role==="mgr") appeals.forEach(a=>{ const e=emp(a.uid); items.push({kind:"appeals", done:a.status==="decided", id:a.id, created:a.on, mine: role==="lead"?a.status==="submitted":a.status==="committee", t:e.name, m:a.year+" · "+a.f.rating+" → expects "+a.f.expected, p:pillOf(AP_STATUS,a.status)}); });
  if(role==="mgr") voice.filter(v=>FORMAL.includes(v.type) && v.dec).forEach(v=>vRow(v, v.dec.stage==="mgr"));
  if(role==="pcd") voice.filter(v=>FORMAL.includes(v.type) && v.dec && ["pcd","done"].includes(v.dec.stage)).forEach(v=>vRow(v, v.dec.stage==="pcd"));
  return items;
}
const STEP_ORDER = ["Approve show cause","Revise show cause","Approve PIP","Review findings","Recommend grievance decision","Approve grievance decision","Revise grievance decision","Record committee decision","Acknowledge receipt","Reply to employee","New concerns to open","Sign and send minutes","Propose an action","Revise and resubmit","Review and recommend","Approve","Confirm final decision","Review draft","Approve or decline"];
function nextStep(c){
  if(c.status==="pending" && route(c).role==="dg") return "Record committee decision";
  return ({sc_draft:"Approve show cause", sc_returned:"Revise show cause", escalated:"New concerns to open", min_lead:"Sign and send minutes", sc_answered:"Propose an action", ready:"Propose an action", returned:"Revise and resubmit", review:"Review and recommend", pending:"Approve", prelim:"Confirm final decision"})[c.status] || "";
}
const ROLE_TABS = {
  lead:[["dash","Dashboard","chart"],["cases","Disciplinary cases","file"],["pips","PIPs","target"],["voice","EmployeeVoice","voice"],["inv","Investigations","search"],["ta","Records checks","users"],["appeals","PM Appeals","trend"]],
  mgr:[["dash","Dashboard","chart"],["cases","Disciplinary cases","file"],["voice","Grievance decisions","scale"],["appeals","PM Appeals","trend"]],
  head:[["dash","Dashboard","chart"],["cases","Approvals","check"]],
  pcd:[["dash","Dashboard","chart"],["cases","Approvals","check"],["voice","Grievance decisions","scale"]],
  dg:[["cases","Committee cases","users"]]
};
state.tabs = {};
const curTab = role => state.tabs[role] || ((ROLE_TABS[role]||[]).length===1 ? ROLE_TABS[role][0][0] : null);
function itemsFor(role){ const t=curTab(role); return listItems(role).filter(x=>x.kind===t); }
function crumbs(role, extra){
  const t = (ROLE_TABS[role]||[]).find(x=>x[0]===curTab(role));
  const multi = (ROLE_TABS[role]||[]).length>1;
  const parts = [];
  if(multi) parts.push(`<button type="button" data-crumb="home">Home</button>`);
  if(t) parts.push(extra ? `<button type="button" data-crumb="list">${t[1]}</button>` : `<span>${t[1]}</span>`);
  if(extra) parts.push(`<span>${esc(extra)}</span>`);
  return parts.length>1 || extra ? `<nav class="crumbs" aria-label="Breadcrumb">${parts.join('<span class="sep">›</span>')}</nav>` : "";
}
function renderHome(role){
  const all = listItems(role);
  const tiles = ROLE_TABS[role].map(([k,label,icon])=>{
    const n = all.filter(x=>x.kind===k && x.mine).length, open = all.filter(x=>x.kind===k && !x.done).length;
    const sub = k==="dash" ? "Overview" : n ? `${n} to attend` : open ? `${open} open` : "Nothing new";
    return `<button type="button" class="wtile ${n?"has":""}" data-ltab="${k}"><span class="wic">${ic(icon,22)}</span><b>${label}</b><small>${sub}</small>${n?`<span class="wn">${n}</span>`:""}</button>`; }).join("");
  return `<div class="home"><div class="wtiles">${tiles}</div></div>`;
}
function renderList(){
  const role = state.role, t = (ROLE_TABS[role]||[]).find(x=>x[0]===curTab(role));
  const items = itemsFor(role);
  const open = items.filter(x=>!x.done).sort((a,b)=>(b.mine-a.mine) || (a.created<b.created?-1:1));
  const closed = items.filter(x=>x.done).sort((a,b)=>a.created<b.created?1:-1);
  const row = x => `<li><button type="button" class="prow ${x.done?"dim":""}" data-id="${x.id}"><span class="pic ${x.mine?"todo":x.done?"done":""}">${ic(t[2],16)}</span><span class="pmain"><b>${esc(x.t)}</b><small>${esc(x.m)} · ${x.id}</small></span>${x.p}<span class="chev">${ic("chev",16)}</span></button></li>`;
  const btn = role==="lead"&&t[0]==="cases" ? `<button class="btn primary sm" id="newBtn" type="button">+ Open case</button>` : role==="lead"&&t[0]==="inv" ? `<button class="btn primary sm" data-act="invnew" type="button">+ New request</button>` : "";
  return `<main class="panel pane wl">${crumbs(role)}<div class="pane-head"><h2>${t[1]}</h2>${btn}</div>${t[0]==="appeals"?apWindowCard(role):""}${t[0]==="pips"&&role==="lead"?pipReqCard():""}
    ${open.length?`<ul class="plist">${open.map(row).join("")}</ul>`:`<div class="empty">Nothing open.</div>`}
    ${closed.length?(state.showClosed?`<ul class="plist">${closed.map(row).join("")}</ul><button type="button" class="btn link" data-act="toggleclosed">Hide closed</button>`:`<button type="button" class="btn link" data-act="toggleclosed">Show closed (${closed.length})</button>`):""}
  </main>`;
}

function proposeTask(c, title, intro){
  return `<div class="task" id="propose"><h3>${title}</h3><p class="note" style="margin:0">${intro}</p>
    <div class="f">Clauses breached <span class="h">Tick all that apply</span></div>
    ${clausePicker("pc", c.clauses, c.other)}
    <div class="row">
      <label class="f" for="p-action">Proposed action<select id="p-action">${Object.entries(ACTIONS).filter(([k])=>k!=="verbal").map(([k,v])=>`<option value="${k}" ${k===(c.action||"caution")?"selected":""}>${v.label}</option>`).join("")}</select></label>
    </div>
    <label class="f" for="p-reason">Reason <span class="h">Two or three lines of fact. This appears on the notice as written.</span><textarea id="p-reason" maxlength="400">${esc(c.reason)}</textarea></label>
    <div class="checks"><span style="font-size:13px;font-weight:600">Additional actions (§6)</span>${Object.entries(EXTRAS).map(([k,v])=>`<label><input type="checkbox" class="px" value="${k}" ${c.extras.includes(k)?"checked":""}> ${esc(v)}</label>`).join("")}</div>
    <div class="checks"><label><input type="checkbox" id="p-prelim" ${c.prelim?"checked":""}> Propose a preliminary decision first (§4(8))</label></div>
    <div id="p-route"></div>
    <p class="flag f-block" id="p-err" hidden></p>
    <div class="actions"><button class="btn primary" data-act="propose">Send to ER Manager for review</button></div></div>`;
}
const readPropose = c => ({...c, ...readClauses("pc"), action:$("#p-action").value, reason:$("#p-reason").value.trim(), extras:[...document.querySelectorAll("#propose .px:checked")].map(i=>i.value), prelim:$("#p-prelim").checked});
function livePropose(c){
  if(!$("#propose")) return;
  const d = readPropose(c); const r = route(d);
  $("#p-prelim").disabled = !(d.action==="final"||d.action==="dismiss"); if($("#p-prelim").disabled) $("#p-prelim").checked=false;
  $("#p-route").innerHTML = r.approver ? `<p class="flag f-info"><strong>Will go to</strong><span>ER Manager, then ${esc(r.approver)}</span></p>${flagsHTML(r.flags)}` : "";
}

function taskHTML(c){
  if(REC) return "";
  const role = state.role; const r = route(c); const own = owner(c);
  if(own!==role){
    const who = own==="staff"?"the staff member":own==="att"?"the meeting attendees":own?ROLES[own].full:null;
    let extra = "";
    if(role==="lead" && c.status==="min_att"){ const pend=c.mins.attendees.filter(u=>!c.mins.attSigns[u]); extra = `<p class="note" style="margin:0">Waiting for: ${pend.map(u=>esc(actor(u))).join(", ")}</p><div class="actions"><button class="btn sm" data-act="remind">Send reminder</button></div>`; }
    if(role==="lead" && c.status==="sc_issued"){ const overdue = D(c.sc.due) < TODAY; extra = `<p class="note" style="margin:0">Reply due ${fmt(c.sc.due)}. ${overdue?"The reply date has passed.":"You can continue without a reply once this date has passed."}</p><div class="actions"><button class="btn sm" data-act="noreply" ${overdue?"":"disabled"}>Continue without a reply</button></div>`; }
    return who ? `<div class="task passive"><h3>With ${esc(who)}</h3><p class="note" style="margin:0">${esc(STATUS[c.status][0])}.${extra?"":" No action needed from you."}</p>${extra}</div>` : "";
  }
  if(role==="lead"){
    if(c.status==="sc_returned") return `<div class="task" id="screv"><h3>Revise the show cause notice</h3>
      <p class="flag f-warn"><strong>ER Manager</strong><span>${esc([...c.trail].reverse().find(t=>t.role==="mgr")?.quote||"")}</span></p>
      <label class="f" for="rv-alleg">Allegation<textarea id="rv-alleg">${esc(c.sc.allegation)}</textarea></label>
      <div class="rows">${c.sc.questions.map((q,i)=>`<div class="qrow"><span class="n">${i+1}.</span><input class="rv-q" aria-label="Question ${i+1}" value="${esc(q)}"></div>`).join("")}</div>
      <label class="f" for="rv-due" style="max-width:220px">Reply due<input type="date" id="rv-due" value="${c.sc.due}"></label>
      <div class="actions"><button class="btn primary" data-act="scresubmit">Resubmit to ER Manager</button></div></div>`;
    if(c.status==="escalated") return `<div class="task"><h3>New concern from ${esc(escName(c))}</h3>
      <p class="note" style="margin:0">${esc(c.esc.type)} · ${esc(c.esc.when)} · Discussed with employee: ${esc(c.esc.discussed)}</p>
      <p style="margin:0;font-size:14px">${esc(c.esc.details)}</p>
      <div class="actions"><button class="btn primary" data-act="openesc">Open case</button><button class="btn" data-act="closeesc">Close with no action</button></div></div>`;
    if(c.status==="min_amend"){ const am=c.mins.amendments.slice(-1)[0]; return `<div class="task" id="amendtask"><h3>Review the requested amendment</h3>
      <p class="flag f-info"><strong>Employee's request · ${fmt(am.on)}</strong><span>“${esc(am.text)}”</span></p>
      <p class="note" style="margin:0">If you approve, edit the answers below so the minutes reflect the agreed change. The employee then signs the updated minutes.</p>
      ${c.mins.entries.map((x,i)=>`<label class="f" for="ama-${i}">${i+1}. ${esc(x.q)}<textarea class="am-a" id="ama-${i}" data-i="${i}">${esc(x.a)}</textarea></label>`).join("")}
      <label class="f" for="amx-${c.id}">Add a note to the minutes <span class="h">Optional, shown as an amendment</span><textarea id="amx-${c.id}"></textarea></label>
      <label class="f" for="amn-${c.id}">Note to the employee <span class="h">Required if not approving</span><textarea id="amn-${c.id}"></textarea></label>
      <p class="flag f-block" id="amerr-${c.id}" hidden>Explain why the amendment is not approved.</p>
      <div class="actions"><button class="btn primary" data-act="amendok">Approve and update minutes</button><button class="btn" data-act="amendno">Don't approve</button></div></div>`; }
    if(c.status==="min_lead") return `<div class="task" id="sendatt"><h3>Sign and send to attendees</h3>
      <p class="note" style="margin:0">The employee signed on ${fmt(c.mins.staffSign)}${c.mins.staffComment?" and added a correction, shown in the minutes below":" with no corrections"}. Choose who attended the meeting. Only they receive the minutes to sign, in their ESS Portal.</p>
      <div class="f">Who attended?</div>
      ${attendeePicker("sa", c.mins.attendees, c.uid)}
      <div class="actions"><button class="btn primary" data-act="signlead">Sign and send for signing</button></div></div>`;
    if(c.status==="sc_answered") return proposeTask(c,"Propose an action", c.sc.noReply ? "No reply was received. Set out the clauses, action and reason." : "The employee replied on "+fmt(c.sc.answeredOn)+". Read the reply below, then set out the clauses, action and reason.");
    if(c.status==="ready") return proposeTask(c,"Propose an action", c.method==="pip" ? "Evidence from the line manager under "+c.pipRef+". "+ACTIONS[c.action].label+" is the usual next step at this stage; confirm the facts and reason." : "All signatures are on the minutes. Set out the clauses, action and reason.");
    if(c.status==="returned") return proposeTask(c,"Returned by ER Manager","“"+esc([...c.trail].reverse().find(t=>t.role==="mgr")?.quote||"See case history")+"” Revise and resubmit.");
  }
  if(role==="mgr" && c.status==="sc_draft") return `<div class="task"><h3>Approve the show cause notice</h3>
      <p class="note" style="margin:0">Drafted by the ER Lead. Check the allegation is specific and the questions are fair. Approving issues it to ${esc(emp(c.uid).name)} in the ESS Portal, with 3 working days to reply.</p>
      <label class="f" for="sc-note">Note <span class="h">Required if returning</span><textarea id="sc-note"></textarea></label>
      <p class="flag f-block" id="sc-err" hidden>Add a note so the ER Lead knows what to change.</p>
      <div class="actions"><button class="btn primary" data-act="scapprove">Approve and issue</button><button class="btn" data-act="screturn">Return to ER Lead</button></div></div>`;
  if(role==="mgr") return `<div class="task"><h3>Review and recommend</h3>
      <p class="note" style="margin:0">ER Lead proposed <strong>${ACTIONS[c.proposed].label}</strong>. Confirm or change it, then add your recommendation for the ${esc(r.approver)}.</p>
      <div class="row"><label class="f" for="m-action">Recommended action<select id="m-action">${Object.entries(ACTIONS).filter(([k])=>k!=="verbal").map(([k,v])=>`<option value="${k}" ${k===c.action?"selected":""}>${v.label}</option>`).join("")}</select></label></div>
      <div class="checks"><label><input type="checkbox" id="m-prelim" ${c.prelim?"checked":""}> Issue as a preliminary decision first (§4(8))</label></div>
      <label class="f" for="m-note">Recommendation note<textarea id="m-note" placeholder="e.g. Facts confirmed against attendance log. First instance after verbal advice."></textarea></label>
      <p class="flag f-block" id="m-err" hidden></p>
      <div class="actions"><button class="btn primary" data-act="recommend">Recommend for approval</button><button class="btn" data-act="mreturn">Return to ER Lead</button></div></div>`;
  if(c.status==="prelim") return `<div class="task"><h3>Confirm the final decision</h3>
      <p class="flag f-info"><strong>Staff response</strong><span>${esc(c.staffResponse)}</span></p>
      <div class="row"><label class="f" for="a-action">Final action<select id="a-action">${Object.entries(ACTIONS).filter(([k])=>k!=="verbal").map(([k,v])=>`<option value="${k}" ${k===c.action?"selected":""}>${v.label}</option>`).join("")}</select></label></div>
      <label class="f" for="a-note">Comment<textarea id="a-note" placeholder="Optional"></textarea></label>
      <div class="actions"><button class="btn primary" data-act="finalise">Confirm and issue final notice</button></div></div>`;
  const lastRec = [...c.trail].reverse().find(t=>t.role==="mgr");
  if(role==="dg") return `<div class="task" id="dgrec"><h3>Record the committee decision</h3>
      ${lastRec?`<p class="flag f-info"><strong>ER Manager recommends</strong><span>${esc(ACTIONS[c.action].label)}${c.prelim?" as a preliminary decision":""}. ${lastRec.quote?"“"+esc(lastRec.quote)+"”":""}</span></p>`:""}
      <div class="row"><label class="f" for="dg-date">Meeting date<input type="date" id="dg-date" value="${iso(TODAY)}"></label><label class="f" for="dg-ref">Meeting reference<input id="dg-ref" placeholder="e.g. D&amp;G 11/2026"></label></div>
      <label class="f" for="dg-members">Members present<input id="dg-members" placeholder="Chair and members present"></label>
      <label class="f" for="dg-dec">Committee decision<select id="dg-dec"><option value="approve">Approve ${esc(ACTIONS[c.action].label)}${c.prelim?" (preliminary)":""}</option>${Object.entries(ACTIONS).filter(([k])=>k!=="verbal"&&k!==c.action).map(([k,v])=>`<option value="${k}">Change to ${v.label}</option>`).join("")}<option value="return">Return to Employee Relations for more information</option></select></label>
      <label class="f" for="dg-min">Minutes of the discussion<textarea id="dg-min" style="min-height:100px"></textarea></label>
      <p class="flag f-block" id="dg-err" hidden>Add the members present and the minutes.</p>
      <div class="actions"><button class="btn primary" data-act="dgrecord">Record decision</button></div></div>`;
  return `<div class="task"><h3>Approve this action</h3>
      ${lastRec?`<p class="flag f-info"><strong>ER Manager recommends</strong><span>${esc(ACTIONS[c.action].label)}${c.prelim?" as a preliminary decision":""}. ${lastRec.quote?"“"+esc(lastRec.quote)+"”":""}</span></p>`:""}
      <label class="f" for="a-note">Comment<textarea id="a-note" placeholder="Required if returning; optional if approving"></textarea></label>
      <p class="flag f-block" id="a-err" hidden>Add a comment so the ER Manager knows what to change.</p>
      <div class="actions"><button class="btn primary" data-act="approve" ${r.blocked?"disabled":""}>${c.prelim?"Approve and issue preliminary decision":"Approve and issue notice"}</button><button class="btn" data-act="areturn">Return to ER Manager</button></div></div>`;
}

function renderCase(){
  const c = visibleTo(state.role).find(x=>x.id===state.selected);
  if(!c) return `<main class="panel pane"><div class="empty">Select an item.</div></main>`;
  const e = emp(c.uid); const r = route(c);
  const fx = (c.status==="issued" && c.action==="final") ? `<p class="flag f-info"><strong>System actions on issue</strong><span>Promotion, increment and bonus eligibility blocked for ${D(c.decidedOn).getFullYear()}. Credit facilities flag set until ${fmt(iso(addDays(D(c.decidedOn),365)))}. Payroll and Credit notified.</span></p>` : "";
  const facts = `<dl class="facts">
      ${c.action?`<div><dt>Action</dt><dd>${ACTIONS[c.action].label}${c.proposed&&c.proposed!==c.action?` <span class="note">(Lead proposed ${ACTIONS[c.proposed].label})</span>`:""}</dd></div>`:""}
      <div><dt>Source</dt><dd>${SOURCES[c.source]}${c.escBy?" · "+esc(escName(c)):""}</dd></div>
      ${c.method?`<div><dt>Basis</dt><dd>${METHODS[c.method]}</dd></div>`:""}
      ${hasBreach(c)?`<div style="grid-column:1/-1"><dt>${c.action&&!PRE.includes(c.status)?"Breach":"Suspected breach"}</dt><dd>${clauseLines(c).map(esc).join("<br>")}</dd></div>`:""}
      ${c.reason?`<div style="grid-column:1/-1"><dt>Reason</dt><dd>${esc(c.reason)}</dd></div>`:""}
    </dl>`;
  const showNotice = c.action && !["sc_answered","ready","returned"].includes(c.status);
  return `<main class="panel pane" aria-live="polite">
    <div class="pane-head">
      <div><span class="eyebrow">${c.id} · opened ${fmt(c.created)}</span><h2>${esc(e.name)}</h2><div class="sub">${esc(e.designation)} · ${esc(e.dept)} · ${RANKS[e.rank]}</div></div>
      ${pill(c.status)}
    </div>
    ${stepsHTML(c)}
    <div class="split">
      <div class="col">
        ${taskHTML(c)}
        ${facts}
        ${fx}
        ${c.dgMin?`<section class="dgmin"><span class="eyebrow">D&amp;G Committee minutes · ${esc(c.dgMin.ref||"")} · ${fmt(c.dgMin.date)}</span><p><b>Present:</b> ${esc(c.dgMin.members)}</p><p><b>Decision:</b> ${esc(c.dgMin.decision)}</p><p>${esc(c.dgMin.minutes)}</p><span class="note">Recorded by ${esc(ROLES.dg.person)}, Committee Secretary</span></section>`:""}
        ${state.role==="lead"&&!["issued","recorded","closed"].includes(c.status)?`<div class="actions"><button class="btn sm" data-act="invfromcase">Request investigation from Compliance</button>${invs.filter(i=>i.ref===c.id).map(i=>`<span class="pill t-${INV_STATUS[i.status][1]}">${i.id}: ${INV_STATUS[i.status][0]}</span>`).join("")}</div>`:""}
        ${c.action==="verbal"&&c.vaResponse?`<p class="flag f-info"><strong>Employee response · ${fmt(c.vaResponseOn)}</strong><span>${esc(c.vaResponse)}</span></p>`:""}
        ${showNotice?docWrap("Decision notice", noticeHTML(c), false, ["issued","recorded","prelim"].includes(c.status)?pdfBtn(c):""):""}
        ${questioningDoc(c)}
      </div>
      <aside class="route" aria-label="Routing and history">
        <span class="eyebrow">Final approval by</span>
        <div class="who">${r.approver?esc(r.approver):"Not yet proposed"}</div>
        <div class="why">${esc(r.why)}</div>
        ${flagsHTML(r.flags)}
        <span class="eyebrow">Case history</span>
        ${trailHTML(c.trail)}
        <span class="eyebrow">Employee's record</span>
        ${historyHTML(c.uid, c.id)}
      </aside>
    </div></main>`;
}

function renderPIPReview(){
  const p = pips.find(x=>x.id===state.selected); const e = emp(p.uid);
  const task = p.status==="hr_review" ? `<div class="task"><h3>Review the draft ${p.type}</h3>
      <p class="note" style="margin:0">Check the targets are clear, measurable and linked to the job description, that support is offered, and that the 3-month evidence or “Poor” rating is on record. Approving makes the plan visible to the employee and lets the manager hold the initial meeting.</p>
      <label class="f" for="hr-note">Note to the line manager<textarea id="hr-note" placeholder="Required if returning"></textarea></label>
      <p class="flag f-block" id="hr-err" hidden>Add a note so the manager knows what to change.</p>
      <div class="actions"><button class="btn primary" data-act="pipapprove">Approve draft</button><button class="btn" data-act="pipreturn">Return to manager</button></div></div>`
    : `<div class="task passive"><h3>${PIP_STATUS[p.status][0]}</h3><p class="note" style="margin:0">With the line manager or employee. No action needed from you.</p></div>`;
  return `<main class="panel pane"><div class="pane-head"><div><span class="eyebrow">${p.id} · ${p.type} · from ${esc(actor(p.mgr))}</span><h2>${esc(e.name)}</h2><div class="sub">${esc(e.designation)} · ${esc(e.dept)}</div></div>${pillOf(PIP_STATUS,p.status)}</div>
    <div class="split"><div class="col">${task}${pipReviewHTML(p,"er")}${docWrap(p.type+" · "+p.id, pipHTML(p))}</div>
    <aside class="route"><span class="eyebrow">History</span>${trailHTML(p.trail)}<span class="eyebrow">Employee's record</span>${historyHTML(p.uid,null)}</aside></div></main>`;
}

/* ---------- Talent Acquisition ---------- */
const taStatus = r => r.status==="approved" && addDays(D(r.decidedOn),30) < TODAY ? "expired" : r.status;
const taWindow = r => [iso(addDays(D(r.on),-365)), r.on];
function taResults(r){
  const [from,to] = taWindow(r);
  return r.staff.map(uid=>{
    const acts = cases.filter(c=>c.uid===uid && c.status==="issued" && (c.action==="caution"||c.action==="final") && c.decidedOn>=from && c.decidedOn<=to);
    return {uid, hit:acts.length>0, basis:acts.map(a=>ACTIONS[a.action].label+" · "+fmt(a.decidedOn))};
  });
}
taRequests.forEach(r=>{ if(r.status==="approved") r.results = taResults(r); });
function parseStaff(text){
  const toks = text.split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean);
  const rows=[], seen=new Set();
  toks.forEach(t=>{
    const m = t.match(/^(?:BML-?)?(\d{5})$/i);
    const uid = m ? "BML-"+m[1] : t.toUpperCase();
    if(seen.has(uid)) return; seen.add(uid);
    rows.push({uid, e: m ? emp(uid) : null});
  });
  return {rows, found: rows.filter(r=>r.e).map(r=>r.e.uid), miss: rows.filter(r=>!r.e).map(r=>r.uid)};
}
const yn = hit => hit ? `<span class="yn yes">Yes</span>` : `<span class="yn no">No</span>`;
function taTable(r, showBasis){
  const res = r.results || taResults(r);
  return `<div class="scroll"><table class="tat" id="ta-table"><thead><tr><th>UID</th><th>Name</th><th>Disciplinary action<br><small>past 12 months</small></th>${showBasis?"<th>Basis <small>(ER only)</small></th>":""}</tr></thead>
    <tbody>${res.map(x=>{const e=emp(x.uid);return `<tr><td class="mono">${e.uid}</td><td>${esc(e.name)}<small>${esc(e.designation)}</small></td><td>${yn(x.hit)}</td>${showBasis?`<td class="note">${x.basis.length?esc(x.basis.join(", ")):"—"}</td>`:""}</tr>`}).join("")}</tbody></table></div>`;
}
function renderTA(){
  const mine = taRequests.slice().sort((a,b)=>a.id<b.id?1:-1);
  const r = state.taNew ? null : taRequests.find(x=>x.id===state.taSel);
  let body;
  if(state.taNew){
    body = `${backBtn("Back to records checks")}
      <div class="pane-head"><div><h2>New records check</h2><div class="sub">Paste staff UIDs. Results show after Employee Relations review.</div></div></div>
      <form class="form" id="taForm" novalidate>
        <div class="tagrid">
          <label class="f" for="ta-list">UIDs<textarea id="ta-list" class="mono" style="min-height:220px" placeholder="EMP-10421&#10;EMP-14102&#10;13207"></textarea></label>
          <div class="f">Staff found<div id="ta-preview" class="tapre"><p class="note">Names appear here as you paste.</p></div></div>
        </div>
        <label class="f" for="ta-ref" style="max-width:360px">Reference<input id="ta-ref" placeholder="e.g. BML/IV/2026/131"></label>
        <p class="flag f-block" id="ta-err" hidden></p>
        <div class="actions"><button class="btn primary" type="submit" id="ta-submit">Submit for review</button><button class="btn" type="button" data-act="tacancel">Cancel</button></div>
      </form>`;
  } else if(r){
    const st = taStatus(r);
    const yes = r.results ? r.results.filter(x=>x.hit).length : 0;
    const detail = st==="approved" ? `<div class="tasum"><div><b>${r.staff.length}</b><span>Staff checked</span></div><div><b class="${yes?"yes":""}">${yes}</b><span>With action</span></div><div><b>${fmt(iso(addDays(D(r.decidedOn),30)))}</b><span>Viewable until</span></div></div>${taTable(r,false)}<div class="actions"><button class="btn sm" data-act="tacopy">Copy for Excel</button></div>`
      : st==="pending" ? `<p class="flag f-warn"><strong>With Employee Relations</strong><span>Results appear here once reviewed.</span></p><div class="scroll"><table class="tat"><thead><tr><th>UID</th><th>Name</th></tr></thead><tbody>${r.staff.map(u=>`<tr><td class="mono">${u}</td><td>${esc(emp(u).name)}<small>${esc(emp(u).designation)}</small></td></tr>`).join("")}</tbody></table></div>`
      : st==="rejected" ? `<p class="flag f-block"><strong>Not approved</strong><span>${esc(r.note)}</span></p>`
      : `<p class="flag f-info"><strong>Access expired</strong><span>Submit a new check if needed.</span></p>`;
    body = `${backBtn("Back to records checks")}
      <div class="proc-detail"><div class="proc-head"><span class="eyebrow">Records check · ${r.id}</span><h3>${esc(r.ref)}</h3>
        <dl class="pmeta"><div><dt>Submitted</dt><dd>${fmt(r.on)}</dd></div><div><dt>Staff</dt><dd>${r.staff.length}</dd></div><div><dt>Status</dt><dd>${pillOf(TA_STATUS,st)}</dd></div></dl></div>
        ${detail}</div>`;
  } else {
    const tone = st => TA_STATUS[st][1];
    body = `<div class="pane-head"><div><h2>Records checks</h2><div class="sub">Disciplinary action in the past 12 months, as Yes or No.</div></div><button class="btn primary" type="button" data-act="tanew">+ New check</button></div>
      ${mine.length?`<ul class="plist">${mine.map(x=>{const st=taStatus(x);return `<li><button type="button" class="prow" data-ta="${x.id}">
        <span class="pic ${st==="approved"?"done":""}">${ic("file",16)}</span>
        <span class="pmain"><b>${esc(x.ref)}</b><small>${x.staff.length} staff · ${fmt(x.on)} · ${x.id}</small></span>
        <span class="pill t-${tone(st)}">${TA_STATUS[st][0]}</span><span class="chev">${ic("chev",16)}</span></button></li>`}).join("")}</ul>`:`<div class="empty">No records checks yet.</div>`}`;
  }
  mainEl().innerHTML = `<main class="panel pane ta-page">${body}</main>`;
  bindTA();
}
function bindTA(){
  const f = $("#taForm"); if(!f) return;
  const live = ()=>{
    const {rows,found,miss} = parseStaff($("#ta-list").value);
    $("#ta-preview").innerHTML = rows.length ? `<table class="tat"><tbody>${rows.map(r=>r.e?`<tr><td class="mono">${r.uid}</td><td>${esc(r.e.name)}<small>${esc(r.e.designation)}</small></td></tr>`:`<tr class="bad"><td class="mono">${esc(r.uid)}</td><td>Not in directory</td></tr>`).join("")}</tbody></table><p class="note" style="margin:6px 0 0">${found.length} found${miss.length?` · ${miss.length} not found`:""}</p>` : `<p class="note">Names appear here as you paste.</p>`;
    $("#ta-submit").textContent = found.length ? `Submit ${found.length} for review` : "Submit for review";
    $("#ta-err").hidden = true;
  };
  f.addEventListener("input", live); live();
  f.addEventListener("submit", ev=>{
    ev.preventDefault(); const err=$("#ta-err");
    const {found,miss} = parseStaff($("#ta-list").value); const ref=$("#ta-ref").value.trim();
    if(!found.length){ err.textContent="Paste at least one UID."; err.hidden=false; return; }
    if(miss.length){ err.textContent="Remove UIDs not in the directory: "+miss.join(", "); err.hidden=false; return; }
    if(ref.length<3){ err.textContent="Add a reference."; err.hidden=false; return; }
    const id = nextId("TA-2026-", taRequests);
    taRequests.push({id, by:ROLES.ta.person, on:iso(TODAY), ref, staff:found, status:"pending"});
    state.taNew=false; state.taSel=id; toast("Submitted for review"); render();
  });
}
const DEC_OUT = {upheld:"Grievance upheld", partly:"Partly upheld", not:"Not upheld"};
function decisionHTML(v, viewer){
  if(!FORMAL.includes(v.type) || !v.receivedBy) return "";
  const d = v.dec;
  const show = d ? `<section class="decbox"><span class="eyebrow">Proposed decision · ${DEC_OUT[d.outcome]}</span><p>${esc(d.text)}</p>
      <ol class="decsteps">${[["lead","Proposed","ER Lead",d.on],["mgr","Recommended","ER Manager",d.mgrOn],["pcd","Approved","PCD",d.pcdOn]].map(([k,l,w,on])=>`<li class="${on?"done":d.stage===k?"now":""}"><b>${l}</b><small>${w}${on?" · "+fmt(on):""}</small></li>`).join("")}</ol>
      ${d.mgrNote?`<p class="note" style="margin:0"><b>ER Manager:</b> ${esc(d.mgrNote)}</p>`:""}${d.retNote?`<p class="flag f-warn" style="margin:0"><strong>Returned</strong><span>${esc(d.retNote)}</span></p>`:""}</section>` : "";
  if(v.status==="closed") return show;
  if(viewer==="pc" && (!d || d.stage==="lead")) return show + `<div class="task"><h3>${d?"Revise the decision":"Propose a decision"}</h3><p class="note" style="margin:0">Goes to the ER Manager for recommendation, then to the PCD for approval. The approved decision is sent to the employee as the outcome.</p>
      <label class="f" for="dec-out">Outcome<select id="dec-out">${Object.entries(DEC_OUT).map(([k,l])=>`<option value="${k}" ${d?.outcome===k?"selected":""}>${l}</option>`).join("")}</select></label>
      <label class="f" for="dec-text">Decision and actions to be taken<textarea id="dec-text" style="min-height:90px">${esc(d?.text||"")}</textarea></label>
      <p class="flag f-block" id="dec-err" hidden>Write the decision first.</p>
      <div class="actions"><button class="btn primary" data-act="decpropose" data-id="${v.id}">Send to ER Manager</button></div></div>`;
  if(viewer==="mgr" && d?.stage==="mgr") return show + `<div class="task"><h3>Recommend the decision</h3><label class="f" for="dec-note">Recommendation note <span class="h">Required if returning</span><textarea id="dec-note"></textarea></label><p class="flag f-block" id="dec-err" hidden>Add a note to return it.</p>
      <div class="actions"><button class="btn primary" data-act="decrecommend" data-id="${v.id}">Recommend to PCD</button><button class="btn" data-act="decreturn" data-id="${v.id}">Return to ER Lead</button></div></div>`;
  if(viewer==="pcd" && d?.stage==="pcd") return show + `<div class="task"><h3>Approve the grievance decision</h3><p class="note" style="margin:0">Approving closes the ${VOICE[v.type].label.toLowerCase()} and sends the decision to ${v.anon?"the submitter":esc(emp(v.uid).name)}.</p><label class="f" for="dec-note">Note <span class="h">Required if returning</span><textarea id="dec-note"></textarea></label><p class="flag f-block" id="dec-err" hidden>Add a note to return it.</p>
      <div class="actions"><button class="btn primary" data-act="decapprove" data-id="${v.id}">Approve decision</button><button class="btn" data-act="decreturn" data-id="${v.id}">Return to ER Lead</button></div></div>`;
  return show;
}
function voiceReviewBody(v, viewer){
  const st = vStatus(v);
  const who = v.anon ? "Anonymous" : emp(v.uid).name+" · "+emp(v.uid).designation;
  const recv = !v.receivedBy && viewer!=="chief" && viewer!=="record" ? `<div class="task"><h3>Acknowledge receipt</h3><p class="note" style="margin:0">Records you as the person who received this, with the date and time. The submitter sees it as "Received".</p><div class="actions"><button class="btn primary" data-act="vreceive" data-id="${v.id}">Mark as received</button></div></div>` : "";
  return `<div class="pane-head"><div><span class="eyebrow">${v.id} · ${fmt(v.on)} ${v.at||""}</span><h2>${esc(vTitle(v))}</h2><div class="sub">${esc(VOICE[v.type].label)} · ${esc(who)}</div></div><span class="pill t-${st[1]}">${st[0]}</span></div>
    ${recv}${decisionHTML(v, viewer)}${voiceTrackHTML(v, viewer)}
    <details class="docdet"><summary>View the submission</summary>${voiceDocHTML(v)}</details>`;
}
function renderVoiceReview(){
  const v = voice.find(x=>x.id===state.selected);
  return `<main class="panel pane">${voiceReviewBody(v, state.role==="lead"?"pc":state.role)}</main>`;
}
function renderChief(){
  const mine = voice.filter(v=>v.type==="chief").sort((a,b)=>(chiefTodo(b)-chiefTodo(a)) || (a.on<b.on?1:-1));
  const v = mine.find(x=>x.id===state.chiefSel);
  const body = v ? `${backBtn("Back to submissions")}${voiceReviewBody(v,"chief")}`
    : `<div class="pane-head"><div><h2>Shared with the Chief</h2><div class="sub">Concerns and ideas sent to the Office of the Chief. Open any submission and reply. People & Culture can see the status to make sure each one is answered.</div></div></div>
      ${mine.length?`<ul class="plist">${mine.map(x=>{const st=vStatus(x), todo=chiefTodo(x);return `<li><button type="button" class="prow" data-chief="${x.id}"><span class="pic ${todo?"todo":""}">${ic(x.f.kind==="idea"?"bulb":"voice",16)}</span><span class="pmain"><b>${esc(vTitle(x))}</b><small>${x.anon?"Anonymous":esc(emp(x.uid).name)} · ${VOICE_KINDS[x.f.kind]} · ${fmt(x.on)}${x.needsReply?" · new reply":""}</small></span><span class="pill t-${st[1]}">${st[0]}</span><span class="chev">${ic("chev",16)}</span></button></li>`}).join("")}</ul>`:`<div class="empty">Nothing yet.</div>`}`;
  mainEl().innerHTML = `<main class="panel pane ta-page">${body}</main>`;
}
/* ---------- Investigations (ER Lead <-> Compliance) ---------- */
function invCard(i){
  return `<dl class="pmeta"><div><dt>Requested</dt><dd>${fmt(i.on)}</dd></div><div><dt>Due</dt><dd>${fmt(i.due)}</dd></div><div><dt>Linked record</dt><dd>${esc(i.ref||"None")}</dd></div><div><dt>Status</dt><dd>${pillOf(INV_STATUS,i.status)}</dd></div></dl>
    ${i.uid?infoCard(emp(i.uid)):""}
    <section class="allegation"><span class="eyebrow">Scope of investigation</span><p>${esc(i.scope)}</p></section>
    ${i.status==="done"?`<section class="decbox"><span class="eyebrow">Findings · ${fmt(i.findingsOn)}</span><p>${esc(i.findings)}</p><span class="pill t-${i.recommend==="action"?"bad":"ok"}">${i.recommend==="action"?"Recommends disciplinary action":"No further action recommended"}</span></section>`:""}`;
}
function renderInvReview(){
  const i = invs.find(x=>x.id===state.selected);
  const task = i.status==="done" && !i.ack ? `<div class="task"><h3>Review the findings</h3><div class="actions"><button class="btn primary" data-act="invack" data-id="${i.id}">Mark as reviewed</button>${i.recommend==="action"&&i.uid?`<button class="btn" data-act="invcase" data-id="${i.id}">Open disciplinary case</button>`:""}</div></div>`
    : i.status==="open" ? `<div class="task passive"><h3>With Compliance</h3><p class="note" style="margin:0">Findings due ${fmt(i.due)}.</p></div>` : "";
  return `<main class="panel pane"><div class="pane-head"><div><span class="eyebrow">${i.id} · investigation request</span><h2>${esc(i.subject)}</h2></div>${pillOf(INV_STATUS,i.status)}</div>${task}${invCard(i)}</main>`;
}
function renderInvForm(){
  const p = state.invPrefill||{};
  const refs = [...cases.filter(c=>!["issued","recorded","closed"].includes(c.status)).map(c=>[c.id,c.id+" · "+emp(c.uid).name]), ...voice.filter(v=>FORMAL.includes(v.type)&&v.status!=="closed").map(v=>[v.id,v.id+" · "+VOICE[v.type].label])];
  return `<main class="panel pane"><div class="pane-head"><div><span class="eyebrow">People &amp; Culture → Compliance</span><h2>Request an investigation</h2></div></div>
    <form class="form" id="invForm" novalidate>
      <div class="row"><label class="f" for="iv-uid">Staff member <span class="h">Optional</span><select id="iv-uid"><option value="">Not a specific person</option>${EMPLOYEES.map(e=>`<option value="${e.uid}" ${p.uid===e.uid?"selected":""}>${esc(e.name)} · ${e.uid}</option>`).join("")}</select></label>
      <label class="f" for="iv-ref">Linked record <span class="h">Optional</span><select id="iv-ref"><option value="">None</option>${refs.map(([k,l])=>`<option value="${k}" ${p.ref===k?"selected":""}>${esc(l)}</option>`).join("")}</select></label></div>
      <label class="f" for="iv-subj">Subject <span class="req">*</span><input id="iv-subj" value="${esc(p.subject||"")}"></label>
      <label class="f" for="iv-scope">What should Compliance look into? <span class="req">*</span><textarea id="iv-scope" style="min-height:100px">${esc(p.scope||"")}</textarea></label>
      <label class="f" for="iv-due" style="max-width:220px">Findings needed by<input type="date" id="iv-due" value="${iso(addWorkdays(TODAY,7))}"></label>
      <p class="flag f-block" id="iv-err" hidden>Add a subject and the scope.</p>
      <div class="actions"><button class="btn primary" type="submit">Send to Compliance</button><button class="btn" type="button" data-act="invcancel">Cancel</button></div>
    </form></main>`;
}
function bindInvForm(){
  const f=$("#invForm"); if(!f) return;
  f.addEventListener("submit", ev=>{ ev.preventDefault();
    const subj=$("#iv-subj").value.trim(), scope=$("#iv-scope").value.trim();
    if(!subj||scope.length<10){ $("#iv-err").hidden=false; return; }
    const id=nextId("INV-2026-",invs); invs.push({id,on:iso(TODAY),uid:$("#iv-uid").value||null,ref:$("#iv-ref").value||null,subject:subj,scope,due:$("#iv-due").value,status:"open"});
    const c=cases.find(x=>x.id===$("#iv-ref").value); if(c) c.trail.push(T(iso(TODAY),"lead","Requested investigation from Compliance ("+id+")"));
    state.invNew=false; state.invPrefill=null; state.selected=id; toast("Sent to Compliance"); render(); });
}
function renderCompliance(){
  const t = state.compTab||"inv";
  const tabs = `<div class="ltabs" style="grid-template-columns:repeat(2,minmax(0,1fr))">${[["inv","Investigation requests","From People & Culture",invs.filter(i=>i.status==="open").length],["refer","Refer a staff concern","To Employee Relations for disciplinary action",0]].map(([k,l,sub,n])=>`<button class="ltab" type="button" data-ctab="${k}" aria-selected="${t===k}"><span class="lt-t">${l}${n?` <span class="badge">${n}</span>`:""}</span><span class="lt-s">${sub}</span></button>`).join("")}</div>`;
  let body;
  if(t==="inv"){
    const i = invs.find(x=>x.id===state.compSel);
    if(i) body = `${backBtn("Back to requests")}<div class="pane-head"><div><span class="eyebrow">${i.id} · from People &amp; Culture</span><h2>${esc(i.subject)}</h2></div>${pillOf(INV_STATUS,i.status)}</div>${invCard(i)}
      ${i.status==="open"?`<form class="task" id="findForm" novalidate><h3>Submit findings</h3><label class="f" for="fd-text">Findings <span class="req">*</span><textarea id="fd-text" style="min-height:120px"></textarea></label>
        <label class="f" for="fd-rec">Recommendation<select id="fd-rec"><option value="action">Recommend disciplinary action</option><option value="none">No further action</option></select></label>
        <p class="flag f-block" id="fd-err" hidden>Write the findings first.</p><div class="actions"><button class="btn primary" type="submit">Send findings to Employee Relations</button></div></form>`:""}`;
    else body = `<ul class="plist">${invs.slice().sort((a,b)=>(a.status==="open")===(b.status==="open")?(a.on<b.on?1:-1):a.status==="open"?-1:1).map(x=>`<li><button type="button" class="prow" data-csel="${x.id}"><span class="pic ${x.status==="open"?"todo":"done"}">${ic("search",16)}</span><span class="pmain"><b>${esc(x.subject)}</b><small>${x.id} · ${x.uid?esc(emp(x.uid).name)+" · ":""}due ${fmt(x.due)}</small></span><span class="pill t-${INV_STATUS[x.status][1]}">${INV_STATUS[x.status][0]}</span><span class="chev">${ic("chev",16)}</span></button></li>`).join("")}</ul>`;
  } else {
    const mine = cases.filter(c=>c.escBy==="compliance").sort((a,b)=>a.created<b.created?1:-1);
    body = `<div class="split"><form class="form" id="cmpForm" novalidate>
        <label class="f" for="cm-uid">Staff member<select id="cm-uid"><option value="">Select…</option>${EMPLOYEES.map(e=>`<option value="${e.uid}">${esc(e.name)} · ${e.uid}</option>`).join("")}</select></label>
        <div id="cm-card"></div>
        <div class="row"><label class="f" for="cm-inv">Related investigation<select id="cm-inv"><option value="">None</option>${invs.map(i=>`<option value="${i.id}">${i.id} · ${esc(i.subject)}</option>`).join("")}</select></label><label class="f" for="cm-when">When it happened<input id="cm-when"></label></div>
        <label class="f" for="cm-det">Concern and evidence <span class="req">*</span><textarea id="cm-det" style="min-height:120px"></textarea></label>
        <p class="flag f-block" id="cm-err" hidden>Choose the staff member and describe the concern.</p>
        <div class="actions"><button class="btn primary" type="submit">Refer to Employee Relations</button></div></form>
      <aside class="route"><span class="eyebrow">Concerns you referred</span>${mine.length?mine.map(c=>`<div class="card" style="background:var(--surface)"><div class="top"><strong style="font-size:14px">${esc(emp(c.uid).name)}</strong><span class="ref">${c.id}</span></div>${pill(c.status)}<span class="note">Referred ${fmt(c.created)}</span></div>`).join(""):`<p class="note" style="margin:0">None yet.</p>`}</aside></div>`;
  }
  mainEl().innerHTML = `${tabs}<main class="panel pane">${body}</main>`;
}
function bindCompliance(){
  const ff=$("#findForm"); if(ff) ff.addEventListener("submit", ev=>{ ev.preventDefault(); const t=$("#fd-text").value.trim(); if(t.length<10){ $("#fd-err").hidden=false; return; }
    const i=invs.find(x=>x.id===state.compSel); Object.assign(i,{status:"done",findings:t,recommend:$("#fd-rec").value,findingsOn:iso(TODAY),ack:false});
    const c=cases.find(x=>x.id===i.ref); if(c) c.trail.push(T(iso(TODAY),"comp","Submitted investigation findings ("+i.id+")",t));
    toast("Findings sent to Employee Relations"); render(); });
  const cf=$("#cmpForm"); if(cf){ $("#cm-uid").addEventListener("change",()=>{ const e=emp($("#cm-uid").value); $("#cm-card").innerHTML=e?infoCard(e):""; });
    cf.addEventListener("submit", ev=>{ ev.preventDefault(); const uid=$("#cm-uid").value, det=$("#cm-det").value.trim(); if(!uid||det.length<15){ $("#cm-err").hidden=false; return; }
      const id=nextId("DA-2026-",cases), ivr=$("#cm-inv").value;
      cases.push({id, uid, source:"investigation", method:null, clauses:[], other:null, action:null, proposed:null, reason:"", extras:[], prelim:false, status:"escalated", created:iso(TODAY), escBy:"compliance",
        esc:{type:"Compliance referral"+(ivr?" ("+ivr+")":""), when:$("#cm-when").value.trim()||"Not stated", details:det, discussed:"Not applicable"},
        trail:[T(iso(TODAY),"comp","Referred staff concern to Employee Relations for disciplinary action",det)]});
      toast("Referred to Employee Relations ("+id+")"); render(); }); }
}

/* ---------- ER Head dashboard ---------- */
function renderDashboard(){
  const open = cases.filter(c=>!["issued","recorded","closed"].includes(c.status));
  const grp = {"Questioning":["sc_draft","sc_returned","sc_issued","min_staff","min_amend","min_lead","min_att"],"With ER Lead":["escalated","sc_answered","ready","returned"],"ER Manager review":["review"],"Awaiting approval":["pending"],"Preliminary decision":["prelim"]};
  const stage = Object.entries(grp).map(([k,v])=>[k,open.filter(c=>v.includes(c.status)).length]);
  const yr = iso(addDays(TODAY,-365));
  const issued = cases.filter(c=>["issued","recorded"].includes(c.status) && c.action && c.decidedOn>=yr);
  const byAct = Object.entries(ACTIONS).map(([k,a])=>[a.label, issued.filter(c=>c.action===k).length]);
  const pend = cases.filter(c=>c.status==="pending").map(c=>({c,who:route(c).role==="dg"?"D&G Committee":ROLES[route(c).role].label,age:Math.round((TODAY-D(c.trail.filter(t=>t.role==="mgr").pop()?.on||c.created))/864e5)})).sort((a,b)=>b.age-a.age);
  const vOpen = voice.filter(v=>v.status!=="closed" && v.type!=="chief");
  const max = a => Math.max(1,...a.map(x=>x[1]));
  const bars = (rows) => { const m=max(rows); return `<div class="bars">${rows.map(([l,n])=>`<div class="bar"><span class="bl">${esc(l)}</span><span class="bt"><span style="width:${n/m*100}%"></span></span><b>${n}</b></div>`).join("")}</div>`; };
  const kpi = (n,l,sub) => `<div class="dk"><b>${n}</b><span>${l}</span>${sub?`<small>${sub}</small>`:""}</div>`;
  return `<main class="panel pane"><div class="pane-head"><div><span class="eyebrow">As of ${fmt(iso(TODAY))}</span><h2>Employee Relations dashboard</h2></div></div>
    <div class="dkpis">${kpi(open.length,"Open disciplinary cases")}${kpi(issued.filter(c=>c.action==="caution"||c.action==="final").length,"Cautionary and Final Warning","last 12 months")}${kpi(pips.filter(p=>["active","to_sign","meeting"].includes(p.status)).length,"Active PIPs",pips.filter(p=>p.status==="hr_review").length+" awaiting approval")}${kpi(vOpen.length,"Open EmployeeVoice items",vOpen.filter(v=>FORMAL.includes(v.type)).length+" formal")}${kpi(invs.filter(i=>i.status==="open").length,"Investigations with Compliance")}${kpi(appeals.filter(a=>a.status!=="decided").length,"Open PM appeals",appealWin.open?appealWin.year+" appeals open":"Appeals closed")}</div>
    <div class="two"><section class="ess-card"><h3>Open cases by stage</h3>${bars(stage)}</section><section class="ess-card"><h3>Actions issued, last 12 months</h3>${bars(byAct)}</section></div>
    <section class="ess-card"><h3>Awaiting approval</h3>${pend.length?`<div class="scroll"><table class="tat"><thead><tr><th>Case</th><th>Employee</th><th>Action</th><th>With</th><th>Days waiting</th></tr></thead><tbody>${pend.map(x=>`<tr><td class="mono">${x.c.id}</td><td>${esc(emp(x.c.uid).name)}</td><td>${ACTIONS[x.c.action].label}</td><td>${x.who}</td><td>${x.age}</td></tr>`).join("")}</tbody></table></div>`:`<p class="note">Nothing awaiting approval.</p>`}</section>
    <section class="ess-card"><h3>EmployeeVoice by channel</h3>${bars(Object.entries(VOICE).filter(([k])=>k!=="chief").map(([k,v])=>[v.label, voice.filter(x=>x.type===k && x.status!=="closed").length]))}</section>
  </main>`;
}

function renderTAReview(){
  const r = taRequests.find(x=>x.id===state.selected); const s = taStatus(r);
  const res = r.results || taResults(r), yes = res.filter(x=>x.hit).length;
  const task = s==="pending" ? `<div class="actions"><button class="btn primary" data-act="taapprove">Approve and release</button><button class="btn" data-act="tareject">Return</button><input id="ta-note" placeholder="Note (required to return)" style="flex:1;min-width:180px"></div><p class="flag f-block" id="tan-err" hidden>Add a note to return the request.</p>`
    : `<p class="flag f-${s==="approved"?"ok":"info"}"><strong>${TA_STATUS[s][0]}</strong><span>${r.decidedOn?fmt(r.decidedOn):""}${r.note?" · "+esc(r.note):""}</span></p>`;
  return `<main class="panel pane"><div class="pane-head"><div><span class="eyebrow">${r.id} · ${esc(r.by)} · ${fmt(r.on)}</span><h2>${esc(r.ref)}</h2></div>${pillOf(TA_STATUS,s)}</div>
    <div class="tasum"><div><b>${r.staff.length}</b><span>Staff</span></div><div><b class="${yes?"yes":""}">${yes}</b><span>With action</span></div><div><b>${fmt(taWindow(r)[0])}</b><span>Checked from</span></div></div>
    ${task}
    ${taTable(r,true)}
    <p class="note" style="margin:0">Talent Acquisition sees UID, Name and Yes/No only. Cautionary and Final Warning Notices are counted; verbal advice is not.</p></main>`;
}

/* ---------- forms ---------- */
function renderForm(){
  const opt = (o,sel)=>Object.entries(o).map(([k,v])=>`<option value="${k}" ${k===sel?"selected":""}>${esc(v)}</option>`).join("");
  const due = iso(addWorkdays(TODAY,3));
  const ec = state.fromEsc ? cases.find(x=>x.id===state.fromEsc) : null;
  return `<main class="panel pane">
    <div class="pane-head"><div><span class="eyebrow">ER Lead${ec?" · from "+ec.id:""}</span><h2>Open a case</h2><div class="sub">Choose how the employee will be questioned. The action is proposed once their reply or the signed minutes are in.</div></div></div>
    ${ec?`<p class="flag f-info"><strong>Concern from ${esc(escName(ec))}</strong><span>${esc(ec.esc.details)}</span></p>`:""}
    <div class="split">
      <form class="form" id="caseForm" novalidate>
        <fieldset><legend>Employee and matter</legend>
          <label class="f" for="f-uid">Employee<select id="f-uid" ${ec?"disabled":""}><option value="">Select employee…</option>${EMPLOYEES.map(e=>`<option value="${e.uid}" ${ec&&ec.uid===e.uid?"selected":""}>${esc(e.name)} · ${esc(e.designation)}</option>`).join("")}</select></label>
          <label class="f" for="f-source" style="max-width:320px">Source<select id="f-source">${opt(SOURCES,"escalation")}</select></label>
          <div class="f">Suspected breach <span class="h">Tick all that apply. You can change these when proposing the action.</span></div>
          ${clausePicker("fc", [], null)}
        </fieldset>
        <fieldset><legend>How will the employee be questioned?</legend>
          <div class="seg" role="radiogroup">
            <label><input type="radio" name="f-method" value="showcause" checked> Show cause notice</label>
            <label><input type="radio" name="f-method" value="interview"> Meeting with minutes</label>
            <label><input type="radio" name="f-method" value="verbal"> Log verbal advice</label>
          </div>
        </fieldset>
        <fieldset id="sec-showcause"><legend>Show cause notice</legend>
          <label class="f" for="sc-alleg">Allegation <span class="h">What the employee is alleged to have done, with dates. Shown to the employee as written.</span><textarea id="sc-alleg">${ec?esc(ec.esc.details):""}</textarea></label>
          <div id="q-rows" style="display:flex;flex-direction:column;gap:8px">${STD_QUESTIONS.map((q,i)=>`<div class="qrow"><span class="n">${i+1}.</span><input class="q-in" aria-label="Question ${i+1}" value="${esc(q)}"></div>`).join("")}</div>
          <div><button class="btn link" type="button" data-act="addq">+ Add a question</button></div>
          <label class="f" for="sc-due" style="max-width:220px">Reply due<input type="date" id="sc-due" value="${due}"></label>
        </fieldset>
        <fieldset id="sec-interview" hidden><legend>Meeting minutes</legend>
          <div class="row">
            <label class="f" for="mi-date">Meeting date<input type="date" id="mi-date" value="${iso(TODAY)}"></label>
            <label class="f" for="mi-venue">Venue<input id="mi-venue" value="People & Culture meeting room, 3rd floor"></label>
          </div>
          <div class="f">Who else attended? <span class="h">These people receive the minutes to sign after the employee and you. You can change this before sending.</span></div>
          ${attendeePicker("fa", [HM], null)}
          <div id="m-rows">${[0,1].map(i=>`<div class="mrow"><span class="n note">${i+1}.</span><div class="pair"><input class="mq" aria-label="Question ${i+1}" placeholder="Question asked"><textarea class="ma" aria-label="Answer ${i+1}" placeholder="Employee's answer"></textarea></div></div>`).join("")}</div>
          <div><button class="btn link" type="button" data-act="addm">+ Add a question and answer</button></div>
        </fieldset>
        <fieldset id="sec-verbal" hidden><legend>Verbal advice</legend>
          <label class="f" for="v-reason">Concern <span class="h">What the line manager raised with the employee, with dates.</span><textarea id="v-reason">${ec?esc(ec.esc.details):""}</textarea></label>
          <label class="f" for="v-sugg">Suggestion for improvement <span class="h">What the employee should do differently. Shown to the employee.</span><textarea id="v-sugg"></textarea></label>
          <p class="note" style="margin:0">Verbal advice is not a disciplinary action. The employee can view it and respond in the ESS Portal.</p>
        </fieldset>
        <p id="f-err" class="flag f-block" hidden></p>
        <div class="actions"><button class="btn primary" type="submit" id="f-submit">Send show cause to ER Manager</button><button class="btn" type="button" data-act="cancel">Cancel</button></div>
      </form>
      <aside class="route" aria-label="Routing" id="liveRoute"></aside>
    </div></main>`;
}

function bindForm(){
  const form = $("#caseForm"); if(!form) return;
  const method = ()=>form.querySelector("input[name=f-method]:checked").value;
  const live = ()=>{
    const m = method();
    ["showcause","interview","verbal"].forEach(k=>$("#sec-"+k).hidden = k!==m);
    $("#f-submit").textContent = {showcause:"Send show cause to ER Manager",interview:"Send minutes to employee to sign",verbal:"Log verbal advice"}[m];
    const c = {uid:$("#f-uid").value, ...readClauses("fc"), action: m==="verbal"?"verbal":null, source:$("#f-source").value, id:"(new)"};
    const r = route(c);
    const path = {showcause:"ER Manager approves notice → staff reply → you propose → ER Manager → approver → staff",interview:"Staff signs → you sign and send → attendees sign → you propose → ER Manager → approver → staff",verbal:"Logged → appears in staff Disciplinary History"}[m];
    $("#liveRoute").innerHTML = `<span class="eyebrow">Next steps</span><p class="note" style="margin:0">${esc(path)}</p>${c.uid&&hasBreach(c)?`<div class="why">${esc(r.why)}</div>`:""}${flagsHTML(r.flags)}${c.uid?`<span class="eyebrow">Employee's record</span>${historyHTML(c.uid,null)}`:""}`;
    $("#f-err").hidden = true;
  };
  form.addEventListener("input", live); form.addEventListener("change", live); live();
  form.addEventListener("submit", ev=>{
    ev.preventDefault(); const err=$("#f-err"); const m = method();
    const uid=$("#f-uid").value, source=$("#f-source").value, br=readClauses("fc"), today=iso(TODAY);
    const fail = t=>{ err.textContent=t; err.hidden=false; };
    if(!uid) return fail("Choose an employee.");
    const ce = clauseError(br); if(ce) return fail(ce);
    const ec = state.fromEsc ? cases.find(x=>x.id===state.fromEsc) : null;
    const c = ec || {id:nextId("DA-2026-",cases), uid, created:today, trail:[]};
    const patch = {source, method:m, clauses:br.clauses, other:br.other, action:null, proposed:null, reason:"", extras:[], prelim:false};
    if(m==="showcause"){
      const alleg=$("#sc-alleg").value.trim(); const qs=[...document.querySelectorAll(".q-in")].map(i=>i.value.trim()).filter(Boolean);
      if(alleg.length<15) return fail("Write the allegation in a sentence or two, with dates.");
      if(!qs.length) return fail("Add at least one question.");
      Object.assign(c, patch, {status:"sc_draft", sc:{allegation:alleg, issuedOn:null, due:$("#sc-due").value, questions:qs, answers:null, answeredOn:null}});
      c.trail.push(T(today,"lead","Drafted show cause notice and sent to ER Manager for approval")); toast("Show cause draft sent to ER Manager");
    } else if(m==="interview"){
      const entries=[...document.querySelectorAll("#m-rows .mrow")].map(r=>({q:r.querySelector(".mq").value.trim(),a:r.querySelector(".ma").value.trim()})).filter(x=>x.q);
      if(!entries.length) return fail("Record at least one question and answer.");
      if(entries.some(x=>!x.a)) return fail("Every question needs the employee's answer, or 'No comment'.");
      const att = readAttendees("fa").filter(u=>u!==uid);
      Object.assign(c, patch, {status:"min_staff", mins:{date:$("#mi-date").value, venue:$("#mi-venue").value.trim(), entries, staffSign:null, staffComment:"", leadSign:null, attendees:att, attSigns:Object.fromEntries(att.map(u=>[u,null])), attComments:{}}});
      c.trail.push(T(today,"lead","Drafted meeting minutes and sent to employee to sign")); toast("Minutes sent to "+emp(uid).name+" to sign");
    } else {
      const reason=$("#v-reason").value.trim();
      const test = route({...c, ...patch, action:"verbal"});
      if(test.blocked) return fail(test.flags.find(f=>f.l==="block").t);
      if(reason.length<15) return fail("Describe the concern in a sentence or two.");
      const sugg=$("#v-sugg").value.trim(); if(sugg.length<10) return fail("Add a suggestion for improvement.");
      Object.assign(c, patch, {action:"verbal",proposed:"verbal",reason,suggestion:sugg,status:"recorded",decidedRole:"lead",decidedOn:today});
      c.trail.push(T(today,"lead","Logged verbal advice given by line manager")); toast("Verbal advice logged");
    }
    if(!ec) cases.push(c);
    state.selected=c.id; state.mode="view"; state.fromEsc=null; render();
  });
}

function readPipRows(k){ return [...document.querySelectorAll(`#rows-${k} .prow`)].map(r=>({a:r.querySelector(".pa")?.value.trim()||"",b:r.querySelector(".pb")?.value.trim()||"",c:r.querySelector(".pc")?.value.trim()||"",d:r.querySelector(".pd")?.value.trim()||""})); }
function bindStaffForms(){
  const today = iso(TODAY);
  const ef = $("#escForm");
  if(ef){ const fillVA = ()=>{ const box=$("#e-vabox"), u=$("#e-uid").value, on=$("#e-disc").value==="verbal"; box.hidden=!on; if(!on) return;
      const list = cases.filter(c=>c.uid===u && c.action==="verbal").sort((a,b)=>a.decidedOn<b.decidedOn?1:-1);
      $("#e-va").innerHTML = !u ? `<option value="">Choose the team member first</option>` : list.length ? list.map(c=>`<option value="${c.id}">${fmt(c.decidedOn)} · ${esc(c.reason.slice(0,70))}${c.reason.length>70?"…":""}</option>`).join("") : `<option value="">No verbal advice recorded for this team member</option>`; };
    $("#e-disc").addEventListener("change", fillVA); $("#e-uid").addEventListener("change", fillVA); }
  if(ef) ef.addEventListener("submit", ev=>{
    ev.preventDefault(); const err=$("#e-err");
    const uid=$("#e-uid").value, det=$("#e-details").value.trim(), disc=$("#e-disc").value;
    if(!uid){ err.textContent="Choose the team member."; err.hidden=false; return; }
    if(det.length<20){ err.textContent="Describe what happened in a few sentences, with dates."; err.hidden=false; return; }
    const id = nextId("DA-2026-",cases);
    cases.push({id, uid, source:"escalation", method:null, clauses:[], other:null, action:null, proposed:null, reason:"", extras:[], prelim:false, status:"escalated", created:today, escBy:state.staffUid,
      esc:{type:$("#e-type").value, when:$("#e-when").value.trim()||"Not stated", details:det, discussed:disc==="verbal"?(()=>{ const vc=cases.find(x=>x.id===$("#e-va")?.value); return vc?"Verbal advice given ("+vc.id+", "+fmt(vc.decidedOn)+": "+vc.reason+")":"Verbal advice given"; })():disc, verbalRef:$("#e-va")?.value||null},
      trail:[T(today,"line","Submitted staff concern",det,actor(state.staffUid))]});
    state.concernDone=id; render();
  });
  const vf = $("#voiceForm");
  if(vf) vf.addEventListener("submit", ev=>{
    ev.preventDefault(); const err=$("#v-err"); const type=vf.dataset.type, cfg=VOICE[type];
    const val = id => ($("#vf-"+id)?.value||"").trim();
    const miss = VOICE_REQ[type].filter(k=>!val(k));
    if(miss.length){ err.textContent="Complete the required fields marked *."; err.hidden=false; $("#vf-"+miss[0])?.focus(); return; }
    if(["harassment","gender"].includes(type) && !$("#vf-sign").checked){ err.textContent="Tick the confirmation to sign the form."; err.hidden=false; return; }
    const f = {};
    vf.querySelectorAll("[id^=vf-]").forEach(el=>{ const k=el.id.slice(3); if(el.type==="file") f[k]=[...el.files].map(x=>x.name).join(", "); else if(el.type!=="checkbox") f[k]=el.value.trim(); });
    if(!cfg.anon || true){ const k = vf.querySelector("input[name=vf-kind]:checked"); if(k) f.kind=k.value; }
    const anon = cfg.anon && $("#vf-anon")?.checked;
    const id = nextId(cfg.prefix, voice);
    voice.push({id, code:genCode(), type, uid: anon?null:state.staffUid, owner: anon?state.staffUid:undefined, anon, on:today, at:nowTime(), f, status:"submitted", thread:[]});
    clearDraft(vf.dataset.draft); state.voiceDone=id; state.voiceSel=null;
    render();
  });
  const vaf = $("#vaForm");
  if(vaf){ $("#va-uid").addEventListener("change", ()=>{ const e=emp($("#va-uid").value); $("#va-card").innerHTML = e?infoCard(e):""; });
    vaf.addEventListener("submit", ev=>{ ev.preventDefault(); const err=$("#va-err");
      const uid=$("#va-uid").value, con=$("#va-concern").value.trim(), sug=$("#va-sugg").value.trim(), d=$("#va-date").value||today;
      if(!uid||con.length<10||sug.length<10){ err.textContent="Choose a team member and complete the concern and suggestion."; err.hidden=false; return; }
      const id=nextId("DA-2026-",cases), mn=actor(state.staffUid);
      cases.push({id, uid, source:"escalation", method:"verbal", clauses:[], other:null, action:"verbal", proposed:"verbal", reason:con, suggestion:sug, extras:[], prelim:false, status:"recorded", created:today, decidedRole:"line", decidedOn:d, escBy:state.staffUid,
        trail:[T(today,"line","Gave verbal advice",null,mn),T(today,"system","Shared with the employee and Employee Relations")]});
      state.vaDone=id; render(); }); }
  const apf = $("#apForm");
  if(apf){ $("#ap-oth")?.addEventListener("change", e=>{ $("#ap-othbox").hidden=!e.target.checked; });
    apf.addEventListener("submit", ev=>{ ev.preventDefault(); const err=$("#ap-err"), v=id=>($("#ap-"+id)?.value||"").trim();
      const reasons=[...apf.querySelectorAll(".ap-r:checked")].map(i=>i.value), files=[...($("#ap-docs")?.files||[])];
      const fail = m => { err.textContent=m; err.hidden=false; };
      if(!v("appraiser")||!v("rating")||!v("expected")||!v("justification")) return fail("Complete the required fields marked *.");
      if(!reasons.length) return fail("Choose at least one reason for appeal.");
      if(reasons.includes("other") && !v("other")) return fail("Describe the other reason.");
      if(files.length>5) return fail("Attach up to 5 files.");
      if(!appealWin.open) return fail("Appeals have closed.");
      const id = "PMA-"+appealWin.year+"-"+String(Math.max(0,...appeals.filter(a=>a.year===appealWin.year).map(a=>+a.id.slice(-3)))+1).padStart(3,"0");
      appeals.push({id, year:appealWin.year, uid:state.staffUid, on:iso(TODAY), at:nowTime(), f:{appraiser:v("appraiser"), rating:v("rating"), reasons, other:v("other"), expected:v("expected"), justification:v("justification"), docs:files.map(x=>x.name).join(", ")}, status:"submitted"});
      clearDraft(apf.dataset.draft); state.apNew=false; state.apDone=id; render(); }); }
  document.querySelectorAll("form[data-steps]").forEach(initSteps);
  const land = $("#evLand");
  if(land && !document.documentElement.classList.contains("calm") && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)){
    land.addEventListener("pointermove", ev=>{ const r=land.getBoundingClientRect(); land.style.setProperty("--mx", ((ev.clientX-r.left)/r.width*100).toFixed(1)+"%"); land.style.setProperty("--my", ((ev.clientY-r.top)/r.height*100).toFixed(1)+"%"); });
    land.addEventListener("pointerleave", ()=>{ land.style.removeProperty("--mx"); land.style.removeProperty("--my"); });
  }
  const trk = document.querySelector(".evtrack"); if(trk) trk.addEventListener("toggle", ()=>{ state.trackOpen = trk.open; });
  const tf = $("#trackForm");
  if(tf) tf.addEventListener("submit", ev=>{ ev.preventDefault();
    const code = $("#trk").value.trim().toUpperCase().replace(/\s+/g,"");
    const v = voice.find(x=>x.code===code || x.code.replace(/-/g,"")===code.replace(/-/g,""));
    if(!v){ $("#trkerr").hidden=false; return; }
    state.voiceCodeOk=v.id; state.voiceSel=v.id; state.voiceTab=null; render(); });
  const pf = $("#pipForm");
  if(pf){
    const pre = state.pipPrefill;
    const fillRows = (k, vals, fn) => { const rows=[...document.querySelectorAll(`#rows-${k} .prow`)]; vals.forEach((v,i)=>{ if(rows[i]) fn(rows[i],v); }); };
    if(pre){ fillRows("concern", pre.concerns, (r,v)=>{r.querySelector(".pa").value=v.area; r.querySelector(".pb").value=v.issue;}); }
    const showEmp = ()=>{ const e=emp($("#pp-uid").value); $("#pp-emp").innerHTML = e ? infoCard(e,[["Date of joining",fmt(e.doj)],["Line manager",managerName(e)]]) : ""; };
    $("#pp-uid").addEventListener("change", showEmp); showEmp();
    pf.addEventListener("submit", ev=>{
      ev.preventDefault(); const err=$("#pp-err"); const fail=t=>{err.textContent=t; err.hidden=false;};
      const uid = pre ? pre.uid : $("#pp-uid").value;
      if(!uid) return fail("Choose the team member.");
      if(pips.some(p=>p.uid===uid && !["met","not_met"].includes(p.status))) return fail(emp(uid).name+" already has an open PIP.");
      const basis = pre ? "pip2" : pf.querySelector("input[name=pp-basis]:checked").value;
      const concerns = readPipRows("concern").filter(r=>r.a).map(r=>({area:r.a, issue:r.b}));
      const prior = pre ? [] : readPipRows("prior").filter(r=>r.b||r.c).map(r=>({date:r.a, area:r.b, summary:r.c}));
      const goals = readPipRows("goal").map(r=>r.a).filter(Boolean);
      const activities = readPipRows("act").filter(r=>r.b).map(r=>({g:r.a||"1", act:r.b, start:r.c||$("#pp-start").value, end:r.d||$("#pp-start").value}));
      const support = readPipRows("support").map(r=>r.a).filter(Boolean);
      if(!concerns.length) return fail("Add at least one area of concern.");
      if(!pre && basis==="three" && prior.length<2) return fail("Record at least two previous discussions as evidence of underperformance over 3 months, or choose the year-end “Poor” rating basis.");
      if(goals.length<1) return fail("Add at least one SMART improvement goal.");
      if(!activities.length) return fail("Add at least one activity to help reach the goals.");
      if(!support.length) return fail("Offer at least one resource or form of support.");
      const id = nextId("PIP-2026-", pips);
      pips.push({id, uid, mgr:state.staffUid, type:pre?"PIP 2":"PIP", basis:pre?"three":basis, from:pre?.from, prevReview:pre?.prevReview, start:$("#pp-start").value, months:pre?3:+$("#pp-months").value, concerns, prior, goals, activities, support, mgrComment:$("#pp-comment").value.trim(), reviews:[], status:"hr_review", trail:[T(today,"line","Submitted draft "+(pre?"PIP 2":"PIP"),null,emp(state.staffUid).name)]});
      clearDraft(pf.dataset.draft); state.pipNew=false; state.pipPrefill=null; state.pipReq=null; state.pipDone=id; render();
    });
  }
}

function makeCase(p, action, note){
  const today = iso(TODAY), mgrName = actor(p.mgr);
  const reasons = {caution:"Did not show the required improvement at the first monthly check-in of PIP 2 ("+p.id+").", final:"Did not show the required improvement at the second monthly check-in of PIP 2 ("+p.id+"), following a Cautionary Notice.", dismiss:"Did not reach the required performance level at the end of PIP 2 ("+p.id+") despite progressive discipline.", verbal:"Did not meet the requirements of the Performance Improvement Plan ("+p.id+") at the final review."};
  const c = {id:nextId("DA-2026-",cases), uid:p.uid, source:"pip", method:"pip", pipRef:p.id, clauses:["3.2(3)"], other:null, action, proposed:null, reason:reasons[action], extras:[], prelim:false, status:"ready", created:today, escBy:p.mgr,
    trail:[T(today,"line","Sent PIP evidence to Employee Relations",note,mgrName)]};
  if(action==="verbal") Object.assign(c,{suggestion:"Work through the PIP 2 goals with your line manager and use the coaching and resources listed in the plan. Raise any obstacles at the monthly check-ins.",proposed:"verbal",status:"recorded",decidedRole:"lead",decidedOn:today,trail:[T(today,"line","Issued verbal advice after PIP final review",note,mgrName),T(today,"system","Verbal advice recorded; appears in the employee's Disciplinary History")]});
  cases.push(c); return c;
}


/* ---------- Records register (every workspace and team) ---------- */
let REC = false;
state.rec = {q:"", mod:"all", st:"all", yr:"all"}; state.recSel = null;
const REC_MODS = {appeals:["PM Appeal","trend"], cases:["Disciplinary","file"], pips:["PIP","target"], voice:["EmployeeVoice","voice"], inv:["Investigation","search"], ta:["Records check","users"]};
const lastOn = l => l && l.length ? l[l.length-1].on : null;
function recRows(uid, scope){
  const role = WS[uid]?.role, R = [];
  const C = c => { const e=emp(c.uid); R.push({kind:"cases", id:c.id, on:c.created, upd:lastOn(c.trail)||c.created, who:e.name, uid:e.uid, unit:e.dept,
    what:(c.action?ACTIONS[c.action].label:c.method?METHODS[c.method]:"Staff concern")+(hasBreach(c)?" · "+clauseShort(c):""), st:STATUS[c.status][0], tone:STATUS[c.status][1], done:["issued","recorded","closed"].includes(c.status)}); };
  const P = p => { const e=emp(p.uid); R.push({kind:"pips", id:p.id, on:p.trail[0].on, upd:lastOn(p.trail)||p.trail[0].on, who:e.name, uid:e.uid, unit:e.dept,
    what:p.type+" · "+fmt(p.start)+" to "+fmt(pipEnd(p)), st:PIP_STATUS[p.status][0], tone:PIP_STATUS[p.status][1], done:["met","not_met"].includes(p.status)}); };
  const V = v => { const st = v.type==="chief" && scope!=="self" && chiefTodo(v) ? ["Awaiting the Chief's response","warn"] : vStatus(v); R.push({kind:"voice", id:v.id, on:v.on, upd:lastOn(v.thread)||v.on, who:v.anon?"Anonymous":emp(v.uid).name, uid:v.anon?"":v.uid, unit:v.anon?"":emp(v.uid).dept,
    what:vTitle(v)===VOICE[v.type].label?VOICE[v.type].label:VOICE[v.type].label+" · "+vTitle(v), st:st[0], tone:st[1], done:v.status==="closed"}); };
  const I = i => R.push({kind:"inv", id:i.id, on:i.on, upd:i.findingsOn||i.on, who:i.uid?emp(i.uid).name:"Not a specific person", uid:i.uid||"", unit:i.uid?emp(i.uid).dept:"",
    what:i.subject, st:INV_STATUS[i.status][0], tone:INV_STATUS[i.status][1], done:i.status==="done"});
  const A = r => { const s=taStatus(r); R.push({kind:"ta", id:r.id, on:r.on, upd:r.decidedOn||r.on, who:r.staff.length+" staff", uid:"", unit:"",
    what:r.ref, st:TA_STATUS[s][0], tone:TA_STATUS[s][1], done:s!=="pending"}); };
  const AP = a => { const e=emp(a.uid); R.push({kind:"appeals", id:a.id, on:a.on, upd:a.dec?.on||a.fwdOn||a.on, who:e.name, uid:e.uid, unit:e.dept, what:a.year+" · "+a.f.rating+(a.dec?" → "+(a.dec.outcome==="revised"?a.dec.rating:a.f.rating):" · expects "+a.f.expected), st:AP_STATUS[a.status][0], tone:AP_STATUS[a.status][1], done:a.status==="decided"}); };
  if(scope==="self"){
    cases.filter(c=>c.uid===uid && (c.sc?.issuedOn || (c.mins && c.status!=="min_lead" && c.mins.staffSign!==undefined) || ["prelim","issued","recorded"].includes(c.status))).forEach(c=>{ C(c); const r=R[R.length-1];
      const [st,tone] = c.status==="issued"?["Issued","bad"]:c.status==="recorded"?["Recorded","info"]:c.status==="prelim"?["Preliminary decision","warn"]:c.status==="closed"?["Closed, no action","ok"]:["In progress","info"];
      Object.assign(r,{st,tone,what:(c.action&&["prelim","issued","recorded"].includes(c.status)?ACTIONS[c.action].label:METHODS[c.method]||"Disciplinary proceeding")+(hasBreach(c)?" · "+clauseShort(c):"")}); });
    voice.filter(v=>vOwner(v)===uid).forEach(V); pips.filter(p=>p.uid===uid && !["hr_review","returned"].includes(p.status)).forEach(P); appeals.filter(a=>a.uid===uid).forEach(AP);
    return R.sort((a,b)=>a.upd<b.upd?1:a.upd>b.upd?-1:(a.id<b.id?1:-1)); }
  if(scope==="team"){ const team = reportsOf(uid).map(e=>e.uid); cases.filter(c=>team.includes(c.uid)).forEach(C); pips.filter(p=>p.mgr===uid).forEach(P); }
  else if(["lead","mgr","head","pcd"].includes(role)){ cases.forEach(C); pips.forEach(P); voice.forEach(V); invs.forEach(I); taRequests.forEach(A); appeals.forEach(AP); }
  else if(role==="dg") cases.filter(c=>route(c).role==="dg" && c.action).forEach(C);
  else if(role==="comp"){ invs.forEach(I); cases.filter(c=>c.escBy==="compliance").forEach(C); }
  else if(role==="ta") taRequests.forEach(A);
  else if(role==="chief") voice.filter(v=>v.type==="chief").forEach(V);
  return R.sort((a,b)=>a.upd<b.upd?1:a.upd>b.upd?-1:(a.id<b.id?1:-1));
}
const recScope = () => state.staffTab==="teamrec" ? "team" : state.staffTab==="myrec" ? "self" : "ws";
function recFiltered(){
  const f = state.rec, q = f.q.trim().toLowerCase();
  return recRows(state.staffUid, recScope()).filter(r=>(f.mod==="all"||r.kind===f.mod) && (f.st==="all"||(f.st==="open")!==r.done) && (f.yr==="all"||r.on.startsWith(f.yr))
    && (!q || [r.id,REC_MODS[r.kind][0],r.who,r.uid,r.what,r.unit,r.st].join(" ").toLowerCase().includes(q)));
}
function staffRecords(uid, scope){
  const rows = recRows(uid, scope);
  if(state.recSel){ const r = rows.find(x=>x.id===state.recSel); if(r) return recDetail(r, scope); state.recSel = null; }
  const f = state.rec, mods = Object.keys(REC_MODS).filter(k=>rows.some(r=>r.kind===k)), years = [...new Set(rows.map(r=>r.on.slice(0,4)))].sort().reverse();
  if(!mods.includes(f.mod)) f.mod = "all";
  const opt = (v,l,cur) => `<option value="${v}" ${cur===v?"selected":""}>${l}</option>`;
  const counts = mods.map(k=>[k, rows.filter(r=>r.kind===k).length]);
  return `<section class="recs">
    ${mods.length>1?`<div class="recchips" role="group" aria-label="Record type">${[["all","All",rows.length],...counts.map(([k,n])=>[k,REC_MODS[k][0],n])].map(([k,l,n])=>`<button type="button" class="recchip" data-recmod="${k}" aria-pressed="${f.mod===k}">${k==="all"?"":ic(REC_MODS[k][1],14)}${l}<span>${n}</span></button>`).join("")}</div>`:""}
    <div class="recbar">
      <label class="recq">${ic("search",16)}<input id="recq" type="search" placeholder="Search by name, UID, reference or status" value="${esc(f.q)}" aria-label="Search records"></label>
      <select id="recst" aria-label="Status">${opt("all","Any status",f.st)}${opt("open","Open",f.st)}${opt("closed","Closed",f.st)}</select>
      <select id="recyr" aria-label="Year">${opt("all","All years",f.yr)}${years.map(y=>opt(y,y,f.yr)).join("")}</select>
      <button type="button" class="btn sm" data-act="recexport">Export CSV</button>
    </div>
    <p class="recsum" id="recsum" aria-live="polite"></p>
    <div class="recwrap"><table class="rect ${scope==="self"?"self":""}"><thead><tr><th>Reference</th><th>Type</th><th>Employee</th><th>Details</th><th>Status</th><th>Opened</th><th>Last update</th></tr></thead><tbody id="recbody"></tbody></table></div>
  </section>`;
}
function paintRecords(){
  const b = $("#recbody"); if(!b) return;
  const rows = recFiltered();
  b.innerHTML = rows.length ? rows.map(r=>`<tr data-rec="${r.id}" tabindex="0" role="link" aria-label="Open ${r.id}">
      <td data-l="Reference" class="mono">${r.id}</td><td data-l="Type"><span class="rtype">${ic(REC_MODS[r.kind][1],14)}${REC_MODS[r.kind][0]}</span></td>
      <td data-l="Employee"><b>${esc(r.who)}</b>${r.uid?`<small>${r.uid}${r.unit?" · "+esc(r.unit):""}</small>`:""}</td><td data-l="Details">${esc(r.what)}</td>
      <td data-l="Status"><span class="pill t-${r.tone}">${esc(r.st)}</span></td><td data-l="Opened">${fmt(r.on)}</td><td data-l="Last update">${fmt(r.upd)}</td></tr>`).join("")
    : `<tr class="none"><td colspan="7">No records match these filters.</td></tr>`;
  const open = rows.filter(r=>!r.done).length;
  $("#recsum").textContent = `${rows.length} record${rows.length===1?"":"s"} · ${open} open · ${rows.length-open} closed`;
}
async function exportRecords(){
  const rows = recFiltered(), q = v => `"${String(v??"").replace(/"/g,'""')}"`;
  const csv = [["Reference","Type","Employee","UID","Department","Details","Status","Opened","Last update"].join(","),
    ...rows.map(r=>[r.id,REC_MODS[r.kind][0],r.who,r.uid,r.unit,r.what,r.st,r.on,r.upd].map(q).join(","))].join("\n");
  const dl = Platform.downloads /* was: window.claude.use("downloads"). See js/platform.js */;
  if(!dl){ toast("Export is not available in this view"); return; }
  try{ await dl.save({filename:"Records "+iso(TODAY)+".csv", data:csv}); toast("Records exported"); }
  catch(err){ if(err?.code!=="declined") toast("The file could not be saved here."); }
}
function teamCaseRec(c){
  const e = emp(c.uid), out = c.action && ["issued","recorded","prelim"].includes(c.status);
  return `<main class="panel pane"><div class="pane-head"><div><span class="eyebrow">${c.id} · opened ${fmt(c.created)}</span><h2>${esc(e.name)}</h2><div class="sub">${esc(e.designation)} · ${esc(e.dept)}</div></div>${pill(c.status)}</div>
    ${stepsHTML(c)}
    <dl class="facts"><div><dt>Record</dt><dd>${c.action?ACTIONS[c.action].label:c.method?METHODS[c.method]:"Staff concern"}</dd></div><div><dt>Source</dt><dd>${SOURCES[c.source]}</dd></div>
      ${out&&c.reason?`<div style="grid-column:1/-1"><dt>Reason</dt><dd>${esc(c.reason)}</dd></div>`:""}</dl>
    ${out?docWrap("Decision notice", noticeHTML(c), true):""}
    <span class="eyebrow">History</span>${trailHTML(c.trail)}</main>`;
}
function recDetail(r, scope){
  const save = {selected:state.selected, role:state.role}; let html = "";
  REC = true; state.selected = r.id;
  try{
    if(r.kind==="cases"){ const c = cases.find(x=>x.id===r.id); if(scope==="team") html = teamCaseRec(c); else { state.role = "lead"; html = renderCase(); } }
    else if(r.kind==="pips") html = renderPIPReview();
    else if(r.kind==="voice") html = `<main class="panel pane">${voiceReviewBody(voice.find(v=>v.id===r.id), "record")}</main>`;
    else if(r.kind==="inv") html = renderInvReview();
    else if(r.kind==="appeals") html = renderAppealReview();
    else html = renderTAReview();
  } finally { REC = false; Object.assign(state, save); }
  return `<div class="stack">${backBtn("Back to records")}<div class="recview"><p class="recro">${ic("archive",14)} Record view · read only</p>${html}</div></div>`;
}
function stripRec(){
  document.querySelectorAll(".recview .task, .recview .vreply, .recview form, .recview #ta-note, .recview .flag.f-block").forEach(n=>n.remove());
  document.querySelectorAll(".recview [data-act]").forEach(n=>{ if(!["pdf","copy"].includes(n.dataset.act)) n.remove(); });
  document.querySelectorAll(".recview .actions").forEach(n=>{ if(!n.children.length) n.remove(); });
}
/* ---------- Claude assist in the Employee Relations Workspace ----------
   Optional. Works only when the app runs through server.js with ANTHROPIC_API_KEY set.
   Without it the assist panels stay hidden and everything else works. */
let SAMPLE = null;
const AI = {ctl:null, act:null, text:"", data:null};
const AI_ROLES = ["lead","mgr","head","pcd"];
(async()=>{ try{ SAMPLE = await Platform.assist(); /* was: window.claude.use("sample"). Now calls /api/assist on server.js; null when no server or no API key */ }catch(e){ SAMPLE=null; } if(SAMPLE) document.querySelectorAll(".ai").forEach(n=>n.hidden=false); })();
const AI_GUIDE = () => `You are Claude, helping the Employee Relations (ER) team at ${BRAND.orgName} work through a case in their workspace. The person asking is the ${ROLES[state.role].full}.
Rules for everything you write:
- Plain, factual, fair and supportive British English. Short sentences.
- Say "People & Culture", never "HR". Outcomes are called Verbal Advice, Cautionary Notice, Final Warning Notice and Dismissal.
- Refer to people by role ("the employee", "the line manager"), never by name.
- Use only the facts given. Never invent dates, evidence or admissions. If something needed is missing, say what is missing.
- Do not mention templates, guides or "the Bank's template".
- You advise; the ER team decides.
Disciplinary Procedure essentials:
- 3.1 Serious/Gross Misconduct goes to the D&G Committee. 3.2 Other Misconduct is progressive: Verbal Advice (§5(1), line manager), Cautionary Notice (§5(2)), Final Warning Notice (§5(3)), Dismissal (§5(4)).
- Approval: below Head level, the Head of Total Rewards & Employee Relations; Head level and above (or ER staff), the People & Culture Director; serious cases and dismissal, the D&G Committee. The ER Lead proposes, the ER Manager reviews and recommends.
- The employee is questioned first, by a show cause notice (3 working days to reply) or a meeting with signed minutes.
- A preliminary decision (§4(8)) may be issued for a Final Warning or Dismissal, with 5 working days for the employee to respond.
- Additional actions (§6): withholding promotion, increment, bonus and credit facilities; recovery of financial loss.
- A Cautionary or Final Warning Notice stays on record for 12 months and affects promotion and increment eligibility in that period.
Clauses:
${Object.entries(CLAUSES).map(([k,v])=>k+" "+v).join("\n")}`;
const AI_TEXT = "Format: short paragraphs or '-' bullets, with a short bold heading line where helpful. No tables. Under 220 words.";
const who = uid => { const e=emp(uid); return e ? `${e.designation}, ${e.dept} (${RANKS[e.rank]} level, joined ${fmt(e.doj)})` : "Not specified"; };
function caseCtx(c){
  const L = [`CASE ${c.id}. Status: ${STATUS[c.status][0]}. Opened ${fmt(c.created)}. Source: ${SOURCES[c.source]}.`, `Employee: ${who(c.uid)}.`];
  if(c.esc) L.push(`Concern raised: ${c.esc.type}; when: ${c.esc.when}; discussed with employee: ${c.esc.discussed}. Details: ${c.esc.details}`);
  if(c.method) L.push("Questioning method: "+METHODS[c.method]+".");
  if(c.sc){ L.push("Show cause allegation: "+c.sc.allegation); c.sc.questions.forEach((q,i)=>L.push(`Q${i+1}: ${q}${c.sc.answers?.[i]?" | Reply: "+c.sc.answers[i]:""}`)); if(c.sc.noReply) L.push("No reply was received."); }
  if(c.mins){ L.push(`Meeting ${fmt(c.mins.date)} at ${c.mins.venue}.`); (c.mins.entries||[]).forEach((x,i)=>L.push(`Meeting Q${i+1}: ${x.q} | Answer: ${x.a}`)); if(c.mins.staffComment) L.push("Employee's correction to minutes: "+c.mins.staffComment); }
  if(hasBreach(c)) L.push("Clauses: "+clauseLines(c).join("; "));
  if(c.action) L.push("Current action: "+ACTIONS[c.action].label+(c.proposed&&c.proposed!==c.action?` (ER Lead proposed ${ACTIONS[c.proposed].label})`:"")+(c.prelim?", as a preliminary decision":"")+".");
  if(c.reason) L.push("Reason: "+c.reason);
  if(c.extras?.length) L.push("Additional actions: "+c.extras.map(k=>EXTRAS[k]).join("; "));
  if(c.staffResponse) L.push("Employee's response to the preliminary decision: "+c.staffResponse);
  if(c.dgMin) L.push("D&G Committee minutes: "+c.dgMin.decision+". "+c.dgMin.minutes);
  const r = route(c); if(r.why) L.push("Routing: "+(r.approver?r.approver+". ":"")+r.why);
  const prior = cases.filter(x=>x.uid===c.uid && x.id!==c.id && x.action && ["issued","recorded"].includes(x.status));
  L.push("Employee's prior record: "+(prior.length?prior.map(x=>`${ACTIONS[x.action].label} on ${fmt(x.decidedOn)} for ${clauseShort(x)}`).join("; "):"none on record")+".");
  L.push("History: "+c.trail.map(t=>`${fmt(t.on)} ${roleName(t)}: ${t.text}${t.quote?" ("+t.quote+")":""}`).join(" / "));
  return L.join("\n");
}
function voiceCtx(v){
  const f=v.f, L=[`${VOICE[v.type].label} ${v.id}, submitted ${fmt(v.on)}${v.anon?", anonymously":""}. Status: ${vStatus(v)[0]}.`];
  if(!v.anon) L.push("Submitted by: "+who(v.uid)+".");
  Object.entries(f).filter(([k,x])=>x && !["cname","cjob","cunit","sname","sdate","nic","addr","paddr","contact","anic","aaddr","apaddr","acontact","acontact2","aemail"].includes(k)).forEach(([k,x])=>L.push(k+": "+x));
  if(v.dec) L.push(`Proposed decision (${DEC_OUT[v.dec.outcome]}): ${v.dec.text}${v.dec.mgrNote?" | ER Manager: "+v.dec.mgrNote:""}`);
  (v.thread||[]).forEach(t=>L.push(`${fmt(t.on)} ${t.by==="pc"?"People & Culture":t.by==="staff"?"Employee":t.by}: ${t.text}`));
  return L.join("\n");
}
function pipCtx(p){
  return [`${p.type} ${p.id}. Status: ${PIP_STATUS[p.status][0]}. Starts ${fmt(p.start)} for ${p.months} months. Basis: ${p.basis}.`, "Employee: "+who(p.uid)+". Line manager: "+actor(p.mgr)+".",
    ...(p.concerns||[]).map(x=>`Concern: ${x.area}: ${x.issue}`), ...(p.prior||[]).map(x=>`Prior discussion ${fmt(x.date)}: ${x.area}: ${x.summary}`),
    ...p.goals.map((g,i)=>`Goal ${i+1}: ${g}`), ...(p.activities||[]).map(a=>`Support for goal ${a.g}: ${a.act} (${fmt(a.start)} to ${fmt(a.end)})`)].join("\n");
}
const invCtx = i => [`Investigation ${i.id}: ${i.subject}. Status ${INV_STATUS[i.status][0]}. Requested ${fmt(i.on)}, due ${fmt(i.due)}. Linked record: ${i.ref||"none"}.`, i.uid?"Employee: "+who(i.uid):"", "Scope: "+i.scope, i.findings?"Findings: "+i.findings+" | Recommendation: "+i.recommend:""].filter(Boolean).join("\n");
const setVal = (sel,v) => { const el=$(sel); if(el){ el.value=v; el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); } return !!el; };
const tickClauses = (p, list) => { document.querySelectorAll("."+p+"-ck").forEach(i=>{ i.checked = list.includes(i.value); }); };
const prevRows = rows => `<dl class="ai-prev">${rows.filter(r=>r[1]).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
const clauseNote = list => (list||[]).filter(k=>CLAUSES[k]).map(k=>k+" "+CLAUSES[k]).join("; ");
function aiContext(){
  const role = state.role; if(!AI_ROLES.includes(role) || state.staffTab!=="ws") return null;
  const M = mainEl(); if(!M) return null;
  const head = () => M.querySelector("main.pane .pane-head");
  if(state.mode==="new"){
    return {label:"this case", host:()=>M.querySelector("#caseForm"), where:"beforebegin",
      text:()=>{ const ec = state.fromEsc ? cases.find(x=>x.id===state.fromEsc) : null; const uid=$("#f-uid")?.value;
        return `NEW CASE being opened by the ER Lead.\nEmployee: ${who(uid)}.\n${ec?"Concern from the line manager: "+ec.esc.details+" (when: "+ec.esc.when+")":""}\nDraft allegation or notes typed so far: ${$("#sc-alleg")?.value||"(none)"}`; },
      acts:[{k:"scdraft", l:"Draft show cause notice", task:"Draft a show cause notice: a specific allegation (what, when, where, with dates if given; 2-4 sentences, addressed to the employee as 'you') and 3 to 5 fair, open questions. The first question must ask whether they admit or deny the allegation; the last must invite anything else they want considered. Also list the clause codes that appear to be breached.",
        json:'{"allegation": string, "questions": [string], "clauses": [clause code strings such as "3.2(1)"]}',
        preview:d=>prevRows([["Allegation",d.allegation],["Questions",(d.questions||[]).map((q,i)=>(i+1)+". "+q).join("\n")],["Suspected breach",clauseNote(d.clauses)]]),
        apply:d=>{ setVal("#sc-alleg", d.allegation||""); const box=$("#q-rows"); if(box && d.questions?.length) box.innerHTML = d.questions.map((q,i)=>`<div class="qrow"><span class="n">${i+1}.</span><input class="q-in" aria-label="Question ${i+1}" value="${esc(q)}"></div>`).join(""); tickClauses("fc", d.clauses||[]); $('input[name="f-method"][value="showcause"]')?.click(); }}]};
  }
  if(!curTab(role)){
    const mine = listItems(role).filter(x=>x.mine);
    return {label:"your workspace", host:()=>M.querySelector(".home"), where:"beforeend",
      text:()=>`The ${ROLES[role].full}'s items needing action today (${fmt(iso(TODAY))}):\n`+(mine.length?mine.map(x=>`${x.id} (${x.kind}) opened ${fmt(x.created)}: ${x.m}`).join("\n"):"none")+`\nOther open items: ${listItems(role).filter(x=>!x.done&&!x.mine).length}.`,
      acts:[{k:"brief", l:"Brief me on today", task:"Give a short briefing: what to do first and why (oldest and most time-sensitive first), then the rest grouped by type. One line per item, using the reference numbers."}]};
  }
  if(curTab(role)==="dash"){
    return {label:"the dashboard", host:head, where:"afterend",
      text:()=>"Employee Relations dashboard figures:\n"+(M.querySelector("main.pane")?.innerText||"").slice(0,6000),
      acts:[{k:"trends", l:"Explain the numbers", task:"Explain what stands out in these figures for the ER team: bottlenecks, ageing approvals, and anything to raise with management. Suggest two or three practical next steps."}]};
  }
  const id = state.selected; if(!id) return null;
  const c = cases.find(x=>x.id===id), v = voice.find(x=>x.id===id), p = pips.find(x=>x.id===id), i = invs.find(x=>x.id===id);
  if(c){
    const acts = [{k:"sum", l:"Summarise", task:"Summarise this case for someone picking it up: what is alleged, what the employee said, the evidence, where it is now and what happens next."},
      {k:"check", l:"Check against the procedure", task:"Check this case against the Disciplinary Procedure. Cover: are the clauses supported by the facts; is the action proportionate and consistent with progressive discipline and the prior record; is the routing right; is anything missing (evidence, signatures, the employee's side) before a decision. End with a one-line overall view."}];
    if(role==="lead" && ["sc_answered","ready","returned"].includes(c.status)) acts.push({k:"propose", l:"Suggest clauses, action and reason", primary:1,
      task:"Propose the clauses breached, the proportionate action (not Verbal Advice) and a 2-3 line factual reason that will appear on the notice as written. Consider the prior record and progressive discipline. Also give a one-line rationale for the ER team.",
      json:'{"clauses": [clause code strings], "action": "caution" | "final" | "dismiss", "reason": string, "why": string}',
      preview:d=>prevRows([["Clauses",clauseNote(d.clauses)],["Action",ACTIONS[d.action]?.label],["Reason",d.reason],["Why",d.why]]),
      apply:d=>{ tickClauses("pc", d.clauses||[]); if(ACTIONS[d.action]) setVal("#p-action", d.action); setVal("#p-reason", d.reason||""); livePropose(c); }});
    if(role==="lead" && c.status==="sc_returned") acts.push({k:"revise", l:"Revise with the manager's note", primary:1,
      task:"Revise the show cause allegation and questions to address the ER Manager's latest note in the history. Keep the same number of questions.",
      json:'{"allegation": string, "questions": [string]}', preview:d=>prevRows([["Allegation",d.allegation],["Questions",(d.questions||[]).map((q,i)=>(i+1)+". "+q).join("\n")]]),
      apply:d=>{ setVal("#rv-alleg", d.allegation||""); document.querySelectorAll(".rv-q").forEach((el,n)=>{ if(d.questions?.[n]) el.value=d.questions[n]; }); }});
    if(role==="mgr" && c.status==="sc_draft") acts.push({k:"sccheck", l:"Check the show cause notice", primary:1, target:"#sc-note",
      task:"Review the draft show cause notice: is the allegation specific (what, when, where), neutral and supported; are the questions fair and open? List any changes needed. If it is ready, say so in one line."});
    if(role==="mgr" && c.status==="review") acts.push({k:"rec", l:"Draft my recommendation", primary:1,
      task:"Draft the ER Manager's recommendation to the approver: the recommended action (may differ from the proposal if the facts support it) and a 2-3 sentence note covering facts confirmed, proportionality and prior record.",
      json:'{"action": "caution" | "final" | "dismiss", "note": string}', preview:d=>prevRows([["Action",ACTIONS[d.action]?.label],["Note",d.note]]),
      apply:d=>{ if(ACTIONS[d.action]) setVal("#m-action", d.action); setVal("#m-note", d.note||""); }});
    if(["head","pcd"].includes(role) && ["pending","prelim"].includes(c.status)) acts.push({k:"appr", l:"Draft approval comment", primary:1, target:"#a-note",
      task:"Draft a short approver comment (2-3 sentences): either confirming the action is supported and proportionate, or, if not, what the ER Manager should change. Write only the comment text."});
    return {label:"this case", host:()=>M.querySelector(".route"), where:"afterbegin", text:()=>caseCtx(c), acts};
  }
  if(v){
    const viewer = role==="lead"?"pc":role, d=v.dec, acts=[{k:"sum", l:"Summarise", task:"Summarise this submission: the issue, what has happened so far and what is needed next."}];
    if(viewer==="pc" && v.receivedBy && v.status!=="closed") acts.push({k:"reply", l:"Draft a reply", target:"#vr-"+v.id,
      task:"Draft a short, warm reply from People & Culture to the "+(v.anon?"anonymous submitter":"employee")+": acknowledge, say what happens next, invite any further detail. 3-4 sentences. Write only the reply text."});
    if(viewer==="pc" && FORMAL.includes(v.type) && v.receivedBy && (!d||d.stage==="lead") && v.status!=="closed") acts.push({k:"dec", l:"Draft a decision", primary:1,
      task:"Draft the proposed decision on this complaint: the outcome and the decision and actions to be taken (fair to both sides, specific actions with owners where possible, 3-5 sentences).",
      json:'{"outcome": "upheld" | "partly" | "not", "text": string}', preview:x=>prevRows([["Outcome",DEC_OUT[x.outcome]],["Decision",x.text]]),
      apply:x=>{ if(DEC_OUT[x.outcome]) setVal("#dec-out", x.outcome); setVal("#dec-text", x.text||""); }});
    if(role==="mgr" && d?.stage==="mgr") acts.push({k:"decnote", l:"Draft recommendation note", primary:1, target:"#dec-note", task:"Draft a 2-3 sentence ER Manager recommendation note on the proposed decision. Write only the note."});
    if(role==="pcd" && d?.stage==="pcd") acts.push({k:"deccheck", l:"Check the decision", primary:1, task:"Check the proposed decision is fair, proportionate and addresses every point raised. List any gaps."});
    return {label:"this submission", host:head, where:"afterend", text:()=>voiceCtx(v), acts};
  }
  if(p){
    const acts=[{k:"sum", l:"Summarise", task:"Summarise this plan: the performance gaps, the goals, the support and the timeline."}];
    if(role==="lead" && p.status==="hr_review") acts.push({k:"pipcheck", l:"Check this PIP", primary:1, target:"#hr-note",
      task:"Review the draft plan: are the goals specific, measurable and time-bound and linked to the concerns; is support offered for each goal; is prior evidence of the gap on record? Write feedback to the line manager in 3-5 sentences, saying clearly whether it can be approved."});
    return {label:"this PIP", host:head, where:"afterend", text:()=>pipCtx(p), acts};
  }
  const ap = appeals.find(x=>x.id===id);
  if(ap){ const acts=[{k:"sum", l:"Summarise", task:"Summarise this PM appeal: what is contested, the facts and evidence offered, and what the committee needs to decide."}];
    if(role==="lead" && ap.status==="submitted") acts.push({k:"apcheck", l:"Check it's ready for the committee", primary:1, task:"Check this appeal against the form instructions: are the contested KPIs or reasons identified, is a rating proposed, are facts given for each, and is evidence attached? List anything to ask the employee for, or say it is ready."});
    if(role==="mgr" && ap.status==="committee") acts.push({k:"apdec", l:"Draft the committee decision", primary:1,
      task:"Draft the Review Committee's decision as it will be shown to the employee: the outcome, the rating after appeal, and a fair 3-4 sentence explanation that responds to each point raised. Write in the committee's voice ('The Committee ...'). Base it only on the facts given; where the facts do not settle a point, say what the committee relied on.",
      json:'{"outcome": "upheld" | "revised", "rating": one of the rating scale values, "text": string}', preview:d=>prevRows([["Outcome",AP_OUT[d.outcome]],["Rating after appeal",d.outcome==="revised"?d.rating:ap.f.rating],["Decision",d.text]]),
      apply:d=>{ if(AP_OUT[d.outcome]) setVal("#ad-out", d.outcome); if(PM_RATINGS.includes(d.rating)) setVal("#ad-rating", d.rating); setVal("#ad-text", d.text||""); }});
    return {label:"this appeal", host:head, where:"afterend", text:()=>apCtx(ap), acts}; }
  if(i) return {label:"this investigation", host:head, where:"afterend", text:()=>invCtx(i),
    acts:[{k:"sum", l:"Summarise", task:"Summarise the investigation scope and, if available, the findings."},{k:"next", l:"Suggest next steps", task:"Suggest the ER team's next steps on this investigation, including whether a disciplinary case should be opened and on what clauses."}]};
  return null;
}
function aiPanel(ctx){
  return `<section class="ai" ${SAMPLE?"":"hidden"} aria-label="Claude">
    <div class="ai-head"><span class="ai-ic">${ic("spark",16)}</span><div><b>Claude</b><small>Drafts and checks for ${esc(ctx.label)}. Review before you use anything.</small></div></div>
    <div class="ai-chips">${ctx.acts.map(a=>`<button type="button" class="aichip ${a.primary?"pri":""}" data-ai-act="${a.k}">${esc(a.l)}</button>`).join("")}</div>
    <div class="ai-out" id="aiOut" hidden aria-live="polite"><div class="ai-text" id="aiText"></div>
      <div class="ai-foot"><button type="button" class="btn sm primary" data-ai-use hidden>Use this</button><button type="button" class="btn sm" data-ai-copy hidden>Copy</button><button type="button" class="btn sm" data-ai-stop hidden>Stop</button><span class="ai-note" id="aiNote"></span></div></div>
    <form class="ai-ask" id="aiAsk"><input id="aiQ" placeholder="Ask about ${esc(ctx.label)}…" aria-label="Ask Claude about ${esc(ctx.label)}"><button type="submit" class="btn sm">Ask</button></form>
  </section>`;
}
function mountAI(){
  AI.ctl?.abort(); AI.ctx=null;
  const ctx = aiContext(); if(!ctx) return;
  const host = ctx.host(); if(!host) return;
  host.insertAdjacentHTML(ctx.where, aiPanel(ctx)); AI.ctx = ctx;
}
const AI_ERR = {rate_limited:"Claude is busy for you right now. Try again in a moment.", session_expired:"Sign in to Claude again, then retry.", refused:"Claude couldn't help with that. Try rephrasing.", empty_completion:"No answer came back. Try asking for less.", invalid_json:"The draft came back in the wrong shape. Try again.", prompt_too_large:"This record is too long to send in one go."};
const aiMd = t => { const inl = s=>s.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>"); let h="", list=false;
  esc(t).split("\n").forEach(l=>{ const b=l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
    if(b){ if(!list){h+="<ul>";list=true;} h+="<li>"+inl(b[1])+"</li>"; return; }
    if(list){h+="</ul>";list=false;}
    if(/^#{1,4}\s/.test(l)) h+="<h4>"+inl(l.replace(/^#+\s/,""))+"</h4>"; else if(l.trim()) h+="<p>"+inl(l)+"</p>"; });
  return h+(list?"</ul>":""); };
async function aiRun(act, question){
  const ctx = AI.ctx; if(!SAMPLE || !ctx) return;
  AI.ctl?.abort(); const ctl = AI.ctl = new AbortController(); AI.act = act; AI.text=""; AI.data=null;
  const out=$("#aiOut"), txt=$("#aiText"), note=$("#aiNote"), use=$("[data-ai-use]"), copy=$("[data-ai-copy]"), stop=$("[data-ai-stop]");
  out.hidden=false; use.hidden=true; copy.hidden=true; stop.hidden=false; note.textContent="";
  txt.innerHTML = `<p class="ai-think">${question?"Thinking about your question…":"Thinking…"}</p>`;
  document.querySelectorAll(".aichip").forEach(b=>b.classList.toggle("on", !!act && b.dataset.aiAct===act.k));
  let prompt = AI_GUIDE()+"\n\nRECORD\n"+ctx.text()+"\n\nTASK\n"+(act?act.task:"Answer this question from the ER team, using the record above: "+question)+"\n\n"+(act?.json?"Reply with only JSON in this shape: "+act.json:AI_TEXT);
  EMPLOYEES.forEach(e=>{ if(!WS[e.uid]) prompt = prompt.split(e.name).join("the employee ("+e.uid+")"); });
  try{
    if(act?.json){
      const d = await SAMPLE.json(prompt, {signal:ctl.signal, onText:()=>{ txt.innerHTML='<p class="ai-think">Drafting…</p>'; }});
      if(ctl.signal.aborted) return;
      AI.data=d; txt.innerHTML = act.preview(d); use.hidden=false;
    } else {
      const r = await SAMPLE(prompt, {signal:ctl.signal, cache: question?false:undefined, onText:({text})=>{ txt.innerHTML = aiMd(text); }});
      AI.text=r.text; txt.innerHTML = aiMd(r.text); copy.hidden=false;
      if(act?.target && $(act.target)) use.hidden=false;
      if(r.truncated) note.textContent="Cut short. Ask for less at a time.";
    }
  }catch(e){
    if(e?.code==="cancelled"){ if(!e.text) out.hidden=true; }
    else if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(e?.code)){ SAMPLE=null; document.querySelectorAll(".ai").forEach(n=>n.hidden=true); toast("Claude isn't available in this view"); }
    else { if(e?.text && !act?.json) txt.innerHTML=aiMd(e.text); else txt.innerHTML=""; note.textContent = AI_ERR[e?.code] || "Something went wrong. Try again."; }
  } finally { if(AI.ctl===ctl){ stop.hidden=true; document.querySelectorAll(".aichip.on").forEach(b=>b.classList.remove("on")); } }
}
document.addEventListener("click", ev=>{
  const a = ev.target.closest("[data-ai-act]"); if(a){ const act = AI.ctx?.acts.find(x=>x.k===a.dataset.aiAct); if(act) aiRun(act); return; }
  if(ev.target.closest("[data-ai-stop]")){ AI.ctl?.abort(); return; }
  if(ev.target.closest("[data-ai-copy]")){ navigator.clipboard?.writeText(AI.text).then(()=>toast("Copied")).catch(()=>{}); return; }
  if(ev.target.closest("[data-ai-use]")){ const act=AI.act; if(!act) return;
    if(act.apply && AI.data) act.apply(AI.data); else if(act.target) setVal(act.target, AI.text.replace(/\*\*/g,"").trim());
    const f = act.target ? $(act.target) : document.querySelector("#propose, #screv, #caseForm, #dec-text, #m-note, #apdecForm");
    f?.scrollIntoView?.({block:"center", behavior:"smooth"}); toast("Added. Check it before you submit"); return; }
});
document.addEventListener("submit", ev=>{ if(ev.target.id==="aiAsk"){ ev.preventDefault(); const q=$("#aiQ").value.trim(); if(q) aiRun(null, q); } });

/* ---------- PM Appeals ---------- */
const PM_RATINGS = ["Excellent","Very Good","Good","Satisfactory","Poor"];
const AP_REASONS = {overall:"Overall Rating", kpi:"Specific KPI/Competency", discussion:"PM Discussion"};
const AP_STATUS = {submitted:["With Employee Relations","warn"], committee:["With Review Committee","info"], decided:["Decision issued","ok"]};
const AP_OUT = {upheld:"Original rating upheld", revised:"Rating revised"};
const apTitle = a => `${a.year} performance year`;
const apSteps = a => { const k=["submitted","committee","decided"], i=k.indexOf(a.status);
  return `<ol class="vsteps">${[["Submitted",fmt(a.on)],["With Review Committee",a.fwdOn?fmt(a.fwdOn):""],["Decision",a.dec?fmt(a.dec.on):""]].map(([l,d],n)=>`<li class="${n<i||a.status==="decided"?"done":n===i?"now":""}"><span class="vd">${n<i||a.status==="decided"?ic("check",14):n+1}</span><span>${l}${d?`<small class="apd">${d}</small>`:""}</span></li>`).join("")}</ol>`; };
function apDecisionHTML(a){
  if(!a.dec) return "";
  const d=a.dec;
  return `<section class="apdec"><div class="apdec-h"><span class="ai-ic">${ic("scale",16)}</span><div><b>Review Panel Decision</b><small>Decision by Review Committee · ${fmt(d.on)}${d.ref?" · "+esc(d.ref):""}</small></div><span class="pill t-${d.outcome==="revised"?"ok":"info"}">${AP_OUT[d.outcome]}</span></div>
    <dl class="apgrid"><div><dt>Rating received</dt><dd>${esc(a.f.rating)}</dd></div><div><dt>Rating after appeal</dt><dd><b>${esc(d.outcome==="revised"?d.rating:a.f.rating)}</b></dd></div></dl>
    <p>${esc(d.text)}</p></section>`;
}
function apFormDoc(a){
  const e=emp(a.uid), f=a.f, t = rows => `<table><tbody>${rows.map(([k,v])=>`<tr><th scope="row">${k}</th><td>${esc(v||"—").replace(/\n/g,"<br>")}</td></tr>`).join("")}</tbody></table>`;
  return `<div class="doc">${letterhead(a.id, fmt(a.on)+" "+(a.at||""), "People &amp; Culture · Employee Relations")}<h4>PM Appeal Form · ${a.year}</h4>
    <p style="margin:14px 0 0"><strong>Appeal Information</strong></p>
    ${t([["UID",e.uid],["Name",e.name],["Division",e.division],["Department/Unit",e.department+" / "+e.unit],["Appraiser",f.appraiser],["PM rating received",f.rating],
      ["Reasons for appeal",[...f.reasons.filter(r=>AP_REASONS[r]).map(r=>AP_REASONS[r]),...(f.reasons.includes("other")?["Other: "+f.other]:[])].join(", ")],["Expected Rating",f.expected],["Justification",f.justification],["Additional Documents",f.docs]])}
    <p class="foot">Submitted electronically by the employee on ${fmt(a.on)}.</p></div>`;
}
function staffAppeal(uid){
  const e=emp(uid), mine=appeals.filter(a=>a.uid===uid).sort((a,b)=>a.year<b.year?1:-1), w=appealWin;
  const already = mine.find(a=>a.year===w.year);
  if(state.apDone){ const a=appeals.find(x=>x.id===state.apDone);
    return doneCard("Appeal submitted", `Your appeal for the ${a.year} performance year is with Employee Relations. You'll see the Review Committee's decision here.`, a.id, `<button class="btn primary" data-apsel="${a.id}">View appeal</button><button class="btn" data-act="apdoneback">Back to PM Appeals</button>`); }
  const sel = mine.find(a=>a.id===state.apSel);
  if(sel){ if(sel.status==="decided") sel.seen=true;
    return `<div class="stack">${backBtn("Back to PM Appeals")}
      <div class="actions" style="justify-content:flex-end">${docPdfBtn("appeal",sel.id)}</div><div class="proc-head"><span class="eyebrow">${sel.id}</span><h3>PM appeal · ${apTitle(sel)}</h3><div class="apmeta">${pillOf(AP_STATUS,sel.status)}<span class="note">Rating received: ${esc(sel.f.rating)} · Expected: ${esc(sel.f.expected)}</span></div></div>
      ${apSteps(sel)}
      ${sel.dec?apDecisionHTML(sel):`<p class="flag f-info"><strong>${sel.status==="committee"?"With the Review Committee":"Received by Employee Relations"}</strong><span>${sel.status==="committee"?"The Review Committee is considering your appeal. The decision will appear here.":"Employee Relations is checking your appeal before it goes to the Review Committee."}</span></p>`}
      <details class="docdet"><summary>View your appeal form</summary>${apFormDoc(sel)}</details></div>`; }
  if(state.apNew && w.open && !already){
    const fld=(id,label,o={})=>`<label class="f" for="ap-${id}">${label}${o.req?' <span class="req">*</span>':""}${o.h?` <span class="h">${o.h}</span>`:""}${o.area?`<textarea id="ap-${id}" ${o.req?"data-req":""} style="min-height:120px"></textarea>`:o.sel?`<select id="ap-${id}" ${o.req?"data-req":""}><option value="">Select your answer</option>${o.sel.map(x=>`<option>${x}</option>`).join("")}</select>`:`<input id="ap-${id}" value="${esc(o.v||"")}" ${o.req?"data-req":""} ${o.ro?"readonly":""}>`}</label>`;
    return `<div class="stack">${backBtn("Back to PM Appeals")}
      <form class="form ess-card" id="apForm" data-steps data-draft="appeal:${uid}:${w.year}" novalidate>
        <div class="wstep" data-title="Instructions"><h3 style="font-size:16px">PM Appeal Form · ${w.year} performance year</h3>
          <ol class="apins"><li>Identify the specific reasons or KPI(s) you are contesting on your PM plan.</li><li>Propose the rating you believe is right for each of the KPI(s).</li><li>Provide facts to support your appeal for each of the KPI(s).</li><li>Attach supporting evidence for each of the KPI(s).</li><li>If you are contesting for the overall rating, explain the reason why you believe your performance rating should be changed.</li></ol>
          <p class="note" style="margin:0">Appeals close on ${fmt(w.closes)}. Employee Relations will see your name and UID.</p></div>
        <div class="wstep" data-title="Appeal Information"><fieldset><legend>Appeal Information</legend>
          <div class="row">${fld("uid","UID",{v:e.uid,ro:1})}${fld("name","Name",{v:e.name,ro:1})}</div>
          <div class="row">${fld("div","Division",{v:e.division,ro:1})}${fld("dept","Department/Unit",{v:e.department+" / "+e.unit,ro:1})}</div>
          <div class="row">${fld("appraiser","Appraiser",{req:1,v:managerName(e)})}${fld("rating","PM rating received",{req:1,sel:PM_RATINGS})}</div></fieldset></div>
        <div class="wstep" data-title="Your appeal">
          <div class="f" style="display:block">Reasons for appeal <span class="req">*</span></div>
          <div class="checks" id="ap-reasons">${Object.entries(AP_REASONS).map(([k,l])=>`<label><input type="checkbox" class="ap-r" value="${k}"> ${l}</label>`).join("")}<label><input type="checkbox" class="ap-r" value="other" id="ap-oth"> Other</label></div>
          <label class="f" for="ap-other" id="ap-othbox" hidden>Other reason<input id="ap-other"></label>
          ${fld("expected","Expected Rating",{req:1,sel:PM_RATINGS})}
          ${fld("justification","Justification",{req:1,area:1,h:"Facts for each KPI you are contesting"})}
          <label class="f" for="ap-docs">Additional Documents <span class="h">Up to 5 files: Word, Excel, PPT, PDF, image, video or audio</span><input id="ap-docs" type="file" multiple accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,image/*,video/*,audio/*"></label></div>
        <div class="wstep" data-title="Review" data-review="1"><p class="flag f-block" id="ap-err" hidden></p><div class="actions"><button class="btn primary" type="submit">Submit</button></div></div>
      </form></div>`; }
  state.apNew=false;
  const banner = w.open
    ? `<section class="apwin open"><span class="ai-ic">${ic("trend",16)}</span><div><b>Appeals for the ${w.year} performance year are open</b><small>Submit by ${fmt(w.closes)}.</small></div>${already?`<span class="pill t-${AP_STATUS[already.status][1]}">You've appealed: ${AP_STATUS[already.status][0]}</span>`:`<button class="btn primary" data-act="apnew">Submit an appeal</button>`}</section>`
    : `<section class="apwin"><span class="ai-ic">${ic("clock",16)}</span><div><b>Appeals are closed</b><small>Employee Relations opens PM appeals each year after results are shared. You can still view your previous appeals below.</small></div></section>`;
  const row = a => `<li><button type="button" class="prow" data-apsel="${a.id}"><span class="pic ${a.status==="decided"?"done":"todo"}">${ic("trend",16)}</span><span class="pmain"><b>${apTitle(a)}${a.status==="decided"&&!a.seen?' <span class="ess-cnt">Decision</span>':""}</b><small>${a.id} · ${esc(a.f.rating)}${a.dec?" → "+esc(a.dec.outcome==="revised"?a.dec.rating:a.f.rating):""} · submitted ${fmt(a.on)}</small></span>${pillOf(AP_STATUS,a.status)}<span class="chev">${ic("chev",16)}</span></button></li>`;
  return `<div class="stack">${banner}<h3 class="sech">Your appeals</h3>${mine.length?`<ul class="plist">${mine.map(row).join("")}</ul>`:`<div class="empty">No appeals yet.</div>`}</div>`;
}
function apWindowCard(role){
  const w=appealWin;
  if(role!=="lead") return `<p class="flag f-${w.open?"ok":"info"}"><strong>${w.open?"Appeals open":"Appeals closed"}</strong><span>${w.open?`${w.year} performance year · closes ${fmt(w.closes)}`:"Opened by the ER Lead each year."}</span></p>`;
  return w.open
    ? `<section class="apwin open"><span class="ai-ic">${ic("trend",16)}</span><div><b>${w.year} appeals are open</b><small>Opened ${fmt(w.openedOn)} · closes ${fmt(w.closes)} · ${appeals.filter(a=>a.year===w.year).length} received</small></div><button class="btn" data-act="apclose">Close appeals</button></section>`
    : `<section class="apwin"><span class="ai-ic">${ic("clock",16)}</span><div><b>Appeals are closed</b><small>Open them when PM results are shared. Staff can submit one appeal for the year.</small></div>
        <div class="apopen"><label class="f" for="apw-year">Performance year<input id="apw-year" type="number" value="${w.year}" style="width:110px"></label><label class="f" for="apw-close">Closes on<input id="apw-close" type="date" value="${iso(addWorkdays(TODAY,10))}"></label><button class="btn primary" data-act="apopen">Open appeals</button></div></section>`;
}
function renderAppealReview(){
  const a=appeals.find(x=>x.id===state.selected), e=emp(a.uid), role=state.role;
  let task="";
  if(role==="lead" && a.status==="submitted") task = `<div class="task"><h3>Check and send to the Review Committee</h3><p class="note" style="margin:0">Check the form is complete and the evidence is attached. The ER Manager records the committee's decision.</p><div class="actions"><button class="btn primary" data-act="apfwd">Send to Review Committee</button></div></div>`;
  if(role==="mgr" && a.status==="committee") task = `<div class="task" id="apdecForm"><h3>Record the Review Committee decision</h3><p class="note" style="margin:0">Recorded on behalf of the committee. The employee sees it as the Review Panel Decision.</p>
    <div class="row"><label class="f" for="ad-out">Outcome<select id="ad-out">${Object.entries(AP_OUT).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></label><label class="f" for="ad-rating" id="ad-ratingbox" hidden>Revised rating<select id="ad-rating">${PM_RATINGS.map(r=>`<option ${r===a.f.expected?"selected":""}>${r}</option>`).join("")}</select></label></div>
    <div class="row"><label class="f" for="ad-date">Committee meeting date<input type="date" id="ad-date" value="${iso(TODAY)}"></label><label class="f" for="ad-ref">Meeting reference<input id="ad-ref" placeholder="e.g. Review Committee 11/2026"></label></div>
    <label class="f" for="ad-text">Decision <span class="req">*</span><textarea id="ad-text" style="min-height:110px"></textarea></label>
    <p class="flag f-block" id="ad-err" hidden>Write the committee's decision.</p>
    <div class="actions"><button class="btn primary" data-act="apdecide">Record decision</button></div></div>`;
  if(!task && a.status!=="decided") task = `<div class="task passive"><h3>${a.status==="submitted"?"With the ER Lead":"With the Review Committee"}</h3><p class="note" style="margin:0">${a.status==="submitted"?"Being checked before it goes to the committee.":"The ER Manager records the decision on behalf of the committee."}</p></div>`;
  return `<main class="panel pane"><div class="pane-head"><div><span class="eyebrow">${a.id} · ${a.year} performance year · ${fmt(a.on)}</span><h2>${esc(e.name)}</h2><div class="sub">${esc(e.designation)} · ${esc(e.dept)}</div></div>${pillOf(AP_STATUS,a.status)}</div>
    ${apSteps(a)}${task}${apDecisionHTML(a)}
    <dl class="apgrid"><div><dt>Rating received</dt><dd>${esc(a.f.rating)}</dd></div><div><dt>Expected rating</dt><dd>${esc(a.f.expected)}</dd></div><div><dt>Appraiser</dt><dd>${esc(a.f.appraiser)}</dd></div><div><dt>Reasons</dt><dd>${[...a.f.reasons.filter(r=>AP_REASONS[r]).map(r=>AP_REASONS[r]),...(a.f.reasons.includes("other")?["Other: "+a.f.other]:[])].map(esc).join(", ")}</dd></div></dl>
    <section class="allegation"><span class="eyebrow">Justification</span><p>${esc(a.f.justification)}</p>${a.f.docs?`<span class="note">Documents: ${esc(a.f.docs)}</span>`:""}</section>
    <details class="docdet"><summary>View the appeal form</summary>${apFormDoc(a)}</details>
    <span class="eyebrow">Employee's previous appeals</span>${(()=>{const prev=appeals.filter(x=>x.uid===a.uid&&x.id!==a.id);return prev.length?`<ul class="trail">${prev.map(x=>`<li><span class="d">${x.year}</span><span>${esc(x.f.rating)} → ${x.dec?esc(AP_OUT[x.dec.outcome]+(x.dec.outcome==="revised"?": "+x.dec.rating:"")):AP_STATUS[x.status][0]}</span></li>`).join("")}</ul>`:`<p class="note" style="margin:0">None.</p>`})()}
  </main>`;
}
const apCtx = a => [`PM APPEAL ${a.id} for the ${a.year} performance year. Status: ${AP_STATUS[a.status][0]}. Submitted ${fmt(a.on)}.`, "Employee: "+who(a.uid)+". Appraiser: "+a.f.appraiser+".",
  "Rating received: "+a.f.rating+". Expected rating: "+a.f.expected+". Rating scale, highest first: "+PM_RATINGS.join(", ")+".",
  "Reasons: "+[...a.f.reasons.filter(r=>AP_REASONS[r]).map(r=>AP_REASONS[r]),...(a.f.reasons.includes("other")?["Other: "+a.f.other]:[])].join(", "),
  "Justification: "+a.f.justification, "Documents attached: "+(a.f.docs||"none"),
  ...appeals.filter(x=>x.uid===a.uid&&x.id!==a.id).map(x=>`Previous appeal ${x.year}: ${x.f.rating}, ${x.dec?AP_OUT[x.dec.outcome]:AP_STATUS[x.status][0]}`)].join("\n");


/* ---------- PDF export of any staff record (submission, appeal, PIP, proceeding, notice) ---------- */
const docPdfBtn = (kind,id) => `<button class="btn sm" type="button" data-act="docpdf" data-kind="${kind}" data-id="${id}">${ic("file",14)} Export PDF</button>`;
function docSourceHTML(kind, id){
  if(kind==="voice"){ const v=voice.find(x=>x.id===id); const th=[{on:v.on,at:v.at,by:"system",text:"Submitted"},...(v.thread||[])];
    return [v.id+" "+VOICE[v.type].label, voiceDocHTML(v)+`<div class="doc"><p><strong>Updates and responses</strong></p><table><tbody>${th.map(t=>`<tr><th scope="row">${fmt(t.on)} ${t.at||""}</th><td>${esc((t.by==="staff"?"You: ":t.by==="system"?"":reviewerName(v)+": ")+t.text)}</td></tr>`).join("")}${v.outcome?`<tr><th scope="row">Outcome</th><td>${esc(v.outcome)}</td></tr>`:""}</tbody></table></div>`]; }
  if(kind==="appeal"){ const a=appeals.find(x=>x.id===id); return [a.id+" PM Appeal", apFormDoc(a)+(a.dec?`<div class="doc"><p><strong>Review Panel Decision</strong></p><table><tbody><tr><th scope="row">Decision by</th><td>Review Committee · ${fmt(a.dec.on)}${a.dec.ref?" · "+esc(a.dec.ref):""}</td></tr><tr><th scope="row">Outcome</th><td>${AP_OUT[a.dec.outcome]}</td></tr><tr><th scope="row">Rating after appeal</th><td>${esc(a.dec.outcome==="revised"?a.dec.rating:a.f.rating)}</td></tr><tr><th scope="row">Decision</th><td>${esc(a.dec.text)}</td></tr></tbody></table></div>`:`<div class="doc"><p><strong>Status</strong></p><p>${AP_STATUS[a.status][0]}</p></div>`)]; }
  if(kind==="pip"){ const p=pips.find(x=>x.id===id); return [p.id+" "+p.type, pipHTML(p)]; }
  if(kind==="proc"){ const c=cases.find(x=>x.id===id); return [c.id+" "+(c.method==="showcause"?"Show cause notice":"Meeting minutes"), c.method==="showcause"?showCauseHTML(c):minutesHTML(c)]; }
  if(kind==="notice"){ const c=cases.find(x=>x.id===id); return [c.id+" "+ACTIONS[c.action].label, noticeHTML(c)]; }
  if(kind==="history"){ const uid=state.staffUid, verbal=id==="verbal", p=priorActions(uid,null).filter(x=>(x.action==="verbal")===verbal).reverse();
    return [(verbal?"Verbal Advice":"Disciplinary Actions")+" "+emp(uid).uid, `<div class="doc">${letterhead(emp(uid).uid, fmt(iso(TODAY)), "People &amp; Culture · Employee Relations")}<h4>${verbal?"Verbal Advice record":"Disciplinary actions record"}</h4><table><tbody>${p.length?p.map(x=>`<tr><th scope="row">${fmt(x.decidedOn)} · ${x.id}</th><td>${esc(ACTIONS[x.action].label+(hasBreach(x)?" · "+clauseShort(x):"")+" · "+x.reason)}</td></tr>`).join(""):`<tr><th scope="row">Record</th><td>None</td></tr>`}</tbody></table></div>`]; }
  return null;
}
const pdfTxt = t => String(t||"").replace(/→/g,"to").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,"-").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,"").replace(/\s+/g," ").trim();
function htmlToPDF(html){
  const {jsPDF} = window.jspdf; const doc = new jsPDF({unit:"pt",format:"a4"});
  const W=595.28, H=841.89, M=48, LW=160; let y=56;
  const need = h => { if(y+h > H-56){ doc.addPage(); y=56; } };
  const para = (t,{size=10,bold=false,color=[29,26,26],gap=6}={}) => { t=pdfTxt(t); if(!t) return; doc.setFont("helvetica",bold?"bold":"normal"); doc.setFontSize(size); doc.setTextColor(...color);
    doc.splitTextToSize(t, W-2*M).forEach(l=>{ need(size*1.4); doc.text(l, M, y+size); y+=size*1.4; }); y+=gap; };
  const kv = (k,v) => { doc.setFontSize(9.5); const kl=doc.splitTextToSize(pdfTxt(k)||" ", LW-14), vl=doc.splitTextToSize(pdfTxt(v)||"-", W-2*M-LW-14); const h=Math.max(kl.length,vl.length)*12.5+10; need(h);
    doc.setDrawColor(224,219,218); doc.setLineWidth(.6); doc.setFillColor(246,245,244); doc.rect(M,y,LW,h,"FD"); doc.rect(M+LW,y,W-2*M-LW,h,"S");
    doc.setFont("helvetica","bold"); doc.setTextColor(29,26,26); doc.text(kl, M+7, y+15); doc.setFont("helvetica","normal"); doc.text(vl, M+LW+7, y+15); y+=h; };
  const box = document.createElement("div"); box.innerHTML = html;
  let first = true;
  const walk = el => { for(const n of el.children){
    const tag=n.tagName, cls=n.classList;
    if(cls.contains("lh")){ if(first){ doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(184,20,31); doc.text(BRAND.legalName,M,y);
        const unit=pdfTxt(n.querySelector(":scope > div > div")?.textContent), ref=(n.querySelector(".ref")?.innerHTML||"").split(/<br\s*\/?>/i).map(x=>pdfTxt(x.replace(/<[^>]+>/g,""))).filter(Boolean);
        doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(107,99,98); doc.text(unit, M, y+14); if(ref.length) doc.text(ref, W-M, y-4, {align:"right"});
        doc.setDrawColor(184,20,31); doc.setLineWidth(2); doc.line(M,y+28,W-M,y+28); y+=48; first=false; } continue; }
    if(tag==="H4"||tag==="H3"){ para(n.textContent,{size:13,bold:true,gap:8}); continue; }
    if(tag==="TABLE"){ const heads=[...n.querySelectorAll("thead th")].map(h=>pdfTxt(h.textContent));
      n.querySelectorAll("tbody tr").forEach(tr=>{ const th=tr.querySelector("th"), tds=[...tr.querySelectorAll("td")];
        if(th && tds.length===1) kv(th.textContent, tds[0].innerText||tds[0].textContent);
        else if(heads.length) kv(pdfTxt(tds[0]?.textContent), tds.slice(1).map((d,i)=>(heads[i+1]?heads[i+1]+": ":"")+pdfTxt(d.textContent)).join("  |  "));
        else kv(pdfTxt(tds[0]?.textContent||th?.textContent), tds.slice(th?0:1).map(d=>pdfTxt(d.textContent)).join("  |  ")); }); y+=8; continue; }
    if(cls.contains("sigs")){ n.querySelectorAll(".sig").forEach(sg=>kv([...sg.children][0]?.textContent, [...sg.children].slice(1).map(c=>pdfTxt(c.textContent)).join(" · "))); y+=8; continue; }
    if(tag==="OL"||tag==="UL"){ [...n.children].forEach((li,i)=>para((tag==="OL"?(i+1)+". ":"- ")+li.textContent,{gap:2})); y+=4; continue; }
    if(tag==="P"){ const strong=n.children.length===1 && n.firstElementChild.tagName==="STRONG" && pdfTxt(n.textContent)===pdfTxt(n.firstElementChild.textContent);
      para(n.textContent, strong?{bold:true,size:11,gap:4}:{color:cls.contains("foot")?[107,99,98]:[29,26,26]}); continue; }
    if(n.children.length) walk(n); else para(n.textContent);
  } };
  walk(box);
  const pages = doc.getNumberOfPages(); for(let i=1;i<=pages;i++){ doc.setPage(i); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(149,141,140); doc.text("Exported from the ESS Portal on "+fmt(iso(TODAY))+" · Page "+i+" of "+pages, M, H-28); }
  return doc.output("blob");
}
async function exportDocPDF(kind, id){
  if(!window.jspdf){ toast("PDF export could not load. Check your connection and try again."); return; }
  const src = docSourceHTML(kind, id); if(!src) return;
  const dl = Platform.downloads /* was: window.claude.use("downloads"). See js/platform.js */;
  if(!dl){ toast("PDF export is not available in this view"); return; }
  try{ await dl.save({filename: src[0]+".pdf", data: htmlToPDF(src[1])}); toast("PDF saved"); }
  catch(err){ if(err?.code!=="declined") toast(err?.code==="rate_limited"?"A save is already open. Try again in a moment.":"The PDF could not be saved here."); }
}


/* ---------- Year-end ratings: ER Lead asks line managers to start PIPs ---------- */
const reqPip = r => pips.find(p=>p.uid===r.uid && (p.trail[0]?.on||"")>=r.on);
const reqStatus = r => { const p=reqPip(r); return p ? [PIP_STATUS[p.status][0],PIP_STATUS[p.status][1]] : D(r.due)<TODAY ? ["Overdue: no PIP drafted","bad"] : ["Waiting for line manager · due "+fmt(r.due),"warn"]; };
const openPip = uid => pips.find(p=>p.uid===uid && !["met","not_met"].includes(p.status));
function pipReqCard(){
  const R = PM_RESULTS, poor = Object.entries(R.ratings).filter(([,r])=>r==="Poor").map(([u])=>emp(u)).filter(Boolean);
  const row = e => { const req = pipReqs.find(r=>r.uid===e.uid && r.year===R.year), op = openPip(e.uid), mu = e.managerUid;
    const st = req ? `<span class="pill t-${reqStatus(req)[1]}">${reqStatus(req)[0]}</span>` : op ? `<span class="pill t-info">PIP already open (${op.id})</span>` : !mu ? `<span class="pill t-warn">Line manager not set up in ESS</span>` : `<span class="note">Not sent</span>`;
    const ck = !req && !op && mu ? `<input type="checkbox" class="prq-ck" value="${e.uid}" checked aria-label="Select ${esc(e.name)}">` : "";
    return `<tr><td>${ck}</td><td><b>${esc(e.name)}</b><small>${e.uid} · ${esc(e.designation)}</small></td><td>${R.ratings[e.uid]}</td><td>${esc(managerName(e))}</td><td>${st}</td></tr>`; };
  const can = poor.some(e=>!pipReqs.find(r=>r.uid===e.uid&&r.year===R.year) && !openPip(e.uid) && e.managerUid);
  return `<section class="ess-card prq"><div><h3>Year-end ratings: start PIPs</h3><p class="note" style="margin:2px 0 0">${R.year} PM results, shared ${fmt(R.sharedOn)}. Staff rated Poor. Send a request to their line managers to start the PIP process.</p></div>
    <div class="scroll"><table class="tat"><thead><tr><th></th><th>Staff</th><th>Rating</th><th>Line manager</th><th>Status</th></tr></thead><tbody>${poor.map(row).join("")}</tbody></table></div>
    ${can?`<div class="actions" style="align-items:flex-end"><label class="f" for="prq-due" style="max-width:220px;margin:0">Draft PIP by<input type="date" id="prq-due" value="${iso(addWorkdays(TODAY,10))}"></label><button class="btn primary" data-act="pipreqsend">Send to line managers</button></div>`:""}</section>`;
}
function pipReqTasks(uid){
  const mine = pipReqs.filter(r=>r.mgr===uid && !reqPip(r)); if(!mine.length) return "";
  return `<section class="task"><h3>Employee Relations asked you to start a PIP</h3><p class="note" style="margin:0">These team members were rated Poor at the year-end review. Draft a PIP with clear goals and support, then send it to the ER Lead.</p>
    <ul class="plist">${mine.map(r=>{const e=emp(r.uid);return `<li><div class="prow" style="cursor:default"><span class="pic todo">${ic("target",16)}</span><span class="pmain"><b>${esc(e.name)}</b><small>${r.year} year-end rating: ${PM_RESULTS.ratings[r.uid]||"Poor"} · draft by ${fmt(r.due)}</small></span><button class="btn primary sm" data-act="pipfromreq" data-uid="${r.uid}">Start PIP</button></div></li>`}).join("")}</ul></section>`;
}

function pickDefault(){ state.selected = null; }

function render(){ renderCore(); mountAI(); Platform.save(); /* persist to localStorage after every change (replaces in-memory only state) */ }
function renderCore(){
  if(state.role!=="staff" && !(WS[state.staffUid] && WS[state.staffUid].role===state.role)) state.role="staff";
  renderRoles();
  renderStaff();
  if(state.role==="staff"){ bindStaffForms(); return; }
  if(state.role==="ta"){ renderTA(); return; }
  if(state.role==="chief"){ renderChief(); return; }
  if(state.role==="comp"){ renderCompliance(); bindCompliance(); return; }
  const role = state.role;
  if(state.mode==="new"){ state.tabs.lead="cases"; mainEl().innerHTML = `<div class="wl-wrap">${crumbs(role,"Open a case")}${renderForm()}</div>`; bindForm(); return; }
  if(role==="lead" && curTab("lead")==="inv" && state.invNew){ mainEl().innerHTML = `<div class="wl-wrap">${crumbs(role,"New request")}${renderInvForm()}</div>`; bindInvForm(); return; }
  if(!curTab(role)){ mainEl().innerHTML = renderHome(role); return; }
  if(curTab(role)==="dash"){ mainEl().innerHTML = `<div class="wl-wrap">${crumbs(role)}${renderDashboard()}</div>`; return; }
  if(state.selected && !itemsFor(role).some(x=>x.id===state.selected)) state.selected=null;
  if(!state.selected){ mainEl().innerHTML = renderList(); return; }
  const id = state.selected;
  const pane = invs.some(i=>i.id===id) ? renderInvReview() : voice.some(v=>v.id===id) ? renderVoiceReview() : id.startsWith("PMA-") ? renderAppealReview() : id.startsWith("TA-") ? renderTAReview() : id.startsWith("PIP-") ? renderPIPReview() : renderCase();
  mainEl().innerHTML = `<div class="wl-wrap">${crumbs(role, id)}${pane}</div>`;
  const c = cases.find(x=>x.id===id); if(c) livePropose(c);
}

document.addEventListener("input", ev=>{ if(ev.target.id==="recq"){ state.rec.q = ev.target.value; paintRecords(); } });
document.addEventListener("keydown", ev=>{ const r = ev.target.closest && ev.target.closest("tr[data-rec]"); if(r && (ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); r.click(); } });
function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }

document.addEventListener("change", ev=>{
  if(ev.target.id==="userSel"){
    const uid = ev.target.value.split(":")[1], ws = WS[uid];
    Object.assign(state,{staffUid:uid, mode:"view", fromEsc:null, procKind:null, procSel:null, pipNew:false, pipPrefill:null, viewNotice:null, taNew:false, taSel:null, voiceSel:null, voiceDone:null, voiceCodeOk:null, chiefSel:null, compSel:null, selected:null, myPipSel:null, voiceTab:null, recSel:null, rec:{q:"",mod:"all",st:"all",yr:"all"}});
    state.role = ws ? ws.role : "staff"; state.staffTab = ws ? "ws" : "voice"; state.tabs = {};
    render(); return;
  }
  if(ev.target.id==="staffSel"){ state.staffUid=ev.target.value; state.staffTab=null; state.procKind=null; state.procSel=null; state.procFilter="all"; state.pipNew=false; state.pipPrefill=null; state.viewNotice=null; render(); return; }
  if(ev.target.id==="ad-out"){ $("#ad-ratingbox").hidden = ev.target.value!=="revised"; return; }
  if(ev.target.id==="recst"||ev.target.id==="recyr"){ state.rec[ev.target.id==="recst"?"st":"yr"] = ev.target.value; paintRecords(); return; }
  if(/-oth$/.test(ev.target.id)){ const box=$("#"+ev.target.id+"box"); if(box){ box.hidden=!ev.target.checked; if(ev.target.checked) box.querySelector("input").focus(); } }
  if(ev.target.closest("#propose")) livePropose(cases.find(x=>x.id===state.selected));
});

document.addEventListener("click", ev=>{
  const cr = ev.target.closest("[data-crumb]"); if(cr){ if(cr.dataset.crumb==="home"){ state.tabs[state.role]=null; } state.selected=null; state.mode="view"; state.invNew=false; state.fromEsc=null; state.showClosed=false; render(); (()=>{try{scrollTo(0,0)}catch(e){}})(); return; }
  const lt = ev.target.closest("[data-ltab]"); if(lt){ state.tabs[state.role]=lt.dataset.ltab; state.showClosed=false; state.invNew=false; state.mode="view"; state.fromEsc=null; pickDefault(); render(); return; }
  const rb = ev.target.closest(".rolebtn"); if(rb){ state.role=rb.dataset.role; state.mode="view"; state.fromEsc=null; pickDefault(); render(); return; }
  const sb = ev.target.closest("[data-sub]:not([data-tab])"); if(sb){ state.staffSub=sb.dataset.sub; state.procSel=null; render(); return; }
  const pk = ev.target.closest("[data-pkind]"); if(pk){ state.procKind=pk.dataset.pkind; state.procSel=null; render(); return; }
  const vt = ev.target.closest("[data-vtab]"); if(vt){ state.voiceTab=vt.dataset.vtab; state.voiceSel=null; render(); return; }
  const vs = ev.target.closest("[data-vsel]"); if(vs){ state.voiceSel=vs.dataset.vsel; render(); return; }
  const ct = ev.target.closest("[data-ctab]"); if(ct){ state.compTab=ct.dataset.ctab; state.compSel=null; render(); return; }
  const cs = ev.target.closest("[data-csel]"); if(cs){ state.compSel=cs.dataset.csel; render(); return; }
  const ch = ev.target.closest("[data-chief]"); if(ch){ state.chiefSel=ch.dataset.chief; render(); return; }
  const mp = ev.target.closest("[data-mypip]"); if(mp){ state.myPipSel=mp.dataset.mypip; render(); document.querySelector(".ess-body")?.scrollIntoView?.({block:"start"}); return; }
  const pp = ev.target.closest("[data-pper]"); if(pp){ const [k,i]=pp.dataset.pper.split(":"); state.pipPer=state.pipPer||{}; state.pipPer[k]=+i; render(); return; }
  const aps = ev.target.closest("[data-apsel]"); if(aps){ state.apSel=aps.dataset.apsel; state.apDone=null; state.apNew=false; render(); (()=>{try{scrollTo(0,0)}catch(e){}})(); return; }
  const pbk0 = ev.target.closest("[data-pback]"); if(pbk0 && state.role==="staff" && state.staffTab==="appeal"){ state.apSel=null; state.apNew=false; render(); return; }
  const rrow = ev.target.closest("[data-rec]"); if(rrow && state.staffTab==="myrec"){ const id=rrow.dataset.rec, c=cases.find(x=>x.id===id);
    Object.assign(state,{procKind:null, procSel:null, viewNotice:null, voiceSel:null, voiceTab:null, myPipSel:null, apSel:null});
    if(c){ state.staffTab="history"; if(c.action && ["prelim","issued","recorded"].includes(c.status)){ state.staffSub=c.action==="verbal"?"verbal":"actions"; state.viewNotice=id; } else { state.staffSub="minutes"; state.procKind=c.method==="showcause"?"showcause":"minutes"; state.procSel=id; } }
    else if(id.startsWith("PIP-")){ state.staffTab="mypip"; state.myPipSel=id; }
    else if(id.startsWith("PMA-")){ state.staffTab="appeal"; state.apSel=id; }
    else { state.staffTab="voice"; state.voiceTab="status"; state.voiceSel=id; }
    render(); (()=>{try{scrollTo(0,0)}catch(e){}})(); return; }
  if(rrow){ state.recSel = rrow.dataset.rec; render(); (()=>{try{scrollTo(0,0)}catch(e){}})(); return; }
  const rmod = ev.target.closest("[data-recmod]"); if(rmod){ state.rec.mod = rmod.dataset.recmod; render(); return; }
  const pbk = ev.target.closest("[data-pback]"); if(pbk && ["records","teamrec"].includes(state.staffTab) && state.recSel){ state.recSel = null; render(); return; }
  if(pbk){ if(["lead","mgr","head","pcd","dg"].includes(state.role)){ state.selected=null; state.mode="view"; } else if(state.role==="ta"){ state.taSel=null; state.taNew=false; } else if(state.role==="chief"){ state.chiefSel=null; } else if(state.role==="comp"){ state.compSel=null; } else if(state.role==="staff" && state.staffTab==="voice"){ if(state.voiceSel) state.voiceSel=null; else state.voiceTab=null; } else { state.procSel=null; state.myPipSel=null; state.voiceSel=null; } render(); return; }
  const pi = ev.target.closest("[data-pitem]"); if(pi){ state.procSel=pi.dataset.pitem; render(); document.querySelector(".ess-body")?.scrollIntoView?.({block:"start"}); return; }
  const tb = ev.target.closest("[data-tab]"); if(tb){ state.staffTab=tb.dataset.tab; state.role = tb.dataset.tab==="ws" && WS[state.staffUid] ? WS[state.staffUid].role : "staff"; if(tb.dataset.tab==="ws"){ state.selected=null; state.mode="view"; state.tabs[state.role]=null; } if(tb.dataset.sub) state.staffSub=tb.dataset.sub; state.recSel=null; state.apNew=false; state.apDone=null; state.apSel=tb.dataset.apsel||null; state.procSel=null; state.myPipSel=null; state.voiceSel=null; if(tb.dataset.tab==="voice"){ state.voiceTab=null; state.voiceDone=null; if(tb.dataset.vopen){ state.voiceSel=tb.dataset.vopen; state.voiceTab="status"; } } if(tb.dataset.pk==="mypip") state.myPipSel=tb.dataset.psel; else if(tb.dataset.pk){ state.procKind=tb.dataset.pk; state.procSel=tb.dataset.psel; } state.viewNotice=null; render(); $(".ess-body")?.scrollIntoView?.({block:"nearest"}); return; }
  const tr = ev.target.closest("[data-ta]"); if(tr){ state.taSel=tr.dataset.ta; state.taNew=false; render(); return; }
  const li = ev.target.closest(".list button[data-id], .wl .prow[data-id]"); if(li){ state.selected=li.dataset.id; state.mode="view"; state.fromEsc=null; render(); (()=>{try{scrollTo(0,0)}catch(e){}})(); return; }
  if(ev.target.closest("#newBtn")){ state.mode="new"; state.fromEsc=null; render(); return; }
  const a = ev.target.closest("[data-act]"); if(!a) return;
  const act=a.dataset.act; const today=iso(TODAY);
  if(act==="cancel"){ state.mode="view"; state.fromEsc=null; render(); return; }
  if(act==="addq"){ const box=$("#q-rows"); const n=box.children.length+1; box.insertAdjacentHTML("beforeend",`<div class="qrow"><span class="n">${n}.</span><input class="q-in" aria-label="Question ${n}"></div>`); box.lastElementChild.querySelector("input").focus(); return; }
  if(act==="addm"){ const box=$("#m-rows"); const n=box.children.length+1; box.insertAdjacentHTML("beforeend",`<div class="mrow"><span class="n note">${n}.</span><div class="pair"><input class="mq" aria-label="Question ${n}" placeholder="Question asked"><textarea class="ma" aria-label="Answer ${n}" placeholder="Employee's answer"></textarea></div></div>`); box.lastElementChild.querySelector("input").focus(); return; }
  if(act==="addrow"){ const k=a.dataset.k, box=$("#rows-"+k); const n=box.children.length+1; if(n>+box.dataset.max){ toast("Up to "+box.dataset.max+" rows"); return; } box.insertAdjacentHTML("beforeend",rowTpl[k](n)); box.lastElementChild.querySelector("input").focus(); return; }
  if(act==="copy"){ const n=a.closest(".doc-wrap").querySelector(".doc"); navigator.clipboard?.writeText(n.innerText).then(()=>toast("Copied"),()=>{const r=document.createRange(); r.selectNodeContents(n); const s=getSelection(); s.removeAllRanges(); s.addRange(r); toast("Text selected, press Ctrl+C");}); return; }
  if(act==="viewnotice"){
    const vc = cases.find(x=>x.id===a.dataset.id);
    state.viewNotice = state.viewNotice===a.dataset.id?null:a.dataset.id;
    if(vc && state.role==="staff" && !vc.ackOn && state.viewNotice){ vc.ackOn=today; vc.ackAt=nowTime(); vc.trail.push(T(today,"staff","Received notice (opened in ESS Portal at "+vc.ackAt+")")); toast("Received on "+fmt(today)+" at "+vc.ackAt); }
    render(); setTimeout(()=>document.querySelector(".ess-body .doc-wrap:last-child")?.scrollIntoView?.({block:"start",behavior:"smooth"}),0); return; }
  if(act==="apnew"){ state.apNew=true; state.apSel=null; render(); return; }
  if(act==="apdoneback"){ state.apDone=null; render(); return; }
  if(act==="apopen"){ const y=+$("#apw-year").value, cl=$("#apw-close").value; if(!y||!cl){ toast("Choose the year and closing date"); return; } Object.assign(appealWin,{year:y, open:true, openedOn:iso(TODAY), closes:cl}); toast(y+" appeals opened for staff"); render(); return; }
  if(act==="apclose"){ appealWin.open=false; toast("Appeals closed. Staff can still view their records"); render(); return; }
  if(act==="apfwd"){ const a=appeals.find(x=>x.id===state.selected); a.status="committee"; a.fwdOn=iso(TODAY); toast("Sent to the Review Committee"); render(); return; }
  if(act==="apdecide"){ const a=appeals.find(x=>x.id===state.selected), t=$("#ad-text").value.trim(); if(t.length<10){ $("#ad-err").hidden=false; return; }
    const out=$("#ad-out").value; a.dec={outcome:out, rating: out==="revised"?$("#ad-rating").value:"", text:t, on:$("#ad-date").value||iso(TODAY), ref:$("#ad-ref").value.trim(), by:"mgr"}; a.status="decided"; a.seen=false;
    toast("Decision recorded. The employee can see it now"); render(); return; }
  if(act==="docpdf"){ exportDocPDF(a.dataset.kind, a.dataset.id); return; }
  if(act==="recexport"){ exportRecords(); return; }
  if(act==="pdf"){ const pc = cases.find(x=>x.id===a.dataset.id); if(pc) exportPDF(pc); return; }
  if(act==="remind"){ toast("Reminder sent"); return; }
  /* TA */
  if(act==="motion"){ const on=!document.documentElement.classList.contains("calm"); document.documentElement.classList.toggle("calm",on); try{ localStorage.setItem("calm",on?"1":"0"); }catch(e){} render(); return; }
  if(act==="toggleclosed"){ state.showClosed=!state.showClosed; render(); return; }
  if(act==="invnew"){ state.invNew=true; state.invPrefill=null; render(); return; }
  if(act==="invcancel"){ state.invNew=false; render(); return; }
  if(act==="invfromcase"){ const c=cases.find(x=>x.id===state.selected); state.tabs.lead="inv"; state.invNew=true; state.invPrefill={uid:c.uid,ref:c.id,subject:clauseLines(c)[0]?.split(" · ")[1]||"Investigation for "+c.id}; render(); return; }
  if(act==="invack"||act==="invcase"){ const i=invs.find(x=>x.id===a.dataset.id); i.ack=true;
    if(act==="invcase"){ state.tabs.lead="cases"; state.mode="new"; state.fromEsc=null; render(); const sel=$("#f-uid"); sel.value=i.uid; sel.dispatchEvent(new Event("change",{bubbles:true})); $("#f-source").value="investigation"; const al=$("#sc-alleg"); if(al) al.value=i.findings; toast("Case form opened from "+i.id); return; }
    toast("Marked as reviewed"); render(); return; }
  if(["decpropose","decrecommend","decapprove","decreturn"].includes(act)){
    const v=voice.find(x=>x.id===a.dataset.id), at=nowTime();
    if(act==="decpropose"){ const t=$("#dec-text").value.trim(); if(!t){ $("#dec-err").hidden=false; return; } v.dec={text:t,outcome:$("#dec-out").value,on:today,stage:"mgr"}; v.status="review"; toast("Decision sent to ER Manager"); }
    if(act==="decrecommend"){ v.dec.mgrNote=$("#dec-note").value.trim(); v.dec.mgrOn=today; v.dec.stage="pcd"; v.dec.retNote=null; toast("Recommended to PCD"); }
    if(act==="decreturn"){ const n=$("#dec-note").value.trim(); if(!n){ $("#dec-err").hidden=false; return; } v.dec.retNote=(state.role==="pcd"?"PCD: ":"ER Manager: ")+n; v.dec.stage="lead"; v.dec.mgrOn=null; toast("Returned to ER Lead"); }
    if(act==="decapprove"){ v.dec.pcdOn=today; v.dec.stage="done"; v.status="closed"; v.outcome=DEC_OUT[v.dec.outcome]+". "+v.dec.text; v.thread.push({on:today,at,by:"pc",text:"Decision ("+DEC_OUT[v.dec.outcome]+"): "+v.dec.text}); v.thread.push({on:today,at,by:"system",text:"Decision approved by the People & Culture Director. Closed."}); if(vOwner(v)) v.unread=true; toast("Decision approved and sent"); }
    render(); return;
  }
  if(act==="vcopycode"){ const c=$("#ev-code").textContent; navigator.clipboard?.writeText(c).then(()=>toast("Code copied"),()=>{const r=document.createRange(); r.selectNodeContents($("#ev-code")); const sl=getSelection(); sl.removeAllRanges(); sl.addRange(r); toast("Code selected, press Ctrl+C");}); return; }
  if(act==="vopendone"){ const v=voice.find(x=>x.id===state.voiceDone); state.voiceDone=null; state.voiceSel=v.id; state.voiceTab="status"; render(); return; }
  if(act==="vbackland"){ state.voiceDone=null; state.voiceTab=null; render(); return; }
  if(["vreceive","vrevreply","vstaffreply","vcase"].includes(act)){
    const v = voice.find(x=>x.id===(a.dataset.id||state.selected||state.chiefSel)); if(!v) return;
    const rv = reviewerOf(v), at = nowTime();
    if(act==="vreceive"){ v.receivedBy = rv==="chief" ? ROLES.chief.person : ROLES.lead.person; v.receivedAt=today+" "+at; v.thread=v.thread||[]; v.thread.push({on:today,at,by:"system",text:"Received by "+reviewerName(v)}); if(vOwner(v)) v.unread=true; toast("Marked as received"); }
    if(act==="vrevreply"){ const t=$("#vr-"+v.id).value.trim(); if(!t){ $("#vrerr-"+v.id).hidden=false; return; }
      const close = $("#vs-"+v.id).value==="closed";
      if(!v.receivedBy){ v.receivedBy=reviewerName(v); v.receivedAt=today+" "+at; v.thread.push({on:today,at,by:"system",text:"Received by "+reviewerName(v)}); }
      v.thread.push({on:today,at,by:rv,text:t}); v.needsReply=false; if(vOwner(v)) v.unread=true;
      if(close){ v.status="closed"; v.outcome=t; v.thread.push({on:today,at,by:"system",text:"Closed by "+reviewerName(v)}); } else v.status="review";
      toast(v.anon?"Sent. The submitter sees it anonymously":"Sent to "+emp(v.uid).name); }
    if(act==="vstaffreply"){ const t=$("#vr-"+v.id).value.trim(); if(!t){ $("#vrerr-"+v.id).hidden=false; return; }
      v.thread.push({on:today,at,by:"staff",text:t}); v.needsReply=true; toast("Reply sent to "+reviewerName(v)); }
    if(act==="vcase"){ const tgt = v.f.aname ? EMPLOYEES.find(e=>e.name.toLowerCase()===v.f.aname.toLowerCase()) : null;
      state.tabs.lead="cases"; state.mode="new"; state.fromEsc=null; render();
      if(tgt){ const sel=$("#f-uid"); sel.value=tgt.uid; sel.dispatchEvent(new Event("change",{bubbles:true})); }
      const al=$("#sc-alleg"); if(al){ al.value=v.f.description||""; al.dispatchEvent(new Event("input",{bubbles:true})); }
      toast("Case form opened from "+v.id); return; }
    render(); return;
  }
  if(act==="tanew"){ state.taNew=true; render(); return; }
  if(act==="tacancel"){ state.taNew=false; state.taSel=null; render(); return; }
  if(act==="taadd_unused"){ const v=$("#ta-pick").value; if(!v) return; const t=$("#ta-list"); t.value = (t.value.trim()?t.value.trim()+"\n":"")+v; $("#ta-pick").value=""; t.dispatchEvent(new Event("input",{bubbles:true})); return; }
  if(act==="tacopy"){ const tb=$("#ta-table"); const tsv=[...tb.rows].map(r=>[...r.cells].map(c=>c.innerText).join("\t")).join("\n"); navigator.clipboard?.writeText(tsv).then(()=>toast("Copied. Paste into Excel"),()=>{const r=document.createRange(); r.selectNodeContents(tb); const s=getSelection(); s.removeAllRanges(); s.addRange(r); toast("Table selected, press Ctrl+C");}); return; }
  if(act==="taapprove"||act==="tareject"){
    const r = taRequests.find(x=>x.id===state.selected); const note=$("#ta-note").value.trim();
    if(act==="tareject" && !note){ $("#tan-err").hidden=false; return; }
    r.status = act==="taapprove"?"approved":"rejected"; r.decidedOn=today; r.note=note; if(r.status==="approved") r.results=taResults(r);
    toast(r.status==="approved"?"Results released to Talent Acquisition":"Request not approved"); render(); return;
  }
  /* PIP */
  if(act==="pipdoneok"){ state.pipDone=null; render(); return; }
  if(act==="concerndoneok"){ state.concernDone=null; render(); return; }
  if(act==="vadoneok"){ state.vaDone=null; render(); return; }
  if(act==="pipnew"){ state.pipNew=true; state.pipPrefill=null; state.pipReq=null; render(); return; }
  if(act==="pipfromreq"){ state.pipNew=true; state.pipPrefill=null; state.pipReq=a.dataset.uid; render(); $("#pipForm")?.scrollIntoView?.({block:"start"}); return; }
  if(act==="pipreqsend"){ const due=$("#prq-due").value||iso(addWorkdays(TODAY,10)); const sel=[...document.querySelectorAll(".prq-ck:checked")].map(i=>i.value); if(!sel.length){ toast("Select at least one staff member"); return; }
    sel.forEach(u=>{ const e=emp(u); pipReqs.push({id:"PR-"+PM_RESULTS.year+"-"+String(pipReqs.length+1).padStart(3,"0"), uid:u, mgr:e.managerUid, year:PM_RESULTS.year, on:iso(TODAY), due}); });
    toast("Sent to "+new Set(sel.map(u=>emp(u).managerUid)).size+" line manager"+(sel.length>1?"s":"")); render(); return; }
  if(act==="pipcancel"){ state.pipNew=false; state.pipPrefill=null; render(); return; }
  if(act==="pipapprove"||act==="pipreturn"){
    const p = pips.find(x=>x.id===state.selected); const note=$("#hr-note").value.trim();
    if(act==="pipreturn" && !note){ $("#hr-err").hidden=false; return; }
    p.hrNote=note; p.status = act==="pipapprove"?"meeting":"returned"; p.hrOn=today;
    p.trail.push(T(today,"lead",act==="pipapprove"?"Reviewed and approved draft":"Returned draft to manager",note||null));
    toast(act==="pipapprove"?"Approved. Manager can hold the initial meeting":"Returned to manager"); render(); return;
  }
  const pid = a.dataset.id && a.dataset.id.startsWith("PIP-") ? pips.find(x=>x.id===a.dataset.id) : null;
  if(pid){
    const p = pid, mgrName = actor(p.mgr);
    if(act==="pipresubmit"){ p.status="hr_review"; p.trail.push(T(today,"line","Resubmitted draft to People & Culture",null,mgrName)); toast("Resubmitted to People & Culture"); }
    if(act==="pipmeeting"){ p.meetingOn=$("#pm-"+p.id).value||today; p.mgrComment=$("#pmc-"+p.id).value.trim(); p.status="to_sign"; p.trail.push(T(today,"line","Held initial meeting and sent for signature",null,mgrName)); toast("Sent to "+emp(p.uid).name+" to sign"); }
    if(act==="pipsign"){ if(!$("#pok-"+p.id).checked){ $("#perr-"+p.id).hidden=false; return; } p.empComment=$("#pe-"+p.id).value.trim(); p.empSign=today; p.status="active"; p.trail.push(T(today,"staff","Signed the "+p.type,p.empComment||null)); p.trail.push(T(today,"system","Signed "+p.type+" shared with People & Culture")); toast("Signed. Your manager and People & Culture have a copy"); }
    const cur = pipCurrent(p), r = cur ? pipRev(p,cur.i) : null, key=p.id;
    const readRates = pre => p.goals.map((_,gi)=>document.querySelector(`input[name="${pre}-${key}-${gi}"]:checked`)?.value||null);
    const readTexts = pre => p.goals.map((_,gi)=>($("#"+pre+"-"+key+"-"+gi)?.value||"").trim());
    if(act==="rvself"){ const rt=readRates("rs"); if(rt.includes(null)){ $("#rserr-"+key).hidden=false; return; }
      r.self={ratings:rt, comments:readTexts("rsc"), overall:$("#rso-"+key).value.trim(), on:today};
      p.trail.push(T(today,"staff","Submitted self-assessment: "+cur.label)); toast("Self-assessment sent to "+mgrName); }
    if(act==="rvskip"){ r.self={skipped:true,on:today}; p.trail.push(T(today,"line","Started "+cur.label.toLowerCase()+" without a self-assessment",null,mgrName)); }
    if(act==="rvmgr"){ const rt=readRates("rm"), sum=$("#rmo-"+key).value.trim(); if(rt.includes(null)||!sum){ $("#rmerr-"+key).hidden=false; return; }
      r.mgr={ratings:rt, comments:readTexts("rmc"), summary:sum, on:today};
      const out=revOutcome(r,cur.final);
      p.trail.push(T(today,"line",cur.label+": "+OUTCOME_LABEL[out].toLowerCase()+(cur.final?" (proposed)":""),sum,mgrName));
      if(!cur.final && p.type==="PIP 2" && out==="behind"){ const c=makeCase(p, cur.i===0?"caution":"final", sum); toast("Evidence sent to Employee Relations: "+c.id+" ("+ACTIONS[c.action].label+")"); }
      else toast("Review sent to "+emp(p.uid).name); }
    if(act==="rvack"){ const t=$("#rak-"+key).value.trim(); if(cur.final && !t){ $("#rakerr-"+key).hidden=false; return; }
      r.empAck={comment:t,on:today}; if(!cur.final) r.done=true;
      p.trail.push(T(today,"staff",cur.final?"Responded to final review":"Signed off "+cur.label.toLowerCase(),t||null));
      toast(cur.final?"Response sent to "+mgrName:"Signed off"); }
    if(act==="rvconfirm"){ const met = revOutcome(r,true)==="met"; r.done=true;
      p.final={date:today, assessment:r.mgr.summary, response:r.empAck?.comment||"", outcome:met?"met":"not"};
      p.status = met?"met":"not_met";
      p.trail.push(T(today,"line","Final outcome confirmed: "+(met?"met":"not met"),null,mgrName)); p.trail.push(T(today,"system","Outcome shared with Employee Relations"));
      if(!met){ const c = makeCase(p, p.type==="PIP"?"verbal":"dismiss", r.mgr.summary); toast(p.type==="PIP"?"Verbal advice recorded ("+c.id+"). Next: draft PIP 2":"Termination recommendation sent to Employee Relations ("+c.id+")"); }
      else toast("PIP closed as met"); }
    if(act==="pip2start"){ state.pipNew=true; state.pipPrefill={uid:p.uid, from:p.id, prevReview:p.final?.date, concerns:p.concerns}; render(); $("#pipForm")?.scrollIntoView?.({block:"start"}); return; }
    render(); return;
  }
  const c = cases.find(x=>x.id===(a.dataset.id||state.selected)); if(!c) return;
  const me = state.role;
  if(act==="scapprove"||act==="screturn"){ const n=$("#sc-note").value.trim();
    if(act==="screturn"){ if(!n){ $("#sc-err").hidden=false; return; } c.status="sc_returned"; c.trail.push(T(today,"mgr","Returned show cause notice to ER Lead",n)); toast("Returned to ER Lead"); }
    else { c.status="sc_issued"; c.sc.issuedOn=today; const min=iso(addWorkdays(TODAY,3)); if(!c.sc.due||c.sc.due<min) c.sc.due=min; c.trail.push(T(today,"mgr","Approved show cause notice",n||null)); c.trail.push(T(today,"system","Show cause notice issued to staff")); toast("Show cause issued to "+emp(c.uid).name); }
    render(); return; }
  if(act==="scresubmit"){ c.sc.allegation=$("#rv-alleg").value.trim()||c.sc.allegation; c.sc.questions=[...document.querySelectorAll(".rv-q")].map(i=>i.value.trim()).filter(Boolean); c.sc.due=$("#rv-due").value||c.sc.due; c.status="sc_draft"; c.trail.push(T(today,"lead","Revised show cause notice and resubmitted to ER Manager")); toast("Resubmitted to ER Manager"); render(); return; }
  if(act==="dgrecord"){ const mem=$("#dg-members").value.trim(), min=$("#dg-min").value.trim(), dec=$("#dg-dec").value; if(!mem||!min){ $("#dg-err").hidden=false; return; }
    const label = dec==="approve" ? "Approved "+ACTIONS[c.action].label : dec==="return" ? "Returned to Employee Relations" : "Changed to "+ACTIONS[dec].label;
    c.dgMin={date:$("#dg-date").value||today, ref:$("#dg-ref").value.trim(), members:mem, minutes:min, decision:label};
    c.trail.push(T(today,"dg","Committee decision recorded: "+label,min));
    if(dec==="return"){ c.status="review"; toast("Returned to ER Manager"); }
    else { if(dec!=="approve"){ c.action=dec; if(!(dec==="final"||dec==="dismiss")) c.prelim=false; }
      if(c.prelim){ c.status="prelim"; c.prelimOn=today; c.trail.push(T(today,"system","Preliminary decision sent to staff")); }
      else { c.status="issued"; c.decidedRole="dg"; c.decidedOn=today; c.trail.push(T(today,"system","Notice issued to staff")); }
      toast("Decision recorded"); }
    render(); return; }
  if(act==="openesc"){ state.mode="new"; state.fromEsc=c.id; render(); return; }
  if(act==="closeesc"){ c.status="closed"; c.trail.push(T(today,"lead","Closed with no disciplinary action")); toast("Concern closed"); }
  if(act==="scsubmit"){
    const ans = c.sc.questions.map((_,i)=>$("#sca-"+c.id+"-"+i).value.trim());
    if(ans.some(x=>!x)){ $("#scerr-"+c.id).hidden=false; return; }
    c.sc.answers=ans; c.sc.answeredOn=today; c.status="sc_answered"; c.trail.push(T(today,"staff","Submitted show cause reply")); toast("Reply sent to Employee Relations");
  }
  if(act==="noreply"){ c.sc.noReply=today; c.status="sc_answered"; c.trail.push(T(today,"lead","Continued without a reply after the due date")); }
  if(act==="signstaff"){
    if(!$("#smok-"+c.id).checked){ $("#smerr-"+c.id).hidden=false; return; }
    c.mins.staffSign=today; c.status="min_lead";
    c.trail.push(T(today,"staff","Signed minutes")); toast("Minutes signed");
  }
  if(act==="amendreq"){ const t=$("#sma-"+c.id).value.trim(); if(t.length<5){ $("#smaerr-"+c.id).hidden=false; return; }
    c.mins.amendments=c.mins.amendments||[]; c.mins.amendments.push({on:today, text:t, status:"pending"}); c.status="min_amend";
    c.trail.push(T(today,"staff","Requested an amendment to the minutes",t)); toast("Amendment request sent to the ER Lead"); }
  if(act==="amendok"||act==="amendno"){ const am=c.mins.amendments.slice(-1)[0], note=$("#amn-"+c.id).value.trim();
    if(act==="amendno" && !note){ $("#amerr-"+c.id).hidden=false; return; }
    if(act==="amendok") document.querySelectorAll(".am-a").forEach(el=>{ const i=+el.dataset.i; if(c.mins.entries[i]) c.mins.entries[i].a=el.value.trim(); });
    if(act==="amendok"){ const add=$("#amx-"+c.id)?.value.trim(); if(add) c.mins.entries.push({q:"Amendment",a:add}); }
    Object.assign(am,{status:act==="amendok"?"approved":"declined", leadNote:note, decidedOn:today}); c.status="min_staff";
    c.trail.push(T(today,"lead",act==="amendok"?"Approved the amendment and updated the minutes":"Did not approve the amendment",note||null));
    toast(act==="amendok"?"Minutes updated and sent back to the employee to sign":"Sent back to the employee to sign as recorded"); }
  if(act==="signlead"){
    const att = readAttendees("sa"); c.mins.attendees = att; c.mins.attSigns = Object.fromEntries(att.map(u=>[u,c.mins.attSigns?.[u]??null]));
    c.mins.leadSign=today; c.status = att.length ? "min_att" : "ready";
    c.trail.push(T(today,"lead", att.length ? "Signed and sent to "+att.length+" attendee"+(att.length===1?"":"s")+": "+att.map(u=>emp(u).name).join(", ") : "Signed minutes; no other attendees"));
    toast(att.length ? "Sent to "+att.length+" attendee"+(att.length===1?"":"s")+" to sign" : "Minutes complete");
  }
  if(act==="signatt"){
    const uid=state.staffUid;
    if(!$("#atok-"+c.id).checked){ $("#aterr-"+c.id).hidden=false; return; }
    const cm=$("#atc-"+c.id).value.trim(); c.mins.attSigns[uid]=today; if(cm) c.mins.attComments[uid]=cm;
    c.trail.push(T(today,"att","Signed minutes",cm||null,actor(uid)));
    if(minsComplete(c.mins)){ c.status="ready"; c.trail.push(T(today,"system","All signatures complete. Returned to ER Lead")); }
    toast("Minutes signed");
  }
  if(act==="propose"){
    const d = readPropose(c); const r = route(d); const err=$("#p-err");
    const ce = clauseError(d); if(ce){ err.textContent=ce; err.hidden=false; return; }
    if(d.reason.length<15){ err.textContent="Write the reason in a sentence or two."; err.hidden=false; return; }
    if(r.blocked){ err.textContent=r.flags.find(f=>f.l==="block").t; err.hidden=false; return; }
    const was = c.status==="returned";
    Object.assign(c,{clauses:d.clauses, other:d.other, action:d.action, proposed:d.action, reason:d.reason, extras:d.extras, prelim:d.prelim, status:"review"});
    c.trail.push(T(today,"lead",(was?"Revised and resubmitted: ":"Proposed ")+ACTIONS[d.action].label)); toast("Sent to ER Manager for review");
  }
  if(act==="recommend"){
    const na=$("#m-action").value, note=$("#m-note").value.trim(), prelim=$("#m-prelim").checked;
    const test = route({...c,action:na});
    if(test.blocked){ const e=$("#m-err"); e.textContent=test.flags.find(f=>f.l==="block").t; e.hidden=false; return; }
    const changed = na!==c.action;
    c.trail.push(T(today,"mgr", changed?"Changed action from "+ACTIONS[c.action].label+" to "+ACTIONS[na].label+" and recommended it":"Recommended "+ACTIONS[na].label+(prelim&&(na==="final"||na==="dismiss")?" with preliminary decision":""), note||null));
    c.action=na; c.prelim = (na==="final"||na==="dismiss") && prelim; c.status="pending";
    toast("Sent to "+ROLES[route(c).role].full);
  }
  if(act==="mreturn"){ const note=$("#m-note").value.trim(); if(!note){ const e=$("#m-err"); e.textContent="Add a note so the ER Lead knows what to change."; e.hidden=false; return; }
    c.trail.push(T(today,"mgr","Returned to ER Lead",note)); c.status="returned"; toast("Returned to ER Lead"); }
  if(act==="approve"){ const note=$("#a-note").value.trim();
    if(c.prelim){ c.status="prelim"; c.prelimOn=today; c.trail.push(T(today,me,"Approved preliminary decision",note||null)); c.trail.push(T(today,"system","Preliminary decision sent to staff")); toast("Preliminary decision sent to "+emp(c.uid).name); }
    else { c.status="issued"; c.decidedRole=me; c.decidedOn=today; c.trail.push(T(today,me,"Approved",note||null)); c.trail.push(T(today,"system","Notice issued to staff")); toast("Notice issued to "+emp(c.uid).name); } }
  if(act==="areturn"){ const note=$("#a-note").value.trim(); if(!note){ $("#a-err").hidden=false; return; }
    c.trail.push(T(today,me,"Returned to ER Manager",note)); c.status="review"; toast("Returned to ER Manager"); }
  if(act==="finalise"){ const fa=$("#a-action").value, note=$("#a-note").value.trim();
    const changed = fa!==c.action; c.action=fa; c.status="issued"; c.decidedRole=me; c.decidedOn=today;
    c.trail.push(T(today,me, changed?"Confirmed final decision as "+ACTIONS[fa].label+" after considering response":"Confirmed final decision after considering response", note||null)); c.trail.push(T(today,"system","Final notice issued to staff")); toast("Final notice issued"); }
  if(act==="respond"||act==="noresp"){
    let txt = "No further comments.";
    if(act==="respond"){ txt=$("#resp-"+c.id).value.trim(); if(!txt){ $("#err-"+c.id).hidden=false; return; } }
    c.staffResponse = txt; c.trail.push(T(today,"staff","Responded to preliminary decision", txt)); toast("Response sent"); }
  if(act==="varesp"){ const t=$("#va-"+c.id).value.trim(); if(!t){ $("#vaerr-"+c.id).hidden=false; return; } c.vaResponse=t; c.vaResponseOn=today; c.trail.push(T(today,"staff","Responded to verbal advice",t)); toast("Response submitted"); }
  if(act==="ack"){ c.ackOn=today; c.ackAt=nowTime(); c.trail.push(T(today,"staff","Received notice")); }
  render();
});

try{ if(localStorage.getItem("calm")==="1") document.documentElement.classList.add("calm"); }catch(e){}
render();
````

### `server.js`

````javascript
/* =====================================================================
   Optional local server
   - Serves the app at http://localhost:3000
   - Provides POST /api/assist for the Claude assist panels. This replaces
     the Claude artifact "sample" capability. The API key stays here on the
     server; the browser never sees it.
   Run:  npm install, then  npm start              (app only, assist hidden)
         or  npm run start:assist                  (reads .env, assist on)
   Needs Node 18+ (built-in fetch). Node 20.6+ for --env-file.
   ===================================================================== */
const express = require("express");
const path = require("path");

const PORT = process.env.PORT || 3000;
const KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname, { extensions: ["html"] }));

/* The app checks this first; assist panels only show when assist is true. */
app.get("/api/health", (req, res) => res.json({ ok: true, assist: Boolean(KEY) }));

/* One prompt in, one text answer out. Add authentication and logging before
   using this beyond a local machine; case details are sent to the API. */
app.post("/api/assist", async (req, res) => {
  if (!KEY) return res.status(503).json({ code: "sampling_disabled", message: "Set ANTHROPIC_API_KEY in .env" });
  const prompt = String((req.body && req.body.prompt) || "").slice(0, 200000);
  if (!prompt) return res.status(400).json({ code: "invalid_request", message: "Empty prompt" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: "user", content: prompt }] })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ code: r.status === 429 ? "rate_limited" : "upstream_error", message: data?.error?.message || r.statusText });
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    if (!text.trim()) return res.status(502).json({ code: "empty_completion", message: "No text returned" });
    res.json({ text });
  } catch (e) {
    res.status(502).json({ code: "upstream_error", message: String(e) });
  }
});

app.listen(PORT, () => console.log(`Employee Relations Automation running at http://localhost:${PORT}` + (KEY ? " (Claude assist on)" : " (Claude assist off)")));
````

### `package.json`

````json
{
  "name": "employee-relations-automation",
  "version": "1.0.0",
  "private": true,
  "description": "Employee Relations Automation: disciplinary workflow, EmployeeVoice, PIPs, PM appeals and records (prototype rebuild).",
  "scripts": {
    "start": "node server.js",
    "start:assist": "node --env-file=.env server.js"
  },
  "dependencies": {
    "express": "^4.21.2"
  },
  "engines": {
    "node": ">=18"
  }
}
````

### `.env.example`

````
# Copy this file to .env, then run: npm run start:assist
# Your Anthropic API key (server only, never commit .env)
ANTHROPIC_API_KEY=
# Optional
ANTHROPIC_MODEL=claude-sonnet-5-5
PORT=3000
````

### `.gitignore`

````
node_modules/
.env
.DS_Store
````

### `.vscode/extensions.json`

````json
{
  "recommendations": [
    "ritwickdey.LiveServer"
  ]
}
````

### `.vscode/settings.json`

````json
{
  "liveServer.settings.port": 5500,
  "liveServer.settings.root": "/"
}
````

### `README.md`

````markdown
# Employee Relations Automation

A browser app for Employee Relations at the Bank: disciplinary cases from concern to notice, show cause notices and meeting minutes with e-signatures, approvals, PIPs, EmployeeVoice (grievances, complaints, ideas), PM appeals, records checks, Compliance investigations and a records register. It is a rebuild of a Claude prototype as plain HTML, CSS and JavaScript.

> **All people, IDs and personal details in `data/sample-data.js` are placeholders** ("Sample Staff NN", "EMP-NNNNN", dummy NIC, phone and address values).

## Run it

**Option A: Live Server (quickest, no install)**
1. Open this folder in VS Code.
2. Install the recommended **Live Server** extension when prompted (or search "Live Server" by Ritwick Dey).
3. Right-click `index.html` and choose **Open with Live Server**.
Everything works except the optional Claude assist panels, which stay hidden.

**Option B: Node server (needed for Claude assist)**
1. Install Node.js 20 or later.
2. In the VS Code terminal:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000
4. To turn on Claude assist: copy `.env.example` to `.env`, add your `ANTHROPIC_API_KEY`, then run `npm run start:assist`.

Use the **Viewing as** dropdown to switch between test users (Staff, People Manager, ER Lead, ER Manager, ER Head, PCD, D&G Committee Secretary, Compliance, Talent Acquisition, Office of the Chief). **Reset sample data** clears saved changes.

## Files

| Path | What it holds |
|---|---|
| `index.html` | Page shell; loads fonts, jsPDF and the scripts in order |
| `css/styles.css` | All styles; design tokens at the top |
| `js/config.js` | Branding, roles, clauses, actions, statuses, test users, fixed "today" date |
| `data/sample-data.js` | Sample employees and records (placeholders) |
| `js/platform.js` | Standard replacements for the Claude runtime: downloads, localStorage, assist client |
| `js/app.js` | All screens, workflow logic, PDFs, records, Claude assist prompts |
| `server.js` | Optional Express server: static files and `/api/assist` |

## Customise

- **Wording, clauses, actions, roles, statuses:** `js/config.js`
- **Branding (bank name on notices and PDFs):** `BRAND` in `js/config.js`, plus the header text in `index.html`
- **Colours, fonts, spacing:** tokens at the top of `css/styles.css`
- **Sample data:** `data/sample-data.js`
- **Today's date:** the app uses a fixed date, `TODAY` in `js/config.js`. Set it to `new Date()` for live use.
- **Saved data / real backend:** `js/platform.js` (`load()` and `save()`)

See `HANDOVER.md` for the full guide.
````


---

## 4. Claude-only features removed

The prototype ran as a Claude artifact. Every dependency on the artifact runtime has been replaced, and each replacement is commented in the code.

| Prototype (Claude runtime) | Replacement | Where |
|---|---|---|
| `window.claude.use("downloads").save()` for notice, record and CSV downloads | `Platform.downloads.save()`: a standard `Blob` plus `<a download>` | `js/platform.js` §1; called from `exportPDF`, `exportDocPDF` and `exportRecords` in `js/app.js` |
| Data held only in page memory (lost on reload) | `localStorage` under key `era-data-v1`, saved after every screen update and restored on load. A **Reset sample data** button clears it | `js/platform.js` §2; `render()` in `js/app.js` calls `Platform.save()` |
| `window.claude.use("sample")` (Claude answering inside the artifact, on the viewer's account) | Browser `fetch` to `POST /api/assist` on `server.js`, which calls the Anthropic Messages API with a server-side `ANTHROPIC_API_KEY`. The client keeps the same function shape (`assist(prompt)`, `assist.json(prompt)`), so the assist code in `app.js` is unchanged | `js/platform.js` §3, `server.js` |
| Artifact capability declarations and viewer consent prompts | Not needed. The assist panels show only when `/api/health` reports `assist: true` | `js/platform.js` §3 |

The prototype used no shared storage, artifact database or connected data, so there was nothing else to replace. Draft step forms still use `localStorage` (keys `draft:*`), as they did in the prototype.

**Things to know about the replacements**
- **Saved data is per browser.** Two people on two machines will not see each other's changes. For real multi-user use, replace `load()` and `save()` in `platform.js` with calls to an API. A small Express + SQLite service storing each collection (`cases`, `voice`, `pips`, `invs`, `taRequests`, `appeals`, `pipReqs`) as JSON rows is enough to start.
- **Claude assist sends case details to the Anthropic API.** Use it only under the Bank's approved AI arrangements. Add authentication to `/api/assist` before running it anywhere but your own machine. Staff names are swapped for UIDs before any prompt is sent (`aiRun` in `app.js`).

---

## 5. Design tokens

All tokens are CSS variables at the top of `css/styles.css`. Light values sit on `:root`. Dark values apply when the device is in dark mode, or when `<html data-theme="dark">` is set.

**Fonts**

| Token | Value | Used for |
|---|---|---|
| `--sans` | Inter, then system fonts | All text |
| `--mono` | IBM Plex Mono, then system mono | References, codes, small labels |

The fonts load from Google Fonts in `index.html`. Public Sans and Lexend are also loaded, for a few legacy headings.

**Spacing and radius**

| Token | Value |
|---|---|
| `--space-xs` / `--space-sm` / `--space-md` / `--space-lg` / `--space-xl` | 6px / 8px / 12px / 16px / 18px (gaps between items) |
| `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-pill` | 8px / 10px / 14px / 999px |

Padding values elsewhere in the stylesheet are still literal pixels.

**Core colours**

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | #f6f5f4 | #151413 | Page background (soft grey) |
| `--surface` | #ffffff | #1d1c1b | Cards and panels |
| `--sunk` | #f1efed | #242220 | Recessed areas, table headers |
| `--line` / `--line-strong` | #e7e4e1 / #d3cfcb | #2f2c2a / #45413e | Borders |
| `--fg` | #1f1d1b | #f2f0ee | Text (charcoal) |
| `--muted` / `--faint` | #6b6560 / #948d87 | #a8a29e / #7d7772 | Secondary text |
| `--accent` | #b8141f | #f0717b | BML red: buttons, active states, letterhead |
| `--accent-soft` | #fbeaea | #3a1c1f | Pale red backgrounds |
| `--ok` / `--ok-soft` | #1f6b45 / #e3f2ea | #6cc596 / #1b2e24 | Success pills |
| `--warn` / `--warn-soft` | #8a5a00 / #fbf0d9 | #e3b45a / #30260f | Waiting and action-needed pills |
| `--bad` / `--bad-soft` | #a3141d / #fbe5e6 | #f07a80 / #3a1c1e | Returned, overdue and issued pills |
| `--info` / `--info-soft` | #1f4f86 / #e4edf8 | #86b2e6 / #1a2636 | In-progress pills |

**ESS Portal shell and EmployeeVoice tints**
- The `--ess-*` tokens style the portal frame and sidebar. They mirror the core colours above.
- The `--t-*` tokens are the five EmployeeVoice channel tints:

| Channel | Tokens |
|---|---|
| Chief | `--t-teal` #0f766e on `--t-teal-bg` #e3f4f1 |
| People & Culture | `--t-gold` #a16207 on `--t-gold-bg` #fbf1d6 |
| Formal grievance | `--t-rose` #b04a5a on `--t-rose-bg` #fbebee |
| Harassment complaint | `--t-plum` #86307a on `--t-plum-bg` #f5e7f2 |
| Gender discrimination complaint | `--t-indigo` #4338ca on `--t-indigo-bg` #ebeafc |

The PDF colours (red rule, grey labels) are set separately, as RGB values in `noticePDF()` and `htmlToPDF()` in `js/app.js`.

---

## 6. Dependencies and setup

**Libraries**

| What | How | Why |
|---|---|---|
| jsPDF 2.5.1 | CDN: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` | Builds the notice and record PDFs in the browser |
| Google Fonts | Inter, Public Sans, Lexend, IBM Plex Mono | Typography |
| Express 4 | `npm install` (only for `server.js`) | Optional local server and `/api/assist` |
| Node.js 20+ | Install from nodejs.org | Only needed for the server; built-in `fetch` and `--env-file` |

There is no build step and no framework. For offline or locked-down networks, download jsPDF and the fonts and change the two URLs in `index.html` to local paths.

**Run with Live Server (no install)**
1. Unzip the folder and open it in VS Code (File › Open Folder).
2. When prompted, install the recommended **Live Server** extension (Ritwick Dey).
3. Right-click `index.html` and choose **Open with Live Server**. It opens at http://127.0.0.1:5500.
4. Claude assist panels stay hidden in this mode. Everything else works.

**Run with Node (enables Claude assist)**
1. Open the VS Code terminal (Terminal › New Terminal) in the project folder.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the app:
   ```
   npm start
   ```
4. Open http://localhost:3000
5. Optional, to turn on Claude assist:
   ```
   cp .env.example .env
   ```
   Then put your key in `.env` as `ANTHROPIC_API_KEY=...` and run:
   ```
   npm run start:assist
   ```

**Trying it out**
- Use **Viewing as** to switch users. The number in brackets is that user's to-do count.
- **Reset sample data** (top right) restores the original sample records.
- Good first walk-through:
  1. **ER Lead:** open DA-2026-060 and propose an action.
  2. **ER Manager:** recommend it.
  3. **ER Head:** approve it.
  4. **Staff** (Sample Staff 05): open Disciplinary History, then Verbal Advice, and export the record to PDF.

---

## 7. Customisation notes

**Text and policy**

| Change | Where |
|---|---|
| Disciplinary clauses (3.1 and 3.2) | `CLAUSES` in `js/config.js` |
| Action names, the "§" references and the progressive order | `ACTIONS` in `js/config.js` |
| Additional actions (§6) | `EXTRAS` in `js/config.js` |
| Verbal Advice disclaimer | `VERBAL_DISCLAIMER` in `js/config.js` |
| Impact text on notices | `noticeRows()` in `js/app.js` |
| Standard show cause questions | `STD_QUESTIONS` in `js/config.js` |
| Concern types for line managers | `ISSUE_TYPES` in `js/config.js` |
| Workflow status labels and pill colours (`ok`, `warn`, `bad`, `info`) | `STATUS` and `PIP_STATUS` in `js/config.js`; `AP_STATUS`, `INV_STATUS` and `TA_STATUS` in `js/app.js` |
| EmployeeVoice channel names, recipients and anonymity | `VOICE` in `js/config.js` |
| EmployeeVoice row subtitles, icons and tints | `VOICE_CARD` in `js/config.js` |
| EmployeeVoice form fields and required fields | `voiceFields()` and `VOICE_REQ` in `js/app.js` (field labels match the Bank's paper forms) |
| PM rating scale | `PM_RATINGS` in `js/app.js` (Excellent, Very Good, Good, Satisfactory, Poor) |
| PM appeal reasons and outcomes | `AP_REASONS` and `AP_OUT` in `js/app.js` |
| Grievance decision outcomes | `DEC_OUT` in `js/app.js` |
| Page titles and subtitles in the portal | `PAGE_META` in `js/app.js` |
| Workspace tiles per role | `ROLE_TABS` in `js/app.js` |
| Claude assist instructions | `AI_GUIDE` in `js/app.js` |
| Claude assist buttons per screen | `aiContext()` in `js/app.js` |

**Branding**
- **Bank name:** `BRAND` in `js/config.js` holds the sidebar name, the notice and PDF letterhead, and the assist prompt. Also change the header eyebrow and title in `index.html`.
- **Colours and fonts:** the tokens at the top of `css/styles.css` (section 5).
- **Portal label:** the "OneUI ESS Portal" text is in `renderStaff()` in `js/app.js`.

**Data**
- **Sample records:** everything is in `data/sample-data.js`. Employees, org units, cases, EmployeeVoice, PIPs, investigations, records checks, PM appeals, year-end ratings and PIP requests. Edit or replace freely.
- **Test users and workspaces:** `STAFF_USER`, `PM_USER`, `WS` (which UID gets which workspace) and `TEST_USERS` (dropdown order and labels) in `js/config.js`.
- **Today's date:** fixed at `TODAY` in `js/config.js` (25 October 2026) so the sample data stays consistent. Change it to `new Date()` for live use.
- **Connecting real systems:**
  - Replace the arrays in `sample-data.js` with data from the HR system or an API.
  - Replace `load()` and `save()` in `js/platform.js` with API calls.
  - Replace the test dropdown with the signed-in user from single sign-on. `state.staffUid` is the signed-in UID, and the workspace comes from `WS`.

**Logic**

| Logic | Where |
|---|---|
| Approval routing (who approves, blocks such as "Cautionary Notice only once per issue") | `route()` in `js/app.js` |
| Who holds a case at each status | `owner()` in `js/app.js` |
| What each role can see | `visibleTo()` (cases), `listItems()` (workspace lists) and `recRows()` (Records register) in `js/app.js` |
| Tasks shown on a case per role | `taskHTML()` in `js/app.js` |
| Staff to-dos and sidebar counts | `staffTodos()` and `actionCount()` in `js/app.js` |
| Click actions | One delegated handler at the end of `js/app.js`: `if(act==="...")` blocks, one per button `data-act` |
| Form submissions | `bindStaffForms()`, `bindForm()`, `bindTA()`, `bindCompliance()` and `bindInvForm()` in `js/app.js` |
| PDFs | `noticePDF()` for notices; `htmlToPDF()` and `docSourceHTML()` for every other record in `js/app.js` |
| Records checks window and rules | `taResults()` and `taWindow()` in `js/app.js` (12 months; Cautionary and Final Warning count, Verbal Advice does not) |

**How the app renders**
- `render()` redraws the current screen from `state` and the data arrays, then saves.
- Screens are template-literal HTML strings. To add a screen:
  1. Add a sidebar item in `renderStaff()`.
  2. Add a page title in `PAGE_META`.
  3. Add a function that returns HTML, and wire it into the `body` lookup in `renderStaff()`.

**Production checklist**
- Real authentication and role mapping
- A server-side database and an audit log (the case `trail` arrays show the events to store)
- Server-side validation of every action
- E-signature evidence (time, device, identity)
- PDF archiving
- Notifications (email or the ESS inbox)
- Review of the Claude assist data flow under the Bank's AI policy

Known limits of the prototype:
- No authentication.
- Data is saved per browser.
- Uploaded files keep only their names.
- The "Reset sample data" button is for testing only.
