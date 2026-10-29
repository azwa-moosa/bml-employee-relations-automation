# Changelog

## 1.2.1 — 28 Oct 2026 (light / dark switch)
- **Added a Light · Dark · Auto switch** in the top bar. Before this, dark mode only followed the device setting and there was no way to change it in the app. (The sun icon beside the bell is v39's "reduce motion" button, not a theme switch.) The choice is remembered in the browser and applied before the page draws, so there is no flash.
- Dark-mode polish: readable text on red buttons and badges, softer shadows, dark date pickers and dropdown arrows.
- New file `js/theme.js`; the switch markup is in `index.html`. No workflow code changed.

## 1.2.0 — 28 Oct 2026 (new theme, no functional change)
- **New look.** App layout and component style follow the restyled exit-interview app: full-height left sidebar, sticky top bar with the role switcher, red gradient page headers, layered cards with soft shadows, tinted KPI cards, larger rounded buttons and inputs, Plus Jakarta Sans headings with Inter body text and JetBrains Mono for references. Works in light and dark mode and on phones.
- **Colours kept from Rayya's v39:** BML red accent (`#b8141f`), soft red tints, warm greys, same status colours.
- **Removed the ESS portal branding:** the "OneUI ESS Portal · Bank of Maldives" block in the sidebar and the "Bank of Maldives · Employee Relations" line in the header. Placeholder modules now say "existing portal module".
- **Not changed:** every screen, workflow, role, rule, count and action. Workflow wording that describes how staff receive notices ("opened in the ESS Portal"), the letterhead on notices and PDFs, and `BRAND` in `js/config.js` are unchanged.
- Files: new `css/theme.css`; `index.html` header markup and fonts; three text strings in `js/app.js`. `css/styles.css` and all logic are untouched.
- Checked: same 10 test users and to-do counts, 61 screens clicked through with 0 errors, records check, document panels and saved data all behave as before.

## 1.1.0 — 28 Oct 2026 (aligned with Rayya's prototype v39)
Starting point: the `employee-relations-automation` project exactly as printed in `docs/HANDOVER.md` (identical to the earlier zip).

- **Fixed — Talent Acquisition records check.** The handover build only accepted `BML-` staff IDs, but the sample data uses `EMP-` IDs, so every records check returned "0 found · all not found". It now accepts `EMP-`, `BML-` or just the five digits, and uses whatever prefix the employee data uses (so real `BML-` data will also work). Example: `EMP-10421, 14102, BML-13207, EMP-99999` → 3 found · 1 not found.
- **Added from v39 — collapsible document panels.** Notices, PIPs and other documents fold open and closed ("click to view"), as in v39. Notices a staff member opens start expanded.
- **Added from v39 — testing-mode code.** Ported as Rayya left it: switched off (`TEST_MODE = false` in `js/app.js`). When turned on it auto-fills required fields so you can click through workflows quickly. No switch is shown in the UI, as in v39.
- Styles for the two additions copied from v39 into `css/styles.css` (end of file).

Everything else is unchanged from the handover build, which already matched v39: same colours, fonts and spacing (written as design tokens), same screens and wording.

## Deliberate differences from the Claude prototype (from the handover, kept)
- People and personal details are placeholders ("Sample Staff NN", `EMP-NNNNN`, dummy NIC/phone/address).
- Data is saved in the browser (localStorage) instead of resetting on reload; **Reset sample data** restores it.
- Downloads use the browser instead of the Claude runtime.
- Claude assist calls `server.js` (`/api/assist`) with your own API key; hidden when not configured.
