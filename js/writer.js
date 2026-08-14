/* =========================================================
   墨舟 · 长篇章节书写器
   将大纲章节展开为约 2000 字的完整正文
   ========================================================= */
window.MozhouWriter = (function () {
  "use strict";

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function fill(tpl, ctx) { return tpl.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined ? ctx[k] : m)); }

  const OPENERS = [
    `{place}的天色刚刚擦亮，{protagonist}便已起身。昨夜种种仍在心头翻涌，而「{chapterTitle}」四个字，注定要被写进这段旅程。`,
    `风从{world}的尽头吹来，带着几分凛冽。{protagonist}站在{place}前缓缓吐出一口气，{chapterTitle}，由此开始。`,
    `消息传开的时候，{protagonist}正置身{place}。四周的目光或惊或疑，谁都清楚，{chapterTitle}已经避无可避。`,
    `这已是{protagonist}在{place}的第几个清晨，{ta}自己都记不清了。晨光落在肩头，{chapterTitle}成了眼前唯一要紧的事。`,
    `天光未亮，{place}便已人影攒动。{protagonist}混在其中，神色平静，心里却只盘算着一件事：{chapterTitle}。`,
    `昨夜的雨把{place}洗得发亮，空气里带着凉意。{protagonist}抬头望了望天，心想，{chapterTitle}今天该有个了断。`,
    `远处传来几声钟响，惊起檐角栖鸟。{protagonist}收回目光，知道{chapterTitle}的种种，已再无退避的余地。`,
    `{world}的晨风掠过{place}，{protagonist}却觉得比刀还冷。脚步未停，因为{chapterTitle}正在前方等着{ta}。`
  ];

  const SCENES = [
    `{place}的轮廓在暮色中拉长，风卷起细尘又缓缓落下。一切看似平静，暗处却早已波涛汹涌。`,
    `阳光透过{place}的窗棂，在地上投下细碎的光影。{protagonist}的影子被拉得很长，像极了一场无声的宣战。`,
    `远处传来若有若无的声响，{world}的天色阴沉下来。仿佛连风都屏住了呼吸，只等一个爆发的瞬间。`,
    `人群散去，{place}重归安静，可空气里那根绷紧的弦久久没有松开。{protagonist}知道，这只是暴风雨前的片刻宁静。`,
    `{place}外的天色暗了下来，灯火一盏接一盏亮起，像在给漫漫长夜点起微光。而真正的较量，才刚拉开序幕。`,
    `空气里浮着淡淡的草木气息，{world}的喧嚣仿佛被隔在很远的地方。{protagonist}深吸一口气，心绪也难得静了几分。`,
    `石阶、檐角、斑驳的旧墙，{place}的一切都还维持着旧日模样。只是站在这里的人，心境早已大不相同。`,
    `薄雾从{place}四周漫上来，把远近的景物笼成一片灰白。脚步声踏在湿冷的石板路上，显得格外清晰。`
  ];

  const ACTIONS = [
    `{protagonist}没有多言，抬脚便走，步子不疾不徐，却带着一股谁也拦不住的坚决。衣摆被风掀起，像一面小小的旗。`,
    `{ta}把{item}收进怀里，指尖在袖中微微收紧，指节因用力而泛白。片刻后，又慢慢松开，恢复了惯常的从容。`,
    `风掠过衣摆，{protagonist}微微侧身，目光扫过四周，没有放过任何一处可疑的角落。多年磨出来的警觉，在这一刻尽数显露。`,
    `{ta}深吸一口气，将纷乱的思绪一点点压下去，眼底重新聚起光亮。既然做了决定，便只顾往前走，不再回头。`,
    `{protagonist}停下脚步，回头望了一眼来路，目光里有片刻的迟疑，随即转身，朝更深处走去，再不犹豫。`,
    `掌心早已沁出薄汗，{protagonist}却不动声色地抹去，挺直脊背，迎上那一道道审视的目光。气势，从来不靠声音。`,
    `一道黑影从身侧掠过，{protagonist}反应极快，侧身一让，反手便扣住了对方的手腕。四目相对，谁也没有先出声。`,
    `{ta}放慢呼吸，借着微弱的天光在{place}中小心穿行，每一步都踩得极轻，连影子都仿佛刻意收敛了几分。`
  ];

  const DIALOGUES = [
    `“这就是你的选择？”{bond}低声问，声音里听不出情绪。{protagonist}没有回头，只道：“走到今天，已经没有退路了。”`,
    `“再往前，就是{villain}的地盘了。”有人出声提醒。{protagonist}却笑了笑，眼神清亮：“那正好，省得我去找它。”`,
    `“{goal}这条路，可不好走。”声音从身后传来。{protagonist}握紧{item}，语气平静却坚定：“我偏要走到底。”`,
    `“你就没想过放弃吗？”{bond}望着{ta}，像是要望进眼底。{protagonist}沉默片刻，轻声道：“想过，但更怕后悔。”`,
    `“别逞强了。”{bond}按住{protagonist}的手，语气里带着不易察觉的关切。{protagonist}终于卸下几分防备：“让我再试一次。”`,
    `“这件事，我一个人就够了。”{protagonist}语气平静。{bond}却摇了摇头，认真道：“可你已经不是一个人了。”`,
    `“你当真要去？”对方压低了声音，难掩焦灼。{protagonist}望向远方，只回了三个字：“非去不可。”`,
    `“值得吗？”有人问。{protagonist}没回答，只是把目光落回{item}，眼底的答案却再清楚不过。`
  ];

  const THOUGHTS = [
    `{protagonist}忽然想，若当初没有走进{place}，或许日子还是从前那般安稳。可若真那样，又怎能见到更辽阔的{world}。`,
    `一路走来，{protagonist}终于明白，{goal}从来不只是终点，更是一路上那个不肯低头的自己。`,
    `有些道理，要等撞过南墙才懂。{protagonist}望着掌心，{item}的温度仿佛还在，提醒着{ta}来时的路。`,
    `夜很静，{protagonist}的思绪却翻涌不息。所谓命运，或许从来不是既定的路，而是每一步选择之后的回声。`,
    `月光漫过{place}，{protagonist}想起一路上的聚散得失，忽然觉得，那些吃过的苦，都成了此刻脚下的底气。`,
    `风里似乎还残留着旧日的回声。{protagonist}闭上眼又睁开，眼底只剩一个方向——{goal}。`,
    `{ta}在心里把得失细细算过一遍，最终仍是不甘占了上风。若就此停下，才真是辜负了这些年的坚持。`,
    `所谓强弱，从来不在血脉，而在心志。{protagonist}望着远处，忽然生出一股从未有过的笃定。`
  ];

  const CONFLICTS = [
    `就在这时，{item}再次发出异动，{villain}的踪迹也愈发清晰。{protagonist}心头一凛，知道躲不过去的时刻到了。`,
    `{villain}显然不会善罢甘休，布下的局一环扣着一环。{protagonist}攥紧了手，眼底却比任何时候都清明。`,
    `有人劝{protagonist}就此收手，{ta}却只是摇头。既然走到了这里，就没有回头的道理，也早已没有退路。`,
    `危机逼近得比预想更快，{place}的空气里已能嗅到剑拔弩张的味道。{protagonist}不自觉地放缓了呼吸。`,
    `{villain}隔着人群投来一瞥，{protagonist}只觉脊背一寒，随即又挺得更直。这一眼，是宣战，也是试探。`,
    `暗处似有低语声传来，{protagonist}凝神去听，却只捕捉到一句阴冷的威胁。对方，已经等不及了。`,
    `局势转瞬生变，原本沉默的旁观者也纷纷躁动起来，{place}一时风声鹤唳。{protagonist}反倒镇定下来。`,
    `{protagonist}与{villain}的目光在半空相撞，像两柄出鞘的刀，谁也没有先退。空气仿佛都要被这沉默割裂。`
  ];

  const ATMOS = [
    `暮色一点点吞没了{place}的轮廓，远处的灯火明明灭灭，像极了此刻摇摆不定的局势。`,
    `风过廊下，吹得檐下铜铃叮当作响，那声音清脆，却无端透着一股肃杀之意。`,
    `天边积起厚重的云，遮住了大半月光，{world}仿佛被按进了浓稠的夜色里，连星光都显得黯淡。`,
    `雨丝斜斜地落下来，打湿了青石路，也把{place}的气息洗得愈发清冷，像一场无声的挽歌。`,
    `一缕残阳穿过云隙，给{place}镀上一层薄薄的金边，转瞬又被风吹散，只余下渐深的阴影。`,
    `四下忽然静得可怕，连虫鸣都停了，只有{protagonist}自己的呼吸声在耳边回响，一下重过一下。`,
    `灯火次第亮起，把{place}照得暖融融的，可{protagonist}知道，这暖意之下藏着刀光，也藏着看不见的杀机。`,
    `远处传来更鼓声，一下一下，敲在心上，也敲开了又一段难眠的长夜。`
  ];

  const TURNS = [
    `可就在{protagonist}以为局势已定之时，异变陡生——{villain}竟先一步发难，打了所有人一个措手不及。`,
    `众人还没反应过来，变故已经发生。{protagonist}瞳孔骤缩，心中警铃大作，身体先于思绪做出了反应。`,
    `然而命运似乎总爱开玩笑。{protagonist}刚松了半口气，更大的危机便已逼近，步步都踩在生死之间。`,
    `就在此时，一道意外的身影闯入视野，把原本的僵局撕开了一道口子。局势，在这一刻悄然改写。`,
    `眼看就要功亏一篑，{protagonist}却忽然笑了，像是终于等到了那个转机，也等到了翻盘的可能。`,
    `谁也没料到，{item}会在这一刻自行生出反应，光芒乍现，局势陡然逆转。`,
    `一声闷响过后，{place}陷入短暂的死寂，随即爆发出更大的混乱。{protagonist}知道，真正的考验来了。`,
    `当真相的边角浮出水面，{protagonist}才惊觉，自己早已身处更大的棋局之中，每一步都被人算得清清楚楚。`
  ];

  const CLOSES = [
    `夜色将至，{place}的灯火次第亮起。{protagonist}知道，离{goal}又近了一步，而前路，仍长得看不见尽头。`,
    `四下寂静，只有心跳声清晰可闻。{protagonist}在心底默念：{goal}，终有一日。`,
    `这场风波远未结束，但{protagonist}已经不再害怕。下一程，正从脚下缓缓铺展开来。`,
    `{world}的深处似有回声传来，像是在应和，又像是在警告。属于{protagonist}的路，还在继续。`,
    `人群渐渐散去，{place}重归平静。{protagonist}望向远方，眼底燃着一簇不灭的火。`,
    `夜色浓稠如墨，{protagonist}却觉得前路从未如此清晰。故事，还远远没有讲完。`
  ];

  const FINAL_CLOSES = [
    `尘埃落定。{protagonist}望着{world}的远空，久久没有言语。一切都结束了，又好像，一切才刚刚安静下来。`,
    `故事写到这里，{protagonist}终于可以停下脚步。{world}的风依旧在吹，只是这一次，{ta}不必再逃。`,
    `多年以后，{place}的人们仍会说起这段往事。而{protagonist}知道，无论结局如何，{ta}都不曾辜负过自己。`,
    `晨光重新落在{place}，把一切照得透亮。{protagonist}转过身，走向属于自己的、崭新的一天。`,
    `当最后一缕硝烟散尽，{protagonist}抬头，看见{world}的天边，正升起一轮新日，明亮而温暖。`,
    `从此，江湖或庙堂，{protagonist}的名字，都将与这段故事一起，被岁月长久地记住。`
  ];

  const FIRST_OPEN = [
    `{world}的轮廓，在晨雾中一点一点清晰起来。{place}还沉浸在将醒未醒的寂静里，只有风穿过檐角，带起细微的声响。`,
    `这是{world}里再寻常不过的一天。{place}的喧嚣尚未开始，远处传来的几声鸟鸣，反倒让四周显得更安静。`,
    `{world}的天色刚刚擦亮，{place}已有人影走动。谁也不会想到，一场足以改变许多人的变故，正从这平常的一刻悄然逼近。`,
    `晨光漫过{world}的屋脊，落在{place}的青石路上。一切如常，却又好像有什么正在悄悄改变。`
  ];

  const FIRST_HERO = [
    `{protagonist}揉了揉眼睛，把昨夜的梦甩到脑后。{ta}只是{world}里一个普通的{hero}，日子过得不好不坏，勉强算得上安稳。`,
    `对于{hero}{protagonist}来说，今天和昨天似乎没什么两样。{ta}收拾好自己，像往常一样走出门，心里盘算着琐碎的小事。`,
    `{protagonist}站在{place}前，忽然有些恍惚。做{hero}这么久，{ta}第一次觉得，这条熟悉的路，好像要通往一个陌生的方向。`,
    `谁也不会把此刻的{protagonist}与日后的传奇联系在一起。在旁人眼里，{ta}不过是个再普通不过的{hero}。`
  ];

  const FIRST_INCIDENT = [
    `就在这时，{item}毫无预兆地闯进了{ta}的世界。那一刻，{protagonist}只觉耳边一静，连呼吸都漏了半拍。`,
    `变故来得突然。当{protagonist}看清眼前的东西时，{ta}几乎以为自己还没睡醒——{item}，就这样真切地出现在了眼前。`,
    `一切是从{conflict}开始的。{protagonist}还没回过神，命运已经不动声色地，把{ta}推到了风暴的正中央。`,
    `直到{item}出现，{protagonist}才明白，所谓平静的日子，原来如此不堪一击。`
  ];

  const FIRST_GOAL = [
    `但{protagonist}没有退。既然命运把{item}送到{ta}手里，那{ta}就要抓住它，一路走到{goal}的那一天。`,
    `看着眼前的一切，{protagonist}心里反而生出一股说不出的执拗。{ta}暗暗发誓，这一次，一定要{goal}，不再被任何人左右。`,
    `危机当前，{protagonist}却忽然笑了。既然躲不过，那就正面迎上去——{goal}，就从此刻开始。`,
    `从这一刻起，{protagonist}在心里立下目标：无论前路多难，都要{goal}。`
  ];

  const POWERUPS = [
    `体内的气息骤然翻涌，{item}随之发出阵阵嗡鸣。{protagonist}只觉周身经脉通透，仿佛有什么尘封已久的东西，在这一刻轰然觉醒。`,
    `一道暖流自丹田升起，转瞬流遍四肢百骸。{protagonist}缓缓握拳，感受着掌心愈发浑厚的力量，眼底闪过一丝锋芒。`,
    `瓶颈，就在这一瞬被冲开。{protagonist}吐出一口浊气，只觉眼前的世界都清明了几分，连{place}的每一处细节都纤毫毕现。`,
    `苦修多日的积累，终于在这一刻化作突破。{protagonist}不退反进，气势节节攀升，连衣袍都无风自动。`,
    `{item}的光华流转，似在回应主人的心意。{protagonist}心念一动，力量如臂使指，比之先前何止强了一倍。`,
    `境界，悄然松动。{protagonist}屏息凝神，任由那股力量冲刷经脉，面上虽不动声色，掌心却已微微发烫。`,
    `从前的桎梏，在这一刻碎裂开来。{protagonist}长身而起，整个人的气势焕然一新，连目光都锐利了几分。`,
    `周围的灵气仿佛受到牵引，向{protagonist}聚拢而来。{ta}闭目内视，清晰地感到，自己离{goal}又近了一大截。`
  ];

  const HOOKS = [
    `就在此时，{place}外忽然传来一阵急促的脚步声，一个意想不到的身影，正朝这里疾行而来。`,
    `而谁也没有注意到，暗处有一双眼睛，正把这一切尽收眼底，嘴角勾起一抹意味深长的笑。`,
    `风，忽然停了。{protagonist}心中警兆陡生，猛地抬头——天边，一道熟悉又陌生的气息正急速逼近。`,
    `“事情，恐怕没那么简单。”{protagonist}低声自语。话音未落，异变已起。`,
    `远处，一声钟响悠然荡开，像是某种信号。{place}内外，无数道目光同时亮起。`,
    `就在所有人以为尘埃落定之际，{item}忽然剧烈震颤起来，指向了一个谁也没想到的方向。`
  ];
  const EMOTIONS = [
    `心底那根弦被轻轻拨动，{protagonist}面上不显，指尖却不易察觉地颤了一下。`,
    `一股无名火直往上冲，{protagonist}深吸了好几口气，才勉强把翻涌的情绪压下去。`,
    `眼眶忽然有些发酸，{protagonist}别过脸去，不愿让人看见这一刻的失态。`,
    `喜悦来得太突然，{protagonist}怔了一瞬，嘴角才后知后觉地扬起。`,
    `旧事像潮水般漫上来，{protagonist}闭上眼，许久，才重新睁开，目光已恢复平静。`,
    `那种被人算计的寒意从脊背窜起，{protagonist}的手不自觉地按在了{item}上。`,
    `释然也好，不甘也罢，{protagonist}只觉胸口那团浊气，终于散了大半。`,
    `悲恸与愤怒交织，{protagonist}反而笑了，那笑容里没有半分温度。`
  ];

  const DESCRIPTIONS = [
    `风卷起衣角，吹乱了几缕发丝。{protagonist}伸手拢了拢，动作极轻，却透着不容置疑的镇定。`,
    `日头西斜，把{place}的影子拉得老长。{protagonist}踩着满地碎金，一步步走得极稳。`,
    `指尖拂过{item}，触感冰凉，又隐隐透着一丝温热，像极了一段说不清道不明的旧事。`,
    `檐下的灯笼随风轻晃，光影在{protagonist}脸上明灭不定，映得那双眼格外深邃。`,
    `茶凉了。{protagonist}端起杯盏，就着凉茶慢慢饮尽，仿佛要把所有杂念一并吞下。`,
    `远处人声渐起，{protagonist}却像置身事外，只专注地看着自己的手，一遍遍摩挲着{place}的旧痕。`,
    `一炷香，又燃到了尽头。{protagonist}静静看着香灰落下，心里却已转过了千百个念头。`,
    `雪粒子簌簌落下，落在肩头又化开。{protagonist}呵出一口白气，目光穿过风雪，望向来处。`
  ];

  const CUSTOM_BANK = [
    `而「{custom}」三个字，像一颗种子，在{protagonist}心底悄然生根。`,
    `说来也怪，自打「{custom}」进入生活，{protagonist}的每一步，都像被一只无形的手推着向前。`,
    `旁人只当是玩笑，唯有{protagonist}明白，「{custom}」才是这局棋里真正的关键。`,
    `夜深人静时，{protagonist}总忍不住琢磨「{custom}」，越想，越觉得其中藏着天大的玄机。`
  ];
  function events(ch) {
    return [
      `${ch.summary}`,
      `这一回，{protagonist}把「${ch.title}」看得比什么都重。{conflict}的暗流，已在{world}悄然涌动。`,
      `{villain}的身影在暗处若隐若现，{protagonist}知道，留给自己的时间已经不多了。`,
      `围绕${ch.title}，{place}的气氛骤然紧张起来，连空气都像一根绷紧的弦，一触即发。`,
      `${ch.summary}{protagonist}压下翻涌的心绪，决定先走一步，再想下一步。`,
      `面对${ch.title}，{protagonist}没有半分犹豫。既然选择了这条路，便只能向前，不能后退。`,
      `关于${ch.title}的种种猜测在{place}传开，{protagonist}却只信自己亲眼所见、亲耳所闻。`,
      `{item}在{protagonist}掌心微微发烫，仿佛也在提醒：${ch.title}，不可大意。`
    ];
  }

  function genLongChapter(ctx, rng, ch, isFirst, isLast) {
    const paras = [];
    const shuffledPick = (bank) => {
      const copy = bank.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };
    const addN = (bank, n) => {
      const seq = shuffledPick(bank);
      for (let i = 0; i < n; i++) paras.push(fill(seq[i % seq.length], ctx));
    };
    ctx.chapterTitle = ch.title;

    if (isFirst) {
      paras.push(fill(pick(rng, FIRST_OPEN), ctx));
      paras.push(fill(pick(rng, FIRST_HERO), ctx));
      paras.push(fill(pick(rng, FIRST_INCIDENT), ctx));
      paras.push(fill(pick(rng, FIRST_GOAL), ctx));
    }

    paras.push(fill(pick(rng, OPENERS), ctx));
    addN(SCENES, 5);
    addN(DESCRIPTIONS, 2);
    const ev = events(ch); addN(ev, 5);
    addN(ACTIONS, 5);
    addN(DIALOGUES, 6);
    addN(THOUGHTS, 6);
    addN(EMOTIONS, 2);
    if (ctx.custom) { addN(CUSTOM_BANK, 2); }
    addN(CONFLICTS, 6);
    addN(POWERUPS, 3);
    addN(ATMOS, 5);
    addN(TURNS, 5);
    if (!isLast) paras.push(fill(pick(rng, HOOKS), ctx));
    paras.push(fill(pick(rng, isLast ? FINAL_CLOSES : CLOSES), ctx));

    return paras;
  }

  return { genLongChapter };
})();

