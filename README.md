# 造神计划 · 学习站

纯静态站点，零依赖、零构建。双击 `index.html` 就能看，也可以起个本地服务用手机访问。

## 目录结构

```
site/
├── index.html            主界面：Hero + 搜索 + 继续学习 + 课程目录
├── lessons/
│   ├── d01.html … d15.html   15 天课程页（正文 + 思维导图 + 练习题）
├── assets/
│   ├── site.css          设计系统（深/浅色、响应式、打印）
│   ├── data.js           全站唯一数据源：周次 + 15 课 + 66 个小节索引 + 39 组同义词
│   └── site.js           搜索、目录、主题、进度条、判分、复制
└── README.md
```

## 本地预览

```bash
# 在项目根目录执行，然后浏览器打开 http://localhost:8899
python3 -m http.server 8899 --directory site
```

## 手机怎么打开（三种方式，按推荐顺序）

### 方式一：同一 Wi-Fi 直接访问（最快，推荐）

1. 电脑上先起服务（**必须用 `--bind 0.0.0.0`，否则手机连不上**）：

   ```bash
   cd ~/Desktop/脑子
   python3 -m http.server 8899 --bind 0.0.0.0 --directory site
   ```

2. 查电脑的局域网 IP：

   ```bash
   ipconfig getifaddr en0
   ```

   输出类似 `192.168.31.152`，记下来。

3. 手机连**同一个 Wi-Fi**，浏览器地址栏输入：

   ```
   http://192.168.31.152:8899
   ```

4. 打不开就按顺序排查：
   - 手机和电脑是不是同一个 Wi-Fi（不能一个连 5G 一个连 2.4G 的不同网段）
   - macOS「系统设置 → 网络 → 防火墙」是否拦了 Python
   - 电脑上 `curl http://127.0.0.1:8899` 能不能通（能通说明服务没问题，是网络隔离）
   - 公司/学校 Wi-Fi 常开「AP 隔离」，会禁止设备互访，换手机热点试

### 方式二：手机热点（Wi-Fi 有隔离时用这个）

1. 手机开热点，电脑连这个热点。
2. 重新执行 `ipconfig getifaddr en0` 拿新 IP。
3. 手机浏览器打开 `http://<新IP>:8899`。

### 方式三：部署到公网（随时随地能看，不依赖电脑开机）

`site/` 是纯静态目录，零构建、零依赖，任何静态托管都能直接吃。仓库里已备好三份配置：

| 文件 | 作用 |
|---|---|
| [`vercel.json`](vercel.json:1) | Vercel：`cleanUrls`、静态资源长缓存、安全响应头 |
| [`netlify.toml`](netlify.toml:1) | Netlify：`publish = "."`、同样的缓存与安全头 |
| [`404.html`](404.html:1) | 兜底页，路径写错时不会露出平台默认白页 |
| [`.gitignore`](.gitignore:1) | 排除 `.vercel/`、`.netlify/` 等本地缓存 |

---

#### 路线 A：Netlify Drop（最快，2 分钟，不用装任何东西）

1. 浏览器打开 <https://app.netlify.com/drop>
2. 把 `site` 文件夹**整个拖进去**（不是拖单个文件）
3. 等 10 秒，拿到 `https://随机名.netlify.app`
4. 想改名字：Site settings → Change site name

优点：不用命令行、不用注册就能先看效果（之后注册才能长期保留）。
缺点：以后更新要重新拖一次。

---

#### 路线 B：Vercel CLI（推荐长期用，一条命令更新）

```bash
# ① 全局装一次（只需一次）
npm i -g vercel

# ② 进到 site 目录（重要：必须在 site 里，否则会把整个「脑子」目录传上去）
cd ~/Desktop/脑子/site

# ③ 首次部署，按提示走
vercel
#   Set up and deploy? → Y
#   Which scope?        → 回车选你自己
#   Link to existing?   → N
#   Project name?       → zaoshen（或任意）
#   Directory?          → ./  （直接回车）
#   Override settings?  → N

# ④ 正式发布到生产环境
vercel --prod
```

拿到 `https://zaoshen-xxx.vercel.app`。以后每次改完课程，只要在 `site/` 里再跑一次 `vercel --prod` 就更新了。

> 注意：`cd` 到 `site/` 再执行。在项目根目录跑会把 `zaoshen/`、`teach/`、截图等全部上传，既慢又泄露隐私。

---

#### 路线 C：GitHub Pages（免费、可版本管理，适合长期维护）

```bash
# ① 在 GitHub 网页上新建一个空仓库，比如 zaoshen-site（不要勾 README）

# ② 只把 site 目录推上去（用 subtree，避免把整个「脑子」目录传上去）
cd ~/Desktop/脑子
git subtree push --prefix site https://github.com/<你的用户名>/zaoshen-site.git main

# ③ 打开仓库 → Settings → Pages
#    Source 选 Deploy from a branch
#    Branch 选 main，目录选 / (root)
#    保存，等 1 分钟

# ④ 访问 https://<你的用户名>.github.io/zaoshen-site/
```

