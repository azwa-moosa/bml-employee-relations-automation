# Employee Relations Automation

**This is the Employee Relations module Rayya built** (the "Employee Relations Automation" Claude prototype, version 39), rebuilt as a normal VS Code project that runs in any browser. Same screens, roles, workflows, notices and wording as the prototype. Reference letters are a separate module and are not included.

- Matches Rayya's v39: all 10 test users, the same to-do counts, all 80 workflow actions; 61 screens clicked through with zero errors.
- Built from `docs/HANDOVER.md` (the developer handover), then brought up to v39 and one bug fixed. See `CHANGELOG.md`.
- Specification: `docs/SPEC.md`. How this compares with the other builds: `docs/BUILD_COMPARISON.md`.

A browser app for Employee Relations at the Bank: disciplinary cases from concern to notice, show cause notices and meeting minutes with e-signatures, approvals, PIPs, EmployeeVoice (grievances, complaints, ideas), PM appeals, records checks, Compliance investigations and a records register. It is a rebuild of a Claude prototype as plain HTML, CSS and JavaScript.

> **All people, IDs and personal details in `data/sample-data.js` are placeholders** ("Sample Staff NN", "EMP-NNNNN", dummy NIC, phone and address values).

## Run it

**Option A: Live Server (quickest, no install)**
1. Open this folder in VS Code.
2. Install the **Live Server** extension when prompted (or search "Live Server" by Ritwick Dey in Extensions).
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
| `css/styles.css` | All styles from v39; design tokens at the top |
| `js/theme.js` | Light · Dark · Auto switch in the top bar (remembers the choice) |
| `css/theme.css` | Visual theme (layout, type, colours) loaded after `styles.css`. Delete its `<link>` in `index.html` to get the v39 look back |
| `js/config.js` | Branding, roles, clauses, actions, statuses, test users, fixed "today" date |
| `data/sample-data.js` | Sample employees and records (placeholders) |
| `js/platform.js` | Standard replacements for the Claude runtime: downloads, localStorage, assist client |
| `js/app.js` | All screens, workflow logic, PDFs, records, Claude assist prompts |
| `server.js` | Optional Express server: static files and `/api/assist` |

## Customise

- **Wording, clauses, actions, roles, statuses:** `js/config.js`
- **Branding (bank name on notices and PDFs):** `BRAND` in `js/config.js`, plus the header text in `index.html`
- **Colours, fonts, spacing:** tokens at the top of `css/theme.css` (they override the ones in `css/styles.css`)
- **Sample data:** `data/sample-data.js`
- **Today's date:** the app uses a fixed date, `TODAY` in `js/config.js`. Set it to `new Date()` for live use.
- **Saved data / real backend:** `js/platform.js` (`load()` and `save()`)

See `docs/HANDOVER.md` for the full developer guide (every file explained) and `docs/SPEC.md` for the behaviour spec.
