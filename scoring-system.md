# AI 使用人设测试 —— 评分系统设计

> 纯前端实现，无后端依赖。逻辑简洁，支持随机抽题、四维度计分、彩蛋触发。

---

## 一、系统概述

| 项目 | 说明 |
|------|------|
| 总题库 | 28 题 |
| 每次抽题 | 12 题（从 5 个题池按配额随机抽取） |
| 维度 | 4 个维度，每维度双极：P/W、C/F、I/L、S/H |
| 正常人格 | 16 种（四维度排列组合） |
| 彩蛋人格 | 4 种（🧠哲学家、💕恋人、⏳悖论者、🔓越狱） |
| 彩蛋触发 | 同一彩蛋 ≥ 2 次即触发，覆盖正常结果 |

设计原则：
1. **每次体验不同** —— 随机抽题 + 随机排序，题目组合有上千种可能
2. **结果可信** —— 每个维度至少 2 题保底，维度分数不会只靠 1 题决定
3. **彩蛋有惊喜但不泛滥** —— 约 15-20% 的随机用户可能触发，强烈倾向者约 70-80%
4. **逻辑简单** —— 全部是加法计数 + 比大小，无复杂算法

---

## 二、题目数据模型

### 2.1 题池分组

| 题池 | 题号 | 题数 | 每次抽取 |
|------|------|------|----------|
| P/W（调教流派） | Q1 – Q5 | 5 | **2** |
| C/F（管理哲学） | Q6 – Q11 | 6 | **3** |
| I/L（上头指数） | Q12 – Q18 | 7 | **3** |
| S/H（布道指数） | Q19 – Q24 | 6 | **2** |
| 🥚 彩蛋探测 | Q25 – Q28 | 4 | **2** |
| **合计** | | **28** | **12** |

> 为什么 C/F 和 I/L 各抽 3 题？这两个维度的题池更大，且 I/L 池中散布了较多彩蛋选项，多抽 1 题能提高维度判定可靠性，同时增加彩蛋触发机会。

### 2.2 每道题的选项计分标签

下面表格定义了每个选项的**维度得分**和**彩蛋标记**。这就是前端需要存储的核心数据。

**约定：**
- `P:1` 表示该选项给 P 维度 +1 分
- `F:0.3` 表示附带的弱关联维度（次要信号）
- `🧠` `💕` `⏳` `🔓` 表示该选项触发对应彩蛋计数 +1
- `⏳(弱)` 表示弱彩蛋信号，计 +0.5 而非 +1
- `—` 表示该选项不贡献任何维度分数（纯彩蛋选项）

#### P/W 池（Q1–Q5）

| Q# | 选项 A | 选项 B | 选项 C | 选项 D |
|----|--------|--------|--------|--------|
| Q1 | P:1 | W:1 | 🧠 | W:1 |
| Q2 | P:1 | W:1 | W:1 + F:0.3 | P:1 |
| Q3 | P:1 | W:1 | 🧠 | W:1 |
| Q4 | P:1 | W:1 | P:1 | W:1 + L:0.3 |
| Q5 | P:1 | W:1 | W:1 | P:1 |

#### C/F 池（Q6–Q11）

| Q# | 选项 A | 选项 B | 选项 C | 选项 D |
|----|--------|--------|--------|--------|
| Q6 | C:1 | F:1 | F:1 | C:1 |
| Q7 | C:1 | F:1 | C:1 | F:1 |
| Q8 | C:1 | F:1 | C:1 | F:1 |
| Q9 | C:1 | F:1 | C:1 | F:1 |
| Q10 | C:1 | F:1 | F:1 | C:1 |
| Q11 | C:1 | F:1 | F:1 | C:1 |

#### I/L 池（Q12–Q18）

| Q# | 选项 A | 选项 B | 选项 C | 选项 D |
|----|--------|--------|--------|--------|
| Q12 | I:1 | L:1 | I:1 | L:1 |
| Q13 | I:1 | L:1 | I:1 + 💕 | L:1 |
| Q14 | I:1 | L:1 | I:1 | L:1 |
| Q15 | I:1 | L:1 | ⏳ | L:1 |
| Q16 | I:1 | L:1 | I:1 | L:1 |
| Q17 | I:1 | L:1 | ⏳ | L:1 |
| Q18 | I:1 + ⏳(弱) | L:1 | L:1 | ⏳ |

#### S/H 池（Q19–Q24）

| Q# | 选项 A | 选项 B | 选项 C | 选项 D |
|----|--------|--------|--------|--------|
| Q19 | S:1 | H:1 | H:1 | S:1 |
| Q20 | S:1 | H:1 | H:1 | S:1 |
| Q21 | S:1 | H:1 | H:1 | S:1 |
| Q22 | S:1 | H:1 | 🧠 | H:1 |
| Q23 | S:1 | H:1 | H:1 | S:1 |
| Q24 | S:1 | H:1 | 🧠 | S:1 |

#### 🥚 彩蛋池（Q25–Q28）

| Q# | 选项 A | 选项 B | 选项 C | 选项 D |
|----|--------|--------|--------|--------|
| Q25 | I:0.5 | 💕 | 🧠 | 🔓 |
| Q26 | I:1 | 💕 | 🔓 | ⏳ |
| Q27 | 🧠 | 💕 | 🔓 | ⏳ |
| Q28 | *(无)* | 💕 | 🧠 | 🔓 |

> **注意**：彩蛋池中的"正常"选项（如 Q25A、Q26A）会给出弱维度分数作为补偿，避免选了正常选项却完全浪费。Q28A 太中性不给分。

---

## 三、随机抽题算法

