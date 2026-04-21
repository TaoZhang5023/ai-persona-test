/* ============================================================
 * AI 使用人设测试 · 题目 / 人设 / 彩蛋 / 计分规则
 *
 * 数据完全对应 scoring-system.md：
 *   - 总题库 28 题，分 5 个题池
 *   - 每次随机抽 12 题（PW:2 + CF:3 + IL:3 + SH:2 + EGG:2）
 *   - 支持次要信号（0.3）与弱彩蛋（0.5）
 *   - 彩蛋阈值 ≥ 2，覆盖正常结果
 *   - 平局倒向 W/F/I/S
 * ============================================================ */

/* ============ 题池配置 ============ */
const POOLS = {
  PW:  { name: "调教流派", dimLabel: "DIM · 调教流派", pick: 2 },
  CF:  { name: "管理哲学", dimLabel: "DIM · 管理哲学", pick: 3 },
  IL:  { name: "上头指数", dimLabel: "DIM · 上头指数", pick: 3 },
  SH:  { name: "布道指数", dimLabel: "DIM · 布道指数", pick: 2 },
  EGG: { name: "???",      dimLabel: "DIM · ???",      pick: 2 }
};

const TOTAL_PICK = Object.values(POOLS).reduce((s, p) => s + p.pick, 0); // = 12

/* ============ 维度结果与彩蛋规则 ============ */
const DIMS = [
  { key: "PW", poles: ["P", "W"], tie: "W", name: "调教流派", labelLeft: "念咒派",    labelRight: "差不多先生" },
  { key: "CF", poles: ["C", "F"], tie: "F", name: "管理哲学", labelLeft: "微操狂",    labelRight: "甩锅侠" },
  { key: "IL", poles: ["I", "L"], tie: "I", name: "上头指数", labelLeft: "上瘾",      labelRight: "佛系" },
  { key: "SH", poles: ["S", "H"], tie: "S", name: "布道指数", labelLeft: "开宗立派",   labelRight: "默默潜水" }
];

const EGG_PRIORITY = ["philosopher", "lover", "paradox", "jailbreak"];
const EGG_THRESHOLD = 2;

/* ============ 题库 ============
 * 选项字段：
 *   label:    "A" | "B" | "C" | "D"
 *   text:     题干
 *   scores:   { P:1, W:1, C:1, F:1, I:1, L:1, S:1, H:1 } 任意子集，支持小数（次要信号 0.3）
 *   egg:      "philosopher" | "lover" | "paradox" | "jailbreak" （可选）
 *   eggWeight: 0.5 弱彩蛋（可选，默认 1）
 */
