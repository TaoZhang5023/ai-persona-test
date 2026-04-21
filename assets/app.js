/* ============================================================
 * AI 使用人设测试 · 交互逻辑
 * 实现 scoring-system.md 所有规则：
 *   - 每次随机抽 12 题（Fisher-Yates 洗牌）
 *   - 支持次要信号 (0.3) 与弱彩蛋 (0.5)
 *   - 彩蛋阈值 ≥ 2，优先级 🧠 > 💕 > ⏳ > 🔓
 *   - 平局按 W/F/I/S 倒向"戏剧性"一方
 *   - 彩蛋触发时四维度作为"隐藏属性"展示
 *   - sessionStorage 刷新续作
 * ============================================================ */
(function () {
  "use strict";

  const DATA = window.AI_PERSONA_DATA;
  const { POOLS, TOTAL_PICK, DIMS, EGG_PRIORITY, EGG_THRESHOLD, QUESTIONS, PERSONAS, EGG_PERSONAS } = DATA;
  const STORAGE_KEY = "ai-persona.session.v2";
  const SELECT_DELAY = 300;      // 选中后跳下一题的延迟
  const FINISH_DELAY = 500;      // 最后一题结算前的延迟
  const LOCK_MS = 300;           // 防连击时长

  /* ---------- 状态 ---------- */
  let selectedQuestions = []; // 当次抽到的 12 题（Question 对象数组）
  let answers = [];           // 每题的 optionIndex（0-3）或 null
  let current = 0;
  let locked = false;         // 防连击

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ============================================================
   * 随机工具
   * ============================================================ */
  function pickRandom(arr, count) {
    const pool = arr.slice();
    const out = [];
    const n = Math.min(count, pool.length);
    for (let i = 0; i < n; i++) {
      const j = Math.floor(Math.random() * pool.length);
      out.push(pool[j]);
      pool.splice(j, 1);
    }
    return out;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ============================================================
   * 抽题：按池配额抽 + 整体洗牌
   * ============================================================ */
  function selectQuestions() {
    const byPool = {};
    for (const key of Object.keys(POOLS)) {
      byPool[key] = QUESTIONS.filter((q) => q.pool === key);
    }
    let out = [];
    for (const [key, def] of Object.entries(POOLS)) {
      out = out.concat(pickRandom(byPool[key], def.pick));
    }
    return shuffle(out);
  }

  /* ============================================================
   * Session 存档 / 读档
   * ============================================================ */
  function saveSession() {
    try {
      if (!selectedQuestions.length) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ids: selectedQuestions.map((q) => q.id),
          current,
          answers,
          savedAt: Date.now()
        })
      );
    } catch (_) { /* 隐私模式可能禁用 storage */ }
  }

  function loadSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.ids) || !Array.isArray(data.answers)) return null;
      if (data.ids.length !== TOTAL_PICK || data.answers.length !== TOTAL_PICK) return null;
      // 校验 ids 都能找到题
      const qs = data.ids.map((id) => QUESTIONS.find((q) => q.id === id));
      if (qs.some((q) => !q)) return null;
      return { questions: qs, current: data.current || 0, answers: data.answers };
    } catch (_) {
      return null;
    }
  }

  function clearSession() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  /* ============================================================
   * 屏幕切换
   * ============================================================ */
  function show(id) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    $("#" + id).classList.add("active");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /* ============================================================
   * 续作提示
   * ============================================================ */
  function renderResumeBanner() {
    const data = loadSession();
    const banner = $("#resume-banner");
    if (!banner) return;
    if (!data) {
      banner.classList.add("hidden");
      return;
    }
    const answered = data.answers.filter((a) => a != null).length;
    if (answered === 0 || answered >= TOTAL_PICK) {
      banner.classList.add("hidden");
      return;
    }
    banner.classList.remove("hidden");
    $("#resume-count").textContent = answered + " / " + TOTAL_PICK;
  }

  /* ============================================================
   * 开始 / 续作
   * ============================================================ */
  function startQuiz() {
    selectedQuestions = selectQuestions();
    answers = new Array(TOTAL_PICK).fill(null);
    current = 0;
    clearSession();
    saveSession();
    enterQuiz();
  }

  function resumeQuiz() {
    const data = loadSession();
    if (!data) {
      startQuiz();
      return;
    }
    selectedQuestions = data.questions;
    answers = data.answers.slice();
    current = Math.min(data.current, TOTAL_PICK - 1);
    enterQuiz();
  }

  function enterQuiz() {
    $("#q-total").textContent = String(TOTAL_PICK).padStart(2, "0");
    show("screen-quiz");
    renderQuestion();
  }

  /* ============================================================
   * 答题页渲染
   * ============================================================ */
  function renderQuestion() {
    const q = selectedQuestions[current];
    const pool = POOLS[q.pool];

    $("#q-cur").textContent = String(current + 1).padStart(2, "0");

    const dimPill = $("#q-dim-pill");
    if (q.pool === "EGG") {
      dimPill.textContent = "? / ?";
    } else {
      dimPill.textContent = q.pool[0] + " / " + q.pool[1];
    }
    $("#q-dim-tag").textContent = pool.dimLabel;
    $("#q-title").textContent = q.text;

    const progress = (current / TOTAL_PICK) * 100;
    $("#progress-bar").style.width = progress + "%";

    $("#q-back").disabled = current === 0;

    const optsEl = $("#q-options");
    optsEl.innerHTML = "";
    q.options.forEach((opt, i) => {
      const el = document.createElement("button");
      el.className = "option";
      el.type = "button";
      el.setAttribute("data-idx", String(i));
      el.innerHTML =
        '<span class="opt-letter">' + opt.label + "</span>" +
        '<span class="opt-text"></span>';
      el.querySelector(".opt-text").textContent = opt.text;
      el.addEventListener("click", () => selectOption(i));
      optsEl.appendChild(el);
    });

    restoreSelection();
    locked = false;
  }

  function selectOption(idx) {
    if (locked) return;
    locked = true;
    $$(".option").forEach((o) => o.classList.remove("selected"));
    const el = document.querySelector('.option[data-idx="' + idx + '"]');
    if (el) el.classList.add("selected");

    answers[current] = idx;
    saveSession();

    const isLast = current >= TOTAL_PICK - 1;
    const delay = isLast ? FINISH_DELAY : SELECT_DELAY;
    setTimeout(() => {
      if (isLast) finish();
      else nextQuestion();
    }, delay);
  }

  function nextQuestion() {
    if (current < TOTAL_PICK - 1) {
      current++;
      saveSession();
      renderQuestion();
    } else {
      finish();
    }
  }

  function prevQuestion() {
    if (locked) return;
    if (current === 0) {
      show("screen-cover");
      renderResumeBanner();
      return;
    }
    current--;
    saveSession();
    renderQuestion();
  }

  function restoreSelection() {
    const idx = answers[current];
    if (idx == null) return;
    const el = document.querySelector('.option[data-idx="' + idx + '"]');
    if (el) el.classList.add("selected");
  }

  /* ============================================================
   * 计分 / 彩蛋 / 结果
   * ============================================================ */
  function computeBoard() {
    const scores = { P: 0, W: 0, C: 0, F: 0, I: 0, L: 0, S: 0, H: 0 };
    const eggs = { philosopher: 0, lover: 0, paradox: 0, jailbreak: 0 };

    selectedQuestions.forEach((q, qi) => {
      const idx = answers[qi];
      if (idx == null) return;
      const opt = q.options[idx];
      if (opt.scores) {
        for (const [dim, value] of Object.entries(opt.scores)) {
          if (scores.hasOwnProperty(dim)) scores[dim] += value;
        }
      }
      if (opt.egg && eggs.hasOwnProperty(opt.egg)) {
        eggs[opt.egg] += (opt.eggWeight != null ? opt.eggWeight : 1);
      }
    });

    return { scores, eggs };
  }

  function checkEasterEgg(eggs) {
    const triggered = Object.entries(eggs)
      .filter((e) => e[1] >= EGG_THRESHOLD)
      .sort((a, b) => b[1] - a[1]);
    if (!triggered.length) return null;
    const maxCount = triggered[0][1];
    const tied = triggered.filter((e) => e[1] === maxCount);
    if (tied.length === 1) return tied[0][0];
    return tied.sort(
      (a, b) => EGG_PRIORITY.indexOf(a[0]) - EGG_PRIORITY.indexOf(b[0])
    )[0][0];
  }

  function calcResult() {
    const board = computeBoard();
    const eggKey = checkEasterEgg(board.eggs);

    const dimensions = {};
    let code = "";
    for (const dim of DIMS) {
      const [a, b] = dim.poles;
      const sa = board.scores[a];
      const sb = board.scores[b];
      const total = sa + sb;
      let winner;
      if (sa > sb) winner = a;
      else if (sb > sa) winner = b;
      else winner = dim.tie;
      const pctA = total > 0 ? Math.round((sa / total) * 100) : 50;
      dimensions[dim.key] = {
        winner,
        scoreA: sa, scoreB: sb,
        pctA, pctB: 100 - pctA,
        ...dim
      };
      code += winner;
    }
    return { eggKey, code, dimensions, scores: board.scores, eggs: board.eggs };
  }

  /* ============================================================
   * 结算 & 渲染结果
   * ============================================================ */
  function finish() {
    $("#progress-bar").style.width = "100%";
    const result = calcResult();

    if (result.eggKey) {
      renderEgg(result.eggKey, result.dimensions);
    } else {
      renderNormal(result.code, result.dimensions);
    }

    const hash = result.eggKey ? "egg-" + result.eggKey : result.code;
    if (history.replaceState) history.replaceState(null, "", "#" + hash);
    else location.hash = hash;

    clearSession();
    show("screen-result");
  }

  function renderNormal(code, dimensions) {
    const persona = PERSONAS[code] || {
      name: "未知人设 · " + code,
      tagline: "稀有样本，等待分类学家研究中。",
      desc: "这是一个理论上可能、但在野外极少出现的人设组合。",
      quote: "「我就是我，是颜色不一样的烟火。」",
      rarity: "理论罕见",
      compat: []
    };

    const codeEl = $("#result-code");
    codeEl.innerHTML =
      '<span class="l1">' + code[0] + "</span>" +
      '<span class="l2">' + code[1] + "</span>" +
      '<span class="l3">' + code[2] + "</span>" +
      '<span class="l4">' + code[3] + "</span>";

    $("#result-name").textContent = persona.name;
    $("#result-tagline").textContent = persona.tagline;
    $("#result-desc").textContent = persona.desc;
    $("#result-quote").textContent = persona.quote;
    $("#result-stamp").textContent = "CERTIFIED · " + (persona.rarity || "独一无二");
    $("#result-stamp").classList.remove("hidden");

    $("#result-egg-tag").classList.add("hidden");
    $("#screen-result").classList.remove("egg");

    $("#dim-card-title").textContent = "四维度画像";
    $("#dim-card").classList.remove("hidden");
    renderDimBars(dimensions);

    renderCompat(persona.compat || []);
    $("#compat-card").classList.toggle("hidden", (persona.compat || []).length === 0);
  }

  function renderEgg(key, dimensions) {
    const p = EGG_PERSONAS[key];
    const codeEl = $("#result-code");
    codeEl.innerHTML = '<span>' + p.emoji + '</span>';

    $("#result-name").textContent = p.name;
    $("#result-tagline").textContent = p.tagline;
    $("#result-desc").textContent = p.desc;
    $("#result-quote").textContent = p.quote;
    $("#result-stamp").textContent = "EGG · " + p.rarity;
    $("#result-stamp").classList.remove("hidden");

    $("#result-egg-tag").classList.remove("hidden");
    $("#screen-result").classList.add("egg");

    // 彩蛋模式下：四维度作为"隐藏属性"展示
    $("#dim-card-title").textContent = "隐藏属性 · 你的四维度倾向";
    $("#dim-card").classList.remove("hidden");
    renderDimBars(dimensions);

    // 彩蛋没有兼容人设
    $("#compat-card").classList.add("hidden");
  }

  function renderCompat(codes) {
    const wrap = $("#compat-list");
    wrap.innerHTML = "";
    codes.forEach((c) => {
      const p = PERSONAS[c];
      if (!p) return;
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML =
        '<span class="mono" style="color:var(--primary);font-weight:800;">' + c + "</span>" +
        '<span>· ' + p.name + "</span>";
      wrap.appendChild(tag);
    });
  }

  function renderDimBars(dimensions) {
    const wrap = $("#dim-bars");
    wrap.innerHTML = "";
    DIMS.forEach((d) => {
      const info = dimensions[d.key];
      const leftActive = info.pctA >= info.pctB;
      const pct = Math.max(info.pctA, info.pctB);
      const row = document.createElement("div");
      row.className = "dim-row";
      row.innerHTML =
        '<div class="dim-row-head">' +
          '<span class="dim-row-name">' + d.name + "</span>" +
          '<span class="dim-row-poles mono">' +
            '<span class="' + (leftActive ? "active" : "inactive") + '">' + d.poles[0] + "</span>" +
            '<span style="color:var(--muted);">·</span>' +
            '<span class="' + (!leftActive ? "active" : "inactive") + '">' + d.poles[1] + "</span>" +
          "</span>" +
        "</div>" +
        '<div class="dim-bar">' +
          '<div class="dim-bar-fill ' + (leftActive ? "left" : "right") + '"></div>' +
        "</div>" +
        '<div class="dim-row-foot mono">' +
          '<span>' + info.pctA + '% ' + d.labelLeft + "</span>" +
          '<span>' + info.pctB + '% ' + d.labelRight + "</span>" +
        "</div>";
      wrap.appendChild(row);

      requestAnimationFrame(() => {
        const fill = row.querySelector(".dim-bar-fill");
        fill.style.width = pct + "%";
        fill.textContent = pct + "%";
      });
    });
  }

  /* ============================================================
   * hash 直达（分享链接）
   * ============================================================ */
  function tryShowSharedResult() {
    const hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return false;

    if (hash.indexOf("egg-") === 0) {
      const key = hash.slice(4);
      if (EGG_PERSONAS[key]) {
        $("#q-total").textContent = String(TOTAL_PICK).padStart(2, "0");
        // 无真实分数，构造"匿名维度"展示
        const fakeDims = buildFakeDimensions(null);
        renderEgg(key, fakeDims);
        show("screen-result");
        return true;
      }
    }

    if (/^[PWCFILSH]{4}$/.test(hash) && PERSONAS[normalizeCode(hash)]) {
      const code = normalizeCode(hash);
      const fakeDims = buildFakeDimensions(code);
      renderNormal(code, fakeDims);
      show("screen-result");
      return true;
    }
    return false;
  }

  function normalizeCode(hash) {
    // 按维度字母顺序归一化：P/W, C/F, I/L, S/H
    const ALLOWED = ["PW", "CF", "IL", "SH"];
    const letters = hash.split("");
    const code = [];
    for (const pair of ALLOWED) {
      const letter = letters.find((l) => pair.indexOf(l) !== -1);
      if (!letter) return null;
      code.push(letter);
    }
    return code.join("");
  }

  function buildFakeDimensions(code) {
    const out = {};
    DIMS.forEach((d, i) => {
      const [a, b] = d.poles;
      let leftPct;
      if (code) {
        const winner = code[i];
        leftPct = winner === a ? 75 : 25;
      } else {
        leftPct = 50;
      }
      out[d.key] = {
        winner: leftPct >= 50 ? a : b,
        scoreA: 0, scoreB: 0,
        pctA: leftPct, pctB: 100 - leftPct,
        ...d
      };
    });
    return out;
  }

  /* ============================================================
   * 分享 / 重测
   * ============================================================ */
  async function shareResult() {
    const name = $("#result-name").textContent.trim();
    const code = $("#result-code").textContent.trim();
    const shareText = "我在 AI 使用人设测试里是「" + code + " · " + name + "」，你是哪种？";
    const shareUrl = location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: "AI 使用人设测试", text: shareText, url: shareUrl });
        return;
      } catch (_) { /* fallback */ }
    }
    const toCopy = shareText + "\n" + shareUrl;
    try {
      await navigator.clipboard.writeText(toCopy);
      flashToast("链接已复制到剪贴板 ✓");
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = toCopy;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); flashToast("链接已复制到剪贴板 ✓"); }
      catch (_) { alert(toCopy); }
      document.body.removeChild(ta);
    }
  }

  /* ============================================================
   * 保存结果为图片（手机走原生分享面板 → 可保存到相册 / 发送；桌面直接下载）
   * ============================================================ */
  async function saveResultImage() {
    const btn = $("#save-img-btn");
    if (btn.dataset.busy === "1") return;

    if (typeof htmlToImage === "undefined") {
      flashToast("截图组件未加载，检查网络后重试");
      return;
    }

    const target = $("#screen-result");
    const actions = target.querySelector(".actions");
    const originalLabel = btn.textContent;
    let actionsPrevDisplay = "";

    btn.dataset.busy = "1";
    btn.disabled = true;
    btn.textContent = "生成中…";

    try {
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}

      if (actions) {
        actionsPrevDisplay = actions.style.display;
        actions.style.display = "none";
      }

      const bg = getComputedStyle(document.body).backgroundColor || "#F2ECDD";
      const pxRatio = Math.min(window.devicePixelRatio || 1, 2);

      const dataUrl = await htmlToImage.toPng(target, {
        pixelRatio: pxRatio,
        backgroundColor: bg,
        cacheBust: true,
        style: { transform: "none" }
      });

      const code = ($("#result-code").textContent || "result").trim().replace(/\s+/g, "");
      const name = ($("#result-name").textContent || "").trim();
      const filename = `AI人设-${code}${name ? "-" + name : ""}.png`;

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });

      const shareText =
        "我在 AI 使用人设测试里是「" + code + " · " + name + "」，你是哪种？\n" + location.href;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "AI 使用人设测试",
            text: shareText
          });
          flashToast("已打开分享面板，可保存到相册 ✓");
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
      }

      triggerDownload(dataUrl, filename);
      flashToast("图片已保存到下载目录 ✓");
    } catch (err) {
      console.error(err);
      flashToast("生成失败，请稍后再试");
    } finally {
      if (actions) actions.style.display = actionsPrevDisplay;
      btn.dataset.busy = "";
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  function triggerDownload(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function flashToast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.style.cssText =
        "position:fixed;left:50%;bottom:32px;transform:translateX(-50%);" +
        "background:var(--ink);color:#fff;padding:10px 16px;border-radius:999px;" +
        "font-size:13px;font-weight:700;letter-spacing:.05em;z-index:9999;" +
        "border:2px solid var(--line);box-shadow:3px 3px 0 0 var(--line);" +
        "opacity:0;transition:opacity .2s ease, transform .2s ease;";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => {
      t.style.opacity = "1";
      t.style.transform = "translateX(-50%) translateY(-4px)";
    });
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateX(-50%) translateY(0)";
    }, 1800);
  }

  function restart() {
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    else location.hash = "";
    startQuiz();
  }

  function toHome() {
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    else location.hash = "";
    show("screen-cover");
    renderResumeBanner();
  }

  /* ============================================================
   * 键盘快捷键
   * ============================================================ */
  function onKeyDown(e) {
    const quizActive = $("#screen-quiz").classList.contains("active");
    if (!quizActive) return;
    const map = {
      "1": 0, "2": 1, "3": 2, "4": 3,
      "a": 0, "b": 1, "c": 2, "d": 3,
      "A": 0, "B": 1, "C": 2, "D": 3
    };
    if (e.key in map) {
      const idx = map[e.key];
      const q = selectedQuestions[current];
      if (q && q.options[idx]) {
        e.preventDefault();
        selectOption(idx);
      }
    } else if (e.key === "ArrowLeft") {
      prevQuestion();
    }
  }

  /* ============================================================
   * 事件绑定 & 初始化
   * ============================================================ */
  function init() {
    $("#q-total").textContent = String(TOTAL_PICK).padStart(2, "0");
    $("#cover-q-total").textContent = String(TOTAL_PICK);

    $("#start-btn").addEventListener("click", startQuiz);
    $("#resume-btn").addEventListener("click", resumeQuiz);
    $("#resume-restart-btn").addEventListener("click", startQuiz);
    $("#q-back").addEventListener("click", prevQuestion);
    $("#share-btn").addEventListener("click", shareResult);
    $("#save-img-btn").addEventListener("click", saveResultImage);
    $("#restart-btn").addEventListener("click", restart);
    $("#result-home-btn").addEventListener("click", toHome);
    document.addEventListener("keydown", onKeyDown);

    if (!tryShowSharedResult()) {
      show("screen-cover");
      renderResumeBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