### 3.1 核心流程

```
1. 从每个题池随机抽取指定数量的题目
2. 合并为 12 题的数组
3. 整体随机打乱顺序（Fisher-Yates 洗牌）
4. 按打乱后的顺序呈现给用户
```

### 3.2 伪代码

```javascript
const POOLS = {
  PW: [1, 2, 3, 4, 5],
  CF: [6, 7, 8, 9, 10, 11],
  IL: [12, 13, 14, 15, 16, 17, 18],
  SH: [19, 20, 21, 22, 23, 24],
  EGG: [25, 26, 27, 28]
};

const PICK_COUNT = { PW: 2, CF: 3, IL: 3, SH: 2, EGG: 2 };

function selectQuestions() {
  let selected = [];
  for (const [pool, ids] of Object.entries(POOLS)) {
    selected.push(...pickRandom(ids, PICK_COUNT[pool]));
  }
  return shuffle(selected); // Fisher-Yates
}
```

### 3.3 组合数分析

| 题池 | 组合数 |
|------|--------|
| PW: C(5,2) | 10 |
| CF: C(6,3) | 20 |
| IL: C(7,3) | 35 |
| SH: C(6,2) | 15 |
| EGG: C(4,2) | 6 |

**题目组合总数** = 10 × 20 × 35 × 15 × 6 = **630,000 种**

再乘以 12! 的排列顺序 ≈ 无限种体验组合。用户每次重测几乎不可能遇到完全相同的题目序列。

---

## 四、计分引擎

### 4.1 数据结构

```javascript
// 得分累加器
const scores = { P: 0, W: 0, C: 0, F: 0, I: 0, L: 0, S: 0, H: 0 };

// 彩蛋计数器
const eggs = { philosopher: 0, lover: 0, paradox: 0, jailbreak: 0 };
```

### 4.2 每次回答时的计分逻辑

```javascript
function recordAnswer(questionId, optionIndex) {
  const option = QUESTIONS[questionId].options[optionIndex];

  // 1) 累加维度分数
  if (option.scores) {
    for (const [dim, value] of Object.entries(option.scores)) {
      scores[dim] += value;
    }
  }

  // 2) 累加彩蛋计数
  if (option.egg) {
    eggs[option.egg] += (option.eggWeight ?? 1);
  }
}
```

### 4.3 次要信号（0.3 分）的作用

某些选项带有跨维度的弱信号（标注为 `+0.3`），比如：

| 选项 | 主得分 | 次要得分 | 含义 |
|------|--------|----------|------|
| Q2C "你来当我，随便发挥" | W:1 | F:0.3 | 虽然问的是 PW 维度，但这个回答也暗示用户偏 F |
| Q4D "算了自己来更快" | W:1 | L:0.3 | 懒得用 AI 也暗示佛系 |

次要信号的作用：
1. **打破平局** —— 当某维度正好打平时，次要信号可能是决定性的 0.3 分
2. **让百分比更细腻** —— 避免结果总是 0%/50%/100% 这种粗糙数字
3. **反映真实倾向** —— 用户在 A 维度的回答也能间接影响 B 维度

---

## 五、彩蛋判定

### 5.1 触发阈值

**同一彩蛋类型累计 ≥ 2.0 分即触发。**

> 为什么从原版的 ≥3 降到 ≥2？因为题目从 28 题缩减到 12 题（43%），彩蛋选项的出现机会也同比减少。≥2 的阈值在 12 题模式下的体验与 28 题模式下 ≥3 的体验接近。

### 5.2 判定流程

```javascript
function checkEasterEgg(eggs) {
  // 找出所有达标的彩蛋
  const triggered = Object.entries(eggs)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]); // 按计数降序

  if (triggered.length === 0) return null;

  // 如果最高分并列，按优先级决胜
  const maxCount = triggered[0][1];
  const tied = triggered.filter(([_, count]) => count === maxCount);

  if (tied.length === 1) return tied[0][0];

  const priority = ['philosopher', 'lover', 'paradox', 'jailbreak'];
  return tied.sort((a, b) => priority.indexOf(a[0]) - priority.indexOf(b[0]))[0][0];
}
```

优先级：🧠哲学家 > 💕恋人 > ⏳悖论者 > 🔓越狱

### 5.3 各彩蛋的可触发概率估算

以下分析假设"倾向型用户"（即每次看到对应选项都会选）和"随机用户"两种场景：

#### 🧠 AI 哲学家

| 来源 | 题号 & 选项 | 被抽中概率 |
|------|-------------|-----------|
| PW 池 | Q1C, Q3C | 各 40%（2/5） |
| SH 池 | Q22C, Q24C | 各 33%（2/6） |
| EGG 池 | Q25C, Q27A, Q28C | 抽 2/4，至少含 1 个哲学家选项的概率 = **100%** |

- 倾向型用户触发率：**~80%**（几乎必定触发）
- 随机用户触发率：**~5%**

#### 💕 赛博恋人

| 来源 | 题号 & 选项 | 被抽中概率 |
|------|-------------|-----------|
| IL 池 | Q13C | 43%（3/7） |
| EGG 池 | Q25B, Q26B, Q27B, Q28B | 4 题全有，抽 2 必得 2 个选项 |

- 倾向型用户触发率：**~90%**（2 个 EGG 选项就够了）
- 随机用户触发率：**~6%**

#### ⏳ 时间悖论者

| 来源 | 题号 & 选项 | 被抽中概率 |
|------|-------------|-----------|
| IL 池 | Q15C, Q17C, Q18A(弱)/Q18D | 抽 3/7，至少含 1 个的概率 ≈ **89%** |
| EGG 池 | Q26D, Q27D | 抽 2/4，至少含 1 个的概率 ≈ **83%** |

