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

      // entrance animation: reveal after the first paint
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

        if (g.aka) h += '<div class="aka">🏷 A.K.A. ' + g.aka + "</div>";
        h += '<div class="desc">' + g.desc + "</div>";

        if (g.ups.length || g.downs.length || g.related) {
          h += '<div class="rels">';
          if (g.ups.length) {
            h +=
              '<div class="rel-title" style="color:#f87171">⬆ 上位（影响/衍生来源）</div>';
            g.ups.forEach(
              (u) => (h += '<span class="tag up">' + u + "</span>"),
            );
          }
          if (g.downs.length) {
            h +=
              '<div class="rel-title" style="color:#4ade80;margin-top:6px">⬇ 下位（派生子风格）</div>';
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
          h += '<div class="ex-title">🎵 例曲</div>';
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
        searchMatches = [];
        for (let el of allNodes) {
          if (el.dataset.name.toLowerCase().includes(q)) {
            searchMatches.push(el);
          }
        }
        if (!searchMatches.length) {
          box.style.display = "block";
          box.innerHTML =
            '<div class="sr-empty">没有找到与「' + q + '」相关的曲风</div>';
          return;
        }
        const cap = 40;
        let h = "";
        searchMatches.slice(0, cap).forEach((el, i) => {
          const name = el.dataset.name;
          const idx = name.toLowerCase().indexOf(q);
          const hl =
            idx >= 0
              ? name.slice(0, idx) +
                "<mark>" +
                name.slice(idx, idx + q.length) +
                "</mark>" +
                name.slice(idx + q.length)
              : name;
          h +=
            '<div class="sr-item" onclick="event.stopPropagation();pickSearch(' +
            i +
            ')"><span class="sr-name">' +
            hl +
            '</span><span class="sr-chap">' +
            el.dataset.chapter +
            "</span></div>";
        });
        if (searchMatches.length > cap) {
          h +=
            '<div class="sr-empty">… 还有 ' +
            (searchMatches.length - cap) +
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


      function expandAll() {
        document
          .querySelectorAll(".col-body")
          .forEach((b) => (b.style.display = ""));
      }

      function collapseAll() {
        document
          .querySelectorAll(".col-body")
          .forEach((b) => (b.style.display = "none"));
      }

      document.addEventListener("click", function (e) {
        if (
          !e.target.closest(".node") &&
          !e.target.closest("#detail") &&
          !e.target.closest("#search")
        ) {
          closeDetail();
        }
        if (!e.target.closest("#search-results") && !e.target.closest("#search")) {
          document.getElementById("search-results").style.display = "none";
        }
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeDetail();
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

      // Mobile swipe hint
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
    