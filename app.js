if (typeof DATA === "undefined" || !DATA.chapters || !DATA.genres) {
        document.getElementById("container").innerHTML =
          '<div class="no-desc">数据加载失败，请刷新重试</div>';
        throw new Error("DATA missing");
      }
      const CC = {};
      DATA.chapters.forEach((ch) => {
        CC[ch.name] = ch.color;
      });

      const GENRES = DATA.genres;

      function normKey(s) {
        return String(s)
          .toLowerCase()
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201c\u201d]/g, '"')
          .replace(/\[[^\]]*\]/g, "")
          .replace(/\*+$/, "")
          .replace(/[_\-/\\]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
      const NORM_KEYS = new Map();
      Object.keys(GENRES).forEach((k) => {
        const n = normKey(k);
        if (!NORM_KEYS.has(n)) NORM_KEYS.set(n, []);
        NORM_KEYS.get(n).push(k);
      });
      // 数据里的字面 <br> 是作者手写的换行标记：分段各自转义，仅 <br> 还原成真实换行（保持 XSS 安全）
      function escBr(s) {
        return String(s)
          .split(/<br\s*\/?>/i)
          .map(esc)
          .join("<br>");
      }
      function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c;
        });
      }
      function findGenre(label) {
        if (!label) return null;
        const raw = String(label).toLowerCase();
        if (GENRES[raw]) return GENRES[raw];
        const n1 = normKey(label);
        const exact = NORM_KEYS.get(n1);
        if (exact) return GENRES[exact[0]];
        const n2 = n1.replace(/ /g, "");
        for (const [n, ks] of NORM_KEYS) {
          if (n.replace(/ /g, "") === n2) return GENRES[ks[0]];
        }
        const cands = Object.keys(GENRES).filter(
          (k) => normKey(k).includes(n1) && normKey(k) !== n1,
        );
        if (cands.length === 1) return GENRES[cands[0]];
        return null;
      }

      const container = document.getElementById("container");
      let allNodes = [];

      function buildChapter(ch) {
        const trees = ch.tree || [];
        if (!trees.length) return null;

        const col = document.createElement("div");
        col.className = "col";
        col.style.borderColor = ch.color + "33";

        const head = document.createElement("div");
        head.className = "col-head";
        head.style.background = ch.color + "18";
        head.style.color = ch.color;
        let nodeCount = 0;
        function countNodes(n) {
          nodeCount++;
          if (n.children) n.children.forEach(countNodes);
        }
        trees.forEach(countNodes);
        head.innerHTML =
          esc(ch.name) +
          ' <span style="font-size:10px;opacity:.7">(' +
          nodeCount +
          ")</span>";
        head.addEventListener("click", function () {
          const body = col.querySelector(".col-body");
          body.style.display = body.style.display === "none" ? "" : "none";
        });
        col.appendChild(head);

        const body = document.createElement("div");
        body.className = "col-body";

        function renderTree(nodes, level) {
          nodes.forEach((n) => {
            const el = document.createElement("div");
            el.className = "node l" + Math.min(level, 4);
            const hasDesc = !!findGenre(n.label);
            if (hasDesc) el.classList.add("has-desc");
            el.innerHTML =
              '<span class="dot" style="background:' +
              ch.color +
              '"></span>' +
              esc(n.label);
            el.dataset.name = n.label;
            el.dataset.chapter = ch.name;
            el.dataset.hasDesc = hasDesc ? "1" : "0";
            el.dataset.level = level;
            el._norm = normClean(n.label);
            el.addEventListener("click", function (e) {
              e.stopPropagation();
              document
                .querySelectorAll(".node.sel")
                .forEach((x) => x.classList.remove("sel"));
              el.classList.add("sel");
              showDetail(n.label, ch.name);
            });
            body.appendChild(el);
            allNodes.push(el);
            if (n.children) renderTree(n.children, level + 1);
          });
        }

        renderTree(trees, 0);
        col.appendChild(body);
        return col;
      }

      DATA.chapters.forEach((ch, i) => {
        const col = buildChapter(ch);
        if (col) {
          col.style.setProperty("--in-d", i * 45 + "ms");
          container.appendChild(col);
        }
      });

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          container.classList.add("in");
          document.body.classList.add("in");
        });
      });

      document.getElementById("ch-count").textContent =
        DATA.chapters.length +
        " 篇章 · " +
        allNodes.length +
        " 节点 · " +
        Object.keys(GENRES).length +
        " 介绍";

      function closeDetail() {
        document.getElementById("detail").classList.remove("show");
        document.getElementById("dim").classList.remove("show");
        document
          .querySelectorAll(".node.sel")
          .forEach((x) => x.classList.remove("sel"));
        document.body.style.overflow = "";
      }

      function showDetail(name, chapter) {
        const g = findGenre(name);
        const inner = document.getElementById("detail-inner");
        document.getElementById("dim").classList.add("show");
        let h = '<h2 id="detail-title">' + esc(name) + "</h2>";
        h +=
          '<span class="chap" style="background:' +
          (CC[chapter] || "#888") +
          "22;color:" +
          (CC[chapter] || "#888") +
          '">' +
          esc(chapter || "") +
          "</span>";

        if (g && g.chapter && g.chapter !== chapter) {
          h +=
            ' <span class="xref-note">（详细介绍来自「' +
            esc(g.chapter) +
            "」篇章）</span>";
        }

        if (!g || !g.desc) {
          h += '<div class="no-desc">暂无详细介绍</div>';
          inner.innerHTML = h;
          document.getElementById("detail").classList.add("show");
          document.body.style.overflow = "hidden";
          return;
        }

        if (g.aka) h += '<div class="aka">A.K.A. ' + esc(g.aka) + "</div>";
        h += '<div class="desc">' + escBr(g.desc) + "</div>";

        if (g.ups.length || g.downs.length || g.related) {
          h += '<div class="rels">';
          if (g.ups.length) {
            h +=
              '<div class="rel-title" style="color:#f87171">上位（影响/衍生来源）</div>';
            g.ups.forEach(
              (u) => (h += '<span class="tag up">' + esc(u) + "</span>"),
            );
          }
          if (g.downs.length) {
            h +=
              '<div class="rel-title" style="color:#4ade80;margin-top:6px">下位（派生子风格）</div>';
            g.downs.forEach(
              (d) => (h += '<span class="tag down">' + esc(d) + "</span>"),
            );
          }
          if (g.related) {
            h +=
              '<div class="rel-title" style="color:#fb923c;margin-top:6px">≈ Related To</div>';
            h += '<span class="tag rel">' + esc(g.related) + "</span>";
          }
          h += "</div>";
        }

        if (g.examples && g.examples.length) {
          h += '<div class="ex-title">例曲</div>';
          g.examples.forEach(
            (ex) => (h += '<div class="ex-item">' + escBr(ex) + "</div>"),
          );
        }

        inner.innerHTML = h;
        document.getElementById("detail").classList.add("show");
        document.body.style.overflow = "hidden";
        document.getElementById("detail").scrollTop = 0;
      }

      function scrollCols(amount) {
        document
          .getElementById("container")
          .scrollBy({ left: amount, behavior: "smooth" });
      }

      function scrollColsPage(dir) {
        const c = document.getElementById("container");
        scrollCols(dir * Math.max(240, Math.round(c.clientWidth * 0.8)));
      }

      let searchMatches = [];
      let searchTimer = null;

      function normClean(s) {
        const keep = [];
        const map = [];
        for (let i = 0; i < s.length; i++) {
          const c = s[i].toLowerCase();
          if (/[\s\-_（）()\[\]【】·,，.、/\\"'']/.test(c)) continue;
          keep.push(c);
          map.push(i);
        }
        return { clean: keep.join(""), map };
      }

      function editDist(a, b) {
        let prev = new Array(b.length + 1);
        for (let j = 0; j <= b.length; j++) prev[j] = j;
        for (let i = 1; i <= a.length; i++) {
          const cur = [i];
          for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(
              prev[j] + 1,
              cur[j - 1] + 1,
              prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
          }
          prev = cur;
        }
        return prev[b.length];
      }

      function fuzzySearch(q, name) {
        const qn = q.clean;
        const nn = name.clean;
        if (!qn || !nn) return null;
        if (nn.includes(qn)) {
          const idx = nn.indexOf(qn);
          return { score: 100 - idx * 0.5, start: idx, len: qn.length, type: "contains" };
        }
        if (qn.length < 2) return null;
        const thr = qn.length <= 3 ? 1 : Math.min(2, Math.floor(qn.length / 3));
        let best = { d: 99, start: -1, L: qn.length };
        for (let L = qn.length; L <= qn.length + 1; L++) {
          for (let s = 0; s + L <= nn.length; s++) {
            const d = editDist(qn, nn.slice(s, s + L));
            if (d < best.d) best = { d, start: s, L };
          }
        }
        if (best.d <= thr && best.start >= 0) {
          return { score: 70 - best.d * 8, start: best.start, len: best.L, type: "fuzzy" };
        }
        let p = 0;
        const matched = [];
        for (let i = 0; i < nn.length && p < qn.length; i++) {
          if (nn[i] === qn[p]) {
            matched.push(i);
            p++;
          }
        }
        if (p === qn.length) {
          return {
            score: 50 - (nn.length - qn.length) * 0.3,
            start: matched[0],
            len: matched.length,
            matched,
            type: "subseq",
          };
        }
        return null;
      }

      let srActive = -1;
      function clearActiveOption() {
        srActive = -1;
        const searchEl = document.getElementById("search");
        if (searchEl) searchEl.removeAttribute("aria-activedescendant");
      }
      function setActiveOption(i) {
        const box = document.getElementById("search-results");
        const items = box.querySelectorAll(".sr-item");
        const searchEl = document.getElementById("search");
        if (!items.length) {
          clearActiveOption();
          return;
        }
        if (i < 0) i = items.length - 1;
        if (i >= items.length) i = 0;
        srActive = i;
        items.forEach(function (it, k) {
          it.setAttribute("aria-selected", k === i ? "true" : "false");
        });
        const id = items[i].id;
        if (searchEl && id) searchEl.setAttribute("aria-activedescendant", id);
        if (items[i].scrollIntoView) {
          items[i].scrollIntoView({ block: "nearest" });
        }
      }

      function doSearch(q) {
        q = q.toLowerCase().trim();
        const searchEl = document.getElementById("search");
        clearActiveOption();
        document
          .querySelectorAll(".node.sel")
          .forEach((x) => x.classList.remove("sel"));
        const box = document.getElementById("search-results");
        if (!q) {
          box.style.display = "none";
          box.innerHTML = "";
          if (searchEl) searchEl.setAttribute("aria-expanded", "false");
          return;
        }
        const qc = normClean(q);
        searchMatches = [];
        const scored = [];
        for (let el of allNodes) {
          const nc = el._norm || normClean(el.dataset.name);
          const r = fuzzySearch(qc, nc);
          if (r) scored.push({ el, r, nc });
        }
        scored.sort((a, b) => b.r.score - a.r.score || a.r.start - b.r.start);
        if (!scored.length) {
          box.style.display = "block";
          box.innerHTML =
            '<div class="sr-empty">没有找到与「' + esc(q) + '」相关的曲风</div>';
          if (searchEl) searchEl.setAttribute("aria-expanded", "true");
          return;
        }
        const exact = scored.filter((x) => x.r.type === "contains").slice(0, 40);
        const fuzzy = scored.filter((x) => x.r.type !== "contains").slice(0, 20);
        searchMatches = exact.concat(fuzzy).map((x) => x.el);
        function itemHtml({ el, r, nc }, i) {
          const name = el.dataset.name;
          const ori = [];
          if (r.type === "contains") {
            for (let k = r.start; k < r.start + r.len; k++) ori.push(nc.map[k]);
          } else if (r.type === "fuzzy") {
            for (let k = r.start; k < r.start + r.len; k++) {
              if (nc.map[k] !== undefined) ori.push(nc.map[k]);
            }
          } else {
            r.matched.forEach((k) => ori.push(nc.map[k]));
          }
          const oriSet = new Set(ori);
          let hl = "";
          for (let k = 0; k < name.length; k++) {
            hl += oriSet.has(k) ? "<mark>" + esc(name[k]) + "</mark>" : esc(name[k]);
          }
          return (
            '<div class="sr-item" role="option" id="sr-opt-' +
            i +
            '" aria-selected="false" data-idx="' +
            i +
            '"><span class="sr-name">' +
            hl +
            '</span><span class="sr-chap">' +
            esc(el.dataset.chapter) +
            "</span></div>"
          );
        }
        let h = "";
        let idx = 0;
        exact.forEach((x) => (h += itemHtml(x, idx++)));
        if (exact.length && fuzzy.length) {
          h += '<div class="sr-divider">猜你想搜</div>';
        }
        fuzzy.forEach((x) => (h += itemHtml(x, idx++)));
        if (searchMatches.length < scored.length) {
          h +=
            '<div class="sr-empty">… 还有 ' +
            (scored.length - searchMatches.length) +
            " 个结果,继续输入以缩小范围</div>";
        }
        box.innerHTML = h;
        box.style.display = "block";
        if (searchEl) searchEl.setAttribute("aria-expanded", "true");
      }

      function pickSearch(i) {
        const el = searchMatches[i];
        if (!el) return;
        document
          .querySelectorAll(".node.sel")
          .forEach((x) => x.classList.remove("sel"));
        el.classList.add("sel");
        const col = el.closest(".col");
        if (col) {
          const cbody = col.querySelector(".col-body");
          if (cbody && cbody.style.display === "none") cbody.style.display = "";
          col.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
        requestAnimationFrame(function () {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        showDetail(el.dataset.name, el.dataset.chapter);
        const box = document.getElementById("search-results");
        box.style.display = "none";
        box.innerHTML = "";
        const searchEl = document.getElementById("search");
        if (searchEl) searchEl.setAttribute("aria-expanded", "false");
        clearActiveOption();
      }


      let aboutLastFocus = null;
      let groupLastFocus = null;
      const FOCUS_TRAP = "#topbar, .scroll-btn, #container, #swipe-hint";
      function trapFocus(active) {
        document.querySelectorAll(FOCUS_TRAP).forEach((el) => {
          if (active) el.setAttribute("inert", "");
          else el.removeAttribute("inert");
        });
      }
      function openAbout() {
        aboutLastFocus = document.activeElement;
        trapFocus(true);
        document.getElementById("about-mask").classList.add("show");
        document.getElementById("about-dialog").classList.add("show");
        document.getElementById("about-dialog").focus({ preventScroll: true });
      }

      function closeAbout() {
        const wasOpen = document
          .getElementById("about-dialog")
          .classList.contains("show");
        document.getElementById("about-mask").classList.remove("show");
        document.getElementById("about-dialog").classList.remove("show");
        trapFocus(false);
        if (wasOpen && aboutLastFocus && aboutLastFocus.focus) {
          aboutLastFocus.focus();
        }
      }

      let giscusLoaded = false;
      let giscusReady = false;
      let giscusErrorShown = false;
      let giscusTimeout = null;
      let giscusObs = null;
      function groupLoadingError() {
        giscusErrorShown = true;
        giscusTimeout = null;
        if (giscusObs) {
          giscusObs.disconnect();
          giscusObs = null;
        }
        const ld = document.getElementById("group-loading");
        if (!ld) return;
        const spin = ld.querySelector(".group-spinner");
        if (spin) spin.style.display = "none";
        const txt = ld.querySelector("span");
        if (txt) txt.textContent = "评论区暂时无法加载，请检查网络后重试";
      }
      function hideGroupLoading() {
        if (giscusErrorShown) return;
        giscusReady = true;
        const ld = document.getElementById("group-loading");
        if (ld) ld.style.display = "none";
        if (giscusTimeout) {
          clearTimeout(giscusTimeout);
          giscusTimeout = null;
        }
      }
      function showGroupLoading() {
        const ld = document.getElementById("group-loading");
        if (ld && !giscusReady && !giscusErrorShown) ld.style.display = "flex";
      }
      function watchGiscusFrame() {
        const frame = document.querySelector(".giscus-frame");
        if (frame) {
          frame.addEventListener("load", hideGroupLoading);
          return;
        }
        if (typeof MutationObserver === "undefined" || giscusObs) return;
        giscusObs = new MutationObserver(function () {
          const f = document.querySelector(".giscus-frame");
          if (f) {
            f.addEventListener("load", hideGroupLoading);
            giscusObs.disconnect();
            giscusObs = null;
          }
        });
        giscusObs.observe(document.body, { childList: true, subtree: true });
      }
      window.addEventListener("message", function (e) {
        if (e.origin !== "https://giscus.app") return;
        const data = e.data && e.data.giscus;
        if (!data) return;
        if (data.signOut) {
          giscusReady = false;
          giscusErrorShown = false;
          return;
        }
        if (data.error) {
          if (/discussion not found/i.test(data.error)) {
            hideGroupLoading();
          } else {
            console.warn("[giscus] error:", data.error);
            groupLoadingError();
          }
          return;
        }
        hideGroupLoading();
      });
      function openGroup() {
        groupLastFocus = document.activeElement;
        trapFocus(true);
        document.getElementById("group-mask").classList.add("show");
        document.getElementById("group-dialog").classList.add("show");
        document.getElementById("group-dialog").focus({ preventScroll: true });
        showGroupLoading();
        watchGiscusFrame();
        if (!giscusTimeout && !giscusReady && !giscusErrorShown) {
          giscusTimeout = setTimeout(groupLoadingError, 15000);
        }
        if (!giscusLoaded) {
          giscusLoaded = true;
          const s = document.createElement("script");
          s.src = "https://giscus.app/client.js";
          s.async = true;
          const attrs = {
            repo: "YeisuQwQ/music_genre",
            "repo-id": "R_kgDOTTgEmg",
            category: "General",
            "category-id": "DIC_kwDOTTgEms4DFSnO",
            mapping: "pathname",
            strict: "0",
            "reactions-enabled": "0",
            "emit-metadata": "0",
            "input-position": "top",
            theme: "dark",
            lang: "zh-CN",
          };
          for (const k in attrs) s.setAttribute("data-" + k, attrs[k]);
          document.querySelector("#group-dialog .giscus").appendChild(s);
        }
      }

      function closeGroup() {
        const wasOpen = document
          .getElementById("group-dialog")
          .classList.contains("show");
        document.getElementById("group-mask").classList.remove("show");
        document.getElementById("group-dialog").classList.remove("show");
        if (giscusTimeout) {
          clearTimeout(giscusTimeout);
          giscusTimeout = null;
        }
        trapFocus(false);
        if (wasOpen && groupLastFocus && groupLastFocus.focus) {
          groupLastFocus.focus();
        }
      }

      document.getElementById("search").addEventListener("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(
          function () {
            doSearch(document.getElementById("search").value);
          },
          180,
        );
      });
      document.getElementById("group-btn").addEventListener("click", openGroup);
      document.getElementById("about-btn").addEventListener("click", openAbout);
      document.getElementById("about-mask").addEventListener("click", closeAbout);
      document
        .querySelector("#about-dialog .about-close")
        .addEventListener("click", closeAbout);
      document.getElementById("group-mask").addEventListener("click", closeGroup);
      document
        .querySelector("#group-dialog .group-close")
        .addEventListener("click", closeGroup);
      document
        .querySelector("#detail .close-btn")
        .addEventListener("click", closeDetail);
      document
        .querySelector(".scroll-btn.left")
        .addEventListener("click", function () {
          scrollColsPage(-1);
        });
      document
        .querySelector(".scroll-btn.right")
        .addEventListener("click", function () {
          scrollColsPage(1);
        });
      document.getElementById("search").addEventListener("keydown", function (e) {
        const box = document.getElementById("search-results");
        if (box.style.display === "none" || !box.style.display) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveOption(srActive + 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveOption(srActive - 1);
        } else if (e.key === "Enter") {
          if (srActive >= 0) {
            e.preventDefault();
            pickSearch(srActive);
          }
        } else if (e.key === "Escape") {
          clearActiveOption();
        }
      });
      document
        .getElementById("search-results")
        .addEventListener("click", function (e) {
          const item = e.target.closest(".sr-item");
          if (!item) return;
          // 关键：pickSearch 会立刻清空下拉（目标节点脱离 DOM），
          // 若不阻止冒泡，同一 click 到达 document 时 closest() 全为 null，
          // 会被当成「点到外面」而瞬间关闭刚打开的面板。
          e.stopPropagation();
          const idx = parseInt(item.dataset.idx, 10);
          if (!isNaN(idx)) pickSearch(idx);
        });

      document.addEventListener("click", function (e) {
        if (
          !e.target.closest(".node") &&
          !e.target.closest("#detail") &&
          !e.target.closest("#search") &&
          !e.target.closest("#search-results")
        ) {
          closeDetail();
        }
        if (
          !e.target.closest("#about-dialog") &&
          !e.target.closest("#about-btn")
        ) {
          closeAbout();
        }
        if (
          !e.target.closest("#group-dialog") &&
          !e.target.closest("#group-btn")
        ) {
          closeGroup();
        }
        if (!e.target.closest("#search-results") && !e.target.closest("#search")) {
          document.getElementById("search-results").style.display = "none";
          document.getElementById("search").setAttribute("aria-expanded", "false");
          clearActiveOption();
        }
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeDetail();
          closeAbout();
          closeGroup();
          document.getElementById("search-results").style.display = "none";
          document.getElementById("search").setAttribute("aria-expanded", "false");
          clearActiveOption();
        }
        if (e.target && e.target.id === "search") return;
        if (e.key === "ArrowLeft") scrollColsPage(-1);
        if (e.key === "ArrowRight") scrollColsPage(1);
      });

      let touchStartY = 0;
      document
        .getElementById("detail")
        .addEventListener("touchstart", function (e) {
          touchStartY = e.touches[0].clientY;
        });
      document
        .getElementById("detail")
        .addEventListener("touchmove", function (e) {
          const dy = e.touches[0].clientY - touchStartY;
          if (dy > 60 && e.currentTarget.scrollTop <= 0) {
            closeDetail();
          }
        });

      (function () {
        var hint = document.getElementById("swipe-hint");
        var container = document.getElementById("container");
        var isMobile = window.matchMedia("(max-width: 768px)").matches;
        if (!isMobile) return;
        hint.style.display = "block";
        var hinted = false;
        function hideHint() {
          if (!hinted) {
            hinted = true;
            hint.style.opacity = "0";
            setTimeout(function () {
              hint.style.display = "none";
            }, 500);
          }
        }
        container.addEventListener("scroll", hideHint, { once: true });
        container.addEventListener("touchstart", hideHint, { once: true });
        setTimeout(function () {
          if (!hinted) {
            hint.style.opacity = "0";
            setTimeout(function () {
              hint.style.display = "none";
            }, 500);
          }
        }, 5000);
      })();

      
      console.log(
        "神秘电子音乐体系 — " +
          allNodes.length +
          " 节点, " +
          Object.keys(GENRES).length +
          " 介绍",
      );
    