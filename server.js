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
