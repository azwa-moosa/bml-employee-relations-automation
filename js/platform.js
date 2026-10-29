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
