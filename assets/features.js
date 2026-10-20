/* ============================================================
   造神计划 · 功能扩展层（features.js）
   ------------------------------------------------------------
   设计原则（很重要，别改）：
   1. 只「加」不「改」：不改 site.css，不改 site.js，不改 data.js。
      所有样式复用 site.css 里已有的类（.btn / .tag / .section /
      .stats / .resume / .practice / .q / .opts / .callout / .pager）。
      → 所以深色主题、排版、手机端布局 100% 保持上一版的样子。
   2. 每个功能独立 try/catch：任何一个功能出错，只影响它自己，
      不会像第二版那样「一个报错，整页按钮全死」。
   3. 进度环用 SVG 属性（stroke-dashoffset）画，绝不往 <circle>
      里塞 innerHTML —— 那是第二版首页按钮失灵的根因。

   功能清单：
   A 错题本      B 面试模拟器   C 代码回放
   D 知识地图    E 番茄钟       F 成就徽章墙
   + 每日打卡（累计天数 / 连续天数）
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 0. 基础工具 ---------- */
  var DATA = window.COURSE_DATA || { lessons: [], weeks: [], site: {} };
  var LESSONS = DATA.lessons || [];
  var WEEKS = DATA.weeks || [];

  var STORE_KEY = "zs-features-v1"; // 与 site.js 的 zs-theme / zs-check-* 互不干扰

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  // 转义 HTML 特殊字符，防止标题里的符号破坏结构
  var ESC_MAP = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&#" + "39;"
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ESC_MAP[c];
    });
  }
  // 安全执行：一个功能崩了不影响其他功能
  function safe(name, fn) {
    try {
      fn();
    } catch (e) {
      if (window.console && console.warn) console.warn("[features] " + name + " 出错：", e);
    }
  }

  /* ---------- 1. 数据层（localStorage） ---------- */
  var DEFAULT_STATE = {
    checkins: [], // 打卡日期 ['2026-10-20']
    streak: 0, // 当前连续打卡
    maxStreak: 0, // 历史最长连续
    wrong: [], // 错题本 [{ id, day, q, options, answer, picked, at }]
    badges: [], // 已解锁徽章 id
    bestExam: 0, // 章节测试最高分
    bestInterview: 0, // 面试模拟最高分
    pomodoro: 0, // 番茄钟完成数
    studyMinutes: 0, // 累计专注分钟
    replaySeen: [] // 代码回放已看过的天
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      var parsed = JSON.parse(raw);
      var out = JSON.parse(JSON.stringify(DEFAULT_STATE));
      Object.keys(parsed || {}).forEach(function (k) {
        if (parsed[k] !== undefined && parsed[k] !== null) out[k] = parsed[k];
      });
      return out;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 隐私模式静默降级 */
    }
  }
  var state = loadState();

  /* ---------- 2. 日期与打卡 ---------- */
  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function hasCheckedInToday() {
    return state.checkins.indexOf(todayStr()) !== -1;
  }
  function doCheckin() {
    var t = todayStr();
    if (state.checkins.indexOf(t) !== -1) return false;
    state.checkins.push(t);
    // 昨天打过卡 → 连续 +1；否则从 1 重新开始
    state.streak = state.checkins.indexOf(yesterdayStr()) !== -1 ? state.streak + 1 : 1;
    if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    saveState();
    return true;
  }

  /* ---------- 3. 题库（错题本 / 章节测试 共用） ---------- */
  var BANK = [
    // D1–D7 HTML
    { id: "q1", day: 2, type: "choice", q: "HTML 里 <head> 标签的作用是什么？", options: ["显示在页面上的内容", "存放页面元信息，不直接显示", "定义页面背景色", "引入 JavaScript 的唯一方式"], answer: 1, explain: "head 里放 title、meta、link 等元信息，浏览器不直接渲染。" },
    { id: "q2", day: 2, type: "judge", q: "一个 HTML 页面里可以有多个 <h1> 标签。", options: ["对", "错"], answer: 0, explain: "语法上允许，但语义化规范建议一个页面只用一个 h1。" },
    { id: "q3", day: 3, type: "choice", q: "img 标签中，描述图片内容、图片加载失败时显示的属性是？", options: ["src", "alt", "title", "href"], answer: 1, explain: "alt 是替代文本，无障碍和 SEO 都依赖它。" },
    { id: "q4", day: 4, type: "choice", q: "下面哪个 input type 用于输入密码？", options: ['type="text"', 'type="password"', 'type="secret"', 'type="hidden"'], answer: 1, explain: "password 会把输入内容显示为圆点。" },
    { id: "q5", day: 5, type: "judge", q: "语义化标签的主要作用是让页面更好看。", options: ["对", "错"], answer: 1, explain: "语义化是让标签说明内容含义，利于 SEO、无障碍和团队协作，不是为了好看。" },
    { id: "q6", day: 6, type: "choice", q: "把本地改动提交到 Git 仓库的命令是？", options: ["git push", "git add", 'git commit -m "说明"', "git init"], answer: 2, explain: "git commit -m 把暂存区内容提交到本地仓库。" },
    // D8–D10 CSS 基础
    { id: "q7", day: 8, type: "choice", q: "CSS 选择器优先级从高到低，正确的是？", options: ["class > id > 标签", "id > class > 标签", "标签 > class > id", "三者一样"], answer: 1, explain: "id(100) > class(10) > 标签(1)。" },
    { id: "q8", day: 9, type: "choice", q: "box-sizing: border-box 的作用是？", options: ["让边框变细", "让 width 包含 padding 和 border", "让元素居中", "去掉外边距"], answer: 1, explain: "border-box 让 width 就是元素最终宽度，padding 和 border 往里挤。" },
    { id: "q9", day: 9, type: "judge", q: "两个相邻块级元素的上下 margin 会叠加（塌陷），取较大值。", options: ["对", "错"], answer: 0, explain: "这叫 margin 塌陷，垂直方向相邻 margin 会合并。" },
    { id: "q10", day: 10, type: "choice", q: "让元素四个角变圆，用哪个属性？", options: ["border", "border-radius", "box-shadow", "outline"], answer: 1, explain: "border-radius: 8px 让四角变圆。" },
    // D11–D12 Flex
    { id: "q11", day: 11, type: "choice", q: "display: flex 和 display: block 的关系是？", options: ["完全一样", "flex 是 block 的超集，多了排列子元素的能力", "flex 不能设置宽高", "block 性能更好"], answer: 1, explain: "flex 元素对外仍是块级，对内多了主轴/交叉轴排列能力。" },
    { id: "q12", day: 11, type: "choice", q: "justify-content 控制的是哪个方向？", options: ["交叉轴", "主轴", "Z 轴", "两个轴都控制"], answer: 1, explain: "justify-content 管主轴，align-items 管交叉轴。" },
    { id: "q13", day: 12, type: "choice", q: "flex 容器里给子元素设置间距，用哪个属性（比 margin 更干净）？", options: ["margin", "padding", "gap", "space"], answer: 2, explain: "gap 只在子元素之间产生间距，不会在首尾多出空隙。" },
    { id: "q14", day: 12, type: "judge", q: "flex: 1 的意思是让元素宽度固定为 1px。", options: ["对", "错"], answer: 1, explain: "flex: 1 是 flex-grow:1 flex-shrink:1 flex-basis:0%，即等分剩余空间。" },
    { id: "q15", day: 12, type: "choice", q: "让 flex 子元素换行，需要设置？", options: ["flex-wrap: wrap", "flex-flow: row", "align-content: center", "display: block"], answer: 0, explain: "flex-wrap: wrap 打开换行开关。" },
    // D13 定位
    { id: "q16", day: 13, type: "choice", q: "position: absolute 的元素相对谁定位？", options: ["相对浏览器视口", "相对最近的已定位祖先元素", "相对父元素，不管父元素有没有定位", "相对 body"], answer: 1, explain: "absolute 往上找第一个 position 不是 static 的祖先。" },
    { id: "q17", day: 13, type: "judge", q: "父元素不写 position: relative，子元素的 absolute 会飞到页面右上角。", options: ["对", "错"], answer: 0, explain: "找不到已定位祖先就相对初始包含块（页面）定位。" },
    { id: "q18", day: 13, type: "choice", q: "position: fixed 和 sticky 的最大区别是？", options: ["fixed 相对视口固定，sticky 到阈值才粘住", "两者完全一样", "sticky 不能用于导航栏", "fixed 不支持 z-index"], answer: 0, explain: "fixed 一直固定；sticky 在滚动到阈值前是普通流，之后才粘住。" },
    { id: "q19", day: 13, type: "choice", q: "让 z-index 生效，元素必须设置什么（不能是 static）？", options: ["display", "position", "float", "overflow"], answer: 1, explain: "z-index 只对已定位元素或 flex/grid 子元素生效。" },
    // D14 过渡与动画
    { id: "q20", day: 14, type: "choice", q: "transition 应该写在哪里？", options: ["写在 :hover 里", "写在默认状态里", "写在 @keyframes 里", "写在 HTML 的 style 属性里"], answer: 1, explain: "写在 :hover 里，鼠标移开时规则消失，会瞬间弹回。" },
    { id: "q21", day: 14, type: "choice", q: "transform: translateY(-6px) 的效果是？", options: ["往下移 6px", "往上移 6px", "往左移 6px", "放大 6 倍"], answer: 1, explain: "Y 轴向下为正，负值就是往上。" },
    { id: "q22", day: 14, type: "judge", q: "同时写 translate 和 scale，中间要用逗号分隔。", options: ["对", "错"], answer: 1, explain: "多个 transform 函数用空格分隔，用逗号整条声明会失效。" },
    { id: "q23", day: 14, type: "choice", q: "为什么动画推荐用 transform 而不是 left/top？", options: ["transform 写法更短", "transform 不触发重排，性能更好", "left/top 已经废弃", "transform 兼容性更好"], answer: 1, explain: "transform 只影响合成阶段，left/top 会触发重排。" },
    { id: "q24", day: 14, type: "judge", q: "祖先元素有 transform 时，后代的 position: fixed 会失效。", options: ["对", "错"], answer: 0, explain: "祖先有 transform 会创建新的包含块，fixed 退化成相对该祖先定位。" },
    { id: "q25", day: 14, type: "choice", q: "transition 简写的四个值依次是：属性、时长、______、延迟。", options: ["颜色", "缓动函数", "单位", "选择器"], answer: 1, explain: "顺序是 谁 多久 怎么变 什么时候开始。" },
    { id: "q26", day: 14, type: "choice", q: "transition: all 0.3s 的隐患是？", options: ["语法错误", "所有属性都过渡，性能差且容易出意外", "只能用于 transform", "必须配合 animation 使用"], answer: 1, explain: "应明确列出要过渡的属性。" }
  ];

  /* ---------- 4. 面试题（面试模拟器用） ---------- */
  var INTERVIEW = [
    { q: "说说 position 的五个值，各自什么场景用？", points: ["static 默认，top/left 无效", "relative 偏移但保留原位，常当参照物", "absolute 相对最近已定位祖先，脱离文档流", "fixed 相对视口，滚动不动", "sticky 到阈值才粘住，受父元素限制"] },
    { q: "为什么 z-index 会不生效？", points: ["没写 position（static 下无效）", "父元素创建了层叠上下文（transform/opacity/filter）", "两个元素不在同一层叠上下文"] },
    { q: "transition 为什么必须写在默认状态？", points: ["写在 :hover 里，移出时规则消失", "移出会瞬间弹回，没有过渡", "写在默认状态，进出都有动画"] },
    { q: "transform 和 left/top 做动画有什么区别？", points: ["transform 不触发重排重绘，走合成层", "left/top 触发重排，性能差", "transform 还会创建层叠上下文（副作用）"] },
    { q: "flex: 1 到底是什么意思？", points: ["flex-grow:1 分剩余空间", "flex-shrink:1 可压缩", "flex-basis:0% 基准为 0", "合起来 = 等分剩余空间"] },
    { q: "box-sizing: border-box 解决了什么问题？", points: ["默认 content-box 下 width 不含 padding/border", "加 padding 会把盒子撑大", "border-box 让 width 就是最终宽度", "布局计算更直观"] },
    { q: "语义化标签的价值是什么？", points: ["标签说明内容含义", "利于 SEO", "利于无障碍（屏幕阅读器）", "利于团队协作与维护"] },
    { q: "absolute 的包含块怎么找？", points: ["往上找第一个 position 不是 static 的祖先", "找不到就相对初始包含块（页面）", "父元素写 relative 是最常见做法"] }
  ];

  /* ---------- 5. 徽章定义 ---------- */
  var BADGES = [
    { id: "first-checkin", name: "第一次打卡", icon: "🌱", desc: "完成第 1 次打卡", check: function (s) { return s.checkins.length >= 1; } },
    { id: "streak-3", name: "三天不断", icon: "🔥", desc: "连续打卡 3 天", check: function (s) { return s.maxStreak >= 3; } },
    { id: "streak-7", name: "一周不断", icon: "⚡", desc: "连续打卡 7 天", check: function (s) { return s.maxStreak >= 7; } },
    { id: "ten-checkins", name: "十天", icon: "📅", desc: "累计打卡 10 天", check: function (s) { return s.checkins.length >= 10; } },
    { id: "wrong-5", name: "错题收集者", icon: "📕", desc: "错题本累计 5 题", check: function (s) { return s.wrong.length >= 5; } },
    { id: "exam-pass", name: "章节通关", icon: "🎖️", desc: "章节测试得分 ≥ 80", check: function (s) { return s.bestExam >= 80; } },
    { id: "interviewer", name: "面试官认可", icon: "🎤", desc: "面试模拟得分 ≥ 80", check: function (s) { return s.bestInterview >= 80; } },
    { id: "pomodoro-5", name: "专注五轮", icon: "🍅", desc: "完成 5 个番茄钟", check: function (s) { return s.pomodoro >= 5; } },
    { id: "replay-all", name: "回放全看", icon: "🎬", desc: "看完所有代码回放", check: function (s) { return LESSONS.length > 0 && s.replaySeen.length >= LESSONS.length; } },
    { id: "exam-perfect", name: "满分选手", icon: "💯", desc: "章节测试拿到 100 分", check: function (s) { return s.bestExam >= 100; } }
  ];

  function checkBadges() {
    var unlocked = [];
    BADGES.forEach(function (b) {
      if (state.badges.indexOf(b.id) === -1 && b.check(state)) {
        state.badges.push(b.id);
        unlocked.push(b);
      }
    });
    if (unlocked.length) saveState();
    return unlocked;
  }

  /* ---------- 6. 进度环（安全版：只改 SVG 属性） ---------- */
  // 进度靠 stroke-dashoffset 控制，绝不往 <circle> 里塞 innerHTML
  function ringHTML(pct, size) {
    var s = size || 120;
    var r = s / 2 - 8;
    var c = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(100, pct || 0));
    var offset = c * (1 - p / 100);
    return (
      '<svg viewBox="0 0 ' + s + " " + s + '" width="' + s + '" height="' + s + '" role="img" aria-label="进度 ' + Math.round(p) + '%">' +
      '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="var(--line-strong)" stroke-width="8"/>' +
      '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="8" ' +
      'stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" ' +
      'transform="rotate(-90 ' + s / 2 + " " + s / 2 + ')"/>' +
      "</svg>"
    );
  }

  /* ---------- 7. 通用 UI 片段 ---------- */
  function pageHead(crumb, title, lede) {
    return (
      '<div class="lesson-hero">' +
      '<div class="crumb"><a href="../index.html">首页</a><span aria-hidden="true">/</span><span>' + esc(crumb) + "</span></div>" +
      "<h1>" + esc(title) + "</h1>" +
      '<p class="lede">' + esc(lede) + "</p>" +
      "</div>"
    );
  }
  function shell(inner) {
    return '<div class="lesson-shell"><main class="lesson-main-col" id="content">' + inner + "</main></div>";
  }
  function navHTML(active) {
    var items = [
      { href: "../index.html", label: "首页", key: "home" },
      { href: "review.html", label: "复习", key: "review" },
      { href: "exam.html", label: "测试", key: "exam" },
      { href: "map.html", label: "地图", key: "map" },
      { href: "interview.html", label: "面试", key: "interview" },
      { href: "badges.html", label: "徽章", key: "badges" },
      { href: "replay.html", label: "回放", key: "replay" }
    ];
    return (
      '<header class="nav"><div class="nav-inner">' +
      '<a class="brand" href="../index.html"><span class="brand-mark">Z</span><span>造神计划</span></a>' +
      '<nav class="nav-links" aria-label="主导航">' +
      items
        .map(function (it) {
          return '<a href="' + it.href + '"' + (it.key === active ? ' aria-current="page"' : "") + ">" + it.label + "</a>";
        })
        .join("") +
      "</nav>" +
      '<span class="nav-spacer"></span>' +
      '<button class="icon-btn" id="themeBtn" type="button" aria-label="切换主题"></button>' +
      "</div></header>"
    );
  }
  function footerHTML() {
    return (
      '<footer class="footer"><div class="footer-inner">' +
      "<span>造神计划 · 先做后懂，每天一个能看见的产出。</span>" +
      '<span><a href="../index.html">回到首页</a></span>' +
      "</div></footer>"
    );
  }
  // 主题按钮：site.js 用事件委托监听 #themeBtn，动态插入也能用
  function mountThemeBtn() {
    var t = document.documentElement.getAttribute("data-theme") || "dark";
    var btn = $("#themeBtn");
    if (!btn) return;
    btn.setAttribute("aria-label", t === "light" ? "切换到深色模式" : "切换到浅色模式");
    btn.innerHTML =
      t === "light"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  }

  /* ============================================================
     功能页统一渲染入口
     body 上写 data-feature="review|exam|map|badges|interview|replay"
     ============================================================ */
  function renderFeaturePage() {
    var page = document.body.getAttribute("data-feature");
    if (!page) return;

    var titles = {
      review: ["复习模式", "把学过的课，用 3 分钟重新过一遍。"],
      exam: ["章节测试", "从题库随机抽 10 题，80 分算通关。"],
      map: ["知识地图", "把 14 天的知识点连成一张网。"],
      badges: ["成就徽章", "打卡、错题、测试、专注，都会解锁徽章。"],
      interview: ["面试模拟", "8 道高频题，按要点自评打分。"],
      replay: ["代码回放", "把每天写的代码，按顺序重看一遍。"]
    };
    var t = titles[page] || ["功能", ""];

    document.body.insertAdjacentHTML("afterbegin", navHTML(page));
    var host = $("#featureRoot");
    if (host) host.innerHTML = shell(pageHead(t[0], t[0], t[1]) + '<div id="featureBody"></div>');
    document.body.insertAdjacentHTML("beforeend", footerHTML());
    mountThemeBtn();

    var body = $("#featureBody");
    if (!body) return;

    if (page === "review") safe("review", function () { renderReview(body); });
    if (page === "exam") safe("exam", function () { renderExam(body); });
    if (page === "map") safe("map", function () { renderMap(body); });
    if (page === "badges") safe("badges", function () { renderBadges(body); });
    if (page === "interview") safe("interview", function () { renderInterview(body); });
    if (page === "replay") safe("replay", function () { renderReplay(body); });
  }

  /* ============================================================
     A. 复习模式
     ============================================================ */
  function renderReview(host) {
    var done = LESSONS.filter(function (l) {
      return l.status === "done" || l.status === "current";
    });
    var html =
      '<div class="callout tip"><span class="label">怎么用</span><p>选一节课，只看「知识点清单」，能自己讲出来就算复习过。讲不出来的，点进去重看那一节。</p></div>';
    html += '<div class="practice"><div class="practice-head"><div><h2>选一节课复习</h2><p>共 ' + done.length + " 节可复习</p></div></div>";
    done.forEach(function (l) {
      html +=
        '<div class="q"><div class="q-head"><span class="q-no">' + esc(l.day) + '</span><span class="q-text">' + esc(l.title) + "</span></div>" +
        '<div class="opts">' +
        (l.sections || [])
          .map(function (s) {
            return '<a class="opt" href="../' + esc(l.href) + "#" + esc(s.id) + '"><span class="opt-key">·</span><span>' + esc(s.title) + "</span></a>";
          })
          .join("") +
        "</div></div>";
    });
    html += "</div>";
    host.innerHTML = html;
  }

  /* ============================================================
     B. 章节测试
     ============================================================ */
  function renderExam(host) {
    host.innerHTML =
      '<div class="practice"><div class="practice-head"><div><h2>章节测试</h2><p>随机 10 题 · 80 分通关</p></div>' +
      '<span class="score">最高 <b>' + state.bestExam + "</b></span></div>" +
      '<div class="practice-foot"><button class="btn" id="examStart" type="button">开始测试</button>' +
      '<span class="note">答错的题会自动进错题本</span></div></div>' +
      '<div id="examArea"></div>';

    $("#examStart").addEventListener("click", function () {
      var pool = BANK.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 10);
      var idx = 0;
      var right = 0;
      var area = $("#examArea");

      function paint() {
        if (idx >= pool.length) {
          var score = Math.round((right / pool.length) * 100);
          if (score > state.bestExam) state.bestExam = score;
          saveState();
          var got = checkBadges();
          area.innerHTML =
            '<div class="practice"><div class="practice-head"><div><h2>得分 ' + score + "</h2><p>答对 " + right + " / " + pool.length + "</p></div></div>" +
            '<div class="practice-foot"><button class="btn" id="examAgain" type="button">再来一次</button>' +
            '<a class="btn btn-ghost" href="../index.html">回到首页</a></div></div>' +
            (got.length
              ? '<div class="callout tip"><span class="label">解锁徽章</span><p>' +
                got.map(function (b) { return b.icon + " " + b.name; }).join("、") +
                "</p></div>"
              : "");
          $("#examAgain").addEventListener("click", function () { $("#examStart").click(); });
          return;
        }
        var q = pool[idx];
        area.innerHTML =
          '<div class="practice"><div class="practice-head"><div><h2>第 ' + (idx + 1) + " / " + pool.length + " 题</h2><p>D" + q.day + "</p></div>" +
          '<span class="score">答对 <b>' + right + "</b></span></div>" +
          '<div class="q"><div class="q-head"><span class="q-no">Q' + (idx + 1) + '</span><span class="q-text">' + esc(q.q) + "</span></div>" +
          '<div class="opts">' +
          q.options
            .map(function (o, i) {
              return '<button class="opt" type="button" data-i="' + i + '"><span class="opt-key">' + "ABCD"[i] + "</span><span>" + esc(o) + "</span></button>";
            })
            .join("") +
          '</div><p class="fb"></p></div></div>';

        $$(".opt", area).forEach(function (btn) {
          btn.addEventListener("click", function () {
            var picked = Number(btn.getAttribute("data-i"));
            var ok = picked === q.answer;
            if (ok) right++;
            else
              state.wrong.push({
                id: q.id,
                day: q.day,
                q: q.q,
                options: q.options,
                answer: q.answer,
                picked: picked,
                at: todayStr()
              });
            saveState();
            $$(".opt", area).forEach(function (b, i) {
              b.disabled = true;
              if (i === q.answer) b.classList.add("correct");
              else if (i === picked) b.classList.add("wrong");
            });
            var fb = $(".fb", area);
            fb.className = "fb " + (ok ? "ok" : "bad");
            fb.innerHTML = (ok ? "✓ 正确。" : "✗ 不对。") + '<span class="why">' + esc(q.explain) + "</span>";
            setTimeout(function () {
              idx++;
              paint();
            }, 900);
          });
        });
      }
      paint();
    });
  }

  /* ============================================================
     C. 知识地图
     ============================================================ */
  function renderMap(host) {
    var html =
      '<div class="callout tip"><span class="label">怎么看</span><p>按周分组，每节课下面列出它的知识点。点知识点直接跳到课程里对应那一节。</p></div>';
    WEEKS.forEach(function (w) {
      var items = LESSONS.filter(function (l) { return l.week === w.id; });
      if (!items.length) return;
      html +=
        '<div class="week" data-open="true"><div class="week-head"><span class="week-no">' + esc(w.no) +
        '</span><span class="week-title">' + esc(w.title) + '</span><span class="week-count">' + items.length + " 节</span></div>";
      html += '<ul class="lesson-list">';
      items.forEach(function (l) {
        html +=
          '<li><div class="lesson-row"><span class="lesson-day">' + esc(l.day) + "</span>" +
          '<span class="lesson-main"><span class="lesson-title">' + esc(l.title) + "</span>" +
          '<span class="lesson-desc">' +
          (l.sections || [])
            .map(function (s) {
              return '<a href="../' + esc(l.href) + "#" + esc(s.id) + '" style="text-decoration:underline;text-underline-offset:3px;">' + esc(s.title) + "</a>";
            })
            .join(" · ") +
          "</span></span></div></li>";
      });
      html += "</ul></div>";
    });
    host.innerHTML = html;
  }

  /* ============================================================
     D. 成就徽章墙
     ============================================================ */
  function renderBadges(host) {
    checkBadges();
    var html =
      '<div class="stats" style="margin-top:0;border-top:0;padding-top:0;">' +
      "<span><b>" + state.badges.length + "</b>已解锁</span>" +
      "<span><b>" + BADGES.length + "</b>总徽章</span>" +
      "<span><b>" + state.checkins.length + "</b>累计打卡</span>" +
      "<span><b>" + state.maxStreak + "</b>最长连续</span>" +
      "</div>";
    html += '<div class="practice"><div class="practice-head"><div><h2>徽章墙</h2><p>灰色 = 未解锁，亮色 = 已解锁</p></div></div>';
    html += '<div class="opts" style="margin-left:0;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));display:grid;">';
    BADGES.forEach(function (b) {
      var on = state.badges.indexOf(b.id) !== -1;
      html +=
        '<div class="opt" style="flex-direction:column;align-items:flex-start;gap:6px;' +
        (on ? "" : "opacity:.45;") +
        '">' +
        '<span style="font-size:26px;line-height:1;">' + b.icon + "</span>" +
        '<span style="font-weight:600;color:var(--text);">' + esc(b.name) + "</span>" +
        '<span style="font-size:13px;color:var(--text-3);">' + esc(b.desc) + "</span>" +
        '<span class="tag' + (on ? " done" : "") + '">' + (on ? "已解锁" : "未解锁") + "</span>" +
        "</div>";
    });
    html += "</div></div>";
    host.innerHTML = html;
  }

  /* ============================================================
     E. 面试模拟
     ============================================================ */
  function renderInterview(host) {
    host.innerHTML =
      '<div class="practice"><div class="practice-head"><div><h2>面试模拟</h2><p>8 道高频题 · 自己先答，再展开要点自评</p></div>' +
      '<span class="score">最高 <b>' + state.bestInterview + "</b></span></div>" +
      '<div class="practice-foot"><button class="btn" id="ivStart" type="button">开始模拟</button>' +
      '<span class="note">按要点勾选，勾满 80% 算通过</span></div></div>' +
      '<div id="ivArea"></div>';

    $("#ivStart").addEventListener("click", function () {
      var idx = 0;
      var hit = 0;
      var total = 0;
      var area = $("#ivArea");

      function paint() {
        if (idx >= INTERVIEW.length) {
          var score = total ? Math.round((hit / total) * 100) : 0;
          if (score > state.bestInterview) state.bestInterview = score;
          saveState();
          var got = checkBadges();
          area.innerHTML =
            '<div class="practice"><div class="practice-head"><div><h2>得分 ' + score + "</h2><p>命中 " + hit + " / " + total + " 个要点</p></div></div>" +
            '<div class="practice-foot"><button class="btn" id="ivAgain" type="button">再来一次</button>' +
            '<a class="btn btn-ghost" href="../index.html">回到首页</a></div></div>' +
            (got.length
              ? '<div class="callout tip"><span class="label">解锁徽章</span><p>' +
                got.map(function (b) { return b.icon + " " + b.name; }).join("、") +
                "</p></div>"
              : "");
          $("#ivAgain").addEventListener("click", function () { $("#ivStart").click(); });
          return;
        }
        var item = INTERVIEW[idx];
        area.innerHTML =
          '<div class="practice"><div class="practice-head"><div><h2>第 ' + (idx + 1) + " / " + INTERVIEW.length + " 题</h2><p>先自己说一遍，再勾要点</p></div></div>" +
          '<div class="q"><div class="q-head"><span class="q-no">Q' + (idx + 1) + '</span><span class="q-text">' + esc(item.q) + "</span></div>" +
          '<ul class="checklist">' +
          item.points
            .map(function (p, i) {
              return "<li><label><input type=\"checkbox\" data-p=\"" + i + "\"><span>" + esc(p) + "</span></label></li>";
            })
            .join("") +
          "</ul>" +
          '<div class="practice-foot"><button class="btn" id="ivNext" type="button">下一题</button>' +
          '<span class="note">勾上你答到的要点</span></div></div></div>';

        $("#ivNext").addEventListener("click", function () {
          $$('input[type="checkbox"]', area).forEach(function (c) {
            total++;
            if (c.checked) hit++;
          });
          idx++;
          paint();
        });
      }
      paint();
    });
  }

  /* ============================================================
     F. 代码回放
     ============================================================ */
  function renderReplay(host) {
    var html =
      '<div class="callout tip"><span class="label">怎么用</span><p>按顺序点开每一天，看这一课的知识点清单。看完点「标记已看」，进度会记住。</p></div>';
    html += '<div class="practice"><div class="practice-head"><div><h2>代码回放</h2><p>已看 ' + state.replaySeen.length + " / " + LESSONS.length + " 天</p></div></div>";
    LESSONS.forEach(function (l) {
      var seen = state.replaySeen.indexOf(l.day) !== -1;
      html +=
        '<div class="q"><div class="q-head"><span class="q-no">' + esc(l.day) + '</span><span class="q-text">' + esc(l.title) +
        (seen ? ' <span class="tag done">已看</span>' : "") + "</span></div>" +
        '<div class="opts">' +
        (l.sections || [])
          .map(function (s) {
            return '<a class="opt" href="../' + esc(l.href) + "#" + esc(s.id) + '"><span class="opt-key">·</span><span>' + esc(s.title) + "</span></a>";
          })
          .join("") +
        "</div>" +
        '<div class="practice-foot"><button class="btn btn-ghost" type="button" data-seen="' + esc(l.day) + '">' +
        (seen ? "已标记" : "标记已看") +
        "</button></div></div>";
    });
    html += "</div>";
    host.innerHTML = html;

    $$("[data-seen]", host).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var day = btn.getAttribute("data-seen");
        if (state.replaySeen.indexOf(day) === -1) {
          state.replaySeen.push(day);
          saveState();
          checkBadges();
          renderReplay(host);
        }
      });
    });
  }

  /* ============================================================
     首页增强：打卡 + 六个功能入口 + 番茄钟
     ============================================================ */
  function renderHomeExtras() {
    var anchor = $("#resume");
    if (!anchor) return;
    var section = anchor.closest(".section");
    if (!section) return;

    // ---- 打卡条 ----
    var checked = hasCheckedInToday();
    var bar =
      '<div class="resume" style="margin-top:16px;">' +
      "<div>" +
      '<span class="resume-label">每日打卡</span>' +
      "<h3>累计 " + state.checkins.length + " 天 · 连续 " + state.streak + " 天</h3>" +
      "<p>最长连续 " + state.maxStreak + " 天。每天点一次，断了就从 1 重新数。</p>" +
      "</div>" +
      '<button class="btn' + (checked ? " btn-ghost" : "") + '" id="checkinBtn" type="button"' + (checked ? " disabled" : "") + ">" +
      (checked ? "今天已打卡 ✓" : "打卡") +
      "</button>" +
      "</div>";
    // 插到 #resume 后面（不是 section 末尾），避免被 .section 的 padding 挤到奇怪位置
    anchor.insertAdjacentHTML("afterend", bar);

    // ---- 六个功能入口 ----
    var entries = [
      { href: "lessons/review.html", title: "复习模式", desc: "3 分钟过一遍学过的课", tag: "A" },
      { href: "lessons/exam.html", title: "章节测试", desc: "随机 10 题，80 分通关", tag: "B" },
      { href: "lessons/replay.html", title: "代码回放", desc: "按顺序重看每天的代码", tag: "C" },
      { href: "lessons/map.html", title: "知识地图", desc: "14 天知识点连成一张网", tag: "D" },
      { href: "lessons/interview.html", title: "面试模拟", desc: "8 道高频题自评打分", tag: "E" },
      { href: "lessons/badges.html", title: "成就徽章", desc: "打卡与测试解锁徽章", tag: "F" }
    ];
    var grid =
      '<section class="section" style="padding-top:0;"><div class="section-head"><h2>学习工具</h2><p>六个功能 · 数据存在本机浏览器</p></div>' +
      // minmax(150px,1fr)：375px 手机上也能排成两列，不会横向溢出
      '<div class="opts" style="margin-left:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">' +
      entries
        .map(function (e) {
          return (
            '<a class="opt" href="' + e.href + '" style="flex-direction:column;align-items:flex-start;gap:6px;padding:18px;">' +
            '<span class="tag">' + e.tag + "</span>" +
            '<span style="font-weight:600;color:var(--text);font-size:16px;">' + esc(e.title) + "</span>" +
            '<span style="font-size:13px;color:var(--text-3);">' + esc(e.desc) + "</span>" +
            "</a>"
          );
        })
        .join("") +
      "</div></section>";
    anchor.insertAdjacentHTML("afterend", grid);

    // ---- 番茄钟 ----
    var pomo =
      '<section class="section" style="padding-top:0;"><div class="section-head"><h2>番茄钟</h2><p>25 分钟专注 · 完成 ' + state.pomodoro + " 轮</p></div>" +
      '<div class="resume"><div><span class="resume-label">专注计时</span>' +
      '<h3 id="pomoTime">25:00</h3><p>点开始，25 分钟后提醒你休息 5 分钟。</p></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
      '<button class="btn" id="pomoStart" type="button">开始</button>' +
      '<button class="btn btn-ghost" id="pomoStop" type="button">重置</button>' +
      "</div></div></section>";
    anchor.insertAdjacentHTML("afterend", pomo);

    // ---- 绑定打卡 ----
    var cbtn = $("#checkinBtn");
    if (cbtn && !checked) {
      cbtn.addEventListener("click", function () {
        if (doCheckin()) {
          checkBadges();
          location.reload();
        }
      });
    }

    // ---- 绑定番茄钟 ----
    var left = 25 * 60;
    var timer = null;
    var timeEl = $("#pomoTime");
    function paintPomo() {
      var m = String(Math.floor(left / 60)).padStart(2, "0");
      var s = String(left % 60).padStart(2, "0");
      if (timeEl) timeEl.textContent = m + ":" + s;
    }
    var startBtn = $("#pomoStart");
    var stopBtn = $("#pomoStop");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        if (timer) return;
        timer = setInterval(function () {
          left--;
          paintPomo();
          if (left <= 0) {
            clearInterval(timer);
            timer = null;
            left = 25 * 60;
            state.pomodoro++;
            state.studyMinutes += 25;
            saveState();
            checkBadges();
            paintPomo();
            alert("25 分钟完成，休息 5 分钟。");
          }
        }, 1000);
      });
    }
    if (stopBtn) {
      stopBtn.addEventListener("click", function () {
        if (timer) clearInterval(timer);
        timer = null;
        left = 25 * 60;
        paintPomo();
      });
    }
  }

  /* ============================================================
     启动
     ============================================================ */
  safe("featurePage", renderFeaturePage);
  safe("homeExtras", renderHomeExtras);
})();