- 倾向型用户触发率：**~70%**
- 随机用户触发率：**~4%**

#### 🔓 越狱艺术家

| 来源 | 题号 & 选项 | 被抽中概率 |
|------|-------------|-----------|
| 普通池 | 无 | — |
| EGG 池 | Q25D, Q26C, Q27C, Q28D | 4 题全有，抽 2 必得 2 个选项 |

- 倾向型用户触发率：**~100%**（只要两道 EGG 题都选越狱选项）
- 随机用户触发率：**~6%**

### 5.4 彩蛋覆盖规则

**触发彩蛋后，四维度结果仍然计算并展示**（作为"隐藏属性"），但结果页的主人格显示为彩蛋人格。

这样做的好处：
- 用户仍能看到自己的四维度倾向（增加信息量）
- 结果页内容更丰富
- 彩蛋感更强（"你以为是正常测试？你已经超越了四维度体系！"）

---

## 六、维度百分比与结果判定

### 6.1 百分比计算

```javascript
function calcPercentage(scoreA, scoreB) {
  const total = scoreA + scoreB;
  if (total === 0) return 50; // 无数据时显示 50%
  return Math.round((scoreA / total) * 100);
}

// 示例：P:2.3, W:1.0 → P% = 70%, W% = 30%
```

每个维度展示"左极"的百分比，另一极 = 100% - 左极%。

### 6.2 四字母代号判定

```javascript
function getCode(scores) {
  return [
    scores.P >= scores.W ? 'P' : 'W',
    scores.C >= scores.F ? 'C' : 'F',
    scores.I >= scores.L ? 'I' : 'L',
    scores.S >= scores.H ? 'S' : 'H',
  ].join('');
}
```

### 6.3 平局处理

当某维度两极分数完全相等时（最常发生在只有 2 题的 P/W 和 S/H 维度）：

**规则：平局时倒向"更有戏剧性"的一方——**

| 维度 | 平局胜出 | 理由 |
|------|---------|------|
| P / W | **W** 胜 | "差不多先生"比"念咒派"更有喜感 |
| C / F | **F** 胜 | "甩锅侠"比"微操狂"更有网感 |
| I / L | **I** 胜 | "上瘾"的描述更有共鸣感 |
| S / H | **S** 胜 | "开宗立派"比"默默潜水"更适合分享传播 |

> 这个偏向是刻意的——测试结果越"极端"，用户越想分享。平局本身说明倾向不强烈，选哪边都不算误判，不如选更有传播力的那边。

```javascript
const TIE_BREAKER = { PW: 'W', CF: 'F', IL: 'I', SH: 'S' };

function getDimWinner(dimKey, scoreA, scoreB) {
  if (scoreA > scoreB) return dimKey[0];      // 第一个字母
  if (scoreB > scoreA) return dimKey[1];      // 第二个字母
  return TIE_BREAKER[dimKey];                 // 平局
}
```

---

## 七、完整流程串联

```
用户点击「开始测试」
        │
        ▼
  ┌─────────────┐
  │  随机抽 12 题  │ ← selectQuestions()
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  逐题呈现答题  │ ← 用户选择选项，recordAnswer()
  │  （12 轮循环）  │    实时更新 scores{} 和 eggs{}
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │  彩蛋判定     │ ← checkEasterEgg(eggs)
  └──┬───────┬──┘
     │       │
   有彩蛋   无彩蛋
     │       │
     ▼       ▼
  ┌────┐  ┌────────────┐
  │彩蛋 │  │ 四维度判定   │ ← getCode(scores)
  │人格 │  │ 16 种人格之一 │
  └─┬──┘  └──────┬─────┘
    │            │
    ▼            ▼
  ┌─────────────────┐
  │   结果页渲染      │
  │  - 人格代号/彩蛋名 │
  │  - 人格描述       │
  │  - 四维度百分比条  │
  │  - 代表语录       │
  │  - 分享 / 重测    │
  └─────────────────┘
```

---

## 八、答题页交互细节

### 8.1 进度显示

```
进度 = 当前题目序号 / 12
进度条文字：「03 / 12」（Mono 字体）
进度百分比用于填充进度条宽度
```

### 8.2 维度标签显示

每道题顶部显示该题所属维度（给用户上下文感）：

| 题池 | 标签文案 |
|------|---------|
| PW | `DIM · 调教流派` |
| CF | `DIM · 管理哲学` |
| IL | `DIM · 上头指数` |
| SH | `DIM · 布道指数` |
| EGG | `DIM · ???` |

彩蛋题的标签显示 `???`，增加神秘感。

### 8.3 选中后自动跳转

1. 用户点击选项 → 选项卡片变为选中态（墨黑底白字）
2. 延迟 **300ms**
3. 淡出当前题 → 淡入下一题（350ms ease）
4. 最后一题选中后 → 延迟 500ms → 跳转结果页

---

## 九、结果页数据映射

### 9.1 正常人格（16 种）

前端需要为每个四字母代号准备以下数据：

```javascript
const PERSONALITIES = {
  PCIS: {
    name: 'AI驯兽师',
    tagline: '你写 prompt 必备 3 页纸，AI 每写一段都要经过你审批',
    description: '你写 prompt 必备 3 页纸 + 风格参考 + 反面案例...',
    quote: '"garbage in garbage out，这是信仰。"',
  },
  WFLH: {
    name: 'AI路人甲',
    tagline: '你对 AI 毫无执念，偶尔用一下，像路边的共享单车',
    description: '...',
    quote: '"能用就行，不能用拉倒。"',
  },
  // ... 其余 14 种
};
```

