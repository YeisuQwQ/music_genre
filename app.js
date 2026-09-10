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
        if (!NORM_KEYS.has(n)) NORM_KEYS.set(n, k);
      });
      function findGenre(label) {
        if (!label) return null;
        const raw = String(label).toLowerCase();
        if (GENRES[raw]) return GENRES[raw];
        const n1 = normKey(label);
        if (NORM_KEYS.has(n1)) return GENRES[NORM_KEYS.get(n1)];
        const n2 = n1.replace(/ /g, "");
        for (const [n, k] of NORM_KEYS) {
          if (n.replace(/ /g, "") === n2) return GENRES[k];
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
          ch.name +
          ' <span style="font-size:10px;opacity:.7">(' +
          nodeCount +
          ")</span>";
        head.onclick = function () {
          const body = col.querySelector(".col-body");
          body.style.display = body.style.display === "none" ? "" : "none";
        };
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
              n.label;
            el.dataset.name = n.label;
            el.dataset.chapter = ch.name;
            el.dataset.hasDesc = hasDesc ? "1" : "0";
            el.dataset.level = level;
            el.onclick = function (e) {
              e.stopPropagation();
              document
                .querySelectorAll(".node.sel")
                .forEach((x) => x.classList.remove("sel"));
              el.classList.add("sel");
              showDetail(n.label, ch.name);
            };
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
        let h = "<h2>" + name + "</h2>";
        h +=
          '<span class="chap" style="background:' +
          (CC[chapter] || "#888") +
          "22;color:" +
          (CC[chapter] || "#888") +
          '">' +
          (chapter || "") +
          "</span>";

        if (g && g.chapter && g.chapter !== chapter) {
          h +=
            ' <span class="xref-note">（详细介绍来自「' +
            g.chapter +
            "」篇章）</span>";
        }

        if (!g || !g.desc) {
          h += '<div class="no-desc">暂无详细介绍</div>';
          inner.innerHTML = h;
          document.getElementById("detail").classList.add("show");
          document.body.style.overflow = "hidden";
          return;
        }

        if (g.aka) h += '<div class="aka">A.K.A. ' + g.aka + "</div>";
        h += '<div class="desc">' + g.desc + "</div>";

        if (g.ups.length || g.downs.length || g.related) {
          h += '<div class="rels">';
          if (g.ups.length) {
            h +=
              '<div class="rel-title" style="color:#f87171">上位（影响/衍生来源）</div>';
            g.ups.forEach(
              (u) => (h += '<span class="tag up">' + u + "</span>"),
            );
          }
          if (g.downs.length) {
            h +=
              '<div class="rel-title" style="color:#4ade80;margin-top:6px">下位（派生子风格）</div>';
            g.downs.forEach(
              (d) => (h += '<span class="tag down">' + d + "</span>"),
            );
          }
          if (g.related) {
            h +=
              '<div class="rel-title" style="color:#fb923c;margin-top:6px">≈ Related To</div>';
            h += '<span class="tag rel">' + g.related + "</span>";
          }
          h += "</div>";
        }

        if (g.examples && g.examples.length) {
          h += '<div class="ex-title">例曲</div>';
          g.examples.forEach(
            (ex) => (h += '<div class="ex-item">' + ex + "</div>"),
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

      let searchMatches = [];

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

      function doSearch(q) {
        q = q.toLowerCase().trim();
        document
          .querySelectorAll(".node.sel")
          .forEach((x) => x.classList.remove("sel"));
        const box = document.getElementById("search-results");
        if (!q) {
          box.style.display = "none";
          box.innerHTML = "";
          return;
        }
        const qc = normClean(q);
        searchMatches = [];
        const scored = [];
        for (let el of allNodes) {
          const name = el.dataset.name;
          const nc = normClean(name);
          const r = fuzzySearch(qc, nc);
          if (r) scored.push({ el, r, nc });
        }
        scored.sort((a, b) => b.r.score - a.r.score || a.r.start - b.r.start);
        if (!scored.length) {
          box.style.display = "block";
          box.innerHTML =
            '<div class="sr-empty">没有找到与「' + q + '」相关的曲风</div>';
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
            hl += oriSet.has(k) ? "<mark>" + name[k] + "</mark>" : name[k];
          }
          return (
            '<div class="sr-item" onclick="event.stopPropagation();pickSearch(' +
            i +
            ')"><span class="sr-name">' +
            hl +
            '</span><span class="sr-chap">' +
            el.dataset.chapter +
            "</span></div>"
          );
        }
        let h = "";
        exact.forEach((x, i) => (h += itemHtml(x, i)));
        if (exact.length && fuzzy.length) {
          h += '<div class="sr-divider">猜你想搜</div>';
        }
        fuzzy.forEach((x, i) => (h += itemHtml(x, exact.length + i)));
        if (searchMatches.length < scored.length) {
          h +=
            '<div class="sr-empty">… 还有 ' +
            (scored.length - searchMatches.length) +
            " 个结果,继续输入以缩小范围</div>";
        }
        box.innerHTML = h;
        box.style.display = "block";
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
          col.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
        setTimeout(function () {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
        showDetail(el.dataset.name, el.dataset.chapter);
        const box = document.getElementById("search-results");
        box.style.display = "none";
        box.innerHTML = "";
      }


      function openAbout() {
        document.getElementById("about-mask").classList.add("show");
        document.getElementById("about-dialog").classList.add("show");
      }

      function closeAbout() {
        document.getElementById("about-mask").classList.remove("show");
        document.getElementById("about-dialog").classList.remove("show");
      }

      let giscusLoaded = false;
      let giscusReady = false;
      let giscusTimeout = null;
      function hideGroupLoading() {
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
        if (ld && !giscusReady) ld.style.display = "flex";
      }
      document.addEventListener(
        "load",
        function (e) {
          if (
            e.target &&
            e.target.tagName === "IFRAME" &&
            /giscus\.app/.test(e.target.src || "")
          ) {
            hideGroupLoading();
          }
        },
        true,
      );
      window.addEventListener("message", function (e) {
        if (e.data && e.data.giscus) hideGroupLoading();
      });
      function openGroup() {
        document.getElementById("group-mask").classList.add("show");
        document.getElementById("group-dialog").classList.add("show");
        showGroupLoading();
        if (!giscusTimeout) giscusTimeout = setTimeout(hideGroupLoading, 15000);
        if (!giscusLoaded) {
          giscusLoaded = true;
          const s = document.createElement("script");
          s.src = "https://giscus.app/client.js";
          s.crossOrigin = "anonymous";
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
        document.getElementById("group-mask").classList.remove("show");
        document.getElementById("group-dialog").classList.remove("show");
      }
      document.addEventListener("click", function (e) {
        if (
          !e.target.closest(".node") &&
          !e.target.closest("#detail") &&
          !e.target.closest("#search")
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
        }
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeDetail();
          closeAbout();
          closeGroup();
          document.getElementById("search-results").style.display = "none";
        }
        if (e.key === "ArrowLeft") scrollCols(-300);
        if (e.key === "ArrowRight") scrollCols(300);
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
          if (dy > 60 && this.scrollTop <= 0) {
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
    