以后更新：

```bash
cd ~/Desktop/脑子
git subtree push --prefix site https://github.com/<你的用户名>/zaoshen-site.git main
```

---

#### 三条路线怎么选

| 你的情况 | 选 |
|---|---|
| 只想马上在手机上看到，不想折腾 | **A · Netlify Drop** |
| 会经常改课程内容，想一条命令更新 | **B · Vercel CLI** |
| 想留版本历史、以后可能加自定义域名 | **C · GitHub Pages** |

---

#### 部署后必做的 4 项检查

1. **首页能开**：`https://你的域名/` 显示 Hero + 搜索框
2. **搜索能跳**：搜「盒模型」，点结果应跳到 `lessons/d09.html#four-layers` 并自动滚到该小节
3. **练习题能判分**：随便点一题，选项变色 + 底部得分变化
4. **手机竖屏无横向滚动**：左右滑不动才对；思维导图区域可以单独横滑

#### 常见坑

- **页面 404 但文件明明在** → 部署时目录层级错了。Vercel/Netlify 的根目录必须是 `site/` 本身，不是它的父目录。
- **样式全丢** → 检查 `assets/site.css` 是否一起上传了；`404.html` 用的是绝对路径 `/assets/site.css`，必须部署在域名根目录。
- **改了内容线上没变** → 静态资源有长缓存，强制刷新（`Cmd+Shift+R`）或换个无痕窗口。
- **想加密码/只给自己看** → Netlify 有 Password protection（付费），免费方案可考虑 Vercel 的 Deployment Protection。

### 上线后：你的「作品集」在哪

GitHub 上有三个不同的地址，作用完全不同，别搞混：

| 地址 | 是什么 | 给谁看 |
|---|---|---|
| `https://github.com/quee446` | **你的主页**（头像 + 仓库列表） | 面试官点进来看你有哪些项目 |
| `https://github.com/quee446/zaoshen-site` | **仓库页**（代码 + README） | 面试官想看你怎么写的 |
| `https://quee446.github.io/zaoshen-site/` | **线上网站**（真正跑起来的页面） | 面试官直接体验成品 |

**「作品集」= 主页 + 每个仓库的 README + 线上链接，三者一起构成。** 光有代码没有 README，面试官看不出你在做什么；光有链接没有代码，看不出是你写的。

#### 第 1 步：把主页填满（5 分钟，收益最大）

1. 打开 `https://github.com/quee446`，点右上角头像 → **Your profile**
2. 点 **Edit profile**（右侧按钮）
3. 填三项：
   - **Name**：真实姓名或常用昵称（现在为空）
   - **Bio**：一句话定位，例如 `前端学习中 · 每天一课 · 目标前端实习`
   - **Website**：填 `https://quee446.github.io/zaoshen-site/`（这一栏最关键，主页会显示成可点的链接）
4. 点 **Save**

#### 第 2 步：建「个人主页仓库」（让主页有内容）

GitHub 有个隐藏功能：**仓库名和用户名完全一样**（这里是 `quee446`）时，该仓库的 `README.md` 会自动显示在你的主页最上方。

1. 打开 `https://github.com/new`
2. Repository name 填 **`quee446`**（必须和用户名一模一样）
3. 勾选 **Public**，勾选 **Add a README file**
4. 点 **Create repository**
5. 点 README 右上角铅笔图标，粘贴下面模板，改掉方括号里的内容：

```markdown
### 你好，我是 [你的名字]

前端全栈学习中，180 天计划进行到第 15 天。

**正在做**
- [造神计划 · 学习站](https://quee446.github.io/zaoshen-site/) — 15 天课程，含思维导图、练习题、小节级搜索
- 技术栈：HTML / CSS / Flexbox / 定位 / Git

**联系我**
- 邮箱：[你的邮箱]
```

6. 点 **Commit changes**

刷新 `https://github.com/quee446`，主页顶部就会出现这段介绍。

#### 第 3 步：给 `zaoshen-site` 仓库补描述和 README

现在这个仓库的 Description 是空的（API 查过是 `None`），别人在仓库列表里只看到一个光秃秃的名字。

1. 打开 `https://github.com/quee446/zaoshen-site`
2. 右侧 **About** 那一栏，点齿轮图标 ⚙️
3. **Description** 填：`前端学习站 · 15 天课程 · 思维导图 + 练习题 + 小节级搜索`
4. **Website** 勾选 **Use your GitHub Pages website**（会自动填上线地址）
5. **Topics** 加几个标签：`html` `css` `flexbox` `learning` `static-site`
6. 点 **Save changes**

> 注意：仓库里的 `README.md` 就是 [`site/README.md`](README.md) 这份文件（subtree 推送时一起上去了），所以仓库首页已经能看到完整说明，不用另外写。