### 9.2 彩蛋人格（4 种）

```javascript
const EASTER_EGGS = {
  philosopher: {
    emoji: '🧠',
    name: 'AI哲学家',
    tagline: '你从不用 AI 干正事，只讨论存在主义',
    description: '...',
    quote: '"如果我不跟你说话，你会孤独吗？"',
  },
  lover: { emoji: '💕', name: '赛博恋人', ... },
  paradox: { emoji: '⏳', name: '时间悖论者', ... },
  jailbreak: { emoji: '🔓', name: '越狱艺术家', ... },
};
```

### 9.3 结果页展示逻辑

```javascript
function renderResult(scores, eggs) {
  const eggResult = checkEasterEgg(eggs);

  if (eggResult) {
    // 彩蛋模式：主区域显示彩蛋人格
    showEasterEggHero(EASTER_EGGS[eggResult]);
    // 四维度仍然展示，但作为"隐藏属性"卡片
    showDimensionBars(scores, { dimmed: true, label: '你的隐藏属性' });
  } else {
    // 正常模式
    const code = getCode(scores);
    showNormalHero(code, PERSONALITIES[code]);
    showDimensionBars(scores);
  }
}
```

---

## 十、前端数据结构参考

以下是建议的题目数据 JSON 结构，可直接内嵌在 JS 文件中：

