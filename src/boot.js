/* ================= boot ================= */
function boot() {
  // Number sense first, then operations and reasoning, then shape and space.
  const ORDER = ['base-ten', 'ten-frames', 'hundred-chart', 'number-line', 'fractions', 'area-model', 'balance', 'algebra-tiles', 'pattern-blocks', 'tangram', 'geoboard', 'cubes', 'clock'];
  TOOLS.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  app.wrap = $('#wrap'); app.ws = $('#ws');
  app.L = { under: $('#lUnder'), pieces: $('#lPieces'), over: $('#lOver'), ink: $('#lInk'), coach: $('#lCoach') };
  app.bg = $('#bg'); app.pat = $('#gridpat'); app.patBg = $('#patBg'); app.patLine = $('#patLine');
  app.readout = $('#readout'); app.tcard = $('#tcard'); app.hud = $('.hud'); app.buildbar = $('#buildbar');
  app.ctx = $('#ctx'); app.trash = $('#trash'); app.zoom = $('#zoom'); app.penbar = $('#penbar'); app.pErase = $('#pErase');
  app.toast = $('#toast'); app.msgbar = $('#msgbar'); app.tray = $('#tray'); app.tools = $('#tools');
  app.coach = $('#coach'); app.cbody = $('#cbody'); app.sheet = $('#sheet');
  app.bUndo = $('#bUndo'); app.bPen = $('#bPen'); app.bShow = $('#bShow'); app.bTask = $('#bTask'); app.bClear = $('#bClear');
  app.liveBtn = $('#bLive'); app.liveTxt = $('#liveTxt');

  [['bUndo', 'undo'], ['bPen', 'pen'], ['bShow', 'eye'], ['bTask', 'tasks'], ['bClear', 'trash'], ['zIn', 'plus'], ['zOut', 'minus'], ['zFit', 'fit'], ['sheetClose', 'close']]
    .forEach(([id, n]) => { $('#' + id).innerHTML = icon(n); });
  app.trash.innerHTML = icon('trash');

  app.tools.innerHTML = TOOLS.map(t => `<button type="button" class="chip" role="tab" id="tab-${t.id}" data-tool="${t.id}" aria-selected="false">${esc(t.short)}</button>`).join('');
  app.tools.addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b && !isCoach() && b.dataset.tool !== S.tool) setTool(b.dataset.tool, true); });

  app.bUndo.addEventListener('click', undo);
  app.bPen.addEventListener('click', () => togglePen());
  app.bShow.addEventListener('click', () => { S.show = !S.show; render(); saveSoon(); });
  app.bTask.addEventListener('click', openTaskList);
  app.bClear.addEventListener('click', clearAll);
  app.liveBtn.addEventListener('click', onLiveClick);
  $('#zIn').addEventListener('click', () => zoomBy(1.25));
  $('#zOut').addEventListener('click', () => zoomBy(0.8));
  $('#zFit').addEventListener('click', fitView);
  $('#sheetClose').addEventListener('click', closeSheet);
  app.sheet.addEventListener('click', e => { if (e.target === app.sheet) closeSheet(); });
  app.ctx.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; const a = app.ctxActs[+b.dataset.act]; if (a) change(a.fn); });
  app.penbar.addEventListener('click', e => {
    const sw = e.target.closest('[data-pc]');
    if (sw) { S.pen.color = +sw.dataset.pc; S.pen.erase = false; syncChrome(); return; }
    if (e.target.closest('#pErase')) { S.pen.erase = !S.pen.erase; syncChrome(); return; }
    if (e.target.closest('#pClear')) {
      if (isCoach()) { S.coachInk[S.tool] = []; pushCoachInk(); renderInk(); }
      else change(() => { data().ink = []; });
    }
  });
  app.toast.addEventListener('click', e => { if (e.target.closest('[data-undo]')) { undo(); app.toast.hidden = true; } });
  app.msgbar.addEventListener('click', e => { if (e.target.closest('[data-x]')) app.msgbar.hidden = true; });
  app.coach.addEventListener('click', onCoachPanel);
  app.buildbar.addEventListener('click', e => { const b = e.target.closest('[data-build]'); if (b) exitBuild(b.dataset.build === 'use'); });
  app.coach.addEventListener('keydown', e => { if (e.target.id === 'msgIn' && e.key === 'Enter') sendMsg(e.target.value); });
  wireTaskCard(); wireTray(); wirePointers();
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => {
    if (consumePairingHash()) { location.reload(); return; }
    const linked = consumeTaskHash(); if (linked) { openLinkedTask(linked); return; }
    const h = location.hash.slice(1); if (!isCoach() && TOOL[h] && h !== S.tool) setTool(h, true);
  });

  measure();
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { measure(); if (S.tool) render(); }).observe(app.wrap);
  else window.addEventListener('resize', () => { measure(); if (S.tool) render(); });

  liveLoad();
  consumePairingHash();
  loadMine();
  const linked = consumeTaskHash(); // before setTool, which rewrites the address
  const saved = isCoach() ? null : load(), h = location.hash.slice(1);
  if (isCoach()) { S.show = true; S.task = null; LV.tab = innerWidth >= 900 ? 'assign' : (LIVE.fresh ? 'pair' : null); if (LIVE.fresh) { LV.tab = 'pair'; delete LIVE.fresh; liveSave(); } }
  setTool(TOOL[h] ? h : TOOL[saved] ? saved : TOOLS[0].id);
  liveChrome(); renderCoach();
  if (linked) openLinkedTask(linked);
  // A contest practice that was running picks up its timer (or is scored if time ran out).
  if (S.set && !isCoach()) { if (Date.now() >= S.set.end) finishSet(true); else startSetTimer(); }
  connectLive();
  window.mathbench = { S, TOOL, TASK, TASKS, CUSTOM, LEVELS, STYLES, SETS, LIVE, LV, app, parseAns, ansMatch, parseConfig, render, startTask, startSet, finishSet, pickSet, getTask, allTasks, taskLink, validCustom, coverage, emptyBoard };
}
// A task link adds the task; a kid device (or a device used without live mode) opens it right away.
function openLinkedTask(id) {
  const t = getTask(id); if (!t) return;
  if (isCoach()) { LV.tab = 'assign'; renderCoach(); toast(`Added “${t.title}” to My tasks.`); }
  else { startTask(id, 'self'); toast(`Added “${t.title}” to My tasks.`); }
}
boot();