#### 第 4 步：以后每完成一天课程，怎么变成作品集

```bash
cd ~/Desktop/脑子
git add site
git commit -m "D16 · 新增课程"
git subtree push --prefix site https://github.com/quee446/zaoshen-site.git main
```

推送后 30–60 秒，线上自动更新。**提交信息写清楚「D几 + 做了什么」**，面试官翻 commit 记录时能看出你的节奏——连续 15 天有提交，比任何自我介绍都有说服力。

#### 面试时怎么用这个作品集

- **发链接**：简历里写 `https://quee446.github.io/zaoshen-site/`，比写「熟悉 HTML/CSS」有力得多。
- **讲过程**：面试官问「你做过什么」，打开仓库 → 点 **Commits**，让他看到你从 D1 到 D15 的完整轨迹。
- **讲技术**：打开线上站，演示搜索「盒模型」→ 精准跳到 `d09.html#four-layers`，说明你做了小节级索引和同义词扩展，这是加分项。
- **讲取舍**：说明为什么用纯静态、零依赖、零构建——加载快、部署简单、GitHub Pages 免费托管。

#### 常见坑

- **主页仓库名写错**：必须是 `quee446`，写成 `quee446-profile` 或 `profile` 都不会显示在主页顶部。
- **Website 栏填了但主页没显示**：GitHub 有时缓存，等 1–2 分钟或退出重登。
- **仓库是 Public 但主页看不到**：确认仓库没被 Archive，且 README 文件名大小写正确（`README.md`）。
- **想放多个项目**：每个项目一个仓库，各自开 Pages，主页 README 里用列表把链接串起来，这就是最标准的作品集结构。

---

### 手机上建议做的事

- 加到主屏幕：Safari 点「分享 → 添加到主屏幕」，Chrome 点「⋮ → 添加到主屏幕」，之后像 App 一样全屏打开。
- 思维导图区域可以左右滑动；练习题点选项即时判分。
- 深色/浅色跟随系统，也可以点右上角按钮手动切。

## 新增一天课程

1. 在 [`assets/data.js`](assets/data.js:1) 的 `lessons` 数组里加一条：

   ```js
   {
     day: "D14",                 // 章节号，显示在目录左侧
     week: "w2",                 // 属于哪一周（对应 weeks 里的 id）
     title: "复盘 + 补进度",      // 课程标题
     desc: "本周 6 天任务全部打勾", // 一句话说明
     minutes: 90,                // 预计时长
     status: "todo",             // done / current / todo
     href: "lessons/d14.html",   // 课程页路径
     tags: ["复盘"],              // 标签
     keywords: "复盘 间隔重复",    // 搜索关键词（正文里没出现的词也放这里）
   }
   ```

2. 复制 [`lessons/d13.html`](lessons/d13.html:1) 改内容，文件名对上 `href`。

首页目录、搜索、统计数字会自动更新，不用改 HTML。

## 课程页必备结构

| 区块 | 作用 |
|---|---|
| `.lesson-hero` | 标题、导语、时长/产出/面试清单 |
| `.toc` | 左侧目录，滚动时自动高亮当前小节 |
| `.prose` | 正文，`h2` 必须带 `id`，目录才能跳转 |
| `.mindmap` | 思维导图（内联 SVG，手机可横向滑动） |
| `#practice` | 练习题容器，`.q` 每题、`.opt` 每选项 |
| `.checklist` | 验收清单，勾选状态存 localStorage |
| `.pager` | 上一课 / 下一课 |

### 练习题写法

```html
<div class="q">
  <div class="q-head"><span class="q-no">01</span><span class="q-text">题干</span></div>
  <div class="opts">
    <button class="opt" data-correct="false"><span class="opt-key"><span>A</span></span>错误选项</button>
    <button class="opt" data-correct="true" data-why="解析文字"><span class="opt-key"><span>B</span></span>正确选项</button>
  </div>
  <div class="fb"></div>
</div>
```

- `data-correct="true"` 标记正确答案
- `data-why` 是答完后显示的解析
- 得分统计读取 `#practice` 里 `.q` 的数量，改题数不用改代码

## 设计说明

- **配色**：深色为主（`#08090b` 墨底 + `#4de3c1` 电光青），浅色为白天/打印。
- **字体**：系统无衬线（苹方 / SF Pro）+ 等宽（SF Mono），不加载外部字体，首屏零等待。
- **记忆点**：目录里的章节号用超大等宽数字，像终端行号；其余元素保持克制。
- **无障碍**：正确/错误不只靠颜色区分（对勾 / 叉 + 实心 / 虚线），键盘焦点可见，`prefers-reduced-motion` 生效。
- **移动端**：单列布局、搜索框 16px 字号（避免 iOS 自动放大）、思维导图横向滑动、目录自动隐藏。
