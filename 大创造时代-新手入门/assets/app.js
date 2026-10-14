/* ===========================================================
   大创造时代 · 新手入门手册  —  交互脚本
   =========================================================== */
(function () {
  "use strict";

  /* ---------------- 主题切换 ---------------- */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("aoi-theme"); } catch (e) {}
  if (saved) root.setAttribute("data-theme", saved);
  else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }
  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("aoi-theme", next); } catch (e) {}
    });
  }

  /* ---------------- 名词表数据 ---------------- */
  var GLOSSARY = [
    { zh: "工具", en: "Tools", cat: "资源", def: "白色方块。主要来自工坊。用于改造地形、建造与升级建筑。" },
    { zh: "钱", en: "Coins", cat: "资源", def: "金币。主要来自公会与回合奖励片。用于建造、升级建筑和购买创造片。" },
    { zh: "学者", en: "Scholars", cat: "资源", def: "米宝。主要来自学校与大学。用于推进学科等级，以及升级改造 / 航海。" },
    { zh: "魔力", en: "Power", cat: "资源", def: "紫色圆片，放在三只魔力碗中。只有碗 III 的魔力可以花费。来自公会、宫殿、以及别人在你旁边盖房。" },
    { zh: "书", en: "Books", cat: "资源", def: "分四种颜色，对应四个学科（另有灰色书可当任意色）。用于购买创造片与发动书行动。" },
    { zh: "铲子", en: "Spade", cat: "资源", def: "改造地形的计量单位。看目标地形在「地形环」上离家园地形几步，就要几把铲子，最多 3 把——与地图上隔几格无关。" },
    { zh: "魔力碗", en: "Power Bowl", cat: "系统", def: "三只碗 I / II / III。获得魔力时往右推一格，花费魔力时从碗 III 推回碗 I。" },
    { zh: "魔力循环", en: "The Power Cycle", cat: "系统", def: "魔力的流动机制。碗 I 有魔力时，获得魔力从 I→II；碗 I 空但碗 II 有，则从 II→III；全在碗 III 时无法再获得。" },

    { zh: "工坊", en: "Workshop", cat: "建筑", def: "基础建筑，能力值 1。只能建在你的家园地形上。产工具。造价 1 工具 + 2 钱。" },
    { zh: "公会", en: "Guild", cat: "建筑", def: "由工坊升级而来，能力值 2。产钱，是经济引擎。升级费 2 工具 + 6 钱（相邻他人建筑时 3 钱）。" },
    { zh: "学校", en: "School", cat: "建筑", def: "由公会升级而来，能力值 2。产学者，升级时立刻获得 1 张能力片。费用 3 工具 + 5 钱。" },
    { zh: "大学", en: "University", cat: "建筑", def: "由学校升级而来，能力值 3。再获得 1 张能力片，并解锁部族专属能力。费用 5 工具 + 6 钱。" },
    { zh: "宫殿", en: "Palace", cat: "建筑", def: "由公会升级而来，能力值 3。升级时从场上宫殿片中挑 1 张。费用 4 工具 + 6 钱。" },
    { zh: "能力值", en: "Power Value", cat: "建筑", def: "建筑的能力等级：工坊 1，公会 / 学校 2，宫殿 / 大学 3。决定相邻时的魔力往来，以及能否组成城市。" },
    { zh: "城市", en: "City", cat: "建筑", def: "4 个及以上直接相邻、能力值总和 ≥7 的建筑。建成后领取城市片（分数 + 资源 + 1 把城市钥匙）。" },
    { zh: "城市钥匙", en: "City Key", cat: "建筑", def: "来自城市片。是学科推进到 8 级以上的硬门槛，每个学科需要各自独立的钥匙。" },
    { zh: "纪念碑", en: "Monument", cat: "建筑", def: "能力值 4 的中立建筑，由部分创造片提供。若城市中包含纪念碑，只需 2 个建筑即可建城。" },
    { zh: "塔", en: "Tower", cat: "建筑", def: "能力值 2 的中立建筑，由部分创造片或部族能力提供。" },

    { zh: "改造地形", en: "Terraform", cat: "行动", def: "把一格地形改造成你的家园地形。目标格须为空地、在你已有建筑的触及范围内、且不是你的家园地形。" },
    { zh: "改造地形与建造", en: "Terraform & Build", cat: "行动", def: "本作最基础的行动：改造一格地形，并可在此建 1 个工坊。一个行动只能建 1 个工坊。" },
    { zh: "升级建筑", en: "Upgrade a Building", cat: "行动", def: "工坊→公会；公会→宫殿 或 学校；学校→大学。旧建筑退回计划板会降低对应收入。" },
    { zh: "提升改造", en: "Upgrade Terraforming", cat: "行动", def: "铲子兑换率 +1 级，立刻获得 6 分。之后买铲更省工具。" },
    { zh: "提升航海", en: "Increase Sailing", cat: "行动", def: "航海等级 +1（最高 3）。航海等级 = 触及范围，即可跨过的河流格数。" },
    { zh: "研发创造", en: "Develop an Innovation", cat: "行动", def: "花书（至少 5 本，颜色须匹配）购买 1 张创造片。没宫殿时多付 5 钱；每多买一片 +1 本书；最多 3 片。" },
    { zh: "派遣学者", en: "Send a Scholar", cat: "行动", def: "花 1 名学者，在一条学科轨道上前进若干级。学者会留在学术板上直到游戏结束。" },
    { zh: "魔力行动", en: "Power Action", cat: "行动", def: "版图上的公共行动，花魔力发动。每个行动每轮只能被任意一名玩家使用一次。" },
    { zh: "书行动", en: "Book Action", cat: "行动", def: "版图上的 3 个公共行动，花书发动，效果每局随机。同样每个每轮一次。" },
    { zh: "特殊行动", en: "Special Action", cat: "行动", def: "由部族能力、创造片、能力片、宫殿片等提供的行动，通常每轮限用一次。" },
    { zh: "跳过", en: "Pass", cat: "行动", def: "结算回合奖励片分数、换一张新奖励片、退出本轮。本轮第一个跳过的玩家成为下一轮起始玩家。" },
    { zh: "资源转换", en: "Resource Conversion", cat: "行动", def: "免费行动，可在行动前后任意次进行。用魔力换资源，或把高级资源降级为低级资源。" },

    { zh: "相邻", en: "Adjacency", cat: "系统", def: "两个六边形共边才算相邻。隔着河流格不算，除非有桥或航海能力。" },
    { zh: "触及范围", en: "Reach", cat: "系统", def: "等于你的航海等级。判定可达时可以跨过的河流格数。" },
    { zh: "航海", en: "Sailing", cat: "系统", def: "0–3 级。等级即触及范围。用航海把被河隔开的领地连起来是常见扩张手段。" },
    { zh: "铲子兑换率", en: "Spade Exchange Rate", cat: "系统", def: "花多少工具能买 1 把铲子。数值越高越省工具。可通过「提升改造」行动上调。" },
    { zh: "学科", en: "Discipline", cat: "系统", def: "四条轨道：银行学、法学、工程学、医学，各 12 级。取代了《神秘大地》的信仰轨道。" },
    { zh: "银行学", en: "Banking", cat: "系统", def: "四学科之一，黄色。" },
    { zh: "法学", en: "Law", cat: "系统", def: "四学科之一，蓝色。" },
    { zh: "工程学", en: "Engineering", cat: "系统", def: "四学科之一，棕色。" },
    { zh: "医学", en: "Medicine", cat: "系统", def: "四学科之一，灰色。" },
    { zh: "学科里程碑", en: "Discipline Milestones", cat: "系统", def: "达到 3 / 5 / 7 / 12 级立即获得一次性魔力循环；升到 8 级需消耗城市钥匙；9 级以上每轮额外收入；12 级全游戏仅 1 人可达。" },
    { zh: "创造片", en: "Innovation Tile", cat: "系统", def: "花书购买的强化片，最多 3 张。提供特殊行动、一次性得分 / 每轮收入，或允许额外建造建筑。" },
    { zh: "能力片", en: "Competency Tile", cat: "系统", def: "升级到学校或大学时各获得 1 张。提供资源、分数或小能力。" },
    { zh: "宫殿片", en: "Palace Tile", cat: "系统", def: "升级到宫殿时从场上宫殿片中挑 1 张。提供强力一次性能力或每轮收入，先到先得。" },
    { zh: "回合奖励片", en: "Round Bonus Tile", cat: "版图", def: "每人常驻 1 张，跳过时结算并换新，所以随时有 3 张可选。给收入或奖励分。" },
    { zh: "回合计分片", en: "Round Score Tile", cat: "版图", def: "每一轮的得分目标。执行特定行动或建造特定建筑可额外得分。轮末按右半部分结算。" },
    { zh: "终局计分片", en: "Final Round Score Tile", cat: "版图", def: "第 6 轮额外使用的计分片，提供终局前的额外得分机会。" },
    { zh: "城市片", en: "City Tile", cat: "版图", def: "建成城市时领取。给分数、一次性资源，以及 1 把城市钥匙。" },
    { zh: "学术板", en: "Science Display", cat: "版图", def: "四条学科轨道的展示板，轨道上有带魔力的奖励格。" },
    { zh: "计划板", en: "Planning Display", cat: "版图", def: "每位玩家的个人面板：建筑轨道、地形环、铲子兑换率、航海轨道、三只魔力碗、创造片槽位。" },
    { zh: "中立建筑", en: "Neutral Building", cat: "地图", def: "不属于任何玩家、也不能被建造或升级的建筑。可与你的建筑一起参与建城，别人在旁边盖房时你也能获得魔力。" },
    { zh: "岛屿", en: "Island", cat: "地图", def: "被河流分隔开的地图区域。跨岛扩张需要航海或桥梁。" },
    { zh: "家园地形", en: "Native Terrain", cat: "地图", def: "你的建筑唯一可以建造的地形类型。其他地形必须先改造才能使用。" },
    { zh: "地形环", en: "Terraforming Circle", cat: "系统", def: "计划板上的圆环：家园地形在顶部，其余 6 种地形绕成一圈，相邻两格之间隔 1 把铲子。改造费用 = 目标地形到家园地形在环上的步数（最多 3 铲），与地图上的距离完全无关。官方环序：沙漠–平原–沼泽–湖泊–森林–山脉–荒地。" },
    { zh: "河流", en: "River", cat: "地图", def: "地图上的蓝色格，会阻断相邻关系。可用桥或航海跨越。" },
    { zh: "桥", en: "Bridge", cat: "地图", def: "跨越河流格，把两侧建筑连成一片，影响连片判定。" }
  ];

  /* ---------------- 名词表渲染 ---------------- */
  var glist = document.getElementById("glist");
  var gcount = document.getElementById("gcount");
  var gempty = document.getElementById("gempty");
  var gsearch = document.getElementById("gsearch");
  var gpills = document.getElementById("gpills");
  var curCat = "all";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hi(text, q) {
    var t = esc(text);
    if (!q) return t;
    var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    return t.replace(re, "<mark>$1</mark>");
  }

  function renderGlossary() {
    if (!glist) return;
    var q = (gsearch && gsearch.value ? gsearch.value : "").trim();
    var out = [];
    for (var i = 0; i < GLOSSARY.length; i++) {
      var it = GLOSSARY[i];
      if (curCat !== "all" && it.cat !== curCat) continue;
      if (q) {
        var hay = (it.zh + " " + it.en + " " + it.def).toLowerCase();
        if (hay.indexOf(q.toLowerCase()) === -1) continue;
      }
      out.push(
        '<div class="g-item">' +
          '<div class="g-top">' +
            '<span class="g-zh">' + hi(it.zh, q) + '</span>' +
            '<span class="g-en">' + hi(it.en, q) + '</span>' +
            '<span class="g-cat">' + esc(it.cat) + '</span>' +
          '</div>' +
          '<div class="g-def">' + hi(it.def, q) + '</div>' +
        '</div>'
      );
    }
    glist.innerHTML = out.join("");
    if (gcount) gcount.textContent = "共 " + out.length + " 条";
    if (gempty) gempty.style.display = out.length ? "none" : "block";
  }

  if (gsearch) {
    gsearch.addEventListener("input", renderGlossary);
  }
  if (gpills) {
    gpills.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".pill") : null;
      if (!b) return;
      var pills = gpills.querySelectorAll(".pill");
      for (var i = 0; i < pills.length; i++) pills[i].classList.remove("on");
      b.classList.add("on");
      curCat = b.getAttribute("data-cat") || "all";
      renderGlossary();
    });
  }
  renderGlossary();

  /* ---------------- 易村规 20 点 ---------------- */
  var MISTAKES = [
    ["建工坊的位置搞错", "把工坊建在别人的地形、别人的建筑上，或建在自己的家园地形但超出触及范围。", "目标格必须是你的家园地形（或已被改造过）、空地、且在你已有建筑的触及范围内。"],
    ["以为改造和建造是两个行动", "这一轮改造，下一轮再建工坊。", "改造地形与建造工坊属于同一个行动。可以只改造不建，但改造完的格子本轮不建就留到以后，别人也能用。"],
    ["一个行动想建多个工坊", "手里有 2 把铲子就想盖 2 个工坊。", "一个行动最多建 1 个工坊。多余的铲子只能用于改造另一格地形。"],
    ["以为改造费用是固定的", "以为改造一格永远花 3 把铲子。", "铲子数 = 该地形在计划板地形环上离你家园地形的步数，最多 3 把。地形不同、部族不同，费用都不同。"],
    ["忘了铲子要先买才能补", "免费铲不够时直接用工具换铲。", "只有在免费铲不足时，才可以花工具买铲；买铲数量按你的铲子兑换率计算。"],
    ["升级费用算错", "以为自己的建筑相邻也能减费。", "只有与其他玩家的建筑相邻时才减费（工坊→公会：6 钱降为 3 钱）。自己的相邻建筑不减费。"],
    ["忽略升级会降低收入", "只顾升级变强，没注意旧建筑被退回计划板。", "升级时旧建筑要放回计划板最右端空位，会减少对应建筑类型的收入。升级是用收入换能力。"],
    ["把能力片和创造片搞混", "升级到学校时去拿创造片。", "升级到学校 / 大学各获得 1 张能力片；创造片要用「研发创造」行动花书购买。"],
    ["忘了大学解锁部族能力", "建了大学却没使用部族专属能力。", "升级到大学会额外解锁你的部族专属能力，别忘了用。"],
    ["宫殿片以为能随便挑", "想挑哪张就挑哪张，包括别人已经拿走的。", "宫殿片从开局摆出的那几张里选，先升到宫殿的人先挑，被别人拿走就没有了。"],
    ["忘了宫殿能省创造片的钱", "没建宫殿就直接买创造片，多花了 5 钱。", "没建宫殿时买创造片要多付 5 钱。先建宫殿再买创造片能省这笔钱。"],
    ["以为创造片价格固定", "买第二张创造片时还按 5 本书算。", "每多买一张创造片，书的需求 +1 本；且最多只能有 3 张。"],
    ["把学科里程碑奖励记成资源", "以为到 3/5/7/12 级直接拿资源。", "里程碑奖励是一次性的魔力循环（按学术板标注的数量），不是直接发资源。"],
    ["忘了 8 级需要城市钥匙", "一路把学科推到 9、10 级。", "推进到 8 级必须消耗一把城市钥匙，且每个学科需要各自独立的钥匙。没有钥匙时，超过 7 级的进度作废。"],
    ["以为多个玩家能同到 12 级", "两个人都想冲到学科 12 级。", "每条学科只有一名玩家能到 12 级；一旦有人到达，其他人最多 11 级。"],
    ["建城条件算错", "以为建筑数量够就行，没看能力值总和。", "需要 4 个及以上直接相邻建筑，且能力值总和 ≥7。含大学等建筑时可减少所需建筑数量。"],
    ["把跨河当成相邻", "隔着河流格的两块地也当成相邻。", "相邻必须共边，中间隔着河流格不算，除非有桥或足够航海等级。"],
    ["白送的魔力忘了要不要", "别人在你旁边盖房，直接拿了魔力。", "这是可选的。获得的魔力 = 相邻敌方建筑的能力值，同时你要扣（该数值 − 1）分。不想要可以不拿。"],
    ["忘了只有碗 III 的魔力能花", "有魔力就直接用来发动魔力行动。", "只有碗 III 的魔力可以花费；花费即把魔力从碗 III 推回碗 I。碗 I / II 的魔力必须先循环到碗 III。"],
    ["以为跳过了还能继续行动", "跳过之后又想再做一个行动。", "跳过即退出本轮行动阶段，本轮不能再行动。但先跳过能抢到最好的回合奖励片，并成为下一轮起始玩家。"]
  ];

  var mlist = document.getElementById("mistakelist");
  if (mlist) {
    var html = [];
    for (var k = 0; k < MISTAKES.length; k++) {
      var m = MISTAKES[k];
      html.push(
        '<div class="mistake">' +
          '<div class="m-head"><span class="m-idx">' + (k + 1 < 10 ? "0" + (k + 1) : (k + 1)) + '</span>' +
          '<span class="m-title">' + esc(m[0]) + '</span></div>' +
          '<div class="m-body">' +
            '<div class="row bad"><span class="tag">常见误解</span><span>' + esc(m[1]) + '</span></div>' +
            '<div class="row good"><span class="tag">正确规则</span><span>' + esc(m[2]) + '</span></div>' +
          '</div>' +
        '</div>'
      );
    }
    mlist.innerHTML = html.join("");
  }

  /* ---------------- 目录高亮 ---------------- */
  var links = [].slice.call(document.querySelectorAll(".toc a"));
  var navLinks = [].slice.call(document.querySelectorAll(".navlinks a"));
  var sections = links.map(function (a) {
    var id = a.getAttribute("href").slice(1);
    return document.getElementById(id);
  }).filter(Boolean);

  function setActive(id) {
    links.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
    navLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0;
      });
      var bestId = null, best = -1;
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        var v = visible[s.id] || 0;
        if (v > best) { best = v; bestId = s.id; }
      }
      if (bestId) setActive(bestId);
    }, { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.1, 0.3, 0.6, 1] });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------------- 回到顶部 ---------------- */
  var totop = document.getElementById("totop");
  if (totop) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 600) totop.classList.add("show");
      else totop.classList.remove("show");
    }, { passive: true });
    totop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
