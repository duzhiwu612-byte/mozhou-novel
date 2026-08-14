/* =========================================================
   墨舟 · 前端交互
   关键词 → 生成大纲 → 微调大纲 → 逐章生成 → 导出
   支持草稿自动保存、增删章节、导出 MD/TXT/Word
   ========================================================= */
(function () {
  "use strict";

  const D = window.MOZHOU_DATA;
  const Engine = window.MozhouEngine;

  const MAX_KW = 15;
  const LS_SELECTED = "mozhou_selected";
  const LS_PARAMS = "mozhou_params";
  const LS_TOUR = "mozhou_tour_seen";
  const LS_DRAFT = "mozhou_draft";
  const LS_CUSTOM = "mozhou_custom";
  const FB_EMAIL = "duzhiwu612@gmail.com";

  const state = {
    activeCat: "world",
    selected: new Set(),
    params: { length: "medium", pov: "third", tone: "auto", ending: "he" },
    project: null,
    outline: [],
    chapters: [],
    custom: [],
    dragChapterIndex: null,
    cursor: 0,
    mode: "idle",    // idle | outline | chapter | done
    result: null,
    view: "outline",
    tourStep: 0
  };

  /* ---------- 元素引用 ---------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const el = {
    tabs: $("#kwTabs"), grid: $("#kwGrid"), catTitle: $("#kwCatTitle"),
    selectedBar: $("#kwSelectedBar"), selectedChips: $("#kwSelectedChips"),
    selectedCount: $("#kwSelectedCount"), generateSummary: $("#generateSummary"),
    result: $("#result"), resultBody: $("#resultBody"), resultTitle: $("#resultTitle"),
    resultLogline: $("#resultLogline"), resultMeta: $("#resultMeta"),
    studio: $("#studio"), outlineStage: $("#outlineStage"), chapterStage: $("#chapterStage"),
    bookTitle: $("#bookTitle"), bookLogline: $("#bookLogline"), bookSynopsis: $("#bookSynopsis"),
    outlineEditor: $("#outlineEditor"),
    chapterProgress: $("#chapterProgress"), chapterTitle: $("#chapterTitle"), chapterContent: $("#chapterContent"),
    chapterWordCount: $("#chapterWordCount"), kwCustomInput: $("#kwCustomInput"), btnAddCustom: $("#btnAddCustom"),
    btnPrevChapter: $("#btnPrevChapter"), btnBackToKeywords: $("#btnBackToKeywords"),
    feedback: $("#feedback"), fbContact: $("#fbContact"), fbContent: $("#fbContent"),
    btnFbCopy: $("#btnFbCopy"), btnFbMail: $("#btnFbMail"),
    toast: $("#toast"), tour: $("#tour"), tourArt: $("#tourArt"),
    tourStepLabel: $("#tourStep"), tourTitle: $("#tourTitle"), tourText: $("#tourText"),
    tourDots: $("#tourDots"), tourNext: $("#tourNext"), tourSkip: $("#tourSkip")
  };

  /* ---------- 轻提示 ---------- */
  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }

  /* ---------- 持久化 ---------- */
  function saveState() {
    try {
      localStorage.setItem(LS_SELECTED, JSON.stringify([...state.selected]));
      localStorage.setItem(LS_PARAMS, JSON.stringify(state.params));
      localStorage.setItem(LS_CUSTOM, JSON.stringify(state.custom));
    } catch (e) { /* ignore */ }
  }
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_SELECTED) || "[]");
      if (Array.isArray(s)) s.forEach(k => state.selected.add(k));
      const p = JSON.parse(localStorage.getItem(LS_PARAMS) || "{}");
      state.params = Object.assign(state.params, p);
      const cc = JSON.parse(localStorage.getItem(LS_CUSTOM) || "[]");
      if (Array.isArray(cc)) state.custom = cc;
    } catch (e) { /* ignore */ }
  }

  /* ---------- 草稿自动保存 ---------- */
  function saveDraft() {
    if (!state.project) return;
    try {
      localStorage.setItem(LS_DRAFT, JSON.stringify({
        project: state.project,
        outline: state.outline,
        chapters: state.chapters,
        cursor: state.cursor,
        mode: state.mode
      }));
    } catch (e) { /* ignore */ }
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(LS_DRAFT);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d.project || !d.project.ctx) return false;
      state.project = d.project;
      state.outline = d.outline || JSON.parse(JSON.stringify(d.project.outline));
      state.chapters = d.chapters || [];
      state.cursor = d.cursor || 0;
      state.mode = d.mode || "outline";
      return true;
    } catch (e) { return false; }
  }
  function clearDraft() {
    try { localStorage.removeItem(LS_DRAFT); } catch (e) { /* ignore */ }
  }
  function restoreDraftUI() {
    if (state.mode === "done" && state.chapters.length) {
      const items = chapterItemsOf(state.project.outline);
      state.result = Engine.assemble(state.project, state.chapters.slice(0, items.length));
      state.view = "outline";
      el.studio.classList.add("hidden");
      el.result.classList.remove("hidden");
      renderResult();
      return;
    }
    el.result.classList.add("hidden");
    el.studio.classList.remove("hidden");
    if (state.mode === "chapter") {
      el.outlineStage.classList.add("hidden");
      el.chapterStage.classList.remove("hidden");
      const items = chapterItemsOf(state.project.outline);
      const total = items.length;
      const i = Math.min(state.cursor, total - 1);
      state.cursor = i;
      const ch = state.chapters[i];
      if (ch) renderChapterStage(ch, i, total);
      else generateChapterAt(i);
    } else {
      el.outlineStage.classList.remove("hidden");
      el.chapterStage.classList.add("hidden");
      renderOutlineEditor();
    }
  }

  /* ---------- 渲染关键词 ---------- */
  function renderTabs() {
    el.tabs.innerHTML = D.CATEGORIES.map((c) => {
      const active = c.id === state.activeCat ? "active" : "";
      return `<button class="kw-tab ${active}" data-cat="${c.id}" type="button">${c.icon} ${c.name}</button>`;
    }).join("");
    $$("#kwTabs .kw-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        state.activeCat = btn.dataset.cat;
        renderTabs();
        renderKeywords();
      });
    });
  }

  function renderKeywords() {
    const cat = D.CATEGORIES.find(c => c.id === state.activeCat);
    el.catTitle.textContent = cat ? `${cat.icon} ${cat.name} · ${cat.desc}` : "";
    const words = D.KEYWORDS[state.activeCat] || [];
    el.grid.innerHTML = words.map(w => {
      const on = state.selected.has(w) ? "selected" : "";
      return `<button class="kw-chip ${on}" data-word="${w}" type="button">${w}</button>`;
    }).join("");
    $$("#kwGrid .kw-chip").forEach(chip => {
      chip.addEventListener("click", () => toggleKeyword(chip.dataset.word));
    });
  }

  function toggleKeyword(word) {
    if (state.selected.has(word)) {
      state.selected.delete(word);
    } else {
      if (state.selected.size >= MAX_KW) { toast(`最多选择 ${MAX_KW} 个关键词`); return; }
      state.selected.add(word);
    }
    renderKeywords();
    updateSelected();
  }

  function updateSelected() {
    const arr = [...state.selected];
    el.selectedCount.textContent = `${arr.length} / ${MAX_KW}`;
    const libChips = arr.map(w =>
      `<span class="kw-selected-chip">${w}<button data-remove="${w}" type="button">×</button></span>`
    ).join("");
    const customChips = state.custom.map(w =>
      `<span class="kw-selected-chip custom-chip">${w}<button data-custom-remove="${w}" type="button">×</button></span>`
    ).join("");
    el.selectedChips.innerHTML = (libChips + customChips) || `<span style="color:var(--ink-3);font-size:13px;">点击上方关键词卡片进行勾选</span>`;
    $$("#kwSelectedChips [data-remove]").forEach(btn => {
      btn.addEventListener("click", () => toggleKeyword(btn.dataset.remove));
    });
    $$("#kwSelectedChips [data-custom-remove]").forEach(btn => {
      btn.addEventListener("click", () => removeCustomKeyword(btn.dataset.customRemove));
    });
    const parts = [];
    if (arr.length) parts.push(arr.join(" · "));
    if (state.custom.length) parts.push("自定义：" + state.custom.join(" · "));
    el.generateSummary.textContent = parts.length ? "已选：" + parts.join(" ｜ ") : "尚未选择关键词";
    saveState();
  }

  function addCustomKeyword() {
    const raw = el.kwCustomInput.value.trim();
    if (!raw) { toast("请输入关键词"); return; }
    if (state.selected.has(raw) || state.custom.includes(raw)) { toast("该关键词已存在"); return; }
    if (state.custom.length >= 10) { toast("自定义关键词最多 10 个"); return; }
    state.custom.push(raw);
    el.kwCustomInput.value = "";
    updateSelected();
    toast(`已添加自定义关键词「${raw}」`);
  }
  function removeCustomKeyword(w) {
    state.custom = state.custom.filter(k => k !== w);
    updateSelected();
  }

  function randomMix() {
    state.selected.clear();
    const cats = D.CATEGORIES.map(c => c.id);
    const picked = new Set();
    cats.forEach(c => {
      const words = D.KEYWORDS[c];
      if (words && words.length) picked.add(words[Math.floor(Math.random() * words.length)]);
    });
    [...picked].forEach(w => state.selected.add(w));
    if (state.selected.size > 10) {
      const keep = [...state.selected].slice(0, 10);
      state.selected.clear();
      keep.forEach(w => state.selected.add(w));
    }
    renderKeywords();
    updateSelected();
    toast("已为你随机搭配关键词 ✨");
  }

  /* ---------- 创作设定 ---------- */
  function bindParams() {
    $$(".segmented").forEach(group => {
      const key = group.dataset.param;
      Array.from(group.querySelectorAll("button")).forEach(btn => {
        if (btn.dataset.value === state.params[key]) btn.classList.add("active");
        btn.addEventListener("click", () => {
          Array.from(group.querySelectorAll("button")).forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          state.params[key] = btn.dataset.value;
          saveState();
        });
      });
    });
  }

  /* ---------- 工具 ---------- */
  function currentKeywords() { return [...state.selected]; }
  function chapterItemsOf(outline) { return (outline || []).filter(o => o.type === "chapter"); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function xmlEscape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
  }
  function labelFor(kind, value) {
    const map = {
      length: { short: "短篇", medium: "中篇", long: "长篇" },
      pov: { third: "第三人称", first: "第一人称", dual: "双视角" },
      tone: { auto: "智能适配", cool: "冷峻克制", warm: "温暖治愈", funny: "轻松幽默" },
      ending: { he: "圆满 HE", be: "意难平 BE", open: "开放结局" }
    };
    return map[kind] && map[kind][value] ? map[kind][value] : value;
  }

  /* ---------- 第一步：生成大纲 ---------- */
  function buildOutline() {
    let kws = currentKeywords();
    if (!kws.length) { randomMix(); kws = currentKeywords(); }
    state.project = Engine.buildProject({ keywords: kws, params: state.params, seed: Date.now() + "-" + kws.join(","), custom: state.custom });
    state.outline = JSON.parse(JSON.stringify(state.project.outline));
    state.chapters = [];
    state.cursor = 0;
    state.result = null;
    state.mode = "outline";

    el.result.classList.add("hidden");
    el.studio.classList.remove("hidden");
    el.outlineStage.classList.remove("hidden");
    el.chapterStage.classList.add("hidden");

    renderOutlineEditor();
    saveDraft();
    el.studio.scrollIntoView({ behavior: "smooth", block: "start" });
    toast("大纲已生成，可自由修改后再继续");
  }

  function renderOutlineEditor() {
    const items = state.outline.map(o => {
      if (o.type === "act") return `<div class="oe-act">${escapeHtml(o.title)}</div>`;
      return `<div class="oe-item" data-chapter-index="${o.index}" draggable="true">
        <span class="oe-drag" title="拖拽排序">⠿</span>
        <span class="oe-index">${o.index}</span>
        <div class="oe-fields">
          <input data-field="title" value="${escapeHtml(o.title)}" />
          <textarea data-field="summary" rows="2">${escapeHtml(o.summary)}</textarea>
        </div>
        <button class="oe-del" data-del="${o.index}" type="button">×</button>
      </div>`;
    }).join("");
    el.outlineEditor.innerHTML = items + `<button class="oe-add" id="oeAdd" type="button">＋ 添加章节</button>`;
    el.bookTitle.value = state.project.titles[0];
    el.bookLogline.value = state.project.logline;
    el.bookSynopsis.value = state.project.synopsis;
    $$("#outlineEditor .oe-del").forEach(btn => btn.addEventListener("click", () => deleteChapter(Number(btn.dataset.del))));
    const addBtn = $("#oeAdd"); if (addBtn) addBtn.addEventListener("click", addChapter);
    bindDragSort();
  }

  function bindDragSort() {
    $$("#outlineEditor .oe-item").forEach(item => {
      item.addEventListener("dragstart", (e) => {
        state.dragChapterIndex = Number(item.dataset.chapterIndex);
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", String(state.dragChapterIndex)); } catch (err) {}
      });
      item.addEventListener("dragover", (e) => { e.preventDefault(); item.classList.add("drag-over"); });
      item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.classList.remove("drag-over");
        const target = Number(item.dataset.chapterIndex);
        if (state.dragChapterIndex != null && target !== state.dragChapterIndex) {
          readOutlineEditor();
          reorderChapters(state.dragChapterIndex, target);
          renderOutlineEditor();
          saveDraft();
          toast("章节顺序已调整");
        }
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        $$("#outlineEditor .oe-item").forEach(i => i.classList.remove("drag-over"));
        state.dragChapterIndex = null;
      });
    });
  }

  function reorderChapters(dragIdx, targetIdx) {
    const dragItem = state.outline.find(o => o.type === "chapter" && o.index === dragIdx);
    const targetItem = state.outline.find(o => o.type === "chapter" && o.index === targetIdx);
    if (!dragItem || !targetItem) return;
    const rest = state.outline.filter(o => !(o.type === "chapter" && o.index === dragIdx));
    const pos = rest.findIndex(o => o.type === "chapter" && o.index === targetIdx);
    rest.splice(pos, 0, dragItem);
    state.outline = rest;
    reindexOutline();
    state.project.outline = state.outline;
  }

  function readOutlineEditor() {
    state.project.titles[0] = el.bookTitle.value.trim() || state.project.titles[0];
    state.project.logline = el.bookLogline.value.trim() || state.project.logline;
    state.project.synopsis = el.bookSynopsis.value.trim() || state.project.synopsis;
    $$("#outlineEditor .oe-item").forEach(item => {
      const idx = Number(item.dataset.chapterIndex);
      const ch = state.outline.find(o => o.type === "chapter" && o.index === idx);
      if (!ch) return;
      ch.title = item.querySelector('[data-field="title"]').value.trim() || ch.title;
      ch.summary = item.querySelector('[data-field="summary"]').value.trim() || ch.summary;
    });
    state.project.outline = state.outline;
    saveDraft();
  }

  function reindexOutline() {
    let i = 0;
    state.outline.forEach(o => { if (o.type === "chapter") o.index = ++i; });
  }

  function addChapter() {
    readOutlineEditor();
    state.outline.push({ type: "chapter", index: 0, title: "新章节", summary: "新的情节在此展开，等待书写。" });
    reindexOutline();
    state.project.outline = state.outline;
    renderOutlineEditor();
    toast("已添加章节");
  }

  function deleteChapter(idx) {
    readOutlineEditor();
    if (chapterItemsOf(state.outline).length <= 1) { toast("至少保留一章"); return; }
    state.outline = state.outline.filter(o => !(o.type === "chapter" && o.index === idx));
    reindexOutline();
    state.project.outline = state.outline;
    renderOutlineEditor();
    toast("已删除该章");
  }

  /* ---------- 第二步：逐章生成 ---------- */
  function startChapters() {
    readOutlineEditor();
    state.chapters = [];
    state.cursor = 0;
    state.mode = "chapter";
    el.outlineStage.classList.add("hidden");
    el.chapterStage.classList.remove("hidden");
    generateChapterAt(0);
    el.studio.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function generateChapterAt(i) {
    const items = chapterItemsOf(state.project.outline);
    const total = items.length;
    if (i >= total) { finishNovel(); return; }
    const seed = state.project.seed + "-step-" + i + "-" + Date.now();
    const ch = Engine.generateChapter(state.project, items[i], i, total, seed);
    state.chapters[i] = ch;
    state.cursor = i;
    renderChapterStage(ch, i, total);
    saveDraft();
  }

  function renderChapterStage(ch, i, total) {
    el.chapterProgress.textContent = `第 ${i + 1} / ${total} 章`;
    el.chapterTitle.value = ch.title;
    el.chapterContent.value = ch.paragraphs.join("\n\n");
    $("#btnNextChapter").textContent = (i === total - 1) ? "采用本章，完成小说" : "采用本章，生成下一章";
    el.btnPrevChapter.disabled = (i === 0);
    updateWordCount();
  }

  function saveCurrentChapter() {
    const items = chapterItemsOf(state.project.outline);
    const i = state.cursor;
    if (i >= items.length) return;
    const ch = state.chapters[i] || { index: items[i].index, title: "", paragraphs: [] };
    ch.title = el.chapterTitle.value.trim() || ("第" + items[i].index + "章 " + items[i].title);
    ch.paragraphs = el.chapterContent.value.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
    state.chapters[i] = ch;
    saveDraft();
  }

  function nextChapter() {
    saveCurrentChapter();
    const total = chapterItemsOf(state.project.outline).length;
    if (state.cursor >= total - 1) { finishNovel(); return; }
    generateChapterAt(state.cursor + 1);
  }

  function regenChapter() {
    generateChapterAt(state.cursor);
    toast("已重新生成本章 ✨");
  }

  function genRest() {
    saveCurrentChapter();
    const items = chapterItemsOf(state.project.outline);
    const total = items.length;
    for (let i = state.cursor + 1; i < total; i++) {
      if (!state.chapters[i]) {
        state.chapters[i] = Engine.generateChapter(state.project, items[i], i, total, state.project.seed + "-rest-" + i + "-" + Date.now());
      }
    }
    finishNovel();
  }

  function genAll() {
    readOutlineEditor();
    const items = chapterItemsOf(state.project.outline);
    const total = items.length;
    state.chapters = items.map((o, i) => Engine.generateChapter(state.project, o, i, total, state.project.seed + "-all-" + i));
    finishNovel(true);
  }

  function finishNovel(skipSave) {
    if (!skipSave) saveCurrentChapter();
    const items = chapterItemsOf(state.project.outline);
    const total = items.length;
    for (let i = 0; i < total; i++) {
      if (!state.chapters[i]) {
        state.chapters[i] = Engine.generateChapter(state.project, items[i], i, total, state.project.seed + "-final-" + i);
      }
    }
    state.result = Engine.assemble(state.project, state.chapters.slice(0, total));
    state.mode = "done";
    state.view = "outline";
    el.outlineStage.classList.add("hidden");
    el.chapterStage.classList.add("hidden");
    el.studio.classList.add("hidden");
    el.result.classList.remove("hidden");
    renderResult();
    el.result.scrollIntoView({ behavior: "smooth", block: "start" });
    saveDraft();
  }

  function updateWordCount() {
    const cur = (el.chapterContent.value || "").replace(/\s/g, "").length;
    let total = 0;
    state.chapters.forEach(ch => { if (ch && ch.paragraphs) ch.paragraphs.forEach(p => total += p.replace(/\s/g, "").length); });
    el.chapterWordCount.textContent = `本章 ${cur} 字 · 全书已写约 ${total} 字`;
  }

  function prevChapter() {
    if (state.cursor <= 0) return;
    saveCurrentChapter();
    const items = chapterItemsOf(state.project.outline);
    const total = items.length;
    state.cursor--;
    const ch = state.chapters[state.cursor];
    if (ch) renderChapterStage(ch, state.cursor, total);
    else generateChapterAt(state.cursor);
  }

  /* ---------- 意见反馈 ---------- */
  function openFeedback() { el.feedback.hidden = false; }
  function closeFeedback() { el.feedback.hidden = true; }
  function feedbackPayload() {
    return { contact: el.fbContact.value.trim(), content: el.fbContent.value.trim() };
  }
  function copyFeedback() {
    const p = feedbackPayload();
    if (!p.content) { toast("请先填写反馈内容"); return; }
    const text = `【墨舟小说创作台 · 用户反馈】\n联系方式：${p.contact || "未填写"}\n反馈内容：\n${p.content}\n`;
    copyText(text, "已复制反馈内容，可粘贴发送给我");
  }
  function mailFallback(p) {
    const subject = encodeURIComponent("墨舟小说创作台 · 用户反馈");
    const body = encodeURIComponent(`联系方式：${p.contact || "未填写"}\n\n反馈内容：\n${p.content}`);
    window.location.href = `mailto:${FB_EMAIL}?subject=${subject}&body=${body}`;
    toast("已打开邮件客户端，请点击发送");
  }
  function sendFeedback() {
    const p = feedbackPayload();
    if (!p.content) { toast("请先填写反馈内容"); return; }
    const btn = el.btnFbMail;
    btn.disabled = true;
    btn.textContent = "发送中…";
    const payload = { _subject: "墨舟小说创作台 · 用户反馈", contact: p.contact || "未填写", message: p.content };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch("https://formsubmit.co/ajax/duzhiwu612@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(r => {
      clearTimeout(timer);
      btn.disabled = false;
      btn.textContent = "发送反馈";
      if (r.ok) { toast("反馈已发送，谢谢！"); el.fbContent.value = ""; el.fbContact.value = ""; }
      else { mailFallback(p); }
    }).catch(() => {
      btn.disabled = false;
      btn.textContent = "发送反馈";
      mailFallback(p);
    });
  }
  /* ---------- 渲染最终结果 ---------- */
  function renderResult() {
    const r = state.result;
    el.resultTitle.textContent = r.title;
    el.resultLogline.textContent = r.logline;
    el.resultMeta.innerHTML = [
      r.meta.genreName,
      labelFor("length", r.meta.length),
      labelFor("pov", r.meta.pov),
      "基调 · " + r.meta.tone,
      labelFor("ending", r.meta.ending),
      r.meta.relation ? "情感 · " + r.meta.relation : "",
      r.keywords.length ? "关键词 " + r.keywords.length + " 个" : ""
    ].filter(Boolean).map(t => `<span class="meta-tag">${t}</span>`).join("");
    $$(".result-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.view === state.view));
    renderView();
  }

  function renderView() {
    const r = state.result;
    if (!r) return;
    if (state.view === "outline") el.resultBody.innerHTML = renderOutline(r);
    else el.resultBody.innerHTML = renderContent(r);
  }

  function renderOutline(r) {
    const items = r.outline.map(o => {
      if (o.type === "act") return `<li class="outline-item act"><span class="outline-index">◆</span><div class="outline-main"><h4 class="act-head">${escapeHtml(o.title)}</h4></div></li>`;
      return `<li class="outline-item"><span class="outline-index">${o.index}</span><div class="outline-main"><h4>${escapeHtml(o.title)}</h4><p>${escapeHtml(o.summary)}</p></div></li>`;
    }).join("");
    return `<ol class="outline-list">${items}</ol>`;
  }

  function renderContent(r) {
    const chapters = r.chapters.map(ch => {
      const paras = ch.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("");
      return `<section class="chapter"><h3>${escapeHtml(ch.title)}</h3>${paras}</section>`;
    }).join("");
    return `<article class="chapter-body novel-body">${chapters}<p class="chapter-end">— 全书完 —</p></article>`;
  }

  /* ---------- 复制 / 导出 ---------- */
  function copyText(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(successMsg), () => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }
  function fallbackCopy(text, successMsg) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast(successMsg); } catch (e) { toast("复制失败，请手动复制"); }
    document.body.removeChild(ta);
  }
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------- Word (.docx) 生成 ---------- */
  function crc32(buf) {
    if (!crc32.table) {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
      }
      crc32.table = t;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = crc32.table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    files.forEach(f => {
      const nameBytes = enc.encode(f.name);
      const data = (typeof f.data === "string") ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const size = data.length;
      const lh = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      parts.push(lh, data);

      const ch = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      central.push(ch);
      offset += lh.length + data.length;
    });
    const centralSize = central.reduce((n, c) => n + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    const all = parts.concat(central, [eocd]);
    const out = new Uint8Array(all.reduce((n, a) => n + a.length, 0));
    let p = 0;
    all.forEach(a => { out.set(a, p); p += a.length; });
    return out;
  }
  function docxPara(text, heading, size) {
    const pr = heading ? `<w:pPr><w:rPr><w:b/><w:sz w:val="${size || 32}"/></w:rPr></w:pPr>` : "";
    return `<w:p>${pr}<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
  }
  function buildDocxXml(r) {
    const b = [];
    b.push(docxPara(r.title, true, 48));
    b.push(docxPara("一句话简介：" + r.logline));
    b.push(docxPara("故事简介：" + r.synopsis));
    b.push(docxPara(""));
    b.push(docxPara("分章大纲", true, 36));
    r.outline.forEach(o => {
      if (o.type === "act") b.push(docxPara(o.title, true, 30));
      else b.push(docxPara(o.index + ". " + o.title + "——" + o.summary));
    });
    b.push(docxPara(""));
    b.push(docxPara("完整小说", true, 36));
    r.chapters.forEach(ch => {
      b.push(docxPara(ch.title, true, 32));
      ch.paragraphs.forEach(p => b.push(docxPara(p)));
      b.push(docxPara(""));
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      b.join("") + '</w:body></w:document>';
  }
  function exportDocx() {
    if (!state.result) return;
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    const bytes = zipStore([
      { name: "[Content_Types].xml", data: contentTypes },
      { name: "_rels/.rels", data: rels },
      { name: "word/document.xml", data: buildDocxXml(state.result) }
    ]);
    download(`墨舟小说-${state.result.title}.docx`, bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    toast("已导出 Word 文档");
  }

  /* ---------- 新手引导 ---------- */
  const TOUR_STEPS = [
    { art: "01", title: "挑选关键词", text: "从题材、设定、人物、感情等分类中勾选创作关键词，故事方向由你定义，也可以「随机搭配」。" },
    { art: "02", title: "生成并微调大纲", text: "点击「生成大纲」，得到完整故事大纲。你可以直接采用，也可以修改书名、简介与每章梗概，甚至增删章节。" },
    { art: "03", title: "逐章生成", text: "选择「直接生成全文」或「开始逐章生成」。逐章模式下，每生成一章都可编辑修改，再继续下一章。" },
    { art: "04", title: "复制或导出", text: "满意后一键复制全文，或导出为 Markdown、TXT、Word 文档。" }
  ];

  function renderTour() {
    const s = TOUR_STEPS[state.tourStep];
    el.tourArt.textContent = s.art;
    el.tourStepLabel.textContent = `第 ${state.tourStep + 1} 步 / 共 ${TOUR_STEPS.length} 步`;
    el.tourTitle.textContent = s.title;
    el.tourText.textContent = s.text;
    el.tourDots.innerHTML = TOUR_STEPS.map((_, i) => `<span class="${i === state.tourStep ? 'active' : ''}"></span>`).join("");
    el.tourNext.textContent = state.tourStep === TOUR_STEPS.length - 1 ? "开始创作" : "下一步";
  }
  function showTour() {
    state.tourStep = 0;
    renderTour();
    el.tour.hidden = false;
  }
  function hideTour(markSeen) {
    el.tour.hidden = true;
    if (markSeen) { try { localStorage.setItem(LS_TOUR, "1"); } catch (e) { /* ignore */ } }
  }
  function tourNext() {
    if (state.tourStep < TOUR_STEPS.length - 1) {
      state.tourStep++;
      renderTour();
    } else {
      hideTour(true);
      document.getElementById("keywords").scrollIntoView({ behavior: "smooth" });
    }
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    $("#btnStart").addEventListener("click", () => document.getElementById("keywords").scrollIntoView({ behavior: "smooth" }));
    $("#btnTour").addEventListener("click", showTour);
    $("#btnHelp").addEventListener("click", showTour);
    $("#btnReplayTour").addEventListener("click", showTour);
    $("#tourNext").addEventListener("click", tourNext);
    $("#tourSkip").addEventListener("click", () => hideTour(true));
    $("#btnRandomMix").addEventListener("click", randomMix);
    $("#btnClearKw").addEventListener("click", () => {
      state.selected.clear();
      renderKeywords();
      updateSelected();
    });

    $("#btnGenerate").addEventListener("click", () => buildOutline());
    $("#btnGenAll").addEventListener("click", genAll);
    $("#btnStartChapters").addEventListener("click", startChapters);
    $("#btnRegenChapter").addEventListener("click", regenChapter);
    $("#btnNextChapter").addEventListener("click", nextChapter);
    $("#btnGenRest").addEventListener("click", genRest);
    el.chapterContent.addEventListener("input", updateWordCount);
    $("#btnPrevChapter").addEventListener("click", prevChapter);
    $("#btnAddCustom").addEventListener("click", addCustomKeyword);
    $("#kwCustomInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addCustomKeyword(); } });
    $("#btnBackToKeywords").addEventListener("click", () => document.getElementById("keywords").scrollIntoView({ behavior: "smooth" }));
    $("#btnFeedback").addEventListener("click", openFeedback);
    $("#feedbackClose").addEventListener("click", closeFeedback);
    $("#feedbackBackdrop").addEventListener("click", closeFeedback);
    $("#btnFbCopy").addEventListener("click", copyFeedback);
    $("#btnFbMail").addEventListener("click", sendFeedback);
    $("#btnExpand").addEventListener("click", () => {
      const full = el.studio.classList.toggle("full");
      $("#btnExpand").textContent = full ? "⛶ 收起编辑" : "⛶ 展开编辑";
    });

    $("#btnRegen").addEventListener("click", () => buildOutline());
    $("#btnRerollTitle").addEventListener("click", () => {
      if (!state.result) return;
      const fresh = Engine.buildProject({ keywords: state.result.keywords, params: state.params, seed: Date.now() + "-reroll" });
      state.result.title = fresh.titles[0];
      state.result.altTitles = fresh.titles.slice(1);
      state.result.logline = fresh.logline;
      state.result.synopsis = fresh.synopsis;
      state.result.plain = Engine.toText(state.result);
      state.result.markdown = Engine.toMarkdown(state.result);
      renderResult();
      toast("已换一批标题 ✨");
    });
    $("#btnCopy").addEventListener("click", () => {
      if (!state.result) return;
      copyText(state.result.plain, "已复制全文");
    });
    $("#btnExport").addEventListener("click", () => {
      if (!state.result) return;
      download(`墨舟小说-${state.result.title}.md`, state.result.markdown, "text/markdown;charset=utf-8");
      toast("已导出 Markdown 文件");
    });
    $("#btnExportTxt").addEventListener("click", () => {
      if (!state.result) return;
      download(`墨舟小说-${state.result.title}.txt`, state.result.plain, "text/plain;charset=utf-8");
      toast("已导出 TXT 文件");
    });
    $("#btnExportDocx").addEventListener("click", exportDocx);
    $$(".result-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        state.view = tab.dataset.view;
        $$(".result-tab").forEach(t => t.classList.toggle("active", t === tab));
        renderView();
      });
    });

    window.addEventListener("beforeunload", () => {
      if (state.mode === "chapter") saveCurrentChapter();
      if (state.project) saveDraft();
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    const totalKw = Object.values(D.KEYWORDS).reduce((n, arr) => n + arr.length, 0);
    $("#statKeywords").textContent = totalKw;
    $("#statGenres").textContent = "14";

    loadState();
    renderTabs();
    renderKeywords();
    updateSelected();
    bindParams();
    bindEvents();

    const restored = loadDraft();
    if (restored) {
      restoreDraftUI();
      toast("已恢复上次的创作草稿");
    }

    const seen = (() => { try { return localStorage.getItem(LS_TOUR); } catch (e) { return "1"; } })();
    if (!seen) setTimeout(showTour, 700);
  }

  document.addEventListener("DOMContentLoaded", init);
})();


