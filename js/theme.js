/* =====================================================================
   Light / dark / auto switch (visual only).
   Sets <html data-theme="light|dark"> or removes it for "auto" (follow
   the device). The choice is remembered in this browser.
   ===================================================================== */
(function(){
  var KEY = "era-theme";
  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function saved(){ try{ return localStorage.getItem(KEY) || "auto"; }catch(e){ return "auto"; } }
  function effective(mode){ return mode === "auto" ? (mq && mq.matches ? "dark" : "light") : mode; }
  function apply(mode){
    if(mode === "light" || mode === "dark") root.setAttribute("data-theme", mode); else root.removeAttribute("data-theme");
    var meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute("content", effective(mode) === "dark" ? "#121110" : "#f7f5f4");
    var btns = document.querySelectorAll("#themeSwitch [data-theme-set]");
    for(var i=0;i<btns.length;i++) btns[i].setAttribute("aria-pressed", String(btns[i].getAttribute("data-theme-set") === mode));
  }
  apply(saved());
  document.addEventListener("DOMContentLoaded", function(){
    apply(saved());
    var sw = document.getElementById("themeSwitch");
    if(sw) sw.addEventListener("click", function(ev){
      var b = ev.target.closest("[data-theme-set]"); if(!b) return;
      var mode = b.getAttribute("data-theme-set");
      try{ localStorage.setItem(KEY, mode); }catch(e){}
      apply(mode);
    });
  });
  if(mq && mq.addEventListener) mq.addEventListener("change", function(){ apply(saved()); });
})();
