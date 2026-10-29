# Employee Relations Automation: developer handover spec

**Source:** `er-automation-prototype.html`, the published artifact "Employee Relations Automation" (version 39, SHA-256 `c6e63b4f…a9138e19`). It is a single HTML file with inline CSS and JavaScript, about 415 KB.

**Scope:** everything below is taken from the prototype's code and sample data. Anything inferred rather than read directly from the code is marked **[ASSUMED]**.

**Conventions used in this spec**
- `code` names are the identifiers in the prototype (constants, statuses, field ids, `data-act` actions).
- "WD" means working days. The prototype's `addWorkdays()` skips **Friday and Saturday** (the Maldives weekend). It does not account for public holidays.
- The prototype runs on a fixed "today": `TODAY = 2026-10-25 09:00`. Every due date, window and "overdue" check is calculated from it.

---

## Contents
1. Roles and personas
2. Screens, tabs and panels
3. End-to-end flows and statuses
4. Routing rules and flags
5. Form fields
6. Data model
7. Generated documents
8. Audit trail events
9. Reference formats and timelines
10. Open questions, stubs and gaps

---

## 1. Roles and personas

Sign-in is simulated by the **"Viewing as"** dropdown (`TEST_USERS`). It holds one fixed test user per role. A user's workspace comes from the `WS` map, and line-manager status is derived: anyone with direct reports in `EMPLOYEES.managerUid` is a line manager.

| Role key | Label | Test UID | Workspace (`WS`) | Can see | Can do |
|---|---|---|---|---|---|
| `staff` | Staff | BML-11590 | None (ESS Portal only) | Their own EmployeeVoice submissions (named and anonymous), notices, verbal advice, proceedings, PIPs, PM appeals, My Records | Submit EmployeeVoice forms; reply on threads; reply to show cause; sign or request amendment to minutes; open notices (records receipt); respond to preliminary decision and verbal advice; PIP self-assessment, sign-off and sign; submit PM appeal (window open, one per year); export own records to PDF/CSV |
| Line manager ("People Manager") | People Manager | BML-07655 | None. Gets a **My Team** menu because they have reports | Concerns they submitted (status only), verbal advice they gave, their team's PIPs, Team Records, PIP requests from ER | Submit staff concern (optionally linking prior verbal advice); give verbal advice; draft PIP / PIP 2; hold initial meeting; review check-ins; confirm final outcome; resubmit returned PIP; start PIP from an ER request |
| `lead` | ER Lead (Employee Relations Lead) | BML-09120 | Employee Relations Workspace (`grp:"er"`) | All cases, all PIPs, all non-Chief EmployeeVoice, investigations, records checks, PM appeals, dashboard, Records (incl. Chief items) | Open cases (show cause / meeting minutes / log verbal advice); revise returned show cause; sign minutes and choose attendees; approve or decline minute amendments; propose action; continue without reply after due date; close concern with no action; approve or return PIP drafts; send year-end PIP requests; acknowledge, reply to and close EmployeeVoice; propose grievance decisions; request investigations; review findings; approve or return records checks; open/close PM appeal window; send appeals to Review Committee |
| `mgr` | ER Manager (Employee Relations Manager) | BML-07210 | Employee Relations Workspace | All cases; formal EmployeeVoice with a decision; PM appeals; dashboard; Records | Approve or return show cause drafts; review/recommend or return proposals (can change action, set preliminary); recommend or return grievance decisions; record Review Committee decision on PM appeals |
| `head` | ER Head (Head of Total Rewards & Employee Relations) | BML-04518 | Employee Relations Workspace | Cases routed to `head` in `pending`/`prelim`/`issued`; dashboard; Records | Approve (or approve as preliminary) or return to ER Manager; confirm final decision after staff response |
| `pcd` | P&C Director (People & Culture Director) | BML-02215 | Director's Approvals | Cases routed to `pcd` in `pending`/`prelim`/`issued`; formal EmployeeVoice at `pcd`/`done` decision stage; dashboard; Records | Same approval actions as ER Head for its cases; approve or return grievance decisions |
| `dg` | D&G Committee Secretary | BML-08890 | D&G Committee Workspace | Cases routed to `dg` in `pending`/`prelim`/`issued`; Records: cases routed to `dg` with an action | Record committee decision: approve, change action, or return; meeting date, reference, members and minutes |
| `comp` | Compliance | BML-10544 | Compliance Workspace (`grp:"er"`) | Investigation requests; concerns it referred (status) | Submit findings with recommendation; refer a staff concern to ER |
| `ta` | Talent Acquisition | BML-11208 | Talent Acquisition Workspace | Own records checks; results as Yes/No only, no basis | Submit records check (UID list and reference); copy results for Excel |
| `chief` | Office of the Chief | BML-03307 | Office of the Chief | "Share with the Chief" submissions only (anonymous ones show as "Anonymous") | Reply without first acknowledging receipt; close with outcome |

**Cross-cutting rules**
- **People are shown by role.** Workflow actors appear by role or designation through `actor()`: ER Lead, ER Manager, Head of Card Operations and so on. Only the employee who is the subject of a record is shown by name.
- **Every workspace user is also staff.** Each one has the Staff menu (EmployeeVoice, Disciplinary History, PM Appeals, My PIP, My Records) as well as their workspace.
- **Anonymous submissions** (`pc` and `chief` channels only) store `uid:null` and a hidden `owner` UID. Reviewers see "Anonymous", while the submitter sees the submission in My submissions.
- **Line managers see concerns as open or closed only.** UI text: "For confidentiality you see only whether a concern is open or closed, not the decision." In Team Records, however, they see full case status labels, and the decision notice once the case is issued or prelim.
- **Claude assist** panels show only for `lead`, `mgr`, `head` and `pcd` inside the ER workspace (see §2.6).

---

## 2. Screens, tabs and panels

### 2.1 Global shell
- **Header:** eyebrow "Bank of Maldives · Employee Relations", title "Employee Relations Automation" and a "PROTOTYPE · example data only" badge.
- **Viewing as:** the role dropdown, showing each user's to-do count. Below it, the user's designation and department with a to-do badge.
- **ESS Portal frame:** sidebar, breadcrumb bar (shows the role label, a bell icon that does nothing, and a motion toggle that reduces animation, stored in `localStorage` as `calm`), then the page header and body.

### 2.2 Sidebar menu

| Group | Item (`data-tab`) | Shown to | Purpose |
|---|---|---|---|
| Employee Relations | EmployeeVoice (`voice`) | Everyone | Channel picker, forms, My submissions |
| | Disciplinary History (`history`) | Everyone | Three sub-tabs (below) |
| | PM Appeals (`appeal`) | Everyone | Appeal window banner, form, previous appeals |
| | My PIP (`mypip`) | Staff with a PIP past ER review | PIP list, detail, check-ins, signing |
| | My Records (`myrec`) | Everyone | One register of the person's own records |
| My Team | Submit a Staff Concern (`concern`) | Line managers | Concern form; list "Concerns you submitted" below the form |
| | Submit a Staff PIP (`pip`) | Line managers | ER PIP requests, PIP form, team PIP cards |
| | Give Verbal Advice (`verbal`) | Line managers | Verbal advice form; list "Verbal advice you have given" |
| | Team Records (`teamrec`) | Line managers | Register of the team's cases and PIPs |
| My Workspace | {Workspace label} (`ws`) | Users in `WS` | Role workspace (§2.4–2.5) |
| | Records (`records`) | Users in `WS` | Register of everything in the role's scope |

Sidebar counts come from `staffTodos()`, and the workspace count from `actionCount(role)`.

### 2.3 Staff screens
- **EmployeeVoice landing**
  - Header and a "My submissions" button (shows a new-reply count).
  - Protection line: "Your voice is protected. No retaliation. Every submission is handled in confidence."
  - Two groups:
    - **Ideas & support:** Share with the Chief, Share with People & Culture.
    - **Formal complaints:** Formal grievance, Harassment complaint, Gender discrimination complaint.
- **Channel form page:** a channel strip naming the recipient, the form (§5), and "Your submissions" for that channel below.
- **Submitted confirmation:** anonymous submissions also show the reference code, with a Copy button.
- **My submissions:** list showing status pill, "New reply" and "Anonymous" tags.
- **Submission detail:**
  - Channel strip with the ID (and, if anonymous, the reference code).
  - Export PDF.
  - 4-step tracker: Submitted, Received, Under review, Closed.
  - Message thread and reply box (hidden when closed).
  - "View your submission" (the form document).
- **Disciplinary History**
  - **Disciplinary Actions:**
    - Preliminary decision response task.
    - "New {action}" banners for notices not yet opened.
    - Table: Issued date, Action, Received, View.
    - Notice document with Export PDF; summary Export PDF.
  - **Verbal Advice:**
    - Note: "not a disciplinary action".
    - Table: Date, Concern, Issued by, Received, View.
    - Notice and optional response task.
  - **Disciplinary Proceedings:**
    - List of show cause notices issued and minutes about the person.
    - Detail: show cause reply form, or a read-only reply; minutes signing / amendment request; signature tracker; record of meeting; document; Export PDF.
- **PM Appeals**
  - Window banner: open with deadline and "Submit an appeal", already-appealed status pill, or "Appeals are closed".
  - List of past appeals.
  - Detail: Export PDF, 3-step tracker, Review Panel Decision card, form document.
  - Form: 4 steps (§5).