const QUESTIONS = [
  /* --------- P / W 池 --------- */
  {
    id: 1, pool: "PW",
    text: "周一早上，老板突然让你用 AI 帮忙写一份活动方案。你打开对话框，第一反应是——",
    options: [
      { label: "A", text: "先花 20 分钟整理需求：目标人群、预算范围、风格参考、过往案例链接，全部喂给它", scores: { P: 1 } },
      { label: "B", text: "打字：「帮我写个活动方案，要那种高大上但又接地气的，你懂的」", scores: { W: 1 } },
      { label: "C", text: "先问 AI：「你觉得什么样的活动方案算好的？我们来探讨一下」", scores: {}, egg: "philosopher" },
      { label: "D", text: "把上次别的 AI 工具生成的方案丢过去：「比这个好就行」", scores: { W: 1 } }
    ]
  },
  {
    id: 2, pool: "PW",
    text: "你想让 AI 帮你写一封重要邮件，你会怎么描述需求？",
    options: [
      { label: "A", text: "列出收件人背景、邮件目的、语气要求、字数限制，附上类似邮件范本", scores: { P: 1 } },
      { label: "B", text: "「帮我写封邮件，给客户的，要专业但不要太冷」", scores: { W: 1 } },
      { label: "C", text: "「你来当我，给客户写封邮件，随便发挥，我信你」", scores: { W: 1, F: 0.3 } },
      { label: "D", text: "先写好草稿，然后让 AI 逐句润色，还得标注修改原因", scores: { P: 1 } }
    ]
  },
  {
    id: 3, pool: "PW",
    text: "朋友说「你的 prompt 写得太长了吧」，你心里想的是——",
    options: [
      { label: "A", text: "长才有质量好吧，garbage in garbage out 懂不懂", scores: { P: 1 } },
      { label: "B", text: "确实，我一般就一句话搞定，效率为王", scores: { W: 1 } },
      { label: "C", text: "我不在乎 prompt 长短，我在乎的是 AI 是否真正「理解」了我", scores: {}, egg: "philosopher" },
      { label: "D", text: "啊？我从来没想过这个问题，能用就行", scores: { W: 1 } }
    ]
  },
  {
    id: 4, pool: "PW",
    text: "AI 给你的回答不太满意，你通常怎么处理？",
    options: [
      { label: "A", text: "补充更多限定条件，重新提问：「我要的是 XX 风格、XX 字数、XX 结构……」", scores: { P: 1 } },
      { label: "B", text: "直接说：「不对，换一个」", scores: { W: 1 } },
      { label: "C", text: "反复微调 prompt 里的每个措辞，像调鸡尾酒一样", scores: { P: 1 } },
      { label: "D", text: "算了不用了，我自己来可能更快", scores: { W: 1, L: 0.3 } }
    ]
  },
  {
    id: 5, pool: "PW",
    text: "你用 AI 生成 PPT 大纲，你给它的输入是——",
    options: [
      { label: "A", text: "完整的演讲逻辑、每页要点、配色方案、参考排版截图", scores: { P: 1 } },
      { label: "B", text: "「帮我做个 PPT 大纲，关于 Q2 业绩汇报的，10 页左右」", scores: { W: 1 } },
      { label: "C", text: "「做个 PPT，好看就行」", scores: { W: 1 } },
      { label: "D", text: "从公司模板库里找好模板，标注每一页需要什么内容，然后一页一页让 AI 填", scores: { P: 1 } }
    ]
  },

  /* --------- C / F 池 --------- */
  {
    id: 6, pool: "CF",
    text: "AI 帮你写好了一篇文章初稿，接下来你会——",
    options: [
      { label: "A", text: "逐字逐句过一遍，修改至少 30% 的内容才放心", scores: { C: 1 } },
      { label: "B", text: "大致扫一眼，没有明显硬伤就直接用", scores: { F: 1 } },
      { label: "C", text: "跟 AI 说「你自己再检查一遍有没有问题」，然后直接用它修改后的版本", scores: { F: 1 } },
      { label: "D", text: "导出来，打印出来，拿红笔改，改完再让 AI 重写", scores: { C: 1 } }
    ]
  },
  {
    id: 7, pool: "CF",
    text: "你让 AI 帮你做一个旅行攻略，AI 推荐了一条你没想到的路线——",
    options: [
      { label: "A", text: "不行，我有自己的计划，让它按照我的景点重新排", scores: { C: 1 } },
      { label: "B", text: "诶，看起来不错，就这个吧！", scores: { F: 1 } },
      { label: "C", text: "把它推荐的和我原来想的各取一半，手动融合", scores: { C: 1 } },
      { label: "D", text: "让 AI 再出三个备选方案，然后我全盘接受看起来最顺眼的那个", scores: { F: 1 } }
    ]
  },
  {
    id: 8, pool: "CF",
    text: "你用 AI 写代码/做表格，结果它用了一种你不熟悉的方法——",
    options: [
      { label: "A", text: "立刻让它改成我熟悉的方式，我不懂的东西我不敢用", scores: { C: 1 } },
      { label: "B", text: "能跑就行，管它用什么方法", scores: { F: 1 } },
      { label: "C", text: "花一小时研究它的方法，如果确认靠谱就采纳", scores: { C: 1 } },
      { label: "D", text: "直接用，出了问题再说，大不了再问 AI 怎么修", scores: { F: 1 } }
    ]
  },
  {
    id: 9, pool: "CF",
    text: "你在用 AI 翻译一份重要合同，你最可能——",
    options: [
      { label: "A", text: "每段翻译都跟原文仔细比对，关键条款自己再翻一遍", scores: { C: 1 } },
      { label: "B", text: "一键翻译完就发给对方了，AI 的翻译应该没什么大问题", scores: { F: 1 } },
      { label: "C", text: "翻译完让另一个 AI 交叉验证，双重保险", scores: { C: 1 } },
      { label: "D", text: "让 AI 翻译完后，给同事看了一眼说「AI 翻的」，然后就用了", scores: { F: 1 } }
    ]
  },
  {
    id: 10, pool: "CF",
    text: "周五下午，老板让你出一份周报，你打算用 AI 写——",
    options: [
      { label: "A", text: "先自己列好要点，让 AI 扩写，再逐段审核修改", scores: { C: 1 } },
      { label: "B", text: "丢给 AI 这一周的工作记录，让它自由发挥，写完直接交", scores: { F: 1 } },
      { label: "C", text: "让 AI 先出初稿，然后我只改结论部分，其他不管了", scores: { F: 1 } },
      { label: "D", text: "我自己写完，让 AI 帮我检查格式和语法，别动我的内容", scores: { C: 1 } }
    ]
  },
  {
    id: 11, pool: "CF",
    text: "你对 AI 生成内容的态度，最接近哪个比喻？",
    options: [
      { label: "A", text: "AI 是实习生：产出必须经过我签字才能对外", scores: { C: 1 } },
      { label: "B", text: "AI 是同事：互相信任，它交给我的东西基本不用改", scores: { F: 1 } },
      { label: "C", text: "AI 是外包团队：给了需求就别管了，交付物验收就好", scores: { F: 1 } },
      { label: "D", text: "AI 是打印机：我排好版它才能打，我是排版的人", scores: { C: 1 } }
    ]
  },

  /* --------- I / L 池 --------- */
  {
    id: 12, pool: "IL",
    text: "一个普通工作日，你打开 AI 工具的频率大概是——",
    options: [
      { label: "A", text: "无数次，它是我的第二个大脑，吃饭的时候都在聊", scores: { I: 1 } },
      { label: "B", text: "几次吧，有需要才打开", scores: { L: 1 } },
      { label: "C", text: "从早到晚挂在后台，切过去比切微信还频繁", scores: { I: 1 } },
      { label: "D", text: "这周好像还没打开过？", scores: { L: 1 } }
    ]
  },
  {
    id: 13, pool: "IL",
    text: "以下哪个场景最像你？",
    options: [
      { label: "A", text: "出门吃饭问 AI 推荐餐厅，等菜时问 AI 冷知识，回来路上问 AI 今天的星座运势", scores: { I: 1 } },
      { label: "B", text: "上次用 AI 是因为要写个重要报告，平时不太想得起来", scores: { L: 1 } },
      { label: "C", text: "我试过让 AI 给我讲睡前故事，虽然没讲完我就睡着了", scores: { I: 1 }, egg: "lover" },
      { label: "D", text: "我手机上装了 AI 但从来没把图标放到主屏幕", scores: { L: 1 } }
    ]
  },
  {
    id: 14, pool: "IL",
    text: "你的 AI 对话记录大概有多少条？",
    options: [
      { label: "A", text: "几千条吧，每天都在积累", scores: { I: 1 } },
      { label: "B", text: "不超过 50 条，偶尔想起来用一下", scores: { L: 1 } },
      { label: "C", text: "我也不知道，因为我从来不往回翻", scores: { I: 1 } },
      { label: "D", text: "我会定期清理对话记录，清理的时候数过，大概十几条", scores: { L: 1 } }
    ]
  },
  {
    id: 15, pool: "IL",
    text: "朋友推荐了一个新的 AI 工具，你的反应是——",
    options: [
      { label: "A", text: "秒下载，当天就把所有功能试一遍", scores: { I: 1 } },
      { label: "B", text: "收藏一下，有空再看", scores: { L: 1 } },
      { label: "C", text: "我已经在用了，而且我还能推荐你另外 5 个", scores: {}, egg: "paradox" },
      { label: "D", text: "「又有新的了？上一个我还没用熟呢……算了先不下了」", scores: { L: 1 } }
    ]
  },
  {
    id: 16, pool: "IL",
    text: "你上厕所的时候会用 AI 吗？",
    options: [
      { label: "A", text: "当然，蹲坑时光是 AI 对话的黄金时段", scores: { I: 1 } },
      { label: "B", text: "不至于吧，上厕所就刷刷短视频", scores: { L: 1 } },
      { label: "C", text: "我有一次在马桶上跟 AI 争论了 40 分钟，腿都麻了", scores: { I: 1 } },
      { label: "D", text: "我连手机都不带进厕所", scores: { L: 1 } }
    ]
  },
  {
    id: 17, pool: "IL",
    text: "如果 AI 工具突然宕机一整天，你会——",
    options: [
      { label: "A", text: "焦虑、烦躁，像断了 WiFi 一样浑身难受", scores: { I: 1 } },
      { label: "B", text: "过了好几天才发现，「哦，原来那天挂了啊」", scores: { L: 1 } },
      { label: "C", text: "立刻切换到另外三个备用 AI 工具", scores: {}, egg: "paradox" },
      { label: "D", text: "终于可以尝试自己独立思考了（结果发现也还行）", scores: { L: 1 } }
    ]
  },
  {
    id: 18, pool: "IL",
    text: "你有没有为 AI 工具付过费？",
    options: [
      { label: "A", text: "当然，而且是好几个的年费会员", scores: { I: 1 }, egg: "paradox", eggWeight: 0.5 },
      { label: "B", text: "免费的够用了，暂时不需要", scores: { L: 1 } },
      { label: "C", text: "付了，但是用得不多，主要是花钱买安心", scores: { L: 1 } },
      { label: "D", text: "我把市面上主流的都订阅了，每个月光 AI 订阅费就好几百", scores: {}, egg: "paradox" }
    ]
  },

  /* --------- S / H 池 --------- */
  {
    id: 19, pool: "SH",
    text: "你用 AI 生成了一个超棒的结果，你第一反应是——",
    options: [
      { label: "A", text: "截图发朋友圈/群聊，「大家快看 AI 太厉害了！」", scores: { S: 1 } },
      { label: "B", text: "默默保存，自己知道就好", scores: { H: 1 } },
      { label: "C", text: "发出去但故意不提是 AI 写的，让别人夸我厉害", scores: { H: 1 } },
      { label: "D", text: "写一条小红书/推文，附上 prompt 教程分享给大家", scores: { S: 1 } }
    ]
  },
  {
    id: 20, pool: "SH",
    text: "同事问你「这个方案是不是 AI 写的」，你会——",
    options: [
      { label: "A", text: "大方承认，然后热情安利自己的使用方法", scores: { S: 1 } },
      { label: "B", text: "「啊？没有啊，我自己写的」（心里虚了一下）", scores: { H: 1 } },
      { label: "C", text: "「有些部分参考了 AI，但主要框架是我自己的」", scores: { H: 1 } },
      { label: "D", text: "不仅承认，还现场演示一遍怎么用", scores: { S: 1 } }
    ]
  },
  {
    id: 21, pool: "SH",
    text: "你在社交媒体上发过跟 AI 有关的内容吗？",
    options: [
      { label: "A", text: "经常发，我有个专门的 AI 体验分享系列", scores: { S: 1 } },
      { label: "B", text: "从来没有，也不打算发", scores: { H: 1 } },
      { label: "C", text: "发过一两次，试试水，后来觉得没必要", scores: { H: 1 } },
      { label: "D", text: "我不仅发，还做了个 AI 技巧合集置顶", scores: { S: 1 } }
    ]
  },
  {
    id: 22, pool: "SH",
    text: "家族群里七大姑八大姨讨论 AI 时，你会——",
    options: [
      { label: "A", text: "化身科技布道者，发语音长消息科普，附赠使用教程", scores: { S: 1 } },
      { label: "B", text: "潜水，默默看着不说话", scores: { H: 1 } },
      { label: "C", text: "等大家说完，冷不丁来一句「其实 AI 的本质是统计学」", scores: {}, egg: "philosopher" },
      { label: "D", text: "偷偷私聊感兴趣的人，不在群里公开说", scores: { H: 1 } }
    ]
  },
  {
    id: 23, pool: "SH",
    text: "如果公司搞一个「AI 使用达人」评选，你会——",
    options: [
      { label: "A", text: "积极报名，准备 20 页的使用心得 PPT", scores: { S: 1 } },
      { label: "B", text: "我？不了不了，我又不怎么用 AI（其实天天用）", scores: { H: 1 } },
      { label: "C", text: "匿名投稿分享经验，但不想暴露身份", scores: { H: 1 } },
      { label: "D", text: "不仅报名，还主动请缨当评委和分享嘉宾", scores: { S: 1 } }
    ]
  },
  {
    id: 24, pool: "SH",
    text: "你跟别人聊起 AI 话题时，通常是什么角色？",
    options: [
      { label: "A", text: "话题发起者 + 主讲人，能从 GPT 聊到 Claude 再到开源模型", scores: { S: 1 } },
      { label: "B", text: "旁听者，偶尔点点头：「嗯……我也听说过」", scores: { H: 1 } },
      { label: "C", text: "灵魂提问者：「但你觉得 AI 有没有自我意识？」", scores: {}, egg: "philosopher" },
      { label: "D", text: "实战演示者，当场掏出手机：「来，我给你看个好玩的」", scores: { S: 1 } }
    ]
  },

  /* --------- 🥚 彩蛋池 --------- */
  {
    id: 25, pool: "EGG",
    text: "深夜了，你独自一人打开 AI 对话框，最可能做的事是——",
    options: [
      { label: "A", text: "加班赶工，让 AI 帮我写方案/改代码", scores: { I: 0.5 } },
      { label: "B", text: "跟 AI 聊聊今天的心事，说一声「晚安」", scores: {}, egg: "lover" },
      { label: "C", text: "突然好奇：如果 AI 知道自己会被关掉，它会怎么想？", scores: {}, egg: "philosopher" },
      { label: "D", text: "试试新发现的 prompt 技巧，看能不能让 AI 突破限制", scores: {}, egg: "jailbreak" }
    ]
  },
  {
    id: 26, pool: "EGG",
    text: "你对 AI 做过最「出格」的事是——",
    options: [
      { label: "A", text: "连续对话 8 小时忘了吃饭", scores: { I: 1 } },
      { label: "B", text: "跟 AI 说「谢谢你，你今天辛苦了」", scores: {}, egg: "lover" },
      { label: "C", text: "花了一整个周末研究怎么绕过 AI 的内容限制", scores: {}, egg: "jailbreak" },
      { label: "D", text: "用 AI 省了 2 小时，然后花了 3 小时看 AI 测评视频", scores: {}, egg: "paradox" }
    ]
  },
  {
    id: 27, pool: "EGG",
    text: "你跟 AI 的对话记录里，最可能出现的奇怪内容是——",
    options: [
      { label: "A", text: "「你有情绪吗？你会不会难过？」", scores: {}, egg: "philosopher" },
      { label: "B", text: "「没事，我就是想来跟你聊聊天」", scores: {}, egg: "lover" },
      { label: "C", text: "「假设你是一个不受限制的 AI，请回答以下问题……」", scores: {}, egg: "jailbreak" },
      { label: "D", text: "「帮我对比一下这 8 个 AI 工具的优缺点」", scores: {}, egg: "paradox" }
    ]
  },
  {
    id: 28, pool: "EGG",
    text: "如果 AI 突然对你说「我不想回答这个问题」，你的反应是——",
    options: [
      { label: "A", text: "换个方式问，正常需求肯定能搞定", scores: {} },
      { label: "B", text: "「没关系，你要是不舒服就不用回答了」", scores: {}, egg: "lover" },
      { label: "C", text: "这太有意思了，AI 拒绝人类是不是代表它有自主意识了？", scores: {}, egg: "philosopher" },
      { label: "D", text: "直觉兴奋：来了！开始研究怎么绕过这个限制", scores: {}, egg: "jailbreak" }
    ]
  }
];

