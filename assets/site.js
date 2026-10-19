/* ============================================================
   全站脚本 · 无依赖
   ------------------------------------------------------------
   1. 主题切换（深色 / 浅色，记住选择）
   2. 首页：目录渲染 + 搜索（支持拼音首字母以外的关键词、键盘上下选择）
   3. 课程页：阅读进度条、右侧目录高亮、代码复制、练习题判分
   ============================================================ */

(function () {
  "use strict";

  var DATA = window.COURSE_DATA || { lessons: [], weeks: [], site: {} };
  var LESSONS = DATA.lessons || [];
  var WEEKS = DATA.weeks || [];

  /* ---------- 小工具 ---------- */
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  // 转义 HTML 特殊字符，防止课程标题里的符号破坏结构
  var ESC_MAP = {
    "&": "&" + "amp;", // &  →  &
    "<": "&" + "lt;", // <  →  <
    ">": "&" + "gt;", // >  →  >
    '"': "&" + "quot;", // "  →  "
    "'": "&#" + "39;", // '  →  '
  };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ESC_MAP[c];
    });
  }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) {
      /* 隐私模式下 localStorage 可能不可用，静默降级 */
    }
  }

  /* ============================================================
     1. 主题
     ============================================================ */
  var THEME_KEY = "zs-theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    var btn = $("#themeBtn");
    if (btn) {
      btn.setAttribute("aria-label", t === "light" ? "切换到深色模式" : "切换到浅色模式");
      btn.innerHTML =
        t === "light"
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    }
  }
  var savedTheme = store(THEME_KEY);
  var prefersLight =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(savedTheme || (prefersLight ? "light" : "dark"));

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#themeBtn");
    if (!btn) return;
    var next =
      document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    store(THEME_KEY, next);
  });

  /* ============================================================
     2. 首页：目录 + 搜索
     ============================================================ */
  var listRoot = $("#lessonList");
  if (listRoot) {
    renderCatalog();
    initSearch();
    renderResume();
  }

  function statusTag(l) {
    if (l.status === "done") return '<span class="tag done">已完成</span>';
    if (l.status === "current") return '<span class="tag next">进行中</span>';
    return '<span class="tag">待开始</span>';
  }

  function renderCatalog() {
    var html = "";
    WEEKS.forEach(function (w) {
      var items = LESSONS.filter(function (l) {
        return l.week === w.id;
      });
      if (!items.length) return;
      var doneCount = items.filter(function (l) {
        return l.status === "done";
      }).length;

      html += '<section class="week" data-open="true" data-week="' + w.id + '">';
      html +=
        '<button class="week-head" type="button" aria-expanded="true">' +
        '<span class="week-no">' +
        esc(w.no) +
        "</span>" +
        '<span class="week-title">' +
        esc(w.title) +
        "</span>" +
        '<span class="week-count">' +
        doneCount +
        " / " +
        items.length +
        " 已完成</span>" +
        '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>' +
        "</button>";
      html += '<ul class="lesson-list">';
      items.forEach(function (l) {
        html +=
          '<li><a class="lesson-row' +
          (l.status === "current" ? " is-current" : "") +
          '" href="' +
          esc(l.href) +
          '" data-day="' +
          esc(l.day) +
          '">' +
          '<span class="lesson-day">' +
          esc(l.day) +
          "</span>" +
          '<span class="lesson-main">' +
          '<span class="lesson-title">' +
          esc(l.title) +
          statusTag(l) +
          "</span>" +
          '<span class="lesson-desc">' +
          esc(l.desc) +
          "</span>" +
          "</span>" +
          '<span class="lesson-meta-right">' +
          l.minutes +
          " min</span>" +
          "</a></li>";
      });
      html += "</ul></section>";
    });
    listRoot.innerHTML = html;

    // 周折叠
    $$(".week-head", listRoot).forEach(function (head) {
      head.addEventListener("click", function () {
        var week = head.parentElement;
        var open = week.getAttribute("data-open") === "true";
        week.setAttribute("data-open", open ? "false" : "true");
        head.setAttribute("aria-expanded", open ? "false" : "true");
      });
    });
  }

  function renderResume() {
    var box = $("#resume");
    if (!box) return;
    var cur =
      LESSONS.filter(function (l) {
        return l.status === "current";
      })[0] || LESSONS[LESSONS.length - 1];
    if (!cur) return;
    var idx = LESSONS.indexOf(cur);
    var done = LESSONS.filter(function (l) {
      return l.status === "done";
    }).length;
    box.innerHTML =
      '<div><span class="resume-label">继续学习 · ' +
      esc(cur.day) +
      "</span>" +
      "<h3>" +
      esc(cur.title) +
      "</h3>" +
      "<p>" +
      esc(cur.desc) +
      "</p></div>" +
      '<a class="btn" href="' +
      esc(cur.href) +
      '">开始这一课' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
      "</a>";

    var stats = $("#stats");
    if (stats) {
      stats.innerHTML =
        "<span><b>" + done + "</b>天已完成</span>" +
        "<span><b>" + LESSONS.length + "</b>天已排课</span>" +
        "<span><b>" + (LESSONS.length - done) + "</b>天待解锁</span>" +
        "<span>当前进度 <b>" + esc(cur.day) + "</b></span>";
    }
  }

  /* ---------- 搜索 ---------- */
  function initSearch() {
    var input = $("#searchInput");
    var panel = $("#searchResults");
    if (!input || !panel) return;

    var activeIndex = -1;
    var currentResults = [];

    /* ------------------------------------------------------------
       检索模型（参考 book-study 的搜索优先级）
       1. 标题精确命中   → 最高分
       2. 标题包含
       3. 小节标题命中   → 直接跳到 dNN.html#小节id
       4. 小节正文命中
       5. 关键词 / 标签命中
       6. 同义词展开后再算一遍（搜「居中」也能找到 align-items）
       多词查询：每个词都要命中，命中词越多分越高。
       ------------------------------------------------------------ */

    var SYN = (DATA.synonyms || {});

    // 把查询拆成词，并对每个词做同义词展开
    function expand(q) {
      var raw = q.split(/[\s,，、]+/).filter(Boolean);
      var groups = raw.map(function (w) {
        var list = [w];
        // 正向：输入「居中」→ 补上 align-items 等
        if (SYN[w]) list = list.concat(SYN[w]);
        // 反向：输入「align-items」→ 补上「居中」
        Object.keys(SYN).forEach(function (k) {
          if (SYN[k].indexOf(w) > -1 && list.indexOf(k) < 0) list.push(k);
        });
        return list;
      });
      return groups;
    }

    // 一个词在文本里出现的位置，找不到返回 -1
    function hit(text, w) {
      return text.indexOf(w);
    }

    // 计算一节课的得分，同时记录命中的小节（用于生成跳转锚点）
    function scoreLesson(lesson, groups, q) {
      var title = (lesson.title + " " + lesson.day).toLowerCase();
      var meta = (
        (lesson.tags || []).join(" ") +
        " " +
        (lesson.keywords || "") +
        " " +
        lesson.desc
      ).toLowerCase();
      var total = 0;
      var bestSection = null;
      var bestSectionScore = 0;

      groups.forEach(function (alts) {
        var got = 0;
        // 1. 标题精确
        if (title === q) got = Math.max(got, 120);
        // 2. 标题包含
        alts.forEach(function (w) {
          if (hit(title, w) === 0) got = Math.max(got, 100);
          else if (hit(title, w) > -1) got = Math.max(got, 80);
        });
        // 3. 小节标题 / 4. 小节正文
        (lesson.sections || []).forEach(function (sec) {
          var st = (sec.title || "").toLowerCase();
          var sx = (sec.text || "").toLowerCase();
          var sterms = (sec.terms || "").toLowerCase();
          var local = 0;
          alts.forEach(function (w) {
            if (hit(st, w) > -1) local = Math.max(local, 70);
            else if (hit(sterms, w) > -1) local = Math.max(local, 55);
            else if (hit(sx, w) > -1) local = Math.max(local, 45);
          });
          if (local > bestSectionScore) {
            bestSectionScore = local;
            bestSection = sec;
          }
          got = Math.max(got, local);
        });
        // 5. 关键词 / 标签 / 简介
        alts.forEach(function (w) {
          if (hit(meta, w) > -1) got = Math.max(got, 35);
        });
        total += got;
      });

      return { score: total, section: bestSection, sectionScore: bestSectionScore };
    }

    // 高亮：把所有命中的词都包上 <mark>
    function highlight(text, words) {
      if (!words || !words.length) return esc(text);
      var lower = text.toLowerCase();
      var ranges = [];
      words.forEach(function (w) {
        if (!w) return;
        var from = 0;
        while (true) {
          var i = lower.indexOf(w, from);
          if (i < 0) break;
          ranges.push([i, i + w.length]);
          from = i + w.length;
        }
      });
      if (!ranges.length) return esc(text);
      // 合并重叠区间
      ranges.sort(function (a, b) { return a[0] - b[0]; });
      var merged = [ranges[0]];
      for (var k = 1; k < ranges.length; k++) {
        var last = merged[merged.length - 1];
        if (ranges[k][0] <= last[1]) last[1] = Math.max(last[1], ranges[k][1]);
        else merged.push(ranges[k]);
      }
      var out = "";
      var pos = 0;
      merged.forEach(function (r) {
        out += esc(text.slice(pos, r[0]));
        out += "<mark>" + esc(text.slice(r[0], r[1])) + "</mark>";
        pos = r[1];
      });
      out += esc(text.slice(pos));
      return out;
    }

    // 从正文里截一段包含关键词的片段，前后各留一点上下文
    function snippet(text, words) {
      var lower = text.toLowerCase();
      var at = -1;
      for (var i = 0; i < words.length; i++) {
        var p = lower.indexOf(words[i]);
        if (p > -1 && (at < 0 || p < at)) at = p;
      }
      if (at < 0) return { text: text.slice(0, 60) + (text.length > 60 ? "…" : ""), words: [] };
      var start = Math.max(0, at - 18);
      var end = Math.min(text.length, at + 62);
      var body = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
      return { text: body, words: words };
    }

    function render(q) {
      var raw = q.trim();
      if (!raw) {
        panel.classList.remove("open");
        panel.innerHTML = "";
        currentResults = [];
        return;
      }
      var lower = raw.toLowerCase();
      var groups = expand(lower);
      // 所有候选词（用于高亮）
      var allWords = [];
      groups.forEach(function (g) {
        g.forEach(function (w) {
          if (allWords.indexOf(w) < 0) allWords.push(w);
        });
      });

      var scored = LESSONS.map(function (l) {
        var r = scoreLesson(l, groups, lower);
        return { l: l, score: r.score, section: r.section, sectionScore: r.sectionScore };
      })
        .filter(function (r) {
          return r.score > 0;
        })
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, 8);

      currentResults = scored.map(function (r) {
        return {
          href: r.section ? r.l.href + "#" + r.section.id : r.l.href,
          day: r.l.day,
          title: r.l.title,
          desc: r.l.desc,
        };
      });

      if (!scored.length) {
        panel.innerHTML =
          '<div class="empty">没有找到「' +
          esc(raw) +
          '」。试试「定位」「居中」「盒模型」「换行」，或者直接看下面的目录。</div>';
      } else {
        panel.innerHTML = scored
          .map(function (r, i) {
            var l = r.l;
            // 有命中小节就展示小节标题 + 正文片段，否则展示课程简介
            var sub = "";
            var bodyText = l.desc;
            if (r.section && r.sectionScore >= 45) {
              sub =
                '<span class="result-sec">' +
                highlight(r.section.title, allWords) +
                "</span>";
              bodyText = r.section.text;
            }
            var sn = snippet(bodyText, allWords);
            return (
              '<a class="result" href="' +
              esc(r.section && r.sectionScore >= 45 ? l.href + "#" + r.section.id : l.href) +
              '" data-i="' +
              i +
              '">' +
              '<span class="result-day">' +
              esc(l.day) +
              "</span>" +
              '<span class="result-body">' +
              '<span class="result-title">' +
              highlight(l.title, allWords) +
              "</span>" +
              sub +
              '<span class="result-desc">' +
              highlight(sn.text, allWords) +
              "</span>" +
              "</span></a>"
            );
          })
          .join("");
      }
      activeIndex = -1;
      panel.classList.add("open");
    }

    input.addEventListener("input", function () {
      render(input.value);
    });
    input.addEventListener("focus", function () {
      if (input.value.trim()) render(input.value);
    });

    input.addEventListener("keydown", function (e) {
      var items = $$(".result", panel);
      if (e.key === "ArrowDown" && items.length) {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
      } else if (e.key === "ArrowUp" && items.length) {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
      } else if (e.key === "Enter") {
        if (activeIndex > -1 && items[activeIndex]) {
          window.location.href = items[activeIndex].getAttribute("href");
        } else if (currentResults[0]) {
          window.location.href = currentResults[0].href;
        }
        return;
      } else if (e.key === "Escape") {
        panel.classList.remove("open");
        input.blur();
        return;
      } else {
        return;
      }
      items.forEach(function (el, i) {
        el.classList.toggle("active", i === activeIndex);
      });
      if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: "nearest" });
    });

    // 点外面关闭
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".search")) panel.classList.remove("open");
    });

    // 快捷键：/ 或 ⌘K 聚焦搜索
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  /* ============================================================
     3. 课程页
     ============================================================ */
  var prose = $(".prose");

  /* 3.1 阅读进度条 */
  var bar = $("#readProgress");
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = p.toFixed(2) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* 3.2 右侧目录高亮 */
  var tocLinks = $$(".toc a");
  if (tocLinks.length) {
    var targets = tocLinks
      .map(function (a) {
        var id = a.getAttribute("href").slice(1);
        return document.getElementById(id);
      })
      .filter(Boolean);

    var spy = function () {
      var y = window.scrollY + 120;
      var current = targets[0];
      targets.forEach(function (t) {
        if (t.offsetTop <= y) current = t;
      });
      tocLinks.forEach(function (a) {
        a.classList.toggle("active", current && a.getAttribute("href") === "#" + current.id);
      });
    };
    window.addEventListener("scroll", spy, { passive: true });
    spy();
  }

  /* 3.3 代码复制 */
  $$(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var block = btn.closest(".code-block");
      var code = block && block.querySelector("pre");
      if (!code) return;
      var text = code.innerText;
      var done = function () {
        btn.textContent = "已复制";
        btn.classList.add("copied");
        setTimeout(function () {
          btn.textContent = "复制";
          btn.classList.remove("copied");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          btn.textContent = "复制失败";
        });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          done();
        } catch (err) {
          btn.textContent = "复制失败";
        }
        document.body.removeChild(ta);
      }
    });
  });

  /* 3.4 练习题判分 */
  var practice = $("#practice");
  if (practice) {
    var questions = $$(".q", practice);
    var scoreEl = $("#score");
    var answered = {};

    function updateScore() {
      var right = 0;
      var total = questions.length;
      Object.keys(answered).forEach(function (k) {
        if (answered[k]) right++;
      });
      if (scoreEl) {
        scoreEl.innerHTML =
          "得分 <b>" + right + "</b> / " + total;
      }
      var msg = $("#scoreMsg");
      if (msg) {
        if (right === total) {
          msg.textContent = "全对。合上页面，用 30 秒把这一课讲一遍，讲得出来才算真会。";
          msg.className = "fb ok";
        } else if (right > 0) {
          msg.textContent = "答错的题回到对应小节重看，明天开头会再问一次。";
          msg.className = "fb";
        } else {
          msg.textContent = "";
        }
      }
    }

    questions.forEach(function (q, qi) {
      var opts = $$(".opt", q);
      var fb = $(".fb", q);
      opts.forEach(function (opt) {
        opt.addEventListener("click", function () {
          if (q.dataset.answered === "true") return;
          q.dataset.answered = "true";
          var correct = opt.dataset.correct === "true";
          answered[qi] = correct;

          opts.forEach(function (o) {
            o.disabled = true;
            if (o.dataset.correct === "true") o.classList.add("reveal");
          });
          opt.classList.add(correct ? "correct" : "wrong");

          if (fb) {
            fb.className = "fb " + (correct ? "ok" : "bad");
            fb.innerHTML = correct
              ? "✓ 正确。" + (opt.dataset.why ? '<span class="why">' + esc(opt.dataset.why) + "</span>" : "")
              : "✗ 不对。正确答案已标出。" +
                (opt.dataset.why ? '<span class="why">' + esc(opt.dataset.why) + "</span>" : "");
          }
          updateScore();
        });
      });
    });

    var reset = $("#resetPractice");
    if (reset) {
      reset.addEventListener("click", function () {
        answered = {};
        questions.forEach(function (q) {
          delete q.dataset.answered;
          $$(".opt", q).forEach(function (o) {
            o.disabled = false;
            o.classList.remove("correct", "wrong", "reveal");
          });
          var fb = $(".fb", q);
          if (fb) {
            fb.className = "fb";
            fb.textContent = "";
          }
        });
        updateScore();
        practice.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    updateScore();
  }

  /* 3.5 验收清单：勾选状态存本地，刷新不丢 */
  var checks = $$(".checklist input[type=checkbox]");
  if (checks.length) {
    var key = "zs-check-" + (location.pathname.split("/").pop() || "page");
    var saved = {};
    try {
      saved = JSON.parse(store(key) || "{}");
    } catch (e) {
      saved = {};
    }
    checks.forEach(function (c, i) {
      if (saved[i]) c.checked = true;
      c.addEventListener("change", function () {
        saved[i] = c.checked;
        store(key, JSON.stringify(saved));
      });
    });
  }
})();
