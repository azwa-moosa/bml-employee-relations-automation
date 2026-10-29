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
/* v39: document panels fold open and closed (<details>); pass open=true to start expanded */
const docWrap = (title, inner, noCopy, right, open) => { const acts = `${right||""}${noCopy?"":`<button class="btn sm" data-act="copy" type="button">Copy text</button>`}`;
  return `<details class="doc-wrap" ${open?"open":""}><summary class="doc-bar"><h3>${title}</h3><span class="doc-tog">${ic("chev",16)}</span></summary>${acts?`<div class="doc-acts actions">${acts}</div>`:""}${inner}</details>`; };
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
      <div class="ess-grp">Employee Relations</div>
      ${item("voice","EmployeeVoice","voice",cnt("voice"))}
      ${item("history","Disciplinary History","history",cnt("history"))}${item("appeal","PM Appeals","trend",cnt("appeal"))}
      ${hasPip?item("mypip","My PIP","target",cnt("mypip")):""}${item("myrec","My Records","archive")}
      ${mgr?`<div class="ess-grp">My Team</div>${item("concern","Submit a Staff Concern","userplus")}${item("pip","Submit a Staff PIP","chart",cnt("pip"))}${item("verbal","Give Verbal Advice","voice")}${item("teamrec","Team Records","archive")}`:""}
      ${ws?`<div class="ess-grp">My Workspace</div>${wsItem}${item("records","Records","archive")}`:""}
    </nav>`;
  const ex = ESS_EXISTING.find(x=>x[0]===tabNow);
  const [title,subtitle] = tabNow==="ws" ? [ws.label, ROLES[ws.role].full] : tabNow==="records" ? ["Records", "Every "+ws.label.replace(/ Workspace$/,"")+" record, open and closed"] : tabNow==="teamrec" ? ["Team Records","Concerns, verbal advice, PIPs and outcomes for your team"] : ex ? [ex[1],"Existing portal module"] : PAGE_META[tabNow];
  const body = tabNow==="ws" ? `<div id="wsbody" class="wsbody"></div>`
    : ex ? `<div class="ess-card"><p class="note" style="margin:0">This is an existing portal module and is not part of this prototype.</p></div>`
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
    return `<article class="stack">${task}${docWrap(noticeTitle(c)+" · "+c.id, noticeHTML(c), true, "", true)}</article>`;
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
    ${viewing?docWrap(ACTIONS[viewing.action].label+" · "+viewing.id, noticeHTML(viewing), true, pdfBtn(viewing), true):""}
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
      <details><summary class="note" style="cursor:pointer">View the ${p.type} document and history</summary><div class="stack" style="margin-top:10px">${docWrap(p.type+" · "+p.id, pipHTML(p), true, "", true)}${trailHTML(p.trail)}</div></details></article>`;
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
const UID_PREFIX = ((EMPLOYEES[0]&&EMPLOYEES[0].uid.match(/^[A-Za-z]+-/))||["EMP-"])[0];
function parseStaff(text){
  const toks = text.split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean);
  const rows=[], seen=new Set();
  toks.forEach(t=>{
    // Fixed: the handover build only accepted "BML-" while the sample data uses "EMP-", so every UID came back unknown.
    // Accept either prefix (or digits only) and normalise to the prefix used in EMPLOYEES.
    const m = t.match(/^(?:[A-Z]{2,4}-?)?(\d{5})$/i);
    const uid = m ? UID_PREFIX+m[1] : t.toUpperCase();
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
      if(!TEST_MODE && !pre && basis==="three" && prior.length<2) return fail("Record at least two previous discussions as evidence of underperformance over 3 months, or choose the year-end “Poor” rating basis.");
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


/* ---------- Testing mode: move past required fields ---------- */
let TEST_MODE = false; /* v39: off. Set to true (or add a #testMode checkbox) to auto-fill required fields while testing */
const visible = el => !!(el.offsetParent || el.getClientRects().length);
const TEST_SKIP_ACTS = ["motion","copy","pdf","toggleclosed","recexport","addq","apnew","apdoneback","apopen","apclose","invnew","vopendone","vbackland","vcopycode","remind","invfromcase","pip2start"];
function testFill(scope){
  if(!scope) return 0; let n=0;
  const lab = el => (el.closest("label")?.childNodes[0]?.textContent||el.getAttribute("aria-label")||el.placeholder||"field").trim().replace(/\s*\*$/,"").slice(0,40);
  scope.querySelectorAll("input,textarea,select").forEach(el=>{
    if(!visible(el) || el.disabled || el.readOnly || el.closest(".ai")) return;
    if(el.tagName==="SELECT"){ if(!el.value){ const opts=[...el.options].filter(o=>o.value); const o=(el.id==="pp-uid"?opts.find(o=>!pips.some(p=>p.uid===o.value && !["met","not_met"].includes(p.status))):null)||opts[0]; if(o){ el.value=o.value; el.dispatchEvent(new Event("change",{bubbles:true})); n++; } } return; }
    const t=el.type; if(["checkbox","radio","file","search","button","submit"].includes(t)) return;
    if(el.value.trim()) return;
    el.value = t==="date" ? iso(TODAY) : t==="datetime-local" ? iso(TODAY)+"T10:00" : t==="number" ? "1" : t==="tel" ? "7770000" : t==="email" ? "test@bml.mv"
      : el.id==="ta-list" ? "EMP-10421\nEMP-14102" : "Test entry: "+lab(el);
    el.dispatchEvent(new Event("input",{bubbles:true})); n++;
  });
  // confirmations and signatures
  scope.querySelectorAll('#vf-sign,[id^="pok-"],[id^="smok-"],[id^="atok-"]').forEach(el=>{ if(visible(el)&&!el.checked){ el.checked=true; n++; } });
  // a radio group with nothing chosen (e.g. PIP ratings)
  const groups = {}; scope.querySelectorAll('input[type=radio]').forEach(r=>{ if(visible(r)) (groups[r.name]=groups[r.name]||[]).push(r); });
  Object.values(groups).forEach(g=>{ if(!g.some(r=>r.checked)){ g[0].checked=true; n++; } });
  // clause pickers and appeal reasons with nothing ticked
  ["fc","pc"].forEach(p=>{ const cks=[...scope.querySelectorAll("."+p+"-ck")]; if(cks.length && !cks.some(c=>c.checked) && !scope.querySelector("#"+p+"-oth")?.checked){ const c=cks.find(c=>c.value.startsWith("3.2"))||cks[0]; c.checked=true; c.dispatchEvent(new Event("change",{bubbles:true})); n++; } });
  const ar=[...scope.querySelectorAll(".ap-r")]; if(ar.length && !ar.some(c=>c.checked)){ ar[0].checked=true; n++; }
  return n;
}
document.addEventListener("click", ev=>{
  if(!TEST_MODE) return;
  const b = ev.target.closest("button"); if(!b || b.closest(".ai")) return;
  let scope = null;
  if(b.dataset.wnext!==undefined) scope = b.closest("form")?.querySelector(":scope > .wstep:not([hidden])");
  else if(b.type==="submit" && b.form) scope = b.form;
  else if(b.dataset.act && !TEST_SKIP_ACTS.includes(b.dataset.act)) scope = b.closest(".task, .vreply, #apdecForm, #dgrec, #propose, #screv, form");
  if(!scope) return;
  if(b.type==="submit" && b.form && b.form.querySelector(":scope > .wstep")) b.form.querySelectorAll(":scope > .wstep").forEach(st=>{ const h=st.hidden; st.hidden=false; testFill(st); st.hidden=h; });
  else testFill(scope);
}, true);
document.addEventListener("change", ev=>{ if(ev.target.id==="testMode"){ TEST_MODE = ev.target.checked; try{ localStorage.setItem("testMode", TEST_MODE?"1":"0"); }catch(e){} toast(TEST_MODE?"Testing mode on: required fields can be skipped":"Testing mode off: required fields are checked"); } });

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