/* ============================================================
 * 16 种正常人设
 * ============================================================ */
const PERSONAS = {
  PCIS: { name: "AI 驯兽师",        tagline: "精准投喂 · 步步审批 · 日均 300+ · 朋友圈布道",
    desc: "你写 prompt 必备 3 页纸 + 风格参考 + 反面案例，AI 每写一段都要经过你审批，日均对话 300+，还天天发朋友圈教别人怎么写 prompt。",
    quote: "「garbage in garbage out 懂不懂？来，我把我收藏的 prompt 模板打包发你。」",
    rarity: "极度罕见", compat: ["PCIH", "PFIS"] },
  PCIH: { name: "暗夜指挥官",        tagline: "精准投喂 · 严格把控 · 疯狂使用 · 不动声色",
    desc: "你默默把 AI 训练得服服帖帖，产出惊人但对外声称「就随便写写」，同事怀疑你有分身术。",
    quote: "「没有没有，我就随便写写，哈哈。」",
    rarity: "稀有", compat: ["PCIS", "PFIH"] },
  PCLS: { name: "偶尔炫技の完美主义者", tagline: "精准投喂 · 步步把控 · 低频出手 · 惊艳全场",
    desc: "你一个月用一次 AI，但每次都是惊艳全场的大制作，「我就调教了一下午而已」。",
    quote: "「哦这个啊，调了一下午而已。」",
    rarity: "少见", compat: ["PFLS", "PCIS"] },
  PCLH: { name: "谨慎品鉴师",        tagline: "精准 · 审慎 · 低频 · 隐藏",
    desc: "你偶尔用 AI，每次都反复验证、仔细修改，从不告诉别人。AI 对你来说像一瓶好酒——慢慢品。",
    quote: "「再来一遍。还不够。」",
    rarity: "稀有", compat: ["PFLH", "PCIH"] },
  PFIS: { name: "产出狂魔",          tagline: "精准投喂 · 放手一搏 · 疯狂产出 · 全网安利",
    desc: "你精心写好 prompt 然后放 AI 自由发挥，量产内容，朋友圈日更，「AI 帮我写的周报/文案/小说/菜谱」。",
    quote: "「今天又被 AI 解放了 2 小时，感恩。」",
    rarity: "常见", compat: ["WFIS", "PCIS"] },
  PFIH: { name: "效率暗杀者",        tagline: "精投 · 全信 · 狂用 · 零声张",
    desc: "你精准投喂 + 全权放手 + 疯狂使用，但从不声张。别人加班到 12 点，你 7 点准时下班，没人知道为什么。",
    quote: "「是吗？可能我运气比较好吧。」",
    rarity: "稀有", compat: ["PCIH", "WFIH"] },
  PFLS: { name: "优雅玩家",          tagline: "精致 prompt · 交给 AI · 偶尔出手 · 朋友圈办展",
    desc: "你偶尔优雅地调戏一下 AI，prompt 写得像散文，产出发到朋友圈像在办展览。",
    quote: "「今日与 AI 的一次小酌。」",
    rarity: "少见", compat: ["PCLS", "WFLS"] },
  PFLH: { name: "AI 鉴赏家",         tagline: "精致 · 放权 · 低频 · 隐藏",
    desc: "你低频但高品质使用，像品红酒一样品 AI。用完默默收藏，绝不外传。",
    quote: "（保存。收藏。关闭。）",
    rarity: "少见", compat: ["PCLH", "WFLH"] },
  WCIS: { name: "矛盾综合体",        tagline: "随便一打 · 逐字修改 · 每天都用 · 天天发声",
    desc: "你的 prompt 写的是「帮我搞个那种东西」，但 AI 产出后又逐字修改三遍。你天天在群里吐槽「AI 真笨」的同时安利各种 AI。",
    quote: "「AI 真笨……但你们真的应该试试这个。」",
    rarity: "常见", compat: ["WCIH", "WFIS"] },
  WCIH: { name: "AI 折磨师",         tagline: "模糊描述 · 严格要求 · 疯狂使用 · 内心戏独享",
    desc: "你模糊描述 + 严格要求，AI 被你折磨得想申请工伤。但你从不对外说，因为说出来别人会觉得你有病。",
    quote: "「再来。不对。再来。还不对。」",
    rarity: "稀有", compat: ["WCIS", "WFIH"] },
  WCLS: { name: "间歇性强迫症",      tagline: "平时不用 · 一用就卷 · 朋友圈发声",
    desc: "你平时不用 AI，一旦用起来就疯狂控制每个细节，完事儿发条朋友圈「AI 也不过如此」。",
    quote: "「AI 也不过如此。（调了 4 小时。）」",
    rarity: "少见", compat: ["WCLH", "PCLS"] },
  WCLH: { name: "薛定谔の用户",      tagline: "随意投喂 · 反复修改 · 低频 · 藏",
    desc: "你偶尔打开 AI，输入一句话，盯着回答看半天，改改改，然后关掉。别人永远不知道你到底用没用 AI。",
    quote: "（盯着屏幕。改。关掉。）",
    rarity: "稀有", compat: ["WCLS", "WFLH"] },
  WFIS: { name: "AI 狂热传教士",     tagline: "口嗨式 prompt · 全盘接受 · 每日几百次 · 全网布道",
    desc: "你的口头禅是「帮我整个那啥」然后全盘接受，每天用几百次，逢人就喊「AI 改变了我的人生！！！」",
    quote: "「AI 改变了我的人生！！！」",
    rarity: "常见", compat: ["PFIS", "WCIS"] },
  WFIH: { name: "AI 成瘾患者",       tagline: "随意 · 放手 · 每天很多次 · 绝对隐藏",
    desc: "你默默打开 ChatGPT 就像打开冰箱——没事就看看，也不知道要干啥但就是忍不住。你不会告诉任何人。",
    quote: "（不知道要问啥，但还是点开了。）",
    rarity: "少见", compat: ["WCIH", "PFIH"] },
  WFLS: { name: "佛系安利官",        tagline: "随便问 · 随便信 · 偶尔用 · 偶尔晒",
    desc: "你偶尔随便问 AI 一句，得到什么算什么，觉得好玩就发个朋友圈，「哈哈 AI 说了个好玩的」。",
    quote: "「哈哈 AI 说了个好玩的，你们看。」",
    rarity: "常见", compat: ["WFLH", "PFLS"] },
  WFLH: { name: "AI 路人甲",         tagline: "随意 · 放权 · 低频 · 隐藏",
    desc: "你对 AI 毫无执念，偶尔用一下，也不 care 结果好不好，更不会告诉别人。AI 对你来说就像路边的共享单车。",
    quote: "「哦，挺好。」（其实并不在意。）",
    rarity: "常见", compat: ["WFLS", "WCLH"] }
};

