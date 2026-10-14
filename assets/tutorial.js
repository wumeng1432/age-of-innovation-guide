/* ===========================================================
   大创造时代 · 交互式教练模式 (Tutorial Mode)
   带你亲手走完第 1 轮：收入 → 行动 → 结算
   =========================================================== */
(function () {
  "use strict";

  var R = 30;                        // 六边形外接圆半径
  var HW = Math.sqrt(3) * R;         // 高
  var TERRAIN = {
    Forest:    { name: "森林", color: "#6f9e5a", ink: "#fff" },
    Swamp:     { name: "沼泽", color: "#7d6b8a", ink: "#fff" },
    Mountain:  { name: "山脉", color: "#9b8f86", ink: "#fff" },
    Lake:      { name: "湖泊", color: "#7fb3d5", ink: "#fff" },
    Wasteland: { name: "荒地", color: "#b99b7a", ink: "#fff" },
    Desert:    { name: "沙漠", color: "#e0c98a", ink: "#3b342b" },
    Plains:    { name: "平原", color: "#cfd98a", ink: "#3b342b" }
  };

  /* 官方 Terraforming Circle（地形环）：
     沙漠 – 平原 – 沼泽 – 湖泊 – 森林 – 山脉 – 荒地 – (回到沙漠)
     以「森林」为家园地形时，顺时针依次为：山脉1 / 荒地2 / 沙漠3 / 平原3 / 沼泽2 / 湖泊1 */
  var RING = [
    { t: "Forest",    cost: 0 },
    { t: "Mountain",  cost: 1 },
    { t: "Wasteland", cost: 2 },
    { t: "Desert",    cost: 3 },
    { t: "Plains",    cost: 3 },
    { t: "Swamp",     cost: 2 },
    { t: "Lake",      cost: 1 }
  ];

  var DISCS = [
    { key: "banking",     zh: "银行学", color: "#d9a621" },
    { key: "law",         zh: "法学",   color: "#2c5488" },
    { key: "engineering", zh: "工程学", color: "#9b6b3a" },
    { key: "medicine",    zh: "医学",   color: "#8a8577" }
  ];

  /* 版图上的「魔力行动 / 书行动」（官方 Appendix VI；每局随机取 6 张，每个每轮限用一次） */
  var PACTIONS = [
    { id: "pa_scholar", kind: "power", cost: "3 魔力", eff: "得 1 名学者" },
    { id: "pa_tools",   kind: "power", cost: "4 魔力", eff: "得 2 个工具" },
    { id: "pa_build",   kind: "power", cost: "4 魔力", eff: "免费改造 + 建造 1 次（含 1 把免费铲）" },
    { id: "pa_bridge",  kind: "power", cost: "3 魔力", eff: "建 1 座桥" },
    { id: "ba_coins",   kind: "book",  cost: "2 书",   eff: "得 6 钱" },
    { id: "ba_guild",   kind: "book",  cost: "2 书",   eff: "免费把 1 个工坊升成公会" },
    { id: "ba_points",  kind: "book",  cost: "2 书",   eff: "每个公会得 2 分" },
    { id: "ba_terra",   kind: "book",  cost: "3 书",   eff: "免费改造 + 建造 1 次（含 3 把免费铲）" }
  ];

  /* ---------------- 初始局面 ---------------- */
  function freshState() {
    return {
      round: 1,
      tools: 2,
      coins: 3,
      scholars: 2,
      books: 0,
      power: [2, 10, 0],      // 碗 I / II / III
      score: 0,
      spadeRate: 3,           // 买 1 把铲子需要的工具
      freeSpades: 0,
      sailing: 0,
      disc: { banking: 0, law: 0, engineering: 0, medicine: 0 },
      innovations: 0,
      hasGuild: false,
      passed: false,
      paUsed: [],
      hexes: [
        { id: "h1", q: 0,  r: 0,  terrain: "Forest",    mine: "workshop", foe: false },
        { id: "h2", q: 1,  r: -1, terrain: "Forest",    mine: null,       foe: false },
        { id: "h3", q: 1,  r: 0,  terrain: "Swamp",     mine: null,       foe: false },
        { id: "h4", q: 0,  r: 1,  terrain: "Mountain",  mine: null,       foe: false },
        { id: "h5", q: -1, r: 1,  terrain: "Lake",      mine: null,       foe: false },
        { id: "h6", q: -1, r: 0,  terrain: "Forest",    mine: null,       foe: true  },
        { id: "h7", q: 0,  r: -1, terrain: "Wasteland", mine: null,       foe: false },
        { id: "h8", q: 2,  r: -1, terrain: "Forest",    mine: null,       foe: false }
      ]
    };
  }

  /* ---------------- 行动按钮定义 ---------------- */
  var ACTIONS = [
    { id: "income",       label: "领取收入",              sub: "Phase I" },
    { id: "buildWorkshop",label: "建工坊",                sub: "1 工具 + 2 钱" },
    { id: "upgradeGuild", label: "升级为公会",            sub: "2 工具 + 3 钱" },
    { id: "scholar",      label: "派遣学者",              sub: "1 学者" },
    { id: "powerAction",  label: "魔力 / 书行动",          sub: "从下方选一张" },
    { id: "innovation",   label: "研发创造",              sub: "5 本书" },
    { id: "oppBuild",     label: "模拟：对手在你旁边盖房", sub: "演示" },
    { id: "pass",         label: "跳过 Pass",             sub: "结束本轮" },
    { id: "settle",       label: "结算 Phase III",        sub: "回合末" }
  ];

  /* ---------------- 步骤脚本 ---------------- */
  var STEPS = [
    {
      badge: "欢迎", title: "欢迎来到交互式教练模式",
      text: [
        "我会带你<b>亲手走完第 1 轮</b>：从收入、行动，一直到跳过和结算。每一步你都要点一下，点错了我会提醒你。",
        "右侧是模拟桌面：<b>资源条、迷你地图、地形环、魔力碗、学科轨道、行动按钮</b>。放心随便点，点错不会有任何后果。"
      ],
      btn: "开始教程", allow: [], hex: null
    },
    {
      badge: "认识桌面", title: "先看清你的模拟桌面",
      text: [
        "<b>资源条</b>：工具、钱、学者、书，以及当前分数。",
        "<b>迷你地图</b>：绿色是<b>你的家园地形「森林」</b>，你的起始工坊已经在正中间那格。注意左边那格森林上有一个<b>对手的工坊</b>。",
        "<b>地形环</b>：改造地形的费用<b>只看这个环</b>，跟地图上隔几格完全无关。环上相邻 = 1 把铲子，隔一格 = 2 把，隔两格 = 3 把。",
        "<b>魔力碗</b>、<b>学科轨道</b>，以及最下面的<b>魔力行动 / 书行动</b>选项卡：后面几步都会用到。"
      ],
      btn: "下一步", allow: [], hex: null
    },
    {
      badge: "Phase I", title: "收入阶段：先把资源拿到手",
      text: [
        "每一轮都从收入开始。收入来自计划板上已建成的建筑、你的回合奖励片，以及各种能力片。",
        "现在点击下面的「<b>领取收入</b>」。"
      ],
      expect: "income", allow: ["income"], hex: null,
      done: "你获得了 <b>8 工具、8 钱、1 学者</b>（教学简化数值）。收入到手，就可以行动了。"
    },
    {
      badge: "关键系统", title: "顺便认识魔力碗",
      text: [
        "看一眼右侧的魔力碗：现在是 <b>2 / 10 / 0</b>。",
        "记住三条铁律：只有<b>碗 III</b> 的魔力能花；获得魔力只能<b>往右推一格</b>；花掉的魔力会回到<b>碗 I</b>。",
        "接下来你会亲眼看到整个过程。"
      ],
      btn: "下一步", allow: [], hex: null
    },
    {
      badge: "行动 ①", title: "改造地形：费用看「地形环」，不看地图",
      text: [
        "Phase II 开始，轮到你，你要执行 <b>1 个行动</b>。先做最基础的「改造地形与建造」。",
        "请在迷你地图上点击那格<b>沼泽</b>（灰紫色，右侧中间）。",
        "先猜一下：它紧挨着你的工坊，要几把铲子？——答案在右侧的<b>地形环</b>上。"
      ],
      allow: [], hex: "h3", ringFocus: "Swamp",
      done: "改造完成：沼泽 → 森林。费用<b>不是</b>按地图距离算的，而是看<b>地形环</b>：森林 → 湖泊 → 沼泽，在环上隔了 <b>2 格</b>，所以要 <b>2 把铲子</b>。你没有免费铲，于是按兑换率花掉 <b>6 工具</b>。",
      wrongHex: "点错了。现在要改造的是那格<b>沼泽</b>（灰紫色）。"
    },
    {
      badge: "行动 ①", title: "同一个行动的后半段：建工坊",
      text: [
        "改造和建造属于<b>同一个行动</b>——这就是为什么规则书把它写成「改造地形与建造」。",
        "现在点击「<b>建工坊</b>」，把工坊盖在刚改造好的那格上。"
      ],
      expect: "buildWorkshop", allow: ["buildWorkshop"], hex: null,
      done: "工坊建成，花了 <b>1 工具 + 2 钱</b>。记住：<b>一个行动最多只能建 1 个工坊</b>，就算你手里有 2 把铲子也不能盖第二个。"
    },
    {
      badge: "关键系统", title: "别人在你旁边盖房时，你可以拿魔力",
      text: [
        "当其他玩家在你旁边盖建筑时，你可以选择<b>获得魔力</b>——代价是要扣分（获得的魔力 − 1 分）。",
        "点击「<b>模拟：对手在你旁边盖房</b>」，看看魔力碗会怎么变。"
      ],
      expect: "oppBuild", allow: ["oppBuild"], hex: null,
      done: "获得 2 魔力。因为<b>碗 I 还有 2 个</b>，所以魔力是<b>从碗 I 推到碗 II</b>：现在变成 0 / 12 / 0。碗 III 仍然是 0，还是不能花。"
    },
    {
      badge: "行动 ②", title: "升级建筑：工坊 → 公会",
      text: [
        "点击「<b>升级为公会</b>」。",
        "你的工坊紧挨着对手的工坊，所以升级费会<b>从 6 钱降到 3 钱</b>——这就是「贴着别人」的好处。",
        "另外注意：升级会把旧工坊退回计划板，<b>你的收入结构会因此变化</b>。"
      ],
      expect: "upgradeGuild", allow: ["upgradeGuild"], hex: null,
      done: "升级完成，花了 <b>2 工具 + 3 钱</b>（基础 6 钱，因相邻对手建筑减半）。这是新手最容易忽略的一点：<b>升级不是纯赚，它会改变你的收入。</b>"
    },
    {
      badge: "行动 ③", title: "派遣学者，推进学科",
      text: [
        "看右侧的<b>学科轨道</b>：四条轨道各有 12 级，带数字的格子（3 / 5 / 7 / 12）是<b>魔力奖励格</b>。",
        "点击「<b>派遣学者</b>」，把 1 名学者送到「<b>工程学</b>」轨道上，前进 2 级。",
        "注意看：学者的标记会停在哪一格，以及魔力碗接下来怎么变。"
      ],
      expect: "scholar", allow: ["scholar"], hex: null, disc: "engineering",
      done: "工程学 <b>0 → 2 级</b>（看学科轨道上工程学那一行的深色进度）。途中经过奖励格，获得 3 魔力。这次<b>碗 I 已经空了</b>，所以魔力是<b>从碗 II 推到碗 III</b>：变成 0 / 9 / 3。碗 III 终于有魔力了！"
    },
    {
      badge: "行动 ④", title: "发动魔力行动：花掉碗 III 的魔力",
      text: [
        "现在碗 III 有 3 个魔力，可以花了。",
        "看最下面的「<b>魔力行动 / 书行动</b>」选项卡——这就是版图边上那一排公共行动，每个<b>每轮只能被任意一名玩家用一次</b>。",
        "点击<b>高亮的那张卡</b>（花 3 魔力换 1 名学者）。"
      ],
      expect: "powerAction", allow: [], highlight: "powerAction", pa: "pa_scholar", disc: "engineering", hex: null,
      done: "花掉 3 魔力，换回 <b>1 名学者</b>。魔力从碗 III <b>推回了碗 I</b>：现在是 3 / 9 / 0。花掉的魔力不会消失，而是回到起点重新循环。"
    },
    {
      badge: "行动 ⑤", title: "研发创造：本作的构筑核心",
      text: [
        "创造片要用<b>书</b>来买，至少要 5 本。书主要来自学校、大学、能力片和地形 / 部族能力。",
        "为了让你完整体验一次，这里直接给你 5 本书（<b>教学简化</b>，实战中要自己攒）。",
        "点击「<b>研发创造</b>」。"
      ],
      expect: "innovation", allow: ["innovation"], hex: null,
      done: "花掉 5 本书，获得 1 张创造片，<b>立刻 +4 分</b>。注意：如果你已经建了宫殿，可以省下 5 钱的附加费；每多买一张创造片，书的需求 +1 本，最多 3 张。"
    },
    {
      badge: "行动 ⑥", title: "跳过 Pass",
      text: [
        "如果你不想再行动了，就<b>跳过</b>。",
        "点击「<b>跳过 Pass</b>」：结算回合奖励片的分数，然后换一张新的奖励片。",
        "还有一个容易被忽略的奖励——<b>本轮第一个跳过的人，会成为下一轮的起始玩家</b>。"
      ],
      expect: "pass", allow: ["pass"], hex: null,
      done: "结算回合奖励片 <b>+2 分</b>，并换了一张新奖励片。你是本轮第一个跳过的，所以<b>下一轮你先手</b>。"
    },
    {
      badge: "Phase III", title: "回合末：结算与重置",
      text: [
        "所有玩家都跳过后，进入 Phase III。",
        "点击「<b>结算 Phase III</b>」：按当轮回合计分片与你的学科等级拿奖励分，并把版图上的公共行动翻回正面（重置）。"
      ],
      expect: "settle", allow: ["settle"], hex: null, disc: "engineering",
      done: "学科奖励 <b>+3 分</b>（依据你在学科轨道上的等级），公共行动已重置。第 1 轮正式结束。"
    },
    {
      badge: "完成", title: "第 1 轮走完了 🎉",
      text: [
        "一轮的骨架就是这么三件事：<b>收入 → 行动 → 结算</b>，重复 6 轮。",
        "6 轮后终局计分只有三项：<b>最大连片（18 / 12 / 6）、每个学科的最高等级（8 / 4 / 2）、每 3 个资源 1 分</b>。",
        "想继续深入，去看「九个行动详解」和「易村规 20 点」这两节。"
      ],
      btn: "完成并关闭", allow: [], hex: null
    }
  ];

  /* ---------------- DOM ---------------- */
  var el = {};
  var S = null, idx = 0, locked = false;

  function $(id) { return document.getElementById(id); }

  function build() {
    var ov = document.createElement("div");
    ov.className = "tut";
    ov.id = "tut";
    ov.hidden = true;
    ov.innerHTML =
      '<div class="tut-backdrop" data-close="1"></div>' +
      '<div class="tut-panel" role="dialog" aria-modal="true" aria-label="交互式教程">' +
        '<header class="tut-head">' +
          '<div class="tut-prog"><div class="tut-bar"><i id="tutBar"></i></div>' +
          '<span class="tut-stepno" id="tutStepNo"></span></div>' +
          '<button class="tut-x" id="tutClose" aria-label="退出教程">✕</button>' +
        '</header>' +
        '<div class="tut-body">' +
          '<aside class="tut-coach">' +
            '<span class="tut-badge" id="tutBadge"></span>' +
            '<h3 id="tutTitle"></h3>' +
            '<div class="tut-text" id="tutText"></div>' +
            '<div class="tut-fb" id="tutFb" hidden></div>' +
          '</aside>' +
          '<section class="tut-sim">' +
            '<div class="sim-res" id="simRes"></div>' +
            '<div class="sim-grid">' +
              '<div class="sim-map"><svg id="simMap" viewBox="-90 -100 240 200" role="img" aria-label="模拟地图"></svg>' +
                '<div class="sim-leg" id="simLeg"></div></div>' +
              '<div class="sim-side">' +
                '<div class="sim-cap">地形环 <span class="en">Terraforming Circle</span></div>' +
                '<svg id="simRing" viewBox="0 0 264 252" role="img" aria-label="地形环"></svg>' +
                '<div class="sim-cap">魔力碗 <span class="en">Power</span></div>' +
                '<div class="sim-bowls" id="simBowls"></div>' +
              '</div>' +
            '</div>' +
            '<div class="sim-cap">学科轨道 <span class="en">Disciplines</span></div>' +
            '<div class="sim-disc" id="simDisc"></div>' +
            '<div class="sim-cap">魔力行动 · 书行动 <span class="en">Power &amp; Book Actions — 每个每轮限用一次</span></div>' +
            '<div class="sim-pa" id="simPA"></div>' +
            '<div class="sim-acts" id="simActs"></div>' +
          '</section>' +
        '</div>' +
        '<footer class="tut-foot">' +
          '<button class="btn" id="tutReset">↺ 重来</button>' +
          '<span class="tut-spacer"></span>' +
          '<span class="tut-tip" id="tutTip"></span>' +
          '<button class="btn primary" id="tutNext" disabled>下一步</button>' +
        '</footer>' +
      '</div>';
    document.body.appendChild(ov);

    el.ov = ov;
    el.bar = $("tutBar");
    el.stepNo = $("tutStepNo");
    el.badge = $("tutBadge");
    el.title = $("tutTitle");
    el.text = $("tutText");
    el.fb = $("tutFb");
    el.res = $("simRes");
    el.bowls = $("simBowls");
    el.map = $("simMap");
    el.leg = $("simLeg");
    el.ring = $("simRing");
    el.disc = $("simDisc");
    el.pa = $("simPA");
    el.acts = $("simActs");
    el.next = $("tutNext");
    el.tip = $("tutTip");
    el.reset = $("tutReset");
    el.close = $("tutClose");

    el.close.addEventListener("click", close);
    el.reset.addEventListener("click", function () { start(); });
    el.next.addEventListener("click", function () {
      if (el.next.disabled) return;
      if (idx >= STEPS.length - 1) { close(); return; }
      go(idx + 1);
    });
    ov.addEventListener("click", function (e) {
      if (e.target && e.target.getAttribute && e.target.getAttribute("data-close")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !ov.hidden) close();
    });
    el.acts.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-act]") : null;
      if (!b) return;
      hit(b.getAttribute("data-act"));
    });
    el.map.addEventListener("click", function (e) {
      var g = e.target.closest ? e.target.closest("[data-hex]") : null;
      if (!g) return;
      hexHit(g.getAttribute("data-hex"));
    });
    el.pa.addEventListener("click", function (e) {
      var c = e.target.closest ? e.target.closest("[data-pa]") : null;
      if (!c || c.getAttribute("disabled") !== null) return;
      paHit(c.getAttribute("data-pa"));
    });
  }

  /* ---------------- 渲染：迷你地图 ---------------- */
  function hexPix(q, r) {
    return { x: 1.5 * R * q, y: HW * (r + q / 2) };
  }
  function hexPoints(cx, cy) {
    var p = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 180 * (60 * i);
      p.push((cx + R * Math.cos(a)).toFixed(1) + "," + (cy + R * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  }
  var BUILD_LABEL = { workshop: "工", guild: "公", school: "学", university: "大", palace: "宫" };

  function renderMap() {
    var step = STEPS[idx];
    var svg = [], legend = [], seen = {};
    for (var i = 0; i < S.hexes.length; i++) {
      var h = S.hexes[i];
      var c = hexPix(h.q, h.r);
      var t = TERRAIN[h.terrain];
      var native = h.terrain === "Forest";
      var clickable = step.hex === h.id && !locked;
      svg.push('<g class="hex' + (clickable ? " clickable" : "") + '" data-hex="' + h.id + '">');
      svg.push('<polygon points="' + hexPoints(c.x, c.y) + '" fill="' + t.color + '"' +
        ' stroke="' + (native ? "#2f6b2f" : "#6b6157") + '" stroke-width="' + (native ? 2.4 : 1.2) + '"/>');
      svg.push('<text x="' + c.x + '" y="' + (c.y - 2) + '" text-anchor="middle" font-size="10.5" fill="' + t.ink + '" opacity="0.92">' + t.name + '</text>');
      if (h.mine) {
        svg.push('<circle cx="' + c.x + '" cy="' + (c.y + 14) + '" r="10" fill="#1e3a63"/>');
        svg.push('<text x="' + c.x + '" y="' + (c.y + 18) + '" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">' + BUILD_LABEL[h.mine] + '</text>');
      } else if (h.foe) {
        svg.push('<circle cx="' + c.x + '" cy="' + (c.y + 14) + '" r="10" fill="#a23f2b"/>');
        svg.push('<text x="' + c.x + '" y="' + (c.y + 18) + '" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">敌</text>');
      }
      if (clickable) {
        svg.push('<polygon points="' + hexPoints(c.x, c.y) + '" fill="none" stroke="#a9761f" stroke-width="3" class="pulse"/>');
      }
      svg.push('</g>');
      if (!seen[h.terrain]) { seen[h.terrain] = 1; legend.push(h.terrain); }
    }
    el.map.innerHTML = svg.join("");
    el.leg.innerHTML = legend.map(function (k) {
      return '<span class="lg"><i style="background:' + TERRAIN[k].color + '"></i>' + TERRAIN[k].name + '</span>';
    }).join("") + '<span class="lg"><i style="background:#1e3a63"></i>你的建筑</span><span class="lg"><i style="background:#a23f2b"></i>对手建筑</span>';
  }

  /* ---------------- 渲染：地形环 ---------------- */
  function renderRing() {
    var step = STEPS[idx];
    var CX = 132, CY = 126, RR = 74, TR = 19, N = RING.length;
    var out = [];
    out.push('<circle cx="' + CX + '" cy="' + CY + '" r="' + (RR - TR - 4) + '" fill="none" stroke="#d2c4aa" stroke-width="1.2" stroke-dasharray="3 3"/>');
    for (var i = 0; i < N; i++) {
      var a = (-90 + i * (360 / N)) * Math.PI / 180;
      var x = CX + RR * Math.cos(a), y = CY + RR * Math.sin(a);
      var it = RING[i], t = TERRAIN[it.t];
      var isNative = it.cost === 0;
      var focus = step.ringFocus === it.t;
      var done = focus && locked;

      /* 相邻两格之间 = 1 铲 */
      var ma = (-90 + (i + 0.5) * (360 / N)) * Math.PI / 180;
      var mx = CX + RR * Math.cos(ma), my = CY + RR * Math.sin(ma);
      out.push('<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="5" fill="#fff" stroke="#c9a86a" stroke-width="1"/>');
      out.push('<text x="' + mx.toFixed(1) + '" y="' + (my + 2.6).toFixed(1) + '" text-anchor="middle" font-size="6.6" fill="#a9843a">铲</text>');

      if (focus) {
        out.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (TR + 5) + '" fill="none" stroke="#a9761f" stroke-width="2.6" class="' + (done ? "" : "pulse") + '"/>');
      }
      out.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + TR + '" fill="' + t.color + '" stroke="' + (isNative ? "#2f6b2f" : "#8a7a5e") + '" stroke-width="' + (isNative ? 2.6 : 1.1) + '"/>');
      out.push('<text x="' + x.toFixed(1) + '" y="' + (y + 5).toFixed(1) + '" text-anchor="middle" font-size="14" font-weight="bold" fill="' + t.ink + '">' + t.name.charAt(0) + '</text>');

      if (!isNative) {
        var lr = RR + TR + 11;
        var lx = CX + lr * Math.cos(a), ly = CY + lr * Math.sin(a);
        var ca = Math.cos(a);
        var anc = ca > 0.35 ? "start" : (ca < -0.35 ? "end" : "middle");
        out.push('<text x="' + lx.toFixed(1) + '" y="' + (ly + 3.6).toFixed(1) + '" text-anchor="' + anc + '" font-size="10.5" font-weight="bold" fill="' + (focus ? "#a9761f" : "#8a6a20") + '">' + it.cost + ' 铲</text>');
      }
    }
    out.push('<text x="' + CX + '" y="' + (CY - 4) + '" text-anchor="middle" font-size="10" font-weight="bold" fill="#2f6b2f">家园地形</text>');
    out.push('<text x="' + CX + '" y="' + (CY + 9) + '" text-anchor="middle" font-size="10" fill="#6d6357">森林</text>');
    el.ring.innerHTML = out.join("");
  }

  /* ---------------- 渲染：学科轨道 ---------------- */
  function renderDisc() {
    var step = STEPS[idx];
    el.disc.innerHTML = DISCS.map(function (d) {
      var lv = S.disc[d.key] || 0;
      var cells = "";
      for (var i = 1; i <= 12; i++) {
        var cls = "dc";
        if (i <= lv) cls += " fill";
        if (i === lv && lv > 0) cls += " cur";
        if (i === 3 || i === 5 || i === 7 || i === 12) cls += " ms";
        cells += '<i class="' + cls + '" style="--c:' + d.color + '">' + ((i === 3 || i === 5 || i === 7 || i === 12) ? i : "") + "</i>";
      }
      var on = (step.disc === d.key) ? " on" : "";
      return '<div class="drow' + on + '"><span class="dname"><i style="background:' + d.color + '"></i>' + d.zh + '</span>' +
        '<span class="dtrack">' + cells + '</span>' +
        '<span class="dlv">' + (lv ? lv + " 级" : "0") + '</span></div>';
    }).join("");
  }

  /* ---------------- 渲染：魔力 / 书行动 ---------------- */
  function renderPA() {
    var step = STEPS[idx];
    var need = step.pa;
    el.pa.innerHTML = PACTIONS.map(function (a) {
      var on = need === a.id;
      var used = (S.paUsed.indexOf(a.id) !== -1) || (on && locked);
      var dis = !on || locked;
      return '<button class="pa ' + a.kind + (on ? " on" : "") + (used ? " used" : "") + '"' +
        (dis ? ' disabled' : ' data-pa="' + a.id + '"') + '>' +
        '<span class="pc">' + a.cost + '</span><span class="pe">' + a.eff + '</span></button>';
    }).join("");
  }

  /* ---------------- 渲染：资源 / 魔力碗 / 行动 ---------------- */
  function renderRes() {
    var items = [
      ["工具", S.tools, "#8a8577"],
      ["钱", S.coins, "#c9a227"],
      ["学者", S.scholars, "#5b8c5a"],
      ["书", S.books, "#6a4a8e"],
      ["分数", S.score, "#1e3a63"]
    ];
    el.res.innerHTML = items.map(function (it) {
      return '<span class="sim-chip"><i style="background:' + it[2] + '"></i>' + it[0] + '<b>' + it[1] + '</b></span>';
    }).join("") +
      '<span class="sim-chip ghost">1 铲 = ' + S.spadeRate + ' 工具</span>' +
      (S.freeSpades ? '<span class="sim-chip ghost">存着 ' + S.freeSpades + ' 把铲子</span>' : "");
  }

  function renderBowls() {
    var names = ["碗 I", "碗 II", "碗 III"], sub = ["不可花", "过渡", "可花"];
    el.bowls.innerHTML = names.map(function (n, i) {
      return '<div class="bowl' + (i === 2 ? " hot" : "") + '"><span class="bname">' + n + '</span>' +
        '<span class="bval">' + S.power[i] + '</span><span class="bsub">' + sub[i] + '</span></div>';
    }).join("");
  }

  function renderActs() {
    var step = STEPS[idx];
    var allow = step.allow || [];
    el.acts.innerHTML = ACTIONS.map(function (a) {
      var ok = allow.indexOf(a.id) !== -1;
      var hi = ok || step.highlight === a.id;
      var used = step.expect === a.id && locked;
      return '<button class="sim-act' + (hi ? " on" : "") + (used ? " used" : "") + '"' +
        (ok && !locked ? ' data-act="' + a.id + '"' : " disabled") + '>' +
        '<span class="al">' + a.label + '</span><span class="as">' + a.sub + '</span></button>';
    }).join("");
  }

  function render() {
    var step = STEPS[idx];
    el.bar.style.width = Math.round(idx / (STEPS.length - 1) * 100) + "%";
    el.stepNo.textContent = (idx + 1) + " / " + STEPS.length;
    el.badge.textContent = step.badge;
    el.title.textContent = step.title;
    el.text.innerHTML = step.text.map(function (p) { return "<p>" + p + "</p>"; }).join("");

    if (locked && (step.expect || step.hex)) {
      el.fb.hidden = false;
      el.fb.className = "tut-fb ok";
      el.fb.innerHTML = '<b class="fbl">✓ 做对了</b>' + step.done;
    } else {
      el.fb.hidden = true;
      el.fb.innerHTML = "";
    }

    renderRes(); renderBowls(); renderMap(); renderRing(); renderDisc(); renderPA(); renderActs();

    var needAct = !!step.expect && !locked;
    var needHex = !!step.hex && !locked;
    var needPA = !!step.pa && !locked;
    el.next.disabled = needAct || needHex || needPA;
    el.next.textContent = step.btn || (idx >= STEPS.length - 1 ? "完成并关闭" : "下一步");
    el.tip.textContent = needHex ? "请在右侧地图上点击高亮的那格"
      : needPA ? "请在下方「魔力行动 / 书行动」里点击高亮的那张卡"
      : needAct ? "请点击上方高亮的行动按钮" : "";

    /* 把高亮的目标滚进视野，避免被折叠在可视区之外 */
    if (needHex || needPA || needAct) {
      var tgt = needHex ? el.map.querySelector(".hex.clickable")
        : needPA ? el.pa.querySelector(".pa.on")
        : el.acts.querySelector(".sim-act.on");
      if (tgt && tgt.scrollIntoView) {
        try { tgt.scrollIntoView({ block: "nearest" }); }
        catch (err) { tgt.scrollIntoView(false); }
      }
    }
  }

  /* ---------------- 动作处理 ---------------- */
  function gainPower(n) {
    for (var i = 0; i < n; i++) {
      if (S.power[0] > 0) { S.power[0]--; S.power[1]++; }
      else if (S.power[1] > 0) { S.power[1]--; S.power[2]++; }
    }
  }
  function spendPower(n) {
    var take = Math.min(n, S.power[2]);
    S.power[2] -= take; S.power[0] += take;
    return take;
  }
  function spendTools(n) { if (S.tools < n) return false; S.tools -= n; return true; }
  function spendCoins(n) { if (S.coins < n) return false; S.coins -= n; return true; }
  function spendBooks(n) { if (S.books < n) return false; S.books -= n; return true; }

  function hit(id) {
    var step = STEPS[idx];
    if (!step.expect || locked) return;
    if (step.allow.indexOf(id) === -1) { buzz(); return; }

    if (id === "income") {
      S.tools += 8; S.coins += 8; S.scholars += 1;
    } else if (id === "buildWorkshop") {
      if (!spendTools(1) || !spendCoins(2)) { buzz(); return; }
      for (var i = 0; i < S.hexes.length; i++) if (S.hexes[i].id === "h3") S.hexes[i].mine = "workshop";
    } else if (id === "oppBuild") {
      gainPower(2);
    } else if (id === "upgradeGuild") {
      if (!spendTools(2) || !spendCoins(3)) { buzz(); return; }
      for (var j = 0; j < S.hexes.length; j++) if (S.hexes[j].id === "h1") S.hexes[j].mine = "guild";
      S.hasGuild = true;
    } else if (id === "scholar") {
      if (S.scholars < 1) { buzz(); return; }
      S.scholars -= 1;
      S.disc.engineering = 2;
      gainPower(3);
    } else if (id === "powerAction") {
      if (spendPower(2) < 2) { buzz(); return; }
      S.freeSpades += 1;
    } else if (id === "innovation") {
      if (!spendBooks(5)) { buzz(); return; }
      S.innovations += 1; S.score += 4;
    } else if (id === "pass") {
      S.score += 2; S.passed = true;
    } else if (id === "settle") {
      S.score += 3;
    }
    locked = true;
    render();
  }

  function hexHit(hid) {
    var step = STEPS[idx];
    if (!step.hex || locked) return;
    if (step.hex !== hid) { flashMsg(step.wrongHex || "点错了，请点击高亮的那一格。"); return; }
    var h = null;
    for (var i = 0; i < S.hexes.length; i++) if (S.hexes[i].id === hid) h = S.hexes[i];
    if (!h) return;
    var need = 2;                                  // 森林 → 沼泽：地形环上隔 2 格
    if (S.freeSpades >= need) { S.freeSpades -= need; }
    else {
      var buy = need - S.freeSpades;
      if (!spendTools(S.spadeRate * buy)) { buzz(); return; }
      S.freeSpades = 0;
    }
    h.terrain = "Forest";
    locked = true;
    render();
  }

  function paHit(id) {
    var step = STEPS[idx];
    if (!step.pa || locked) return;
    if (step.pa !== id) { buzz(); return; }
    if (id === "pa_scholar") {
      if (spendPower(3) < 3) { buzz(); return; }
      S.scholars += 1;
      S.paUsed.push(id);
    } else {
      S.paUsed.push(id);
    }
    locked = true;
    render();
  }

  function flashMsg(msg) {
    el.fb.hidden = false;
    el.fb.className = "tut-fb warn";
    el.fb.innerHTML = '<b class="fbl">✗ 再想想</b>' + msg;
    el.fb.classList.remove("shake");
    void el.fb.offsetWidth;
    el.fb.classList.add("shake");
  }
  function buzz() {
    el.tip.classList.remove("shake");
    void el.tip.offsetWidth;
    el.tip.classList.add("shake");
    el.tip.textContent = "这一步先别做这个，按提示来。";
    setTimeout(function () { el.tip.textContent = "请点击上方高亮的行动按钮"; }, 1600);
  }

  function go(i) {
    idx = i;
    locked = false;
    el.fb.hidden = true;
    if (STEPS[idx].expect === "innovation") S.books = Math.max(S.books, 5);
    render();
    var body = el.ov.querySelector(".tut-body");
    if (body) body.scrollTop = 0;
  }

  function start() {
    if (!el.ov) build();
    S = freshState();
    idx = 0; locked = false;
    document.body.classList.add("tut-open");
    el.ov.hidden = false;
    render();
  }
  function close() {
    if (!el.ov) return;
    el.ov.hidden = true;
    document.body.classList.remove("tut-open");
  }

  /* ---------------- 绑定入口 ---------------- */
  function bind() {
    var els = document.querySelectorAll("[data-tut]");
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener("click", function (e) { e.preventDefault(); start(); });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  window.__aoiTutorial = { start: start, close: close };
})();
