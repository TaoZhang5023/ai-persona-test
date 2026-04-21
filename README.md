# AI 使用人设测试

> 四维度 × 16 种人设 + 4 个彩蛋身份。3 分钟，看清你跟 AI 的相处姿势。

纯前端实现的趣味性测试，基于 Retro-Zine × Terminal Playful 风格设计系统，单页应用，无后端，无数据库，适合一键部署到 GitHub Pages。

每次测试从 28 道题库中**随机抽取 12 道题**（PW 池 2 + CF 池 3 + IL 池 3 + SH 池 2 + 彩蛋池 2），组合超过 63 万种，几乎不会重复。

---

## 预览

本地启动（任选其一）：

```bash
# Python 3
python3 -m http.server 5173

# Node.js
npx serve .
```

浏览器打开 <http://localhost:5173>。

---

## 目录结构

```
.
├── index.html              主入口
├── 404.html                GitHub Pages 兜底
├── assets/
│   ├── styles.css          全站样式（设计系统落地）
│   ├── data.js             28 道题库 + 16 人设 + 4 彩蛋 + 题池配置
│   └── app.js              随机抽题、计分、彩蛋判定、分享、sessionStorage 续作
├── personality-system.md   体系设定文档
├── design-system.md        视觉规范文档
├── quiz-questions.md       题目与计分规则
├── scoring-system.md       抽题 / 计分 / 彩蛋判定算法
└── preview.html            原始设计稿（保留作为参考）
```

修改题目或人设文案时，只需编辑 `assets/data.js`。

---

## 功能特性

- **随机抽题 12 / 28** —— 5 个题池按配额抽题 + Fisher-Yates 洗牌，每次体验都不一样
- **四维度计分** —— P/W 调教流派、C/F 管理哲学、I/L 上头指数、S/H 布道指数，支持次要信号（0.3）
- **4 个彩蛋人设** —— 同一类彩蛋 ≥ 2 分即触发，覆盖正常结果，优先级 🧠 > 💕 > ⏳ > 🔓
- **彩蛋仍显示四维度** —— 作为"隐藏属性"呈现，信息量更足
- **进度自动续作** —— 答到一半刷新/切后台，下次打开可继续（sessionStorage）
- **结果 URL 分享** —— 链接带 `#PCIS` 或 `#egg-lover`，点开直接跳到对应人设
- **键盘快捷键** —— 答题时按 `1/2/3/4` 或 `A/B/C/D` 选择，`←` 返回上一题
- **Web Share + 剪贴板兜底** —— 手机原生分享，桌面自动复制链接
- **纯静态** —— 不依赖任何后端、不请求任何第三方 API（除 Google Fonts）
- **移动优先** —— 单列布局，48px+ 点击区，安全区适配

---

## 部署到 GitHub Pages

1. 新建仓库，把这些文件推上去：
   ```bash
   git init
   git add .
   git commit -m "init: AI persona test"
   git branch -M main
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```
2. 打开仓库的 **Settings → Pages**：
   - **Source** 选 `Deploy from a branch`
   - **Branch** 选 `main`，目录选 `/ (root)`
   - 点 Save
3. 等几十秒，页面会显示 `Your site is published at https://<you>.github.io/<repo>/`

### 绑定自定义域名（可选）

在仓库根目录新建一个 `CNAME` 文件，内容写你的域名（如 `persona.example.com`），然后在你的 DNS 里把这个域名 CNAME 到 `<you>.github.io` 即可。

### 部署到根域名

如果仓库名就是 `<你的用户名>.github.io`，自动部署到根路径，无需额外配置。

---

## 二次开发

### 修改题目
编辑 `assets/data.js` 里的 `QUESTIONS` 数组。每道题固定 4 个选项，字段如下：

```js
{
  label: "A",                       // A/B/C/D
  text:  "选项文字",
  scores: { P: 1, F: 0.3 },         // 任意维度分，支持小数（次要信号）
  egg:   "philosopher",             // 可选：philosopher | lover | paradox | jailbreak
  eggWeight: 0.5                    // 可选：弱彩蛋权重，默认 1
}
```

想调整每次抽题的配额，改 `POOLS` 里的 `pick` 数值即可；想调整彩蛋阈值，改 `EGG_THRESHOLD`。

### 修改人设
编辑同文件里的 `PERSONAS`（16 种）和 `EGG_PERSONAS`（4 种）。`compat` 字段用于显示「高兼容人设」。

### 调整设计
所有颜色、间距、阴影、圆角都在 `assets/styles.css` 顶部的 `:root` 变量里。修改变量即可全局生效。

---

## 技术说明

- 无构建步骤、无依赖、纯原生 HTML + CSS + JS
- CSS 变量 + 硬边硬阴影 + Neo-brutalism lite
- 字体：JetBrains Mono（代号/数据） + Noto Sans SC（正文）
- 浏览器兼容：Safari 15+、Chrome 90+、Edge 90+、iOS Safari 15+
- 隐私：不收集任何数据，不请求后端，进度仅存在你本地浏览器的 sessionStorage（关闭标签页自动清空）

---

## License

所有题目、人设文案仅供娱乐使用。代码部分可自由使用 / 魔改 / 二次创作。