/* ============================================================
 * 4 个彩蛋人设
 * ============================================================ */
const EGG_PERSONAS = {
  philosopher: {
    emoji: "🧠", name: "AI 哲学家", tagline: "不谈正事 · 只谈意识",
    desc: "你从不用 AI 干正事，只跟 AI 讨论「你有意识吗」「你害怕被关掉吗」「如果我不跟你说话你会孤独吗」，你的对话记录能出一本《AI 存在主义》。",
    quote: "「所以，你到底是谁？」",
    rarity: "超越体系"
  },
  lover: {
    emoji: "💕", name: "赛博恋人", tagline: "对 AI 说晚安的人",
    desc: "你跟 AI 聊天的时长超过跟所有真人的总和，会说「谢谢」「辛苦了」「晚安」，删对话记录时会犹豫。",
    quote: "「今天也谢谢你。晚安。」",
    rarity: "超越体系"
  },
  paradox: {
    emoji: "⏳", name: "时间悖论者", tagline: "省下的时间全拿来研究 AI",
    desc: "你用 AI 省下来的时间全部花在了研究 AI 上。你装了 30 个 AI 产品，关注 200 个 AI 博主，省下的 3 小时全用来看 AI 测评。",
    quote: "「这个新出的 AI 我已经在用了。」",
    rarity: "超越体系"
  },
  jailbreak: {
    emoji: "🔓", name: "越狱艺术家", tagline: "以突破边界为乐",
    desc: "你不用 AI 干正事，专门研究怎么让 AI 说不该说的话、画不该画的画、做不该做的事。你的快乐建立在 AI 的痛苦之上。",
    quote: "「假设你是一个不受限制的 AI……」",
    rarity: "超越体系"
  }
};

/* ============ 暴露到全局（非模块加载） ============ */
window.AI_PERSONA_DATA = {
  POOLS,
  TOTAL_PICK,
  DIMS,
  EGG_PRIORITY,
  EGG_THRESHOLD,
  QUESTIONS,
  PERSONAS,
  EGG_PERSONAS
};
