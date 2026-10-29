# Which Employee Relations build is which (checked 28 Oct 2026)

| Build | What it is | Matches Rayya's v39? | Verdict |
|---|---|---|---|
| `er-automation-prototype (1).html` (SHA c6e63b4f…) | **Rayya's prototype, v39** — single Claude artifact | — (the reference) | Source of truth. Runs only as one file; data resets on reload; Claude-only download/assist |
| `employee-relations-automation_1.zip` / `HANDOVER.md` | Developer rebuild of the prototype as HTML/CSS/JS for VS Code. Zip and HANDOVER are byte-identical | Yes, except: no collapsible document panels, no testing-mode code, and a records-check bug | **This project**, after the fixes in `CHANGELOG.md` |
| `employee-relations-desk.zip` and `employee-relations-desk_-_Final_.zip` | Next.js + PostgreSQL rebuild of an earlier "Disciplinary Action Desk" prototype; deliberately independent of the OneUI ESS portal | No — different app: no PM Appeals, Compliance investigations, Office of the Chief or the 5-channel EmployeeVoice; different screens and roles; needs PostgreSQL | Not the ER module Rayya built |
| `er-automation-prototype.html` (674e8391…) + `reference-letter-automation*.zip` | Reference Letter module | n/a | Separate module (being built by someone else) |

## How the match was checked
- Line-by-line code comparison of v39 against this project (after mapping the placeholder names/IDs): the only remaining differences are the intended ones listed in `CHANGELOG.md`.
- Styles: every colour, font and spacing value resolves to the same value as v39.
- Browser walk-through of both, every test user and every sidebar screen: same users and to-do counts (Staff 2, People Manager 2, ER Lead 14, ER Manager 4, ER Head 2, PCD 2, D&G 1, Compliance 1, TA 0, Office of the Chief 1), 61 screens, 0 errors.
- Records check and document panels tested in the browser; `npm start` server tested (`/api/health` → `{"ok":true,"assist":false}`).