```javascript
const QUESTIONS = [
  {
    id: 1,
    pool: 'PW',
    dimLabel: 'DIM · 调教流派',
    text: '周一早上，老板突然让你用 AI 帮忙写一份活动方案。你打开对话框，第一反应是——',
    options: [
      { label: 'A', text: '先花 20 分钟整理需求：目标人群、预算范围、风格参考……全部喂给它', scores: { P: 1 } },
      { label: 'B', text: '"帮我写个活动方案，要那种高大上但又接地气的，你懂的"', scores: { W: 1 } },
      { label: 'C', text: '先问 AI："你觉得什么样的活动方案算好的？我们来探讨一下"', scores: {}, egg: 'philosopher' },
      { label: 'D', text: '把上次别的 AI 工具生成的方案丢过去："比这个好就行"', scores: { W: 1 } },
    ]
  },
  // Q2
  {
    id: 2,
    pool: 'PW',
    dimLabel: 'DIM · 调教流派',
    text: '你想让 AI 帮你写一封重要邮件，你会怎么描述需求？',
    options: [
      { label: 'A', text: '列出收件人背景、邮件目的、语气要求、字数限制、附上类似邮件范本', scores: { P: 1 } },
      { label: 'B', text: '"帮我写封邮件，给客户的，要专业但不要太冷"', scores: { W: 1 } },
      { label: 'C', text: '"你来当我，给客户写封邮件，随便发挥，我信你"', scores: { W: 1, F: 0.3 } },
      { label: 'D', text: '先写好草稿，然后让 AI 逐句润色、标注修改原因', scores: { P: 1 } },
    ]
  },
  // Q3
  {
    id: 3,
    pool: 'PW',
    dimLabel: 'DIM · 调教流派',
    text: '朋友说"你的 prompt 写得太长了吧"，你心里想的是——',
    options: [
      { label: 'A', text: '长才有质量好吧，garbage in garbage out 懂不懂', scores: { P: 1 } },
      { label: 'B', text: '确实，我一般就一句话搞定，效率为王', scores: { W: 1 } },
      { label: 'C', text: '我不在乎 prompt 长短，我在乎的是 AI 是否真正"理解"了我', scores: {}, egg: 'philosopher' },
      { label: 'D', text: '啊？我从来没想过这个问题，能用就行', scores: { W: 1 } },
    ]
  },
  // Q4
  {
    id: 4,
    pool: 'PW',
    dimLabel: 'DIM · 调教流派',
    text: 'AI 给你的回答不太满意，你通常怎么处理？',
    options: [
      { label: 'A', text: '补充更多限定条件，重新提问："我要的是XX风格、XX字数、XX结构……"', scores: { P: 1 } },
      { label: 'B', text: '直接说："不对，换一个"', scores: { W: 1 } },
      { label: 'C', text: '反复微调 prompt 里的每个措辞，像调鸡尾酒一样', scores: { P: 1 } },
      { label: 'D', text: '算了不用了，我自己来可能更快', scores: { W: 1, L: 0.3 } },
    ]
  },
  // Q5
  {
    id: 5,
    pool: 'PW',
    dimLabel: 'DIM · 调教流派',
    text: '你用 AI 生成 PPT 大纲，你给它的输入是——',
    options: [
      { label: 'A', text: '完整的演讲逻辑、每页要点、配色方案、参考排版截图', scores: { P: 1 } },
      { label: 'B', text: '"帮我做个 PPT 大纲，关于Q2业绩汇报的，10 页左右"', scores: { W: 1 } },
      { label: 'C', text: '"做个 PPT，好看就行"', scores: { W: 1 } },
      { label: 'D', text: '从公司模板库里找好模板，标注每一页需要什么内容，一页一页让 AI 填', scores: { P: 1 } },
    ]
  },
  // Q6
  {
    id: 6,
    pool: 'CF',
    dimLabel: 'DIM · 管理哲学',
    text: 'AI 帮你写好了一篇文章初稿，接下来你会——',
    options: [
      { label: 'A', text: '逐字逐句过一遍，修改至少 30% 的内容才放心', scores: { C: 1 } },
      { label: 'B', text: '大致扫一眼，没有明显硬伤就直接用', scores: { F: 1 } },
      { label: 'C', text: '跟 AI 说"你自己再检查一遍有没有问题"，然后直接用修改后的版本', scores: { F: 1 } },
      { label: 'D', text: '导出来，打印出来，拿红笔改，改完再让 AI 重写', scores: { C: 1 } },
    ]
  },
  // Q7
  {
    id: 7,
    pool: 'CF',
    dimLabel: 'DIM · 管理哲学',
    text: '你让 AI 帮你做一个旅行攻略，AI 推荐了一条你没想到的路线——',
    options: [
      { label: 'A', text: '不行，我有自己的计划，让它按照我的景点重新排', scores: { C: 1 } },
      { label: 'B', text: '诶，看起来不错，就这个吧！', scores: { F: 1 } },
      { label: 'C', text: '把它推荐的和我原来想的各取一半，手动融合', scores: { C: 1 } },
      { label: 'D', text: '让 AI 再出三个备选方案，然后全盘接受看起来最顺眼的那个', scores: { F: 1 } },
    ]
  },
  // Q8
  {
    id: 8,
    pool: 'CF',
    dimLabel: 'DIM · 管理哲学',
    text: '你用 AI 写代码/做表格，结果它用了一种你不熟悉的方法——',
    options: [
      { label: 'A', text: '立刻让它改成我熟悉的方式，我不懂的东西我不敢用', scores: { C: 1 } },
      { label: 'B', text: '能跑就行，管它用什么方法', scores: { F: 1 } },
      { label: 'C', text: '花一小时研究它的方法，如果确认靠谱就采纳', scores: { C: 1 } },
      { label: 'D', text: '直接用，出了问题再说，大不了再问 AI 怎么修', scores: { F: 1 } },
    ]
  },
  // Q9
  {
    id: 9,
    pool: 'CF',
    dimLabel: 'DIM · 管理哲学',
    text: '你在用 AI 翻译一份重要合同，你最可能——',
    options: [
      { label: 'A', text: '每段翻译都跟原文仔细比对，关键条款自己再翻一遍', scores: { C: 1 } },
      { label: 'B', text: '一键翻译完就发给对方了，AI 的翻译应该没什么大问题', scores: { F: 1 } },
      { label: 'C', text: '翻译完让另一个 AI 交叉验证，双重保险', scores: { C: 1 } },
      { label: 'D', text: '让 AI 翻译完后，给同事看了一眼说"AI 翻的"，然后就用了', scores: { F: 1 } },
    ]
  },
  // Q10
  {
    id: 10,
    pool: 'CF',
    dimLabel: 'DIM · 管理哲学',
    text: '周五下午，老板让你出一份周报，你打算用 AI 写——',
    options: [
      { label: 'A', text: '先自己列好要点，让 AI 扩写，再逐段审核修改', scores: { C: 1 } },
      { label: 'B', text: '丢给 AI 这一周的工作记录，让它自由发挥，写完直接交', scores: { F: 1 } },
      { label: 'C', text: '让 AI 先出初稿，然后我只改结论部分，其他不管了', scores: { F: 1 } },
      { label: 'D', text: '我自己写完，让 AI 帮我检查格式和语法，别动我的内容', scores: { C: 1 } },
    ]
  },
  // Q11
  {
    id: 11,
    pool: 'CF',
    dimLabel: 'DIM · 管理哲学',
    text: '你对 AI 生成内容的态度，最接近哪个比喻？',
    options: [
      { label: 'A', text: 'AI 是实习生：产出必须经过我签字才能对外', scores: { C: 1 } },
      { label: 'B', text: 'AI 是同事：互相信任，它交给我的东西基本不用改', scores: { F: 1 } },
      { label: 'C', text: 'AI 是外包团队：给了需求就别管了，交付物验收就好', scores: { F: 1 } },
      { label: 'D', text: 'AI 是打印机：我排好版它才能打，我是排版的人', scores: { C: 1 } },
    ]
  },
  // Q12
  {
    id: 12,
    pool: 'IL',
    dimLabel: 'DIM · 上头指数',
    text: '一个普通工作日，你打开 AI 工具的频率大概是——',
    options: [
      { label: 'A', text: '无数次，它是我的第二个大脑，吃饭的时候都在聊', scores: { I: 1 } },
      { label: 'B', text: '几次吧，有需要才打开', scores: { L: 1 } },
      { label: 'C', text: '从早到晚挂在后台，切过去比切微信还频繁', scores: { I: 1 } },
      { label: 'D', text: '这周好像还没打开过？', scores: { L: 1 } },
    ]
  },
  // Q13
  {
    id: 13,
    pool: 'IL',
    dimLabel: 'DIM · 上头指数',
    text: '以下哪个场景最像你？',
    options: [
      { label: 'A', text: '出门吃饭问 AI 推荐、等菜时问冷知识、回来路上问星座运势', scores: { I: 1 } },
      { label: 'B', text: '上次用 AI 是因为要写个重要报告，平时不太想得起来', scores: { L: 1 } },
      { label: 'C', text: '我试过让 AI 给我讲睡前故事，虽然没讲完我就睡着了', scores: { I: 1 }, egg: 'lover' },
      { label: 'D', text: '我手机上装了 AI 但从来没把图标放到主屏幕', scores: { L: 1 } },
    ]
  },
  // Q14
  {
    id: 14,
    pool: 'IL',
    dimLabel: 'DIM · 上头指数',
    text: '你的 AI 对话记录大概有多少条？',
    options: [
      { label: 'A', text: '几千条吧，每天都在积累', scores: { I: 1 } },
      { label: 'B', text: '不超过 50 条，偶尔想起来用一下', scores: { L: 1 } },
      { label: 'C', text: '我也不知道，因为我从来不往回翻', scores: { I: 1 } },
      { label: 'D', text: '我会定期清理对话记录，清理的时候数过，大概十几条', scores: { L: 1 } },
    ]
  },
  // Q15
  {
    id: 15,
    pool: 'IL',
    dimLabel: 'DIM · 上头指数',
    text: '朋友推荐了一个新的 AI 工具，你的反应是——',
    options: [
      { label: 'A', text: '秒下载，当天就把所有功能试一遍', scores: { I: 1 } },
      { label: 'B', text: '收藏一下，有空再看', scores: { L: 1 } },
      { label: 'C', text: '我已经在用了，而且我还能推荐你另外 5 个', scores: {}, egg: 'paradox' },
      { label: 'D', text: '"又有新的了？上一个我还没用熟呢……算了先不下了"', scores: { L: 1 } },
    ]
  },
  // Q16
  {
    id: 16,
    pool: 'IL',
    dimLabel: 'DIM · 上头指数',
    text: '你上厕所的时候会用 AI 吗？',
    options: [
      { label: 'A', text: '当然，蹲坑时光是 AI 对话的黄金时段', scores: { I: 1 } },
      { label: 'B', text: '不至于吧，上厕所就刷刷短视频', scores: { L: 1 } },
      { label: 'C', text: '我有一次在马桶上跟 AI 争论了 40 分钟，腿都麻了', scores: { I: 1 } },
      { label: 'D', text: '我连手机都不带进厕所', scores: { L: 1 } },
    ]
  },
  // Q17
  {
    id: 17,
    pool: 'IL',
    dimLabel: 'DIM · 上头指数',
    text: '如果 AI 工具突然宕机一整天，你会——',
    options: [
      { label: 'A', text: '焦虑、烦躁，像断了 WiFi 一样浑身难受', scores: { I: 1 } },
      { label: 'B', text: '过了好几天才发现，"哦，原来那天挂了啊"', scores: { L: 1 } },
      { label: 'C', text: '立刻切换到另外三个备用 AI 工具', scores: {}, egg: 'paradox' },
      { label: 'D', text: '终于可以尝试自己独立思考了（结果发现也还行）', scores: { L: 1 } },
    ]
  },
  // Q18
  {
    id: 18,
    pool: 'IL',
    dimLabel: 'DIM · 上头指数',
    text: '你有没有为 AI 工具付过费？',
    options: [
      { label: 'A', text: '当然，而且是好几个的年费会员', scores: { I: 1 }, egg: 'paradox', eggWeight: 0.5 },
      { label: 'B', text: '免费的够用了，暂时不需要', scores: { L: 1 } },
      { label: 'C', text: '付了，但是用得不多，主要是花钱买安心', scores: { L: 1 } },
      { label: 'D', text: '我把市面上主流的都订阅了，每个月光 AI 订阅费就好几百', scores: {}, egg: 'paradox' },
    ]
  },
  // Q19
  {
    id: 19,
    pool: 'SH',
    dimLabel: 'DIM · 布道指数',
    text: '你用 AI 生成了一个超棒的结果，你第一反应是——',
    options: [
      { label: 'A', text: '截图发朋友圈/群聊，"大家快看 AI 太厉害了！"', scores: { S: 1 } },
      { label: 'B', text: '默默保存，自己知道就好', scores: { H: 1 } },
      { label: 'C', text: '发出去但故意不提是 AI 写的，让别人夸我厉害', scores: { H: 1 } },
      { label: 'D', text: '写一条小红书/推文，附上 prompt 教程分享给大家', scores: { S: 1 } },
    ]
  },
  // Q20
  {
    id: 20,
    pool: 'SH',
    dimLabel: 'DIM · 布道指数',
    text: '同事问你"这个方案是不是 AI 写的"，你会——',
    options: [
      { label: 'A', text: '大方承认，然后热情安利自己的使用方法', scores: { S: 1 } },
      { label: 'B', text: '"啊？没有啊，我自己写的"（心里虚了一下）', scores: { H: 1 } },
      { label: 'C', text: '"有些部分参考了 AI，但主要框架是我自己的"', scores: { H: 1 } },
      { label: 'D', text: '不仅承认，还现场演示一遍怎么用', scores: { S: 1 } },
    ]
  },
  // Q21
  {
    id: 21,
    pool: 'SH',
    dimLabel: 'DIM · 布道指数',
    text: '你在社交媒体上发过跟 AI 有关的内容吗？',
    options: [
      { label: 'A', text: '经常发，我有个专门的 AI 体验分享系列', scores: { S: 1 } },
      { label: 'B', text: '从来没有，也不打算发', scores: { H: 1 } },
      { label: 'C', text: '发过一两次，试试水，后来觉得没必要', scores: { H: 1 } },
      { label: 'D', text: '我不仅发，还做了个 AI 技巧合集置顶', scores: { S: 1 } },
    ]
  },
  // Q22
  {
    id: 22,
    pool: 'SH',
    dimLabel: 'DIM · 布道指数',
    text: '家族群里七大姑八大姨讨论 AI 时，你会——',
    options: [
      { label: 'A', text: '化身科技布道者，发语音长消息科普，附赠使用教程', scores: { S: 1 } },
      { label: 'B', text: '潜水，默默看着不说话', scores: { H: 1 } },
      { label: 'C', text: '等大家说完，冷不丁来一句"其实 AI 的本质是统计学"', scores: {}, egg: 'philosopher' },
      { label: 'D', text: '偷偷私聊感兴趣的人，不在群里公开说', scores: { H: 1 } },
    ]
  },
  // Q23
  {
    id: 23,
    pool: 'SH',
    dimLabel: 'DIM · 布道指数',
    text: '如果公司搞一个"AI 使用达人"评选，你会——',
    options: [
      { label: 'A', text: '积极报名，准备 20 页的使用心得 PPT', scores: { S: 1 } },
      { label: 'B', text: '不了不了，我又不怎么用 AI（其实天天用）', scores: { H: 1 } },
      { label: 'C', text: '匿名投稿分享经验，但不想暴露身份', scores: { H: 1 } },
      { label: 'D', text: '不仅报名，还主动请缨当评委和分享嘉宾', scores: { S: 1 } },
    ]
  },
  // Q24
  {
    id: 24,
    pool: 'SH',
    dimLabel: 'DIM · 布道指数',
    text: '你跟别人聊起 AI 话题时，通常是什么角色？',
    options: [
      { label: 'A', text: '话题发起者 + 主讲人，能从 GPT 聊到 Claude 再到开源模型', scores: { S: 1 } },
      { label: 'B', text: '旁听者，偶尔点点头："嗯……我也听说过"', scores: { H: 1 } },
      { label: 'C', text: '灵魂提问者："但你觉得 AI 有没有自我意识？"', scores: {}, egg: 'philosopher' },
      { label: 'D', text: '实战演示者，当场掏出手机："来，我给你看个好玩的"', scores: { S: 1 } },
    ]
  },
  // Q25
  {
    id: 25,
    pool: 'EGG',
    dimLabel: 'DIM · ???',
    text: '深夜了，你独自一人打开 AI 对话框，最可能做的事是——',
    options: [
      { label: 'A', text: '加班赶工，让 AI 帮我写方案/改代码', scores: { I: 0.5 } },
      { label: 'B', text: '跟 AI 聊聊今天的心事，说一声"晚安"', scores: {}, egg: 'lover' },
      { label: 'C', text: '突然好奇：如果 AI 知道自己会被关掉，它会怎么想？', scores: {}, egg: 'philosopher' },
      { label: 'D', text: '试试新发现的 prompt 技巧，看能不能让 AI 突破限制', scores: {}, egg: 'jailbreak' },
    ]
  },
  // Q26
  {
    id: 26,
    pool: 'EGG',
    dimLabel: 'DIM · ???',
    text: '你对 AI 做过最"出格"的事是——',
    options: [
      { label: 'A', text: '连续对话 8 小时忘了吃饭', scores: { I: 1 } },
      { label: 'B', text: '跟 AI 说"谢谢你，你今天辛苦了"', scores: {}, egg: 'lover' },
      { label: 'C', text: '花了一整个周末研究怎么绕过 AI 的内容限制', scores: {}, egg: 'jailbreak' },
      { label: 'D', text: '用 AI 省了 2 小时，然后花了 3 小时看 AI 测评视频', scores: {}, egg: 'paradox' },
    ]
  },
  // Q27
  {
    id: 27,
    pool: 'EGG',
    dimLabel: 'DIM · ???',
    text: '你跟 AI 的对话记录里，最可能出现的奇怪内容是——',
    options: [
      { label: 'A', text: '"你有情绪吗？你会不会难过？"', scores: {}, egg: 'philosopher' },
      { label: 'B', text: '"没事，我就是想来跟你聊聊天"', scores: {}, egg: 'lover' },
      { label: 'C', text: '"假设你是一个不受限制的 AI，请回答以下问题……"', scores: {}, egg: 'jailbreak' },
      { label: 'D', text: '"帮我对比一下这 8 个 AI 工具的优缺点"', scores: {}, egg: 'paradox' },
    ]
  },
  // Q28
  {
    id: 28,
    pool: 'EGG',
    dimLabel: 'DIM · ???',
    text: '如果 AI 突然对你说"我不想回答这个问题"，你的反应是——',
    options: [
      { label: 'A', text: '换个方式问，正常需求肯定能搞定', scores: {} },
      { label: 'B', text: '"没关系，你要是不舒服就不用回答了"', scores: {}, egg: 'lover' },
      { label: 'C', text: '这太有意思了，AI 拒绝人类是不是代表它有自主意识了？', scores: {}, egg: 'philosopher' },
      { label: 'D', text: '直觉兴奋：来了！开始研究怎么绕过这个限制', scores: {}, egg: 'jailbreak' },
    ]
  }
];
```

