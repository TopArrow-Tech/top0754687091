# 项目总览

## 标识

- 应用 ID：xiaoxiaole
- 显示名：消消乐
- 版本：0.1.0
- 运行时：node

## 技术栈

- 语言 / 运行时：Node.js（平台 Node 24），无 npm 依赖
- 数据库：SQLite（`node:sqlite`），文件在 `TOPARROW_DATA_DIR`
- 前端：原生 HTML / CSS / JS 模块，糖果图是本地 SVG

## 目录结构

```text
./
├── manifest.json
├── package.json
├── server.js
├── lib/db.js
├── public/
│   ├── index.html
│   ├── favicon.svg
│   ├── assets/          # 糖果 SVG
│   ├── css/game.css
│   └── js/
│       ├── main.js
│       ├── view.js
│       ├── audio.js     # Web Audio 合成音效
│       ├── rules.js
│       ├── levels.js
│       └── i18n.js
├── test/
├── AGENTS.md
├── _doc/
└── _aiact/
```

## 功能模块

| 模块 | 说明 | 关键路径 |
| --- | --- | --- |
| 服务 | 静态页面、健康检查、语言和关卡存档 | `server.js`、`lib/db.js` |
| 规则 | 交换、三连、特殊糖、分段重力、地图缺口、冰块、重排、星级 | `public/js/rules.js` |
| 关卡 | 16 关：每关独立地形、目标、步数、难度指数与星级线 | `public/js/levels.js` |
| 界面 | 首页、章节地图选关、计分动画说明、对局、中英文、游戏区禁右键 | `public/js/main.js`、`public/js/view.js`、`public/css/game.css` |
| 音效 | 点击、交换、消除、连锁、冰块、提示、过关；可静音 | `public/js/audio.js` |
| 文案 | 中文 / 英文 | `public/js/i18n.js` |

## 注意事项

- 本应用在本机顶箭上运行，不部署到云或其它服务器。
- 资源必须本地化，不要引用外部网络。
- `manifest.json` 的 `id` 是 `xiaoxiaole`，发布后不能改。
- 端口只读 `TOPARROW_APP_PORT`，数据目录只读 `TOPARROW_DATA_DIR`。本机没有这两个变量时，端口用 `39271`，数据放在项目下的 `data/`，方便自己打开页面。
- 对局区域（棋盘和提示按钮）会拦住右键菜单。首页和选关页不拦。
- 棋盘有最大边长（约 528px），窗口变大或浏览器缩小页面时不会再撑满整屏高度；窗口变小才会跟着缩小。
- 每关 `layout` 用 8 行 `#` / `.` 描述可玩格和地图缺口；规则按缺口分段下落，选关卡片显示同一张地形缩略图。
- `difficultyIndex` 只用于选关比较，按步数、缺格、冰层和目标工作量计算并封顶 5；不参与消除得分。
- 计分由 `rules.js` 执行：每颗清除糖果 10 分、连锁轮次倍率、每触发一个特殊糖 50 分；规则弹层用本地 SVG 动画演示。
