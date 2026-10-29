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