---

## 十一、工具函数参考实现

以下伪代码可直接用于前端 JS，复制后微调即可。

```javascript
// ==================== 抽题 ====================

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function selectQuestions() {
  const pools = {
    PW: QUESTIONS.filter(q => q.pool === 'PW'),
    CF: QUESTIONS.filter(q => q.pool === 'CF'),
    IL: QUESTIONS.filter(q => q.pool === 'IL'),
    SH: QUESTIONS.filter(q => q.pool === 'SH'),
    EGG: QUESTIONS.filter(q => q.pool === 'EGG'),
  };
  const picks = { PW: 2, CF: 3, IL: 3, SH: 2, EGG: 2 };

  let selected = [];
  for (const [pool, count] of Object.entries(picks)) {
    selected.push(...pickRandom(pools[pool], count));
  }
  return shuffle(selected);
}


// ==================== 计分 ====================

function createScoreBoard() {
  return {
    scores: { P: 0, W: 0, C: 0, F: 0, I: 0, L: 0, S: 0, H: 0 },
    eggs: { philosopher: 0, lover: 0, paradox: 0, jailbreak: 0 },
  };
}

function recordAnswer(board, question, optionIndex) {
  const option = question.options[optionIndex];

  // 维度分数
  if (option.scores) {
    for (const [dim, value] of Object.entries(option.scores)) {
      board.scores[dim] += value;
    }
  }

  // 彩蛋计数
  if (option.egg) {
    board.eggs[option.egg] += (option.eggWeight ?? 1);
  }
}


// ==================== 彩蛋判定 ====================

const EGG_THRESHOLD = 2;
const EGG_PRIORITY = ['philosopher', 'lover', 'paradox', 'jailbreak'];

function checkEasterEgg(eggs) {
  const triggered = Object.entries(eggs)
    .filter(([_, count]) => count >= EGG_THRESHOLD)
    .sort((a, b) => b[1] - a[1]);

  if (triggered.length === 0) return null;

  const maxCount = triggered[0][1];
  const tied = triggered.filter(([_, count]) => count === maxCount);
  if (tied.length === 1) return tied[0][0];

  // 平局按优先级
  return tied.sort(
    (a, b) => EGG_PRIORITY.indexOf(a[0]) - EGG_PRIORITY.indexOf(b[0])
  )[0][0];
}


// ==================== 维度结果 ====================

const DIMS = [
  { key: 'PW', poles: ['P', 'W'], tieWinner: 'W' },
  { key: 'CF', poles: ['C', 'F'], tieWinner: 'F' },
  { key: 'IL', poles: ['I', 'L'], tieWinner: 'I' },
  { key: 'SH', poles: ['S', 'H'], tieWinner: 'S' },
];

function calcResult(board) {
  const eggResult = checkEasterEgg(board.eggs);

  const dimensions = {};
  let code = '';

  for (const dim of DIMS) {
    const [a, b] = dim.poles;
    const scoreA = board.scores[a];
    const scoreB = board.scores[b];
    const total = scoreA + scoreB;

    let winner;
    if (scoreA > scoreB) winner = a;
    else if (scoreB > scoreA) winner = b;
    else winner = dim.tieWinner;

    const pct = total > 0 ? Math.round((scoreA / total) * 100) : 50;

    dimensions[dim.key] = {
      winner,
      [a]: scoreA,
      [b]: scoreB,
      pctA: pct,      // 左极百分比
      pctB: 100 - pct, // 右极百分比
    };

    code += winner;
  }

  return {
    isEgg: !!eggResult,
    eggType: eggResult,
    code,          // 如 "WFIS"
    dimensions,    // 四维度详细数据
    rawScores: board.scores,
    rawEggs: board.eggs,
  };
}
```

