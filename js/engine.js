/* =========================================================
   墨舟 · 生成引擎
   纯前端离线生成：标题 / 简介 / 分章大纲 / 开篇正文
   ========================================================= */
window.MozhouEngine = (function () {
  "use strict";

  const D = window.MOZHOU_DATA;

  /* ---------- 随机工具（可复现种子） ---------- */
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    return mulberry32(hashString(String(seed)));
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function pickN(rng, arr, n) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }
  function int(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }

  /* ---------- 流派原型配置 ---------- */
  const GENRE_NAMES = {
    xianxia: "东方仙侠", xuanhuan: "玄幻高武", wuxia: "武侠江湖",
    urban: "现代都市", campus: "青春校园", sci: "科幻未来",
    apocalypse: "末世生存", mystery: "悬疑探案", history: "古风权谋",
    western: "西方奇幻", game: "电竞游戏", system: "系统爽文",
    farming: "种田经营", horror: "诡秘惊悚"
  };

  const WORLD_BY_GENRE = {
    xianxia: ["九天仙域", "东玄大陆", "昆仑仙境", "蓬莱仙山", "青冥界", "太虚境"],
    xuanhuan: ["苍澜大陆", "大千世界", "蛮荒九域", "天衍星域", "万族之地"],
    wuxia: ["风起江南", "漠北边城", "蜀中剑阁", "烟雨江湖", "塞外孤城"],
    urban: ["云城", "江城", "滨海市", "华灯之城", "繁华都会"],
    campus: ["江城一中", "青梧高中", "南华大学", "夏日校园", "青春校园"],
    sci: ["第七星区", "新纪元", "环宇城", "方舟号", "星海之城"],
    apocalypse: ["废土", "迷雾之城", "旧世界", "幸存地", "末日之城"],
    mystery: ["江城", "雾都", "旧城", "南城", "雨夜之城"],
    history: ["朝堂", "乱世", "东宫", "王都", "盛世长安"],
    western: ["奥兰大陆", "艾泽王国", "北方雪境", "诸神之地"],
    game: ["虚拟战场", "电竞舞台", "全息世界", "职业赛场"],
    system: ["异界", "平行世界", "系统空间", "法则之地"],
    farming: ["青山村", "云水镇", "桃源乡", "田园小城"],
    horror: ["深海之城", "无名小镇", "诅咒庄园", "迷雾村落"]
  };

  const ITEM_BY_GENRE = {
    xianxia: ["神秘古镜", "无名残卷", "混沌灵根", "上古传承", "一株青莲", "破碎仙图"],
    xuanhuan: ["古老血脉", "沉睡武魂", "一卷天书", "神秘骨纹", "混沌种子"],
    wuxia: ["失传剑谱", "神秘令牌", "半张藏宝图", "无名刀诀"],
    urban: ["未卜先知的记忆", "一本旧账本", "神秘来电", "一段录音", "超常的直觉"],
    campus: ["未拆封的录取通知书", "尘封的旧日记", "一支旧钢笔", "天才般的头脑"],
    sci: ["破损的仿生核心", "异星信号源", "一副神经接口", "未公开的技术蓝图"],
    apocalypse: ["一枚净化晶核", "改造过的载具", "未受污染的水源图", "免疫血清"],
    mystery: ["一张泛黄的照片", "半枚指纹", "匿名信", "消失的档案"],
    history: ["一枚虎符", "密诏", "世家族谱", "兵权印信"],
    western: ["失落的圣剑", "魔法卷轴", "精灵古树之种", "龙鳞护符"],
    game: ["职业级操作", "逆天意识", "隐藏天赋", "老将的经验"],
    system: ["签到系统", "任务面板", "属性加点", "商城兑换", "成就奖励"],
    farming: ["一口灵泉", "改良种子", "废弃的农场", "祖传手艺"],
    horror: ["旧日手记", "诡异铜镜", "不明低语", "残缺的仪轨"]
  };

  const PLACE_BY_GENRE = {
    xianxia: ["青云宗", "落霞峰", "藏经阁", "试炼秘境", "太虚遗迹"],
    xuanhuan: ["苍岚城", "万兽山脉", "天骄学府", "古战场", "封魔渊"],
    wuxia: ["清风镖局", "醉仙楼", "燕子坞", "剑冢", "关外古道"],
    urban: ["云顶大厦", "旧城区", "顶级俱乐部", "创业园区", "私人会所"],
    campus: ["高三（1）班", "图书馆", "操场看台", "社团活动室", "阶梯教室"],
    sci: ["第七区", "空间站", "地下实验室", "中枢控制室", "废弃舰桥"],
    apocalypse: ["幸存者基地", "废弃医院", "地下仓库", "废弃地铁站", "补给站"],
    mystery: ["城南警局", "档案室", "停尸房", "老照相馆", "码头仓库"],
    history: ["御书房", "东宫", "金銮殿", "边境军营", "相国府"],
    western: ["王城", "魔法学院", "精灵森林", "巨龙巢穴", "佣兵公会"],
    game: ["训练基地", "决赛舞台", "战队休息室", "全息网吧", "转会会议室"],
    system: ["新手村", "任务大厅", "世界边界", "副本入口", "积分商店"],
    farming: ["村口晒谷场", "后山果园", "临河农田", "老宅院落", "镇上市集"],
    horror: ["荒废教堂", "老宅阁楼", "地下墓室", "迷雾沼泽", "旧灯塔"]
  };

  const GOAL_BY_GENRE = {
    xianxia: ["证道长生", "飞升成仙", "问鼎仙道之巅", "逆天改命", "守护宗门"],
    xuanhuan: ["登临武道绝巅", "统御万族", "守护苍生", "破开天穹", "寻回失落的血脉"],
    wuxia: ["快意恩仇", "问鼎武林", "寻回师门真相", "守护一方百姓", "了却江湖恩怨"],
    urban: ["登上人生巅峰", "守护所爱之人", "夺回属于自己的一切", "实现最初的梦想", "在商海翻云覆雨"],
    campus: ["考上理想的大学", "不留遗憾地告别青春", "找到真正的自己", "喜欢的人并肩前行"],
    sci: ["拯救人类文明", "揭开星海真相", "阻止失控的智能", "带领人类走向新生"],
    apocalypse: ["在末世中活下去", "建立新的家园", "终结末日的根源", "守护最后的人类"],
    mystery: ["揭开真相", "揪出幕后真凶", "洗刷冤屈", "让逝者安息"],
    history: ["匡扶社稷", "夺回本该属于自己的江山", "守护家国", "在乱世中保全亲族", "辅佐明君"],
    western: ["击败黑暗", "寻回失落的神器", "守护王国", "终结千年的诅咒"],
    game: ["捧起冠军奖杯", "登上世界之巅", "带领战队翻盘", "证明自己的价值"],
    system: ["不断变强", "刷满成就", "打破系统束缚", "成为最强", "逆袭人生"],
    farming: ["把日子越过越好", "打造理想家园", "带领乡亲致富", "寻回内心的安宁"],
    horror: ["逃离诡异之地", "破解诅咒", "活下去并查明真相", "阻止旧日降临"]
  };

  const RIVAL_BY_GENRE = {
    xianxia: ["宿敌剑修", "觊觎传承的魔道", "心怀鬼胎的同门", "上古大能", "天道劫数"],
    xuanhuan: ["宿命中的强敌", "敌对氏族", "隐藏在天骄中的敌人", "沉睡的凶兽"],
    wuxia: ["追杀而来的仇家", "魔教高手", "背信弃义的师叔", "觊觎秘籍的门派"],
    urban: ["商海中的对手", "暗中作梗的竞争者", "曾经背叛自己的人", "高高在上的权贵"],
    campus: ["处处刁难的对手", "严厉的师长", "看不见的压力", "内心的迷茫"],
    sci: ["失控的智能", "觊觎技术的神秘组织", "来自星海的威胁", "冰冷的规则"],
    apocalypse: ["变异怪物", "残酷的生存法则", "掠夺物资的帮派", "未知的疫病"],
    mystery: ["藏在暗处的凶手", "制造迷雾的人", "被掩埋的秘密", "危险的旧案"],
    history: ["觊觎皇位的势力", "朝中权臣", "敌国细作", "家国倾覆的危机"],
    western: ["黑暗法师", "堕落巨龙", "背叛的盟友", "复苏的魔王"],
    game: ["宿敌战队", "状态起伏的老将", "外界的质疑", "更年轻的天才"],
    system: ["更强的系统宿主", "规则的漏洞", "被操纵的命运", "崩溃边缘的世界"],
    farming: ["天灾人祸", "恶意收购者", "陈旧的观念", "偏远之地的落后"],
    horror: ["不可名状之物", "被污染的人心", "远古的诅咒", "愈演愈烈的怪象"]
  };

  const CONFLICT_BY_GENRE = {
    xianxia: ["天劫将至", "宗门危机", "大道之争", "上古秘辛"],
    xuanhuan: ["血脉觉醒", "万族争锋", "天骄之战", "封魔之乱"],
    wuxia: ["江湖恩怨", "师门血仇", "秘籍之争", "天下大势"],
    urban: ["商海暗涌", "身世之谜", "行业洗牌", "名利漩涡"],
    campus: ["升学压力", "青春的遗憾", "理想与现实", "懵懂的心事"],
    sci: ["失控的智能", "星际危机", "技术反噬", "人类存亡"],
    apocalypse: ["末日降临", "物资危机", "感染扩散", "人心崩坏"],
    mystery: ["陈年旧案", "连环谜团", "消失的真相", "隐于暗处的凶手"],
    history: ["朝堂倾轧", "家国危局", "夺嫡之争", "山河飘摇"],
    western: ["黑暗复苏", "王国危机", "神器失落", "诅咒蔓延"],
    game: ["冠军之争", "战队危机", "状态低谷", "外界的质疑"],
    system: ["系统漏洞", "任务危机", "规则崩坏", "宿主的挑战"],
    farming: ["天灾来袭", "经营困境", "旧观念束缚", "乡亲的生计"],
    horror: ["诡异复苏", "诅咒缠身", "不可名状的真相", "失踪谜团"]
  };

  const RELATION_FLAVOR = {
    xianxia: ["道侣", "宿敌", "同门", "上仙"],
    xuanhuan: ["并肩作战的伙伴", "宿命之敌", "各族英才", "守护之人"],
    wuxia: ["红颜知己", "义兄义弟", "师门同门", "剑下留情之人"],
    urban: ["命中注定之人", "并肩创业的伙伴", "商海对手", "旧日恋人"],
    campus: ["同桌的少年", "操场上闪闪发光的人", "并肩备考的同学", "偷偷喜欢的人"],
    sci: ["拥有秘密的搭档", "仿生人同伴", "指挥官", "星海另一端的生命"],
    apocalypse: ["患难与共的伙伴", "失去的亲人", "并肩求生的陌生人", "最后的光"],
    mystery: ["敏锐的搭档", "关键证人", "多年未见的人", "执着真相的自己"],
    history: ["青梅竹马", "阵营对立的宿敌", "忠心的随从", "朝堂之上的盟友"],
    western: ["精灵游侠", "龙裔", "勇敢的公主", "沉默的骑士"],
    game: ["并肩作战的队友", "惺惺相惜的对手", "默默支持的家人", "逐梦的伙伴"],
    system: ["指路的导师", "并肩升级的伙伴", "同样怀揣秘密的人", "最初的梦想"],
    farming: ["质朴的乡邻", "勤劳的家人", "志同道合的朋友", "守候的人"],
    horror: ["仅存的同伴", "来历不明的向导", "失踪多年的人", "自己的恐惧"]
  };

  /* ---------- 姓名与常用词库 ---------- */
  const SURNAMES = ["林", "顾", "沈", "陆", "苏", "白", "江", "秦", "谢", "叶", "温", "许", "程", "韩", "裴", "容", "萧", "楚", "傅", "姜", "宋", "柳"];
  const GIVEN = ["之远", "景行", "云舟", "知微", "墨白", "清和", "星野", "子衿", "怀瑾", "望舒", "明澈", "若川", "闻舟", "拾光", "既白", "长歌", "知夏", "未央", "清欢", "晚晴", "星辞", "若初", "南栀", "念安", "清漪", "云舒", "疏影", "棠梨", "时雨", "眠眠"];

  /* ---------- 模板占位替换 ---------- */
  function fill(tpl, ctx) {
    return tpl.replace(/\{(\w+)\}/g, (m, key) => (ctx[key] !== undefined ? ctx[key] : m));
  }

  /* ---------- 构建创作上下文 ---------- */
  function detectGenre(keywords) {
    // 优先以“世界观·题材”关键词定下故事主框架，避免人物/情节词干扰
    const worldKws = keywords.filter(kw => D.KEYWORDS.world.includes(kw));
    if (worldKws.length) {
      const g = D.GENRE_HINTS[worldKws[0]];
      if (g) return g;
    }
    const votes = {};
    keywords.forEach(kw => {
      const g = D.GENRE_HINTS[kw];
      if (g) votes[g] = (votes[g] || 0) + 1;
    });
    let best = null, bestScore = -1;
    Object.keys(votes).forEach(g => {
      if (votes[g] > bestScore) { best = g; bestScore = votes[g]; }
    });
    return best || "xianxia";
  }

  function deriveContext(keywords, params) {
    const rng = makeRng(keywords.join("|") + "|" + JSON.stringify(params));
    const genre = detectGenre(keywords);
    const genreName = GENRE_NAMES[genre] || "原创故事";

    // 主角身份
    const roleKw = keywords.filter(kw => D.ROLE_HINTS.has(kw));
    const hero = roleKw.length ? roleKw[0] : pick(rng, ["少年", "少女", "普通人", "平凡学子", "无名之辈"]);

    // 世界观
    // 世界观（取流派对应的世界名，保持叙事自洽）
    const world = pick(rng, WORLD_BY_GENRE[genre]);

    // 冲突
    const plotKws = keywords.filter(kw => D.KEYWORDS.plot.includes(kw));
    const conflict = plotKws.length ? pick(rng, plotKws) : pick(rng, CONFLICT_BY_GENRE[genre] || ["未知的危机", "命运的考验"]);

    // 关系
    const relKws = keywords.filter(kw => D.KEYWORDS.relation.includes(kw));
    const relation = relKws.length ? relKws[0] : null;
    const bond = pick(rng, RELATION_FLAVOR[genre]);

    // 元素 / 金手指
    const elemKws = keywords.filter(kw => D.KEYWORDS.element.includes(kw));
    const item = elemKws.length ? pick(rng, elemKws) : pick(rng, ITEM_BY_GENRE[genre]);
    const place = pick(rng, PLACE_BY_GENRE[genre]);
    const goal = pick(rng, GOAL_BY_GENRE[genre]);
    const villain = pick(rng, RIVAL_BY_GENRE[genre]);

    // 风格
    const toneKws = keywords.filter(kw => D.KEYWORDS.tone.includes(kw));
    const tone = params.tone === "auto"
      ? (toneKws.length ? toneKws[0] : pick(rng, ["热血", "治愈", "轻松"]))
      : ({ cool: "冷峻", warm: "温暖", funny: "轻松" }[params.tone] || "热血");

    // 结局
    const ending = params.ending || "he";

    // 姓名与视角
    const heroName = pick(rng, SURNAMES) + pick(rng, GIVEN);
    const partnerName = pick(rng, SURNAMES) + pick(rng, GIVEN);
    const protagonist = params.pov === "first" ? "我" : heroName;
    const ta = params.pov === "first" ? "我" : "TA";

    // 设定词
    const settingKws = keywords.filter(kw => D.KEYWORDS.setting.includes(kw));
    const setting = settingKws.length ? settingKws.join("、") : "逆风翻盘";

    return {
      genre, genreName, keywords, params,
      world, hero, heroName, partnerName, protagonist, ta,
      villain, conflict, relation, bond, item, place, goal, tone, ending, setting
    };
  }

  /* ---------- 标题生成 ---------- */
  function genTitles(ctx, rng) {
    const patterns = {
      xianxia: ["{world}之上", "大道{goal}", "我以{item}证长生", "从{place}开始修仙", "{heroName}的飞升之路", "此间{world}", "仙路{goal}"],
      xuanhuan: ["{world}纪元", "{heroName}战记", "我为{hero}的那些年", "天骄之路", "{item}觉醒", "踏破{world}"],
      wuxia: ["{place}风雨录", "江湖有{hero}", "{heroName}的刀", "一剑{goal}", "天下与{world}"],
      urban: ["重生之{hero}", "都市{hero}", "{hero}的逆袭", "我在{place}当{hero}", "回到{world}的那天", "{goal}计划"],
      campus: ["那年{world}", "{heroName}的青春", "致{place}", "我在{world}等风来", "同桌的{heroName}"],
      sci: ["{world}纪元", "来自{world}的信号", "{heroName}的星海", "我造出了一艘星舰", "{item}之后", "当人类仰望星空"],
      apocalypse: ["{world}求生指南", "末日{hero}", "{heroName}的最后一天", "在{world}活下去", "我是{world}里最后的{hero}"],
      mystery: ["{place}疑云", "{hero}追凶", "真相在{place}", "{heroName}探案录", "藏在{world}的秘密"],
      history: ["{world}风云", "{heroName}传", "凤临{world}", "我自{place}来", "这江山，我要定了", "{goal}"],
      western: ["{world}之刃", "龙与{item}", "{heroName}的圣剑", "诸神黄昏之后", "来自{world}的勇者"],
      game: ["巅峰{hero}", "{heroName}的电竞之路", "从{place}到世界之巅", "请叫我{hero}", "这一局，我要赢"],
      system: ["我的{setting}", "{hero}签到打卡", "系统让我{goal}", "我在{world}开外挂", "{item}使用手册"],
      farming: ["我在{world}种田", "{place}的悠闲生活", "回到{world}搞建设", "{heroName}的田园", "从{place}到小康"],
      horror: ["{world}异闻录", "{hero}存活指南", "别回头，{heroName}", "{place}的怪谈", "当旧日苏醒"]
    };
    const base = patterns[ctx.genre] || ["{world}·{hero}", "{heroName}传", "{goal}之后", "此间{world}", "我在{world}的{goal}"];
    const titles = [];
    const pool = base.slice();
    while (titles.length < 3 && pool.length) {
      const idx = Math.floor(rng() * pool.length);
      const t = fill(pool.splice(idx, 1)[0], ctx);
      if (!titles.includes(t)) titles.push(t);
    }
    return titles;
  }

  /* ---------- 简介 ---------- */
  function genLogline(ctx, rng) {
    const tpls = [
      "这是关于{hero}在{world}中{conflict}，最终{goal}的故事。",
      "{heroName}意外卷入{conflict}，在{world}里一步步{goal}。",
      "当{hero}遇上{conflict}，{world}的平静被彻底打破，一场{goal}的旅程就此展开。",
      "在{world}，{heroName}带着{item}，开始了{goal}的逆袭之路。"
    ];
    return fill(pick(rng, tpls), ctx);
  }

  function genSynopsis(ctx, rng) {
    const a = fill("{heroName}原本只是{world}中再普通不过的存在，直到{item}的出现，让{ta}的人生彻底改变。", ctx);
    const b = fill("面对{conflict}与{villain}，{ta}在{place}不断成长，与{bond}的羁绊越缠越深。", ctx);
    const c = ctx.ending === "he"
      ? "最终，{ta}冲破重重阻碍，{goal}，迎来属于自己的圆满结局。"
      : ctx.ending === "be"
        ? "可命运从不轻易成全，当真相揭开，{ta}不得不面对最残酷的代价。"
        : "故事的终点尚未写定，而{heroName}的选择，将决定{world}的未来。";
    return [a, b, fill(c, ctx)].join("");
  }

  /* ---------- 大纲 ---------- */
  function chapterCount(length) {
    if (length === "short") return 8;
    if (length === "long") return 16;
    return 12;
  }

  const ACT_BEATS = [
    { // 第一幕 · 开端
      label: "第一幕 · 风起",
      beats: [
        { t: "{place}初逢", s: "{protagonist}在{place}意外得到{item}，命运的齿轮开始转动。" },
        { t: "平静被打破", s: "{conflict}突然降临{world}，{protagonist}第一次意识到自己无法再置身事外。" },
        { t: "觉醒", s: "{protagonist}发现{item}藏着不为人知的秘密，也窥见了{goal}的一线可能。" },
        { t: "抉择", s: "面对{villain}的逼迫，{protagonist}做出改变一生的决定，正式踏入{world}的风暴中心。" },
        { t: "初见", s: "在{place}，{protagonist}与{bond}的羁绊初次交织，彼此都未料到日后纠葛。" }
      ]
    },
    { // 第二幕 · 发展
      label: "第二幕 · 破浪",
      beats: [
        { t: "试炼", s: "为了{goal}，{protagonist}在{place}接受严酷考验，实力与心性都得到磨砺。" },
        { t: "结盟", s: "{protagonist}结识重要伙伴，并凭借{item}在{world}站稳脚跟，赢得转机。" },
        { t: "危机", s: "{villain}步步紧逼，{protagonist}陷入前所未有的困境，险些满盘皆输。" },
        { t: "破局", s: "绝境之中，{protagonist}抓住一线生机，反败为胜，却也付出了代价。" },
        { t: "成长", s: "经历起伏后，{protagonist}看清了{conflict}背后的真相，目标愈发坚定。" },
        { t: "变数", s: "新的变数出现，原本的盟友与敌人立场模糊，{world}的格局悄然改写。" }
      ]
    },
    { // 第三幕 · 高潮与结局
      label: "第三幕 · 归途",
      beats: [
        { t: "对峙", s: "所有线索汇聚，{protagonist}与{villain}在{place}正面交锋，恩怨迎来总清算。" },
        { t: "决战", s: "赌上一切的最终一战爆发，{protagonist}为{goal}拼尽全力，生死悬于一线。" },
        { t: "真相", s: "尘封的真相被揭开，{conflict}的源头浮出水面，一切因果终于清晰。" },
        { t: "结局", s: ctx => ctx.ending === "he"
          ? "尘埃落定，{protagonist}战胜{villain}，如愿{goal}，与珍视之人携手走向新生。"
          : ctx.ending === "be"
            ? "代价沉重，{protagonist}虽达{goal}，却永远失去了最重要的东西，徒留意难平。"
            : "胜负已分，但故事远未结束，{protagonist}站在{place}，望向更广阔的{world}。" },
        { t: "新生", s: "风波过后，{protagonist}重新审视来路，{world}也在悄然之中迎来新的开始。" }
      ]
    }
  ];

  function genOutline(ctx, rng) {
    const total = chapterCount(ctx.params.length);
    const outline = [];
    // 分配各幕章节数量
    const first = Math.max(2, Math.round(total * 0.28));
    const second = Math.max(3, total - first - Math.max(2, Math.round(total * 0.25)));
    const third = total - first - second;

    const plan = [
      { act: ACT_BEATS[0], n: first },
      { act: ACT_BEATS[1], n: second },
      { act: ACT_BEATS[2], n: third }
    ];

    let index = 0;
    plan.forEach(({ act, n }) => {
      outline.push({ type: "act", title: act.label });
      // 按固定叙事顺序推进，保证章节逻辑连贯
      for (let i = 0; i < n; i++) {
        const beat = act.beats[i % act.beats.length];
        const summary = (typeof beat.s === "function") ? beat.s(ctx) : beat.s;
        outline.push({
          type: "chapter",
          index: ++index,
          title: fill(beat.t, ctx),
          summary: fill(summary, ctx)
        });
      }
    });

    // 保证末章一定是“结局”，让完整小说收束自然
    const chapterItems = outline.filter(o => o.type === "chapter");
    if (chapterItems.length) {
      const last = chapterItems[chapterItems.length - 1];
      const endBeat = ACT_BEATS[2].beats.find(b => b.t === "结局") || ACT_BEATS[2].beats[ACT_BEATS[2].beats.length - 1];
      last.title = fill(endBeat.t, ctx);
      last.summary = fill((typeof endBeat.s === "function") ? endBeat.s(ctx) : endBeat.s, ctx);
    }
    return outline;
  }

  /* ---------- 开篇正文 ---------- */
  /* 共享叙事素材：场景细节 / 对话 / 内心回响 */
  const PROSE_BANKS = {
    scenes: [
      `{place}的轮廓在暮色中拉长，风卷起细尘，又缓缓落下。一切看似平静，暗处却早已波涛汹涌。`,
      `阳光透过{place}的窗棂，在地上投下细碎的光影。{protagonist}的影子被拉得很长，像极了一场无声的宣战。`,
      `远处传来若有若无的声响，{world}的天色阴沉下来，仿佛连风都屏住了呼吸。`,
      `人群散去，{place}重归安静，可空气里那根绷紧的弦，却久久没有松开。`,
      `{place}外的天色暗了下来，灯火一盏接一盏亮起，像在给这漫漫长夜点起微光。`,
      `空气里浮着淡淡的草木气息，{world}的喧嚣仿佛被隔在很远的地方。{protagonist}的心，也难得地静了下来。`
    ],
    dialogues: [
      `“这就是你的选择？”{bond}低声问。{protagonist}没有回头，只道：“走到今天，已经没有退路了。”`,
      `“再往前，就是{villain}的地盘了。”有人出声提醒。{protagonist}却笑了笑：“那正好，省得我去找它。”`,
      `“{goal}这条路，可不好走。”声音从身后传来。{protagonist}握紧{item}，目光坚定：“我偏要走到底。”`,
      `“你就没想过放弃吗？”{bond}望着{ta}。{protagonist}沉默片刻，轻声道：“想过，但更怕后悔。”`,
      `“别逞强了。”{bond}按住{protagonist}的手，语气里带着不易察觉的关切。{protagonist}终于卸下几分防备：“让我再试一次。”`,
      `“这件事，我一个人就够了。”{protagonist}语气平静。{bond}却摇了摇头：“可你已经不是一个人了。”`
    ],
    reflections: [
      `{protagonist}忽然想，若当初没有走进{place}，或许日子还是从前那般安稳。可若真那样，又怎能见到更辽阔的{world}。`,
      `一路走来，{protagonist}终于明白，{goal}从来不只是终点，更是一路上不肯低头的自己。`,
      `有些道理，要等撞过南墙才懂。{protagonist}望着掌心，{item}的温度仿佛还在，提醒着{ta}来时的路。`,
      `夜很静，{protagonist}的思绪却翻涌不息。所谓命运，或许从来不是既定的路，而是每一步选择之后的回声。`,
      `月光漫过{place}，{protagonist}想起一路上的聚散得失，忽然觉得，那些吃过的苦，都成了此刻脚下的底气。`,
      `风里似乎还残留着旧日的回声。{protagonist}闭上眼，又睁开，眼底只剩下一个方向——{goal}。`
    ]
  };

  function genChapter(ctx, rng) {
    const toneOpen = {
      "热血": ["风起于青萍之末。", "命运从来只眷顾敢拼的人。", "有些故事，从一声不甘开始。"],
      "治愈": ["阳光落在肩头，带着恰到好处的温度。", "生活再难，也总有一束光会照进来。", "风很轻，云很慢，日子在慢慢变好。"],
      "轻松": ["事情的走向，比想象中离谱多了。", "谁也没想到，平静的日子说翻就翻。", "如果早知道会这样，当初就该……算了，后悔也没用。"],
      "冷峻": ["夜色浓得化不开。", "世界从不问你是否准备好。", "所有的偶然，都早已写好了代价。"],
      "温暖": ["屋里的灯还亮着，暖融融的。", "总有人记得你的喜好。", "冬天再冷，也冷不过人心，暖不过陪伴。"]
    };
    const open = pick(rng, toneOpen[ctx.tone] || toneOpen["热血"]);
    ctx.open = open;

    // 正文段落模板
    const paras = [
      // 1 环境与开场
      [
        "{open}{world}的轮廓，在晨雾中一点一点清晰起来。{place}还沉浸在将醒未醒的寂静里，只有风穿过檐角，带起细微的声响。",
        "{open}这是{world}里再寻常不过的一天。{place}的喧嚣尚未开始，远处传来的几声鸟鸣，反倒让四周显得更安静。",
        "{open}{world}的天色刚刚擦亮，{place}已有人影走动。谁也不会想到，一场足以改变许多人的变故，正从这平常的一刻悄然逼近。"
      ],
      // 2 主角出场
      [
        "{protagonist}揉了揉眼睛，把昨夜的梦甩到脑后。{ta}只是{world}里一个普通的{hero}，日子过得不好不坏，谈不上大富大贵，也勉强算得上安稳。",
        "对于{hero}{protagonist}来说，今天和昨天似乎没什么两样。{ta}收拾好自己，像往常一样走出门，心里盘算着琐碎而具体的小事。",
        "{protagonist}站在{place}前，忽然有些恍惚。做{hero}这么久，{ta}第一次觉得，这条熟悉的路，好像要通往一个完全陌生的方向。"
      ],
      // 3 变故 / 引子
      [
        "就在这时，{item}毫无预兆地闯进了{ta}的世界。那一刻，{protagonist}只觉耳边一静，连呼吸都漏了半拍。",
        "变故来得突然。当{protagonist}看清眼前的东西时，{ta}几乎以为自己还没睡醒——{item}，就这样真真切切地出现在了眼前。",
        "一切是从{conflict}开始的。{protagonist}还没回过神，命运已经不动声色地，把{ta}推到了风暴的正中央。"
      ],
      // 4 加剧
      [
        "紧接着，{villain}的影子浮出水面。对方显然早有准备，步步紧逼，不给{protagonist}任何喘息的机会。",
        "可事情远没有结束。{villain}的出现，让这场突如其来的风波彻底变了味，{place}的空气里，都透着剑拔弩张的意味。",
        "还没等{ta}理清头绪，危机已经追了上来。{villain}隔着人群，与{protagonist}遥遥对望，眼神里满是势在必得的算计。"
      ],
      // 5 对话交锋
      PROSE_BANKS.dialogues,
      // 6 目标确立
      [
        "但{protagonist}没有退。既然命运把{item}送到{ta}手里，那{ta}就要抓住它，一路走到{goal}的那一天。",
        "看着眼前的一切，{protagonist}心里反而生出一股说不出的执拗。{ta}暗暗发誓，这一次，一定要{goal}，不再被任何人左右。",
        "危机当前，{protagonist}却忽然笑了。既然躲不过，那就正面迎上去——{goal}，就从此刻开始。"
      ],
      // 7 内心回响
      PROSE_BANKS.reflections,
      // 8 悬念收尾
      [
        "夜风乍起，{world}的远方有灯火次第亮起。属于{protagonist}的故事，才刚刚翻开第一页。",
        "而{ta}还不知道，更大的风暴，正从{world}的深处，缓缓向这里涌来。",
        "人群散去，{place}重归寂静。可{protagonist}知道，有些东西，已经永远地改变了。"
      ]
    ];

    const paragraphs = paras.map(group => fill(pick(rng, group), ctx));
    const title = fill("第一章 {place}初逢", ctx);
    return { title, paragraphs, open };
  }

  /* ---------- 完整章节正文 ---------- */
  function genChapterProse(ctx, rng, ch, isLast) {
    const opens = [
      `{place}的天色刚刚擦亮，{protagonist}便已起身。昨夜种种仍在心头翻涌，而「${ch.title}」四个字，注定要被写进这段旅程。`,
      `风从{world}的尽头吹来，带着几分凛冽。{protagonist}站在{place}前，缓缓吐出一口气——${ch.title}，由此开始。`,
      `消息传开的时候，{protagonist}正置身{place}。谁都清楚，${ch.title}已经避无可避。`,
      `这已是{protagonist}在{place}的第几个清晨，{ta}自己都记不清了。${ch.title}，成了眼前唯一要紧的事。`
    ];
    const bodies = [
      `${ch.summary}{protagonist}没有半分退缩，反而从这变局中窥见了一线转机。`,
      `${ch.summary}可越是如此，{protagonist}越明白，真正的考验才刚刚开始。`,
      `${ch.summary}旧日的平静已被彻底打破，{world}的天平，正悄悄向未知的一侧倾斜。`,
      `${ch.summary}{protagonist}把这几个字在心里反复念过，眼神却愈发坚定。`
    ];
    const mids = [
      `就在这时，{item}再次发出异动，{villain}的踪迹也愈发清晰。`,
      `{villain}显然不会善罢甘休。{protagonist}攥紧了手，眼底却比任何时候都清明。`,
      `身旁，{bond}的一句话让{protagonist}心头一暖。无论如何，{ta}并非孤身一人。`,
      `有人劝{protagonist}就此收手，{ta}却只是摇头。既然走到了这里，就没有回头的道理。`
    ];
    const closes = [
      `夜色将至，{place}的灯火次第亮起。{protagonist}知道，离{goal}，又近了一步。`,
      `四下寂静，只有心跳声清晰可闻。{protagonist}在心底默念：{goal}，终有一日。`,
      `这场风波远未结束，但{protagonist}已经不再害怕。下一程，正从脚下铺展开来。`,
      `{world}的深处似有回声传来，像是在应和，又像是在警告。属于{protagonist}的路，还在继续。`
    ];
    const finalCloses = [
      `尘埃落定。{protagonist}望着{world}的远空，久久没有言语。一切都结束了，又好像，一切才刚刚安静下来。`,
      `故事写到这里，{protagonist}终于可以停下脚步。{world}的风依旧在吹，只是这一次，{ta}不必再逃。`,
      `多年以后，{place}的人们仍会说起这段往事。而{protagonist}知道，无论结局如何，{ta}都不曾辜负过自己。`,
      `晨光重新落在{place}，把一切照得透亮。{protagonist}转过身，走向属于自己的、崭新的一天。`
    ];
    const closing = isLast ? finalCloses : closes;
    return [
      fill(pick(rng, opens), ctx),
      fill(pick(rng, bodies), ctx),
      fill(pick(rng, PROSE_BANKS.scenes), ctx),
      fill(pick(rng, mids), ctx),
      fill(pick(rng, PROSE_BANKS.dialogues), ctx),
      fill(pick(rng, PROSE_BANKS.reflections), ctx),
      fill(pick(rng, closing), ctx)
    ];
  }

  /* ---------- 导出纯文本 / Markdown ---------- */
  function toText(result) {
    const lines = [];
    lines.push(result.title);
    lines.push("");
    lines.push("【一句话简介】" + result.logline);
    lines.push("【故事简介】" + result.synopsis);
    lines.push("");
    lines.push("【分章大纲】");
    result.outline.forEach(o => {
      if (o.type === "act") lines.push("\n" + o.title);
      else lines.push(`${o.index}. ${o.title}——${o.summary}`);
    });
    lines.push("");
    lines.push("【完整小说】");
    result.chapters.forEach(ch => {
      lines.push("");
      lines.push(ch.title);
      ch.paragraphs.forEach(p => lines.push("\n" + p));
    });
    return lines.join("\n");
  }

  function toMarkdown(result) {
    const lines = [];
    lines.push("# " + result.title);
    lines.push("");
    lines.push("> " + result.logline);
    lines.push("");
    lines.push(result.synopsis);
    lines.push("");
    lines.push("## 分章大纲");
    result.outline.forEach(o => {
      if (o.type === "act") lines.push("\n### " + o.title);
      else lines.push(`${o.index}. **${o.title}** —— ${o.summary}`);
    });
    lines.push("");
    lines.push("## 完整小说");
    result.chapters.forEach(ch => {
      lines.push("");
      lines.push("### " + ch.title);
      ch.paragraphs.forEach(p => lines.push("\n" + p));
    });
    return lines.join("\n");
  }

  /* ---------- 主入口 ---------- */
  function buildProject(input) {
    const keywords = (input.keywords || []).slice(0, 8);
    const params = Object.assign({ length: "medium", pov: "third", tone: "auto", ending: "he" }, input.params || {});
    const seed = input.seed || (Date.now() + "-" + keywords.join(","));
    const rng = makeRng(seed);
    const ctx = deriveContext(keywords, params);

    const titles = genTitles(ctx, rng);
    const logline = genLogline(ctx, rng);
    const synopsis = genSynopsis(ctx, rng);
    const outline = genOutline(ctx, rng);
    const meta = {
      genre: ctx.genre,
      genreName: ctx.genreName,
      length: params.length,
      pov: params.pov,
      tone: ctx.tone,
      ending: params.ending,
      relation: ctx.relation
    };
    return { keywords, params, seed, ctx, titles, logline, synopsis, meta, outline };
  }

  function generateChapter(project, ch, idx, total, chapterSeed) {
    const rng = makeRng(chapterSeed);
    const ctx = project.ctx;
    const isFirst = idx === 0;
    const isLast = idx === total - 1;
    const paragraphs = window.MozhouWriter.genLongChapter(ctx, rng, ch, isFirst, isLast);
    return { index: ch.index, title: "第" + ch.index + "章 " + ch.title, paragraphs };
  }

  function assemble(project, chapters) {
    const result = {
      title: project.titles[0],
      altTitles: project.titles.slice(1),
      logline: project.logline,
      synopsis: project.synopsis,
      meta: project.meta,
      outline: project.outline,
      chapters,
      chapter: chapters[0],
      keywords: project.keywords
    };
    result.plain = toText(result);
    result.markdown = toMarkdown(result);
    return result;
  }

  function generate(input) {
    const project = buildProject(input);
    const chapterItems = project.outline.filter(o => o.type === "chapter");
    const chapters = chapterItems.map((o, idx) => generateChapter(project, o, idx, chapterItems.length, project.seed + "-ch-" + idx));
    return assemble(project, chapters);
  }

  return { generate, buildProject, generateChapter, assemble, toText, toMarkdown, makeRng, hashString };
})();