- **My PIP**
  - List with to-do status.
  - Detail:
    - Export PDF and an info card.
    - Sign task (`to_sign`).
    - Review periods: tabs per check-in; self-assessment form; manager ratings; sign-off/response.
    - Full plan document.
- **My Records:**
  - Filter chips by type; search; status (Open/Closed); year; Export CSV.
  - Table: Reference, Type, Details, Status, Opened, Last update. (The Employee column is hidden for the person's own records.)
  - Clicking a row opens the record in its own module page.
- **Submit a Staff Concern:** the form; "Concerns you submitted" cards with a simplified status; done card.
- **Give Verbal Advice:** the form with employee info card and impact notice; list of advice given; done card.
- **Submit a Staff PIP:**
  - "Employee Relations asked you to start a PIP" task list.
  - "+ Start a PIP" and the 5-step PIP form.
  - Team PIP cards with tasks: returned, hold meeting, check-in reviews, confirm outcome, start PIP 2. Each card has a collapsible document and history.
- **Team Records:** register limited to the team. The case detail is a reduced view: stage bar, record type, source, reason and notice (if issued), history.

### 2.4 ER workspace (lead, mgr, head, pcd, dg)
- **Home:** tiles from `ROLE_TABS` showing "{n} to attend", "{n} open" or "Nothing new". Lead, mgr, head and pcd also get a Claude panel ("Brief me on today").

| Role | Tiles |
|---|---|
| lead | Dashboard, Disciplinary cases, PIPs, EmployeeVoice, Investigations, Records checks, PM Appeals |
| mgr | Dashboard, Disciplinary cases, Grievance decisions, PM Appeals |
| head | Dashboard, Approvals |
| pcd | Dashboard, Approvals, Grievance decisions |
| dg | Committee cases (single tab, so it opens straight to the list) |

- **List:**
  - Breadcrumb, heading and an action button: "+ Open case" (lead, cases) or "+ New request" (lead, investigations).
  - Open items first, with items needing the user's action first, then oldest. Closed items sit behind a "Show closed (n)" toggle.
  - PM Appeals list adds the window card: lead can open/close; others see read-only state.
  - PIPs list (lead) adds the "Year-end ratings: start PIPs" card.
- **Case detail** (`renderCase`)
  - Header: ID, opened date, employee name, designation, department, grade, status pill.
  - **Stage bars:**
    - Questioning bar, by method:
      - Show cause: Drafted, Approved, Reply.
      - Minutes: Minutes drafted, Signed (Staff), Signed and sent, Signed (attendees).
      - PIP evidence.
      - Concern raised / Case opened.
    - Decision bar: Proposed, Reviewed, Approved, optional Preliminary, Issued, Received.
  - **Task card for the current owner.** Other roles see a passive "With {owner}" card. The ER Lead additionally gets "Send reminder" (`min_att`) and "Continue without a reply" (`sc_issued`, enabled after the due date).
  - **Facts:** Action (with "Lead proposed …" if changed), Source, Basis, (Suspected) breach, Reason.
  - **Info flags:**
    - "System actions on issue" for an issued Final Warning.
    - D&G Committee minutes block.
    - Lead's "Request investigation from Compliance" button, with linked investigation status pills.
    - Employee's verbal-advice response.
  - **Documents:** Decision notice and questioning document. These are collapsed by default; when open they offer Copy text and Export PDF (issued/recorded/prelim notices only).
  - **Right panel:** "Final approval by" with the reason, routing flags, Case history (trail), Employee's record (prior actions), Claude panel.
- **Open a case** form (lead), with a live "Next steps" panel showing the path, routing reason, flags and prior record.
- **PIP review** (lead): approve/return task, review periods (read-only), plan document, history, prior record.
- **EmployeeVoice review:**
  - Acknowledge receipt task.
  - Decision box and task (formal types).
  - Tracker, thread, reply box with "Status after sending" and "Open disciplinary case" (formal, named).
  - Submission document.
- **Investigation review** (lead): "Review the findings" with Mark as reviewed and, if action is recommended, Open disciplinary case. Also the info card, scope and findings.
- **New investigation request** form (lead).
- **Records check review** (lead):
  - Summary tiles: staff, with action, checked-from date.
  - Approve and release / Return with note.
  - Results table with the ER-only "Basis" column.
- **PM appeal review:**
  - Tracker; lead "Send to Review Committee"; mgr "Record the Review Committee decision".
  - Decision card, key facts, justification, form document, previous appeals.
- **Dashboard** (lead, mgr, head, pcd):
  - KPIs: Open disciplinary cases; Cautionary + Final Warning (12 months); Active PIPs (+ awaiting approval); Open EmployeeVoice (+ formal); Investigations with Compliance; Open PM appeals (+ window state).
  - Bars: open cases by stage; actions issued in 12 months; EmployeeVoice open by channel (excludes Chief).
  - Table: "Awaiting approval", with days waiting since the last ER Manager trail event.

### 2.5 Other workspaces
- **Compliance:** two tabs.
  - **Investigation requests:** list, detail, findings form.
  - **Refer a staff concern:** form, plus "Concerns you referred" with the internal status pill.
- **Talent Acquisition:**
  - Records checks list.
  - "+ New check" form with live UID preview ("Not in directory" flags).
  - Detail by status: approved (results, "Viewable until", Copy for Excel), pending (staff list), not approved (note), expired.
- **Office of the Chief:** list ordered with items needing a response first; detail with tracker, thread and reply box. No receipt step.
- **Records (workspace):** the same register as My Records, scoped to the role (§3.10). Opening a row shows a "Record view · read only" version of the module screen, with all task forms and action buttons removed except Copy and PDF.

### 2.6 Claude assist panel (ER workspace only; needs the Claude artifact runtime)
The panel offers buttons that change with the screen, plus a free-text "Ask". Prompts are sent with staff names replaced by UIDs.

| Screen | Buttons |
|---|---|
| Home | Brief me on today |
| Dashboard | Explain the numbers |
| Open a case | Draft show cause notice (fills allegation, questions and clauses) |
| Case | Summarise; Check against the procedure |
| Case, lead at `sc_answered`/`ready`/`returned` | Suggest clauses, action and reason (fills the propose form) |
| Case, lead at `sc_returned` | Revise with the manager's note |
| Case, mgr at `sc_draft` | Check the show cause notice |
| Case, mgr at `review` | Draft my recommendation |
| Case, head/pcd at `pending`/`prelim` | Draft approval comment |
| EmployeeVoice | Summarise; Draft a reply; Draft a decision (lead); Draft recommendation note (mgr); Check the decision (pcd) |
| PIP | Summarise; Check this PIP (lead, `hr_review`) |
| Investigation | Summarise; Suggest next steps |
| PM appeal | Summarise; Check it's ready for the committee (lead); Draft the committee decision (mgr) |

"Use this" fills form fields only. Nothing is submitted automatically.

### 2.7 Present in the code but unreachable in the current UI
- Staff Dashboard (`staffDashboard`): hero, attention cards, "Coming up", quick actions, other services.
- `ESS_EXISTING` stub modules: Per Diem, PF, Non-BML Activity, Conflict of Interest, FX Requests, Coaching.
- **"Minutes to Sign" (`staffToSign`, tab `tosign`).** This is the only screen where a meeting **attendee** signs. It has no sidebar item and `tosign` is not in the valid tab list, so attendee signing cannot be reached (see §10).
- Anonymous tracking-code lookup form (`trackForm`).
- Testing mode (`TEST_MODE = false`; its checkbox was removed).

---

## 3. End-to-end flows and statuses

### 3.1 Disciplinary case statuses (`STATUS`)

| Status | Label | Owner (`owner()`) |
|---|---|---|
| `escalated` | New concern: open case | lead |
| `sc_draft` | Show cause draft: with ER Manager | mgr |
| `sc_returned` | Show cause returned for changes | lead |
| `sc_issued` | Show cause: awaiting staff reply | staff |
| `sc_answered` | Reply received: propose action | lead |
| `min_staff` | Minutes: awaiting staff signature | staff |
| `min_amend` | Minutes: amendment requested | lead |
| `min_lead` | Minutes: ER Lead to sign and send | lead |
| `min_att` | Minutes: awaiting attendee signatures | attendees |
| `ready` | Ready: propose action | lead |
| `review` | Awaiting ER Manager review | mgr |
| `returned` | Returned to ER Lead | lead |
| `pending` | Awaiting approval | `route(c).role`: head / pcd / dg |
| `prelim` | Preliminary decision issued | staff until they respond, then the approver |
| `issued` | Notice issued | staff until opened (`ackOn`), then none |
| `recorded` | Recorded (verbal advice) | staff until opened, then none |
| `closed` | Closed, no action | none |

### 3.2 Intake
1. **Line manager concern.** Submitting the concern form creates a case with `source:"escalation"`, `method:null`, `status:"escalated"`, `escBy`={manager UID} and `esc:{type, when, details, discussed, verbalRef}`.
2. **Compliance referral.** Creates `source:"investigation"`, `escBy:"compliance"`, `status:"escalated"` and `esc.type` "Compliance referral (INV-…)".
3. **ER Lead "+ Open case".** A direct case, with source chosen from: Line manager concern / Internal investigation / PIP outcome.
4. **From an escalated case.** "Open case" reuses the same case object; "Close with no action" moves it to `closed`.
5. **From EmployeeVoice.** "Open disciplinary case" (formal, named) opens the case form prefilled with the accused (matched by exact name) and the description as the allegation.
6. **From an investigation.** "Open disciplinary case" (findings recommend action) opens the case form with the employee, source "investigation" and the findings as the allegation.
7. **From a PIP** (`makeCase`). The case is created with `source:"pip"`, `method:"pip"`, clause 3.2(3) and `escBy`={manager}:
   - PIP 2 check-in "not meeting requirements" → `ready` with action `caution` (check-in 1) or `final` (check-in 2).
   - PIP final outcome not met → `recorded` Verbal Advice.
   - PIP 2 final outcome not met → `ready` with action `dismiss`.
8. **Verbal advice by a line manager.** Created directly as `recorded` (`decidedRole:"line"`, `escBy`={manager}). The ER Lead can also "Log verbal advice" from the case form (`decidedRole:"lead"`).

### 3.3 Questioning paths (chosen when the case is opened)

**A. Show cause notice**
1. **ER Lead submits the draft.** Status becomes `sc_draft`, with `sc.issuedOn=null` and `sc.due` (default today +3 WD).
2. **ER Manager approves or returns.**
   - Approve (`scapprove`): status becomes `sc_issued`. `issuedOn` is set to today, and `due` is raised to at least today +3 WD.
   - Return (`screturn`, note required): status becomes `sc_returned`.
3. **ER Lead revises** (`scresubmit`): allegation, questions and due date. Status goes back to `sc_draft`.
4. **Staff replies** (`scsubmit`; every question needs an answer, "No comment" allowed). Status becomes `sc_answered`.
   - If no reply arrives, the ER Lead can "Continue without a reply" (`noreply`) once the due date has passed. This sets `sc.noReply` and moves the case to `sc_answered`.

**B. Meeting with minutes**
1. **ER Lead records the meeting** (date, venue, Q&A entries, attendees). Status becomes `min_staff`.
2. **Staff signs or asks for an amendment.**
   - Sign (`signstaff`, confirmation tick): status becomes `min_lead`.
   - Request amendment (`amendreq`, text of 5+ characters): an amendment is added with `status:"pending"`, and the case moves to `min_amend`.
3. **ER Lead decides an amendment.**
   - Approve (`amendok`): the lead edits answers inline and may add an "Amendment" entry.
   - Decline (`amendno`): a note is required.
   - Either way the amendment status, note and date are recorded and the case goes back to `min_staff` to be re-signed.
4. **ER Lead signs and sends** (`signlead`), choosing attendees from all employees except the subject.
   - With attendees: status becomes `min_att`.
   - With none: status becomes `ready`.
5. **Each attendee signs** (`signatt`, confirmation plus optional comment). When all have signed, status becomes `ready` and a system event "All signatures complete. Returned to ER Lead" is logged.

**C. Log verbal advice** (ER Lead): straight to `recorded`. This is blocked if any clause is 3.1 (see §4).

### 3.4 Decision path
1. **ER Lead proposes** (`propose`) from `sc_answered`, `ready` or `returned`.
   - Inputs: clauses (or Other), action (Cautionary / Final Warning / Dismissal), reason (15–400 characters), additional actions (§6), and "preliminary decision first" (enabled only for Final Warning or Dismissal).
   - The proposal is blocked if `route()` returns a block flag.
   - Status becomes `review`.
2. **ER Manager reviews.**
   - Recommend (`recommend`): may change the action and set preliminary (Final/Dismissal only). Blocked if the new action is blocked. Status becomes `pending`.
   - Return (`mreturn`, note required): status becomes `returned`.
3. **Approver decides** (head / pcd: `approve` or `areturn`).
   - Approve without preliminary: status becomes `issued`, with `decidedRole` and `decidedOn` set.
   - Approve with preliminary: status becomes `prelim`, with `prelimOn` set.
   - Return (note required): status goes back to `review`.
   - The approve button is disabled when the route is blocked.
4. **D&G Committee** (`dgrecord`; members and minutes required).
   - Approve, or change the action. Changing to anything other than Final/Dismissal clears preliminary. The case then moves to `prelim` (if preliminary) or `issued` (with `decidedRole:"dg"`).
   - Return to Employee Relations: status goes back to `review`.
   - All outcomes store `dgMin`.
5. **Preliminary decision.**
   - Staff responds (`respond`, text) or chooses "I have nothing to add" (`noresp`). This stores `staffResponse`, and ownership moves to the approver.
   - The approver then confirms (`finalise`), with the option to change the action. Status becomes `issued`.
6. **Receipt.** When staff open the notice (`viewnotice`), `ackOn` and `ackAt` are set and a trail event is logged.

### 3.5 PIP statuses (`PIP_STATUS`) and flow

| Status | Label |
|---|---|
| `hr_review` | With ER Lead for approval |
| `returned` | Returned by People & Culture |
| `meeting` | Approved: hold initial meeting |
| `to_sign` | Awaiting employee signature |
| `active` | In progress |
| `met` | Completed: met |
| `not_met` | Completed: not met |

1. **Intake.** The ER Lead may send year-end Poor ratings to managers as PIP requests (§3.9).
2. **Manager submits the draft.** Status becomes `hr_review`. The draft is blocked if the employee already has an open PIP (any status other than `met`/`not_met`).
3. **ER Lead decides.**
   - Approve (`pipapprove`): status becomes `meeting`.
   - Return (`pipreturn`, note required): status becomes `returned`. The manager resubmits (`pipresubmit`), returning it to `hr_review`.
4. **Manager holds the initial meeting** (`pipmeeting`: meeting date and comments). Status becomes `to_sign`.
5. **Employee signs** (`pipsign`: tick plus optional comments). Status becomes `active`.
6. **Review periods.** There are `months` periods, each due 1, 2, … months after the start. The last is the "Final review". Each period runs:
   1. Employee self-assessment (`rvself`): rating per goal (Not met / Partially met / Met), comments and overall comment. The manager can instead start the review without one (`rvskip`).
   2. Manager review (`rvmgr`): rating and comment per goal, plus a summary.
      - Interim outcome is "On track" unless any goal is Not met, in which case it is "Not meeting requirements".
      - For **PIP 2** check-ins that are not meeting requirements, a case is created (check-in 1 → Cautionary; check-in 2 → Final Warning).
   3. Employee sign-off (`rvack`). Comments are optional at interim reviews and required at the final review. Interim periods are then done.
   4. Final review only: manager confirms the outcome (`rvconfirm`).
      - **Met** only if every goal is rated Met. Status becomes `met`.
      - Otherwise status becomes `not_met`, and a case is created: PIP → Verbal Advice; PIP 2 → Dismissal recommendation.
7. **PIP 2.** After a PIP is `not_met`, the manager gets "Draft PIP 2". It is prefilled with the employee and concerns, has a fixed 3 months, and has no prior-discussions section.

### 3.6 EmployeeVoice stages and statuses
- **Display stage** (`vStage`): `submitted` (no `receivedBy`), `received`, `review`, `closed`.
- **Stored status:** `submitted`, `review` or `closed`.

| Event | Effect |
|---|---|
| P&C acknowledges (`vreceive`, ER Lead) | Sets `receivedBy` and `receivedAt`; system thread "Received by People & Culture"; submitter notified (`unread`) |
| Reviewer reply (`vrevreply`) | Status becomes `review`. Non-formal channels can choose "Closed (message becomes the outcome)" |
| Chief replies | Receipt is recorded automatically first; the Chief never has a receipt step |
| Staff reply (`vstaffreply`) | Sets `needsReply` (shows as a new reply for the reviewer) |

**Formal decision** (grievance, harassment, gender; after receipt):
1. ER Lead proposes (`decpropose`): outcome (Grievance upheld / Partly upheld / Not upheld) plus decision text. Decision stage becomes `mgr` and status `review`.
2. ER Manager recommends (`decrecommend`, optional note). Stage becomes `pcd`. The ER Manager can instead return it (`decreturn`, note required), which sends it back to stage `lead`.
3. PCD approves (`decapprove`). Stage becomes `done` and status `closed`. The outcome is set to "{Outcome}. {text}", a thread message and a system message are posted, and the submitter is notified. The PCD can instead return it (`decreturn`), which sends it back to stage `lead`.

Formal types can only be closed through the decision path. The reply box does not offer "Closed" for them.

### 3.7 Investigations
1. **ER Lead requests** an investigation, from the Investigations list or from a case. Status becomes `open`, and a trail event is added to the linked case.
2. **Compliance submits findings** (`findings`, `recommend`: action / none). Status becomes `done`, `ack:false`, and a trail event is added to the linked case.
3. **ER Lead marks as reviewed** (`ack:true`), or chooses "Open disciplinary case".

### 3.8 Records checks (Talent Acquisition)
1. **TA submits** UIDs and a reference. Status becomes `pending`.
2. **ER Lead decides.**
   - Approve and release: status becomes `approved` and `results` are computed.
   - Return (note required): status becomes `rejected`.
3. **Expiry.** 30 days after the decision, the status is derived as `expired` (`taStatus`).
- **Result rule:** "Yes" if the staff member has a case with `status:"issued"` and action Cautionary or Final Warning, decided within the 365 days up to the request date. Verbal Advice is not counted.

### 3.9 Year-end ratings to PIP requests
1. **Source data.** `PM_RESULTS` (year, sharedOn, rating per UID) is hard-coded sample data.
2. **ER Lead sends requests.** The card lists staff rated **Poor**; for each it shows a status or a selectable checkbox:
   - **Not selectable**, with the reason shown:
     - "Line manager not set up in ESS" (no `managerUid`).
     - "PIP already open".
     - A request already exists for this year.
   - **Selectable:** checked by default.

   "Send to line managers" uses a "Draft PIP by" date (default +10 WD) and creates one `pipReqs` row per staff member.
3. **Manager starts the PIP.** The manager gets a to-do and a "Start PIP" button. The PIP form opens with the employee and the "Poor rating" basis preselected.
4. **Request status** (`reqStatus`) is derived:
   - A PIP for the staff member whose first trail date is on or after the request date: that PIP's status.
   - Otherwise, past the due date: "Overdue: no PIP drafted".
   - Otherwise: "Waiting for line manager · due {date}".

### 3.10 PM appeals
1. **Window.** The ER Lead opens a window (`apopen`: performance year and close date, default +10 WD) or closes it (`apclose`).
   - **While open:** staff can submit one appeal for that year (the button is hidden once they have one).
   - **While closed:** staff can only view past appeals.
2. **Statuses** (`AP_STATUS`): `submitted` (With Employee Relations), `committee` (With Review Committee), `decided` (Decision issued).
3. **Flow:**
   1. Staff submits. Status is `submitted`.
   2. ER Lead "Send to Review Committee" (`apfwd`). Status becomes `committee`, with `fwdOn` set.
   3. ER Manager "Record the Review Committee decision" (`apdecide`): outcome (Original rating upheld / Rating revised), revised rating, meeting date, reference and decision text (10+ characters). Status becomes `decided`, `seen:false`, and the staff member gets a to-do.
4. **What staff see:** "Review Panel Decision · Decision by Review Committee · {date} · {ref}", with Rating received, Rating after appeal and the text.

### 3.11 Records register scopes (`recRows`)

| Scope | Contents |
|---|---|
| Self (My Records) | Own cases that staff have been told about: a show cause has been issued, minutes exist (any status except `min_lead`), or the case is prelim/issued/recorded. Status labels are simplified (Issued / Recorded / Preliminary decision / Closed, no action / In progress). Also own EmployeeVoice (including anonymous), own PIPs from `meeting` onwards, own appeals |
| Team | Cases and PIPs for the manager's direct reports |
| lead, mgr, head, pcd | Everything: cases, PIPs, all EmployeeVoice including Chief (labelled "Awaiting the Chief's response" until the Chief replies), investigations, records checks, appeals |
| dg | Cases routed to D&G that have an action |
| comp | Investigations and the cases it referred |
| ta | Its records checks |
| chief | Chief submissions |

Every scope can be filtered by type, status and year, searched, and exported to CSV.

---

## 4. Routing rules and flags (`route(c)`)

### 4.1 Category
- The case is **Serious/Gross Misconduct** if any clause starts with `3.1`, or if an "Other" breach is marked "treat as Serious/Gross".
- Otherwise it is **Other Misconduct**.

### 4.2 Before an action is chosen
The case page shows a preview: "On current facts this would go to:"
- D&G Committee, for serious cases.
- People & Culture Director, for Head grade and above (rank ≥ 5) or anyone in Total Rewards & Employee Relations.
- Head of Total Rewards & Employee Relations, otherwise.

### 4.3 Final approver once an action is set

| Condition | Approver role | Reason text |
|---|---|---|
| Action is Verbal Advice | None (line manager) | "Verbal advice is given by the line manager and logged by ER. No review or approval (§5(1))." |
| Serious category, or action is Dismissal | `dg` (D&G Committee) | "Includes Serious/Gross Misconduct (…). Decided by the committee (§2, §4(7))." / "Dismissal is referred to the committee in this prototype." |
| Employee grade rank ≥ 5 (Head, Director) | `pcd` | "{designation} is Head level or above, so the People & Culture Director approves." |
| Employee in "Employee Relations" (matched on department text) | `pcd` (plus a warn flag) | Conflict of interest |
| Otherwise | `head` | "{grade} grade, below Head level, so the Head of TR&ER approves." |

Grades (`RANKS`, index = rank): Officer (0), Senior Officer (1), Assistant Manager (2), Manager (3), Senior Manager (4), Head (5), Director (6). `HEAD_RANK = 5`.

### 4.4 Flags
Severities: `block` (shown as "Stop"; prevents propose, recommend, approve and verbal logging), `warn` ("Check"), `info` ("Note").

| Severity | Trigger | Text (abridged) |
|---|---|---|
| info | "Other" breach treated as Other Misconduct | P&C decides on severity and impact (§3.2) |
| info | "Other" breach treated as Serious | D&G Committee evaluates (§3.1) |
| info | More than one breach | One notice lists them all; the most serious sets the route |
| block | Verbal Advice on a serious case | Serious cases go to D&G, not verbal advice |
| warn | Employee works in TR&ER | Escalated to the Director to avoid a conflict of interest |
| **block** | The same action was already given for an overlapping clause (any prior issued/recorded case, **no time limit**) | "{Action} was already given for {clauses} ({id}, {date}). The procedure allows it only once per issue." |
| info | Other Misconduct where the action skips a step for the same issue (step > last step + 1; not Dismissal) | Allowed where warranted (§5(2)–(3)); the reason should say why |
| warn | 2 or more prior actions (any issue) | Consider multiple/repeated misconduct (§3.1(17), §5(5)) |
| warn | Final Warning issued within the last 365 days (when the action is not Dismissal) | Further misconduct may warrant dismissal (§5(4)) |
| info | PIP-sourced case without clause 3.2(3) | PIP cases normally use 3.2(3) |

Progressive steps (`ACTIONS.step`): Verbal Advice 1, Cautionary 2, Final Warning 3, Dismissal 4.

### 4.5 Other routing-related rules
- **Preliminary decision** (§4(8)) is available only for Final Warning and Dismissal.
- **Who sees a case.** The ER Lead and ER Manager see all cases. The Head, PCD and D&G see only cases routed to them in `pending`, `prelim` or `issued`.
- **EmployeeVoice reviewer.** The `chief` channel goes to the Office of the Chief; all others go to People & Culture (ER Lead).

---

## 5. Form fields

`*` means required. Unless noted otherwise, validation runs when the form is submitted. Step forms (marked "steps") also check `data-req` fields on Next, keep drafts in memory and `localStorage` (`draft:{key}`), and end with an automatic review summary.

### 5.1 Submit a Staff Concern (line manager): `escForm`

| Field | Type | Req | Options / rules |
|---|---|---|---|
| Team member `e-uid` | select | * | Direct reports |
| Type of concern `e-type` | select | | Attendance or absence; Conduct or behaviour; Use of Bank systems or resources; Customer complaint; Other |
| When it happened `e-when` | text | | Saved as "Not stated" if blank |
| What happened `e-details` | textarea | * | At least 20 characters |
| Have you discussed it with the employee? `e-disc` | select | | No; Informally; Yes, I gave verbal advice |
| Which verbal advice? `e-va` | select | | Shown only for "Yes, I gave verbal advice"; lists that employee's verbal advice records; saved in `esc.verbalRef` and appended to `discussed` text |

### 5.2 Give Verbal Advice (line manager): `vaForm`

| Field | Type | Req | Notes |
|---|---|---|---|
| Team member `va-uid` | select | * | Direct reports; shows an info card |
| Date discussed `va-date` | date | | Default today; becomes `decidedOn` |
| Concern `va-concern` | textarea | * | At least 10 characters |
| Suggestion for improvement `va-sugg` | textarea | * | At least 10 characters |
| (display) Impact | text | | `VERBAL_DISCLAIMER` |

### 5.3 Open a case (ER Lead): `caseForm`

| Field | Type | Req | Notes |
|---|---|---|---|
| Employee `f-uid` | select | * | All employees; locked when opened from a concern |
| Source `f-source` | select | | Line manager concern / Internal investigation / PIP outcome (underperformance) |
| Suspected breach | checkboxes `fc-ck` + Other | * | At least one clause, or Other with text of 5+ characters. Other: text `fc-otxt` and "Treat as" `fc-ocat` (Other Misconduct §3.2 / Serious/Gross §3.1) |
| Method `f-method` | radio | | Show cause notice / Meeting with minutes / Log verbal advice |
| Allegation `sc-alleg` (show cause) | textarea | * | At least 15 characters; prefilled from the concern |
| Questions `q-in` (show cause) | text list | * | At least 1; defaults to the 3 standard questions; "+ Add a question" |
| Reply due `sc-due` (show cause) | date | | Default today +3 WD |
| Meeting date `mi-date` (minutes) | date | | Default today |
| Venue `mi-venue` (minutes) | text | | Default "People & Culture meeting room, 3rd floor" |
| Who else attended `fa-att` (minutes) | checkboxes | | All employees; defaults to Investigation Officer (BML-10077); the subject is excluded on save |
| Q&A rows `mq`/`ma` (minutes) | text + textarea | * | At least 1 question; every question needs an answer; "+ Add a question and answer" |
| Concern `v-reason` (verbal) | textarea | * | At least 15 characters |
| Suggestion `v-sugg` (verbal) | textarea | * | At least 10 characters |

### 5.4 Case task forms

| Task | Fields |
|---|---|
| Revise show cause (lead) | Allegation `rv-alleg`; questions `rv-q` (the existing ones, editable); reply due `rv-due` |
| Approve show cause (mgr) | Note `sc-note` (required to return) |
| Sign and send minutes (lead) | Attendees `sa-att` (checkboxes) |
| Review amendment (lead) | Editable answer per entry `ama-{i}`; note added to minutes `amx-{id}` (optional; appended as an "Amendment" entry); note to employee `amn-{id}` (required to decline) |
| Propose action (lead) | Clauses `pc-ck` + Other; Proposed action `p-action` (Cautionary / Final Warning / Dismissal; default Cautionary); Reason `p-reason` (15–400 characters); Additional actions `px` (Withholding of promotion, increment, bonus and credit facilities §6(1) / Recovery of financial loss from salary §6(2) / Demotion §6(3)); Preliminary decision `p-prelim` (Final/Dismissal only) |
| Review and recommend (mgr) | Recommended action `m-action`; Preliminary `m-prelim`; Recommendation note `m-note` (required to return) |
| Approve (head/pcd) | Comment `a-note` (required to return) |
| Confirm final decision (approver, prelim) | Final action `a-action`; Comment `a-note` (optional) |
| Record committee decision (dg) | Meeting date `dg-date` (default today); Meeting reference `dg-ref` (e.g. "D&G 11/2026"); Members present `dg-members` *; Committee decision `dg-dec` (Approve {action} / Change to {other action} / Return to Employee Relations for more information); Minutes `dg-min` * |

### 5.5 Staff case forms

| Form | Fields |
|---|---|
| Show cause reply | One textarea per question `sca-{id}-{i}`, all required ("No comment" allowed); cannot be edited after submitting |
| Sign minutes (employee) | Confirmation `smok-{id}` *; or Request amendment: "What should be changed?" `sma-{id}` (5+ characters) |
| Sign minutes (attendee; unreachable, §2.7) | Comment `atc-{id}` (optional); confirmation `atok-{id}` * |
| Preliminary decision response | Your response `resp-{id}` (required for Submit) or "I have nothing to add" |
| Verbal advice response | Your response `va-{id}` (optional task; required to submit) |

### 5.6 EmployeeVoice forms

**Formal grievance** (steps: What happened, Steps taken, Review). An info card shows the employee.

| Field | Type | Req |
|---|---|---|
| When and where did it happen? `event` | textarea | * |
| What happened, and who was involved? `description` | textarea | * |
| Have you tried to resolve it already? What happened? `previous` | textarea | * |

**Harassment Complaint Form** (steps: Complainant, Alleged harasser, The incident, Description, Sign & submit)

| Section | Field | Type | Req |
|---|---|---|---|
| Information of the complainant | Name `cname` | text, read-only (profile) | |
| | NIC No `nic` | text | * |
| | Present Address `addr` | text | * |
| | Contact no `contact` | tel | * |
| | Permanent Address `paddr` | text | |
| | Job title `cjob` | read-only | |
| | Division/Department/Unit `cunit` | read-only | |
| Information of the alleged harasser | Name `aname` | text | * |
| | NIC No `anic` | text ("If known") | |
| | Present Address `aaddr` | text | |
| | Contact no `acontact` | tel | |
| | Permanent Address `apaddr` | text | |
| | Position & Place of Employment `apos` | text | * |
| The incident | List any witnesses who were present or provide evidence `witnesses` | textarea | |
| | Where did the incident occur? `where` | text | * |
| | Date and time of occurrence `when` | datetime-local | * |
| | If the harassment was towards another person, please identify that person: `other` | textarea | |
| Description | Brief description of the harassment `description` | textarea | * |
| Signature | Date `sdate` | read-only (today) | |
| | Signature of the complainant `vf-sign` | checkbox (e-signature) | * |

**Complaint Form for Gender Discrimination** (steps: Complainant, Accused, Description, Sign & submit)
- **Complainant:** the same fields as the harassment form.
- **Accused:**
  - Name `aname` *
  - NIC No `anic`
  - Contact no `acontact`
  - Contact no `acontact2` (second number)
  - Email `aemail` (email)
  - Position & Place of Employment `apos` *
- **Description:**
  - Brief Description of the Complaint `description` * (hint: "If any documents are submitted with the form, please provide details here").
  - Documents submitted with the form `docs` (multi-file upload; only file names are kept).
- **Signature:** Name of the complainant `sname` (read-only), Date `sdate`, Signature `vf-sign` *.

**Share with the Chief / Share with People & Culture** (single page)

| Field | Type | Req | Options |
|---|---|---|---|
| Type `vf-kind` | radio | | Concern / Idea or suggestion |
| Subject | text | * | |
| Details | textarea | * | |
| Submit anonymously `vf-anon` | checkbox | | Default ticked |

**Reviewer and staff thread forms**
- **Reply:** `vr-{id}`, required.
- **Status after sending:** `vs-{id}` (Under review / Closed; Closed is not offered for formal types).
- **Decision:** Outcome `dec-out` (Grievance upheld / Partly upheld / Not upheld) and Decision and actions `dec-text` *.
- **Recommendation / approval note:** `dec-note` (required to return).

### 5.7 PIP form (line manager; steps: Team member, Concerns, Goals, Support, Review)

| Field | Type | Req | Notes |
|---|---|---|---|
| Team member `pp-uid` | select | * | Locked for PIP 2; info card shows date of joining and line manager |
| Basis `pp-basis` | radio | | "Underperformance documented for 3 months" (default) / "'Poor' rating at year-end review". Not shown for PIP 2 |
| Areas of concern (rows: Area, Resulting issues) | text pairs | * | At least 1 (area); 2 rows by default |
| Observations, previous discussions or coaching sessions (rows: Date, Area, Summary) | date + text | * if basis = 3 months | At least 2 rows required for the 3-month basis; not shown for PIP 2 |
| Improvement goals (SMART) | text rows | * | At least 1, at most 5 |
| Activities (rows: Goal #, Activity, Start, Estimated completion) | text/date | * | At least 1 (activity); dates default to the start date |
| Resources / management support | text rows | * | At least 1 |
| Start date `pp-start` | date | | Default today +7 days |
| Duration `pp-months` | select | | 3 months (standard) / 4 / 6; fixed at 3 for PIP 2 |
| Line Manager comments `pp-comment` | textarea | | |

**PIP task forms**

| Task | Fields |
|---|---|
| ER approval | Note to the line manager `hr-note` (required to return) |
| Initial meeting | Meeting date `pm-{id}` (default today); Line Manager comments `pmc-{id}` |
| Employee sign | Employee comments `pe-{id}`; "I have read and understood this plan" `pok-{id}` * |
| Self-assessment | Per goal: rating (radio: Not met / Partially met / Met) * and comment; overall comments |
| Manager review | Per goal: rating * and comment; Review summary * |
| Sign-off / final response | Comments `rak-{id}` (required at the final review) |

### 5.8 PM Appeal Form (staff; steps: Instructions, Appeal Information, Your appeal, Review)
- **Instructions:**
  1. Identify the specific reasons or KPI(s) you are contesting.
  2. Propose the rating you believe is right for each KPI.
  3. Provide facts to support your appeal for each KPI.
  4. Attach supporting evidence for each KPI.
  5. If you are contesting the overall rating, explain why.

| Field | Type | Req | Options |
|---|---|---|---|
| UID, Name, Division, Department/Unit | read-only | | From profile |
| Appraiser `ap-appraiser` | text | * | Default: line manager's role/designation |
| PM rating received `ap-rating` | select | * | Excellent, Very Good, Good, Satisfactory, Poor |
| Reasons for appeal `ap-r` | checkboxes | * (at least 1) | Overall Rating, Specific KPI/Competency, PM Discussion, Other (+ "Other reason" text, required if ticked) |
| Expected Rating `ap-expected` | select | * | Same scale |
| Justification `ap-justification` | textarea | * | |
| Additional Documents `ap-docs` | file (multiple) | | At most 5; accepts .doc(x), .xls(x), .ppt(x), .pdf, image, video, audio; only names are kept |

**Review Committee decision** (ER Manager)
- Outcome `ad-out`: Original rating upheld / Rating revised.
- Revised rating `ad-rating`: shown only for "Rating revised"; defaults to the expected rating.
- Committee meeting date `ad-date`.
- Meeting reference `ad-ref`.
- Decision `ad-text` *: at least 10 characters.

**Appeal window** (ER Lead): Performance year `apw-year` (number) and Closes on `apw-close` (date, default +10 WD).

### 5.9 Investigations, referral and records checks
- **Request investigation** (ER Lead):
  - Staff member `iv-uid` (optional).
  - Linked record `iv-ref`: open cases and open formal EmployeeVoice items; optional.
  - Subject `iv-subj` *.
  - Scope `iv-scope` *: at least 10 characters.
  - Findings needed by `iv-due`: default +7 WD.
- **Submit findings** (Compliance): Findings `fd-text` * (at least 10 characters); Recommendation `fd-rec` (Recommend disciplinary action / No further action).
- **Refer a staff concern** (Compliance):
  - Staff member `cm-uid` *.
  - Related investigation `cm-inv`.
  - When it happened `cm-when`.
  - Concern and evidence `cm-det` *: at least 15 characters.
- **New records check** (TA):
  - UIDs `ta-list`: free text, split on space/comma/semicolon. "BML-12345", "BML12345" and "12345" are all accepted. Duplicates are removed, and UIDs not in the directory block submission. At least 1 required.
  - Reference `ta-ref` *: at least 3 characters.
- **Records check decision** (ER Lead): Note `ta-note`, required to return.
- **PIP requests** (ER Lead): staff checkboxes `prq-ck`; Draft PIP by `prq-due`.

---

## 6. Data model

All data lives in in-memory arrays and resets on reload. Dates are ISO `YYYY-MM-DD` strings unless noted.

### 6.1 Employee (`EMPLOYEES`, 31 records)
- **Fields:**
  - `uid` (BML-NNNNN), `name`, `designation`, `dept`
  - `rank`: 0–6 index into `RANKS`
  - `managerUid` (FK → Employee, 8 records) or `manager` (free-text role, 23 records)
  - `doj`
- **Derived from `ORG[uid]`:** `unit`, `department`, `division` ("—" if missing).
- **Relationships:**
  - A line manager is any employee who has others pointing at them via `managerUid`.
  - Team-role users are Employee records whose `name` is the role label.

### 6.2 Workspace assignment (`WS`)
- `{uid: {role, label, grp}}`
- [ASSUMED] In production this would come from an identity or role-mapping table.

### 6.3 Case (`cases`, 29 records)

| Field | Type | Notes |
|---|---|---|
| `id` | string | DA-YYYY-NNN |
| `uid` | FK Employee | Subject |
| `source` | enum | `escalation`, `investigation`, `pip` |
| `method` | enum or null | `showcause`, `interview`, `verbal`, `pip` |
| `clauses` | string[] | Keys of `CLAUSES` |
| `other` | object or null | `{text, serious}` |
| `action` | enum or null | `verbal`, `caution`, `final`, `dismiss` |
| `proposed` | enum or null | What the ER Lead proposed |
| `reason` | string | Goes on the notice as written |
| `suggestion` | string | Verbal advice only |
| `extras` | string[] | `withhold`, `recover`, `demote` |
| `prelim` | bool | |
| `status` | enum | §3.1 |
| `created` | date | |
| `escBy` | FK Employee, `"compliance"`, or absent | Who raised it |
| `esc` | object | `{type, when, details, discussed, verbalRef}` |
| `sc` | object | Show cause: `{allegation, issuedOn, due, questions[], answers[] or null, answeredOn, noReply?}` |
| `mins` | object | Minutes: `{date, venue, entries[{q,a}], staffSign, staffComment, leadSign, attendees[uid], attSigns{uid:date or null}, attComments{uid:text}, amendments[{on, text, status: pending/approved/declined, leadNote, decidedOn}]}` |
| `pipRef` | FK PIP | |
| `decidedRole` | role key or `"line"` | |
| `decidedOn` | date | |
| `prelimOn` | date | |
| `staffResponse`, `staffResponseOn` | string, date | Response to preliminary decision. [ASSUMED] intended; the `respond` action does not set `staffResponseOn` |
| `ackOn`, `ackAt` | date, HH:MM | Receipt (notice opened) |
| `vaResponse`, `vaResponseOn` | string, date | Response to verbal advice |
| `dgMin` | object | `{date, ref, members, minutes, decision, by}` |
| `closedNote` | string | In sample data only; not displayed |
| `trail` | array | §8 |

### 6.4 EmployeeVoice item (`voice`, 12 records)

| Field | Notes |
|---|---|
| `id` | GRV-/HC-/GD-/CH-/PC-YYYY-NNN |
| `code` | Reference code EV-XXXX-XXXX |
| `type` | `grievance`, `harassment`, `gender`, `chief`, `pc` |
| `uid` | FK Employee, or null if anonymous |
| `owner` | FK Employee; anonymous submitter, hidden from reviewers |
| `anon` | bool |
| `on`, `at` | Submitted date and time |
| `f` | Form fields per §5.6 (`cname, nic, addr, contact, paddr, cjob, cunit, aname, anic, aaddr, acontact, acontact2, aemail, apaddr, apos, witnesses, where, when, other, description, docs, event, previous, kind, subject, details, sname, sdate`) |
| `receivedBy`, `receivedAt` | Role label and "YYYY-MM-DD HH:MM" |
| `status` | `submitted`, `review`, `closed` |
| `dec` | `{outcome: upheld/partly/not, text, on, stage: lead/mgr/pcd/done, mgrNote, mgrOn, pcdOn, retNote}` |
| `thread[]` | `{on, at, by: system/pc/chief/staff, text}` |
| `outcome` | string |
| `needsReply` | bool; staff replied |
| `unread` | bool; new reviewer message for the submitter |

### 6.5 PIP (`pips`, 6 records)

| Field | Notes |
|---|---|
| `id` | PIP-YYYY-NNN |
| `uid` | FK Employee |
| `mgr` | FK Employee (line manager) |
| `type` | `PIP` or `PIP 2` |
| `basis` | `three` (3 months documented) or `poor` |
| `from` | FK PIP; the PIP this PIP 2 follows |
| `prevReview` | date |
| `start` | date |
| `months` | 3, 4 or 6 |
| `concerns[]` | `{area, issue}` |
| `prior[]` | `{date, area, summary}` |
| `goals[]` | string |
| `activities[]` | `{g, act, start, end}` |
| `support[]` | string |
| `mgrComment`, `empComment`, `hrNote` | strings |
| `hrOn`, `meetingOn`, `empSign` | dates |
| `reviews[i]` | `{self:{ratings[], comments[], overall, on, skipped?}, mgr:{ratings[], comments[], summary, on}, empAck:{comment, on}, done}` |
| `final` | `{date, assessment, response, outcome: met/not}` |
| `status` | §3.5 |
| `trail[]` | §8 |

### 6.6 Other entities

| Entity | Fields |
|---|---|
| Investigation (`invs`, 3) | `id` INV-YYYY-NNN, `on`, `uid` (FK, optional), `ref` (FK Case or EmployeeVoice, optional), `subject`, `scope`, `due`, `status` (open/done), `findings`, `recommend` (action/none), `findingsOn`, `ack` |
| Records check (`taRequests`, 4) | `id` TA-YYYY-NNN, `by` (role label), `on`, `ref`, `staff[]` (FK Employee), `status` (pending/approved/rejected; expired is derived), `decidedOn`, `note`, `results[{uid, hit, basis[]}]` (computed when approved) |
| PM appeal (`appeals`, 5) | `id` PMA-{year}-NNN, `year`, `uid`, `on`, `at`, `f{appraiser, rating, reasons[], other, expected, justification, docs}`, `status`, `fwdOn`, `dec{outcome, rating, text, on, ref, by}`, `seen` |
| Appeal window (`appealWin`, single) | `{year, open, openedOn, closes}` |
| Year-end results (`PM_RESULTS`, single) | `{year, sharedOn, ratings{uid: rating}}` |
| PIP request (`pipReqs`, 1) | `id` PR-{year}-NNN, `uid`, `mgr`, `year`, `on`, `due` |

### 6.7 Relationships
- **Employee 1–N:** Cases (subject), EmployeeVoice (`uid` or `owner`), PIPs (subject), Appeals, Investigations.
- **Employee as manager 1–N:** PIPs (`mgr`), Cases (`escBy`), PIP requests (`mgr`).
- **Case links:**
  - Case N–1 PIP (`pipRef`).
  - Case 1–N Investigations (`inv.ref`).
  - Case → Verbal Advice Case (`esc.verbalRef`).
  - Case → prior Cases (derived through `priorActions` by uid).
- **PIP 2 → PIP** (`from`).
- **Records check N–N Employee** (`staff[]`).
- **Requests:** PIP request → PIP (derived: same uid, created on or after the request date). Investigation → EmployeeVoice (`ref`, optional).

### 6.8 Reference lists in config
`CLAUSES` (26: 3.1(1)–3.1(17) including 3.1(10a–e), and 3.2(1)–3.2(5)), `ACTIONS`, `EXTRAS`, `SOURCES`, `METHODS`, `ISSUE_TYPES`, `VOICE`, `VOICE_KINDS`, `STD_QUESTIONS`, `RANKS`, `PM_RATINGS`, `AP_REASONS`, `AP_OUT`, `DEC_OUT`, `RATINGS` (PIP: not/partial/met), `TA_PURPOSES` (defined but unused).

---

## 7. Generated documents

**All documents share a letterhead:**
- "BANK OF MALDIVES PLC" in red.
- A unit line: default "People & Culture · Employee Relations", or the specific unit.
- On the right: "Ref {ref}", the date, and "Confidential".
- A red rule underneath.

**Stamps:** "DRAFT" (diagonal, red) or "UNSIGNED", as noted below.

**PDFs** are generated in the browser with jsPDF 2.5.1, in two ways:
- **Notices:** `noticePDF`, a dedicated A4 layout.
- **Everything else:** `htmlToPDF`, which converts the HTML document to A4. Each page gets the footer "Exported from the ESS Portal on {date} · Page x of y".

Characters outside Latin-1 are stripped or replaced in PDFs.

### 7.1 Decision notice: Verbal Advice, Cautionary Notice, Final Warning Notice, Dismissal, Preliminary decision
- **Ref:** `{case id}`. **Date:** `prelimOn` (preliminary) or `decidedOn`; "Not yet issued" in draft.
- **Stamp:** DRAFT while `review`, `pending` or `returned`.
- **Info table:** UID, Name, Unit, Department, Division, Date.
- **Title:** "{Action}", or "Preliminary decision: {Action}".

| Notice | Body rows |
|---|---|
| Verbal Advice | Concern (`reason`); Suggestion for improvement; Impact (`VERBAL_DISCLAIMER`); Issued by "{line manager role} (Line Manager) · {date}" |
| Other notices | Action; Category (Serious/Gross or Other Misconduct); Clause(s) breached (one line per clause: "{code} · {text}", or "Other (treated as …) · {text}"); Reason; Previous actions ("{Action} · {clauses} · {date}" per prior, or "None on record"); Additional action (if any); Impact (`consequences()` text, §9); Your response (preliminary only: "You may respond in writing by {prelimOn +5 WD}. …"); Approved by "{approver full title} · {date / preliminary, date / pending}" |

- **Footer:** "Received electronically by the employee on {ackOn} at {ackAt}." or "…when opened in the ESS Portal.", followed by "A copy is kept on your personnel file."
- **Signatures:** none. Approval and receipt are recorded electronically as text.

### 7.2 Show cause notice: ref `{id}/SC`
- **Date:** issued date, or "Not yet issued". **Stamp:** DRAFT until issued.
- **To block:** Name (UID), designation · department.
- **Content:**
  - Intro paragraph.
  - Table: Possible breach (clause lines), Allegation, Reply by "{due}, through the ESS Portal".
  - "Please answer each question below. No decision will be made before your reply is considered."
  - Numbered questions, each with its answer, "Awaiting reply" or "No answer given."
- **Footer:** "Reply submitted electronically by {name} on {date}." / "No reply received by {due}. Case continued without a reply on {date}." / "Issued by Employee Relations on {date}."

### 7.3 Minutes of disciplinary meeting: ref `{id}/MIN`
- **Date:** meeting date. **Stamp:** UNSIGNED until all signatures are in.
- **Table:**
  - Employee "{name} ({uid}), {designation}".
  - Date and venue.
  - Present: "ER Lead, {attendee roles}, {name} (employee)".
  - Matter (clause lines).
- **Body:**
  - Numbered Q&A.
  - "Amendments requested by the employee" table: date, text, then "With the ER Lead" or "Approved/Not approved by the ER Lead · {date} · {note}".
  - Optional employee corrections (legacy `staffComment`) and attendee comments.
- **Signature blocks:**
  - Employee (name).
  - Employee Relations Lead ("ER Lead").
  - One per attendee (role).

  Each block shows "Signed electronically · {date}" or "Awaiting signature".

### 7.4 Performance Improvement Plan / Targeted PIP (PIP 2) [Confidential]: ref `{PIP id}`
- **Unit:** "People & Culture · Performance Management". **Date:** start date. **Stamp:** DRAFT while `hr_review`, `returned` or `meeting`.
- **Header table:**
  - Name, UID, Designation, Section/Department, Date of joining, Line Manager (role).
  - Basis: "'Poor' rating at year-end performance review" or "Underperformance documented consistently over 3 months".
- **Fixed text:** a purpose paragraph (PIP and PIP 2 differ).
- **Tables:**
  - Areas of concern / Resulting issues.
  - Observations, previous discussions or coaching sessions (PIP only).
  - Improvement goals (SMART).
  - Activities (Goal #, Activities/actions, Start date, Estimated completion).
  - Resources / management support.
  - Progress checkpoints: monthly; type "Meeting (in person or Teams)"; progress expected "Measurable progress on all goals" or, at the final review, "All goals met".
  - Follow-up notes, from manager reviews.
- **Closing sections:**
  - Timeline for improvement (fixed text with the dates merged in).
  - "Subsequent action…" (PIP) or "Progressive disciplinary process as part of PIP 2" (fixed list).
  - Line Manager comments, Employee comments, People & Culture review note.
- **Signatures:**
  - Employee (`empSign`).
  - Line Manager (`meetingOn`).
- **Footer:** support line.

### 7.5 EmployeeVoice forms: ref `{voice id}`
- **Date:** "{date} {time}". **Unit:** "People & Culture · Employee Voice". **Title:** `VOICE.title`.

| Form | Content |
|---|---|
| Formal grievance | UID, Name, Date/time/place of event; then "Detailed description of the grievance" (Description; Previous attempts) |
| Harassment / Gender | Sections exactly as the forms in §5.6. Harassment ends with "Signature of the complainant · signed electronically" and Date. Gender ends with Name of the complainant, Signature "Signed electronically" and Date |
| Chief / P&C | Submitted by (or "Anonymous"), Type, Subject, Details, Sent to |

- **"For Official Purpose" block** (all except Chief):
  - Harassment and gender: "Form received by:" with Name, Sign "Signed electronically" and Date & Time.
  - Others: a single "Form received by" line.
  - An Outcome line once closed.
- **PDF export** adds an "Updates and responses" table built from the thread.

### 7.6 PM Appeal Form · {year}: ref `{PMA id}`
- **Table:** UID, Name, Division, Department/Unit, Appraiser, PM rating received, Reasons for appeal, Expected Rating, Justification, Additional Documents.
- **Footer:** "Submitted electronically by the employee on {date}."
- **PDF** adds the Review Panel Decision: Decision by "Review Committee · {date} · {ref}", Outcome, Rating after appeal, Decision. Before a decision it shows the status instead.

### 7.7 Other outputs
- **Record summary PDFs** (staff): "Disciplinary actions record" and "Verbal Advice record". Ref = UID, one row per action: "{date} · {id}" and "{Action} · {clauses} · {reason}".
- **Records CSV:** Reference, Type, Employee, UID, Department, Details, Status, Opened, Last update. The file is named "Records {date}.csv".
- **Records check results:** an on-screen table (UID, Name, Yes/No; plus Basis for ER only), with "Copy for Excel" as tab-separated text.

---

## 8. Audit trail events

Trail entries have the shape `{on (date only), role, text, quote?, name?}`. They are shown as "{date} {role name} · {text} “{quote}”". The role name rules are:
- `line` → "Line manager"
- `att` → "Attendee · {role}"
- `staff` → "Staff member"
- `comp` → "Compliance"
- `system` → "System"
- otherwise `ROLES[role].full`

**Times are not stored** in trail entries, except where included in the text (receipt).

### 8.1 Case trail

| Actor | Events (quote shown in brackets) |
|---|---|
| line | Submitted staff concern (details); Gave verbal advice; Sent PIP evidence to Employee Relations (note); Issued verbal advice after PIP final review (note) |
| comp | Referred staff concern to Employee Relations for disciplinary action (details); Submitted investigation findings (INV-id) (findings) |
| lead | Drafted show cause notice and sent to ER Manager for approval; Revised show cause notice and resubmitted to ER Manager; Drafted meeting minutes and sent to employee to sign; Logged verbal advice given by line manager; Signed and sent to N attendee(s): {names} / Signed minutes; no other attendees; Approved the amendment and updated the minutes / Did not approve the amendment (note); Continued without a reply after the due date; Proposed {Action} / Revised and resubmitted: {Action}; Closed with no disciplinary action; Requested investigation from Compliance (INV-id) |
| mgr | Approved show cause notice (note); Returned show cause notice to ER Lead (note); Recommended {Action} [with preliminary decision] / Changed action from X to Y and recommended it (note); Returned to ER Lead (note) |
| head / pcd | Approved (note); Approved preliminary decision (note); Returned to ER Manager (note); Confirmed final decision [as {Action}] after considering response (note) |
| dg | Committee decision recorded: Approved {Action} / Changed to {Action} / Returned to Employee Relations (minutes) |
| staff | Submitted show cause reply; Signed minutes; Requested an amendment to the minutes (text); Responded to preliminary decision (text); Responded to verbal advice (text); Received notice (opened in ESS Portal at HH:MM) |
| att | Signed minutes (comment) |
| system | Show cause notice issued to staff; All signatures complete. Returned to ER Lead; Preliminary decision sent to staff; Notice issued to staff; Final notice issued to staff; Shared with the employee and Employee Relations; Verbal advice recorded; appears in the employee's Disciplinary History |

### 8.2 PIP trail

| Actor | Events |
|---|---|
| line | Submitted draft PIP / PIP 2; Resubmitted draft to People & Culture; Held initial meeting and sent for signature; Started {check-in} without a self-assessment; {Check-in}: on track / not meeting requirements / met / not met [(proposed)] (summary); Final outcome confirmed: met / not met |
| lead | Reviewed and approved draft / Returned draft to manager (note) |
| staff | Signed the PIP (comments); Submitted self-assessment: {period}; Signed off {period} / Responded to final review (comments) |
| system | Signed PIP shared with People & Culture; Outcome shared with Employee Relations |

### 8.3 EmployeeVoice thread (date and time stored)
- **System messages:** Submitted [anonymously] (implicit first item); Received by People & Culture / the Office of the Chief; Closed by {reviewer}; Decision approved by the People & Culture Director. Closed.
- **Messages from reviewers and staff:** `by:"pc"`, `"chief"` or `"staff"`. The approved decision is posted as a P&C message.
- **The decision workflow** (propose, recommend, return) is **not** written to the thread. It is stored only in `dec` (dates per stage, `mgrNote`, `retNote`).

### 8.4 Not audited
These actions change data but write no trail entry:
- PM appeals: only the timestamps `on`, `fwdOn` and `dec.on` exist.
- Records checks: only `on` and `decidedOn`.
- Investigations, except entries on a linked case.
- PIP requests.
- Appeal window open/close.
- "Send reminder" (toast only).
- PDF and CSV exports, and record views.

---

## 9. Reference formats and timelines

### 9.1 Identifiers

| Item | Format | Generation |
|---|---|---|
| Staff UID | `BML-NNNNN` | Directory. TA input also accepts "BML12345" or "12345" |
| Disciplinary case | `DA-2026-NNN` | `nextId`: highest existing 3-digit suffix for that prefix +1. **Year is hard-coded to 2026**; sample data also has DA-2025-… |
| Show cause / minutes doc ref | `{case}/SC`, `{case}/MIN` | |
| Grievance / harassment / gender / Chief / P&C | `GRV-2026-NNN`, `HC-2026-NNN`, `GD-2026-NNN`, `CH-2026-NNN`, `PC-2026-NNN` | Prefix per channel (`VOICE.prefix`), year hard-coded |
| EmployeeVoice reference code | `EV-XXXX-XXXX` | Random; alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I, L, O, 0, 1). Generated for all submissions, shown only for anonymous ones. Not checked for uniqueness |
| PIP | `PIP-2026-NNN` | Year hard-coded |
| Investigation | `INV-2026-NNN` | Year hard-coded |
| Records check | `TA-2026-NNN` | Year hard-coded |
| PM appeal | `PMA-{performance year}-NNN` | Max suffix for that year +1 (sample includes `PMA-2025-000`) |
| PIP request | `PR-{year}-NNN` | Total request count +1 (not per year) |
| D&G meeting ref | Free text, e.g. "D&G 11/2026" | |
| Review Committee ref | Free text, e.g. "Review Committee 11/2026" | |
| TA reference | Free text, e.g. "BML/IV/2026/131" | |

### 9.2 Timelines and windows

| Rule | Value | Enforced? |
|---|---|---|
| Show cause reply due | Default today +3 WD at drafting; on approval, raised to at least approval date +3 WD | Default set and raised on approval. "Continue without a reply" is enabled only after the due date. No automatic escalation |
| Preliminary decision response window | `prelimOn` +5 WD | **Displayed only.** Not enforced. There is no auto-finalise and no lock after the deadline |
| Investigation findings due | Default +7 WD | Displayed only |
| PIP start | Default today +7 calendar days | |
| PIP duration | 3 (standard), 4 or 6 months; PIP 2 fixed at 3 months ("90 days") | |
| PIP checkpoints | Monthly from the start; last = Final review | Due dates displayed. No overdue logic |
| PIP 2 escalation | Check-in 1 not meeting requirements → Cautionary; check-in 2 → Final Warning; final not met → Dismissal recommendation | Automatic case creation |
| PIP request due | Default +10 WD | Shows "Overdue" after the due date |
| Appeal window close | Default +10 WD | Submission blocked when the window is closed. **Not blocked by the close date itself**; only the `open` flag is checked |
| Records check lookback | 365 days up to the request date | |
| Records check result access | 30 days from the decision, then "Access expired" | |
| Cautionary Notice impact | "For one year from the date of this notice, you will not be eligible for transfers/promotions…" | Notice text only |
| Final Warning impact | "For one year … not eligible for transfer/promotion, an annual increment, a performance-related bonus or employee credit facilities…" | Notice text only. Case page shows "System actions on issue": promotion/increment/bonus blocked for the decision's calendar year; credit flag until +365 days; "Payroll and Credit notified" |
| Active Final Warning flag | Final Warning within the last 365 days | Warn flag |
| Same-action-per-issue rule | No time limit | Block |
| Dashboard "Days waiting" | Days since the last ER Manager trail event (or case creation) | |
| "Actions issued, last 12 months" | `decidedOn` within the last 365 days | |

---

## 10. Open questions, stubs and gaps

### 10.1 Stubbed or fake in the prototype
1. **Sign-in.** It is a dropdown with one fixed user per role. There is no authentication or permissions layer. Visibility is enforced only in the UI code.
2. **Data.** Everything is hard-coded sample data held in memory and lost on reload, except form drafts and the motion setting in `localStorage`.
3. **The date is fixed.** "Today" is set to `2026-10-25`.
4. **Records check results are fixed when approved.** They are calculated from in-app cases at approval time and never refreshed.
5. **Year-end ratings** (`PM_RESULTS`) are hard-coded, with no import from the PM system.
6. **File uploads keep only file names.** This affects the gender complaint documents and PM appeal attachments. No files are stored or viewable.
7. **Notifications.** "Send reminder" only shows a toast, and the bell icon does nothing. Staff and manager "notifications" are in-app to-do counts only. There is no email, SMS or push.
8. **"System actions on issue" for a Final Warning** (payroll, credit and promotion blocks, "Payroll and Credit notified") is display text only. There is no integration.
9. **E-signatures** are a ticked checkbox plus the date. No identity evidence, time, IP or device is captured, and minutes signatures store a date only.
10. **PDF export, CSV export and Claude assist** depend on the Claude artifact runtime (`window.claude.use("downloads" / "sample")`) and do not work outside it. Assist prompts send case content to the viewer's own Claude account.
11. **Dormant code:**
    - Staff Dashboard, `ESS_EXISTING` modules and the `tosign` page.
    - The tracking-code lookup.
    - Testing mode: `TEST_MODE` is a `const` that the dormant toggle handler would try to reassign.
    - `TA_PURPOSES`, the `taadd_unused` action, `closedNote`, `staffComment` (legacy minutes corrections), `docnotes`.
    - `nextStep()`/`STEP_ORDER` and the `.rolebtn`/`staffSel` handlers.

### 10.2 Functional gaps to resolve
1. **Attendee signing is unreachable.** Attendees get a "Sign minutes as meeting attendee" to-do that points to the `tosign` tab, which is not in the menu. In the demo, cases in `min_att` (for example DA-2026-053) cannot be completed. The default attendee, the Investigation Officer, is also not a test user. Decision: where attendees sign, and whether non-ESS people (for example external investigators) sign. [ASSUMED] An attendee menu item is needed.
2. **The preliminary decision deadline is not enforced.** What happens when 5 WD pass with no response: auto-finalise, ER Lead prompt, or nothing?
3. **The show cause deadline only enables "Continue without a reply".** Should there be reminders or automatic escalation?
4. **The "once per issue" block has no time limit.** It blocks a repeat Cautionary Notice for the same clause even years later. Confirm whether the Procedure limits this to 12 months, or to active notices only.
5. **Clause overlap is the only definition of "same issue".** Different clauses for related conduct are not linked. [ASSUMED] ER may need a manual "same issue" override.
6. **Dismissal always goes to D&G**, labelled "in this prototype". Confirm the real authority for dismissals below Head level.
7. **Conflict-of-interest routing** uses a department text match ("Employee Relations"). Production needs a reliable org attribute and rules for other conflicts, such as the approver being the line manager. [ASSUMED]
8. **The approver cannot change the action except on a preliminary decision** (`finalise`). On a normal approval they can only approve or return. Confirm.
9. **The ER Manager can set preliminary** when recommending, overriding the ER Lead. Confirm authority.
10. **D&G "Return to Employee Relations"** sends the case back to `review` (ER Manager), not to the ER Lead. Confirm.
11. **Verbal advice logged by the ER Lead** records `decidedRole:"lead"`, but the notice says "Issued by {line manager} (Line Manager)". Confirm who is the issuer of record.
12. **Line manager visibility is inconsistent.** The concern page says managers see open/closed only, but Team Records shows internal status labels (for example "Show cause draft: with ER Manager") and notices. Decide the policy.
13. **Anonymity design.** The system stores the anonymous submitter's UID (`owner`), so they can follow and reply. Confirm this meets the anonymity promise, and who (DBAs, auditors) may see `owner`. The reference code no longer has a lookup use.
14. **Chief items appear in ER/P&C Records** with full content, while the form says P&C "can see these to make sure each one gets a response". Confirm whether P&C should see content or status only.
15. **Who receives P&C submissions.** "Received by" is always recorded as "ER Lead" / People & Culture. Is there an ER team queue with assignment?
16. **Formal complaints have no investigation workflow of their own** (witness interviews, hearing). They go from receipt straight to a decision, optionally with an investigation request or a disciplinary case. Confirm.
17. **The grievance decision chain** (ER Lead → ER Manager → PCD) applies to all formal types regardless of the employees' grades. Confirm escalation, for example for complaints against senior staff.
18. **PM appeals:**
    - The close date is not enforced (only the open flag).
    - There is no way to reject an appeal as ineligible.
    - Review Committee membership and minutes are not captured (only a reference).
    - A revised rating is not written back to the PM system.
19. **PIP:**
    - No overdue handling for check-ins.
    - No extension or pause (for example for leave).
    - "Activities" goal numbers are free text.
    - The employee cannot formally dispute ratings beyond comments.
    - The ER Lead cannot edit a draft, only approve or return it.
20. **PIP requests** link to a PIP by "same employee, created on or after the request date". Any later PIP counts, even if unrelated. [ASSUMED] An explicit link is needed.
21. **Records check** results ignore Dismissal and preliminary decisions and count only `issued` Cautionary and Final Warning notices. Confirm the rule and the 30-day access window.
22. **IDs embed the year 2026** for most types and never roll over, and PIP request numbering is global. Define real numbering per year.
23. **Time-of-day** is stored only for receipts, EmployeeVoice and appeals. Case and PIP trails store dates only. Define audit precision, and add an immutable audit log including views and exports (§8.4).
24. **Retention.** There are no rules for record retention, expiry of disciplinary actions from the record, or archiving. [ASSUMED] A requirement.
25. **Accessibility and localisation.** The UI is English only. Dhivehi support is not addressed. [ASSUMED] A requirement.
26. **"Additional actions" (§6)** (withhold, recover, demote) are recorded on the notice but trigger nothing. Integration targets are undefined.