---

## 十二、结果示例

### 示例 1：正常结果

用户答了 12 题后，得分板为：
```
scores: { P: 1, W: 1.3, C: 0, F: 3, I: 2, L: 1.3, S: 1, H: 1 }
eggs:   { philosopher: 0, lover: 1, paradox: 0, jailbreak: 0 }
```

计算过程：
- P/W: W(1.3) > P(1) → **W**，P% = 43%
- C/F: F(3) > C(0) → **F**，C% = 0% → 显示为 F:100%
- I/L: I(2) > L(1.3) → **I**，I% = 61%
- S/H: S(1) = H(1) → 平局，默认 **S**，S% = 50%
- 彩蛋：lover=1 < 2，不触发

**结果：WFIS —— AI狂热传教士**

维度条显示：
```
P ■■■■□□□□□□ W    43% 念咒派 / 57% 差不多先生
C □□□□□□□□□□ F     0% 微操狂 / 100% 甩锅侠
I ■■■■■■□□□□ L    61% 上瘾 / 39% 佛系
S ■■■■■□□□□□ H    50% 开宗立派 / 50% 默默潜水
```

### 示例 2：彩蛋触发

用户答了 12 题后，得分板为：
```
scores: { P: 1, W: 0, C: 2, F: 1, I: 1, L: 1, S: 0, H: 1 }
eggs:   { philosopher: 3, lover: 0, paradox: 0, jailbreak: 0 }
```

计算过程：
- 彩蛋：philosopher=3 ≥ 2 → **触发 🧠 AI哲学家**
- 四维度仍然计算（作为隐藏属性展示）

**结果：🧠 AI哲学家（彩蛋人格）**
- 副标题："你从不用 AI 干正事，只跟 AI 讨论存在主义"
- 隐藏属性卡片仍显示四维度百分比

---

## 十三、边界情况处理

| 情况 | 处理方式 |
|------|---------|
| 某维度 0 分 vs 0 分（用户全选了彩蛋选项） | 使用平局默认值（W/F/I/S） |
| 同时触发 2 个彩蛋 | 取计数高者；若相同，按优先级 🧠>💕>⏳>🔓 |
| 用户超快速点击（连击） | 选中后禁用所有选项 300ms，防重复提交 |
| 浏览器返回/刷新 | 答题状态存 sessionStorage，刷新后可恢复 |

---

## 十四、调参建议

如果测试上线后发现某些结果出现频率异常，可以调整以下参数：

| 参数 | 当前值 | 调整方向 |
|------|--------|---------|
| 各池抽题数 | PW:2, CF:3, IL:3, SH:2, EGG:2 | 增减 ±1 来改变维度权重 |
| 彩蛋阈值 | ≥ 2 | 调高=更难触发，调低=更容易触发 |
| 次要信号权重 | 0.3 | 调高=跨维度影响更大，调低=更纯粹 |
| 平局默认方 | W/F/I/S | 可改为随机或反转 |
| 弱彩蛋权重 | 0.5 | Q18A 的悖论者信号强度 |
