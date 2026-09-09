# antpress

> A Hugo theme inspired by [antfu.me](https://antfu.me/).

复古打字 / 印刷感 / 工程师低调美学。

## 特性

- **纯文本紧凑列表**：首页按年份分组（年份作为大水印字），每条文章以「标题 + 日期 · 阅读时长 · 中文/English 标签」展示
- **Typewriter 字体**：纯系统字体 fallback（JetBrains Mono → IBM Plex Mono → SF Mono → Menlo），无外部 CDN 依赖
- **印刷感配色**：off-white `#FAFAF7` 纸面 + 深炭 `#1A1A1A` 文字 + 链接继承文字色（无蓝色强调）
- **自动暗色**：`prefers-color-scheme` + 手动 sun/moon 切换 + localStorage 持久化
- **ArtPlum canvas 装饰**：移植自 antfu.me 真实的 `ArtPlum.vue` L-system 算法，每次访问随机生成羽毛/枝叶装饰
- **手绘 `af` logo**：使用 antfu.me 真实 SVG path
- **星号行 `* * *`**：标志性 antfu 风格分节符号
- **打印 stylesheet**：自动隐藏导航 / 评论 / 页脚，外链附带 URL

## 安装

```bash
# 作为 Hugo 站点的主题使用
cd /path/to/your-hugo-site/themes
git clone https://github.com/leon/antpress.git antpress

# 在 hugo.toml 中启用
echo 'theme = "antpress"' >> hugo.toml
```

或者作为 git submodule：

```bash
git submodule add https://github.com/leon/antpress.git themes/antpress
```

## 配置

主题通过 `hugo.toml` 的 `[params]` 块配置：

```toml
[params]
  description = "你的站点副标题"
```

`theme-config.toml` 后台配置项（如果有）：
- `footerNote`：页脚附加文本（可选）

## 自定义 hero 内容

hero 大字姓名取自 `site.Title`。副标题取自 `site.Params.description`。

hero 区下方的「开发者 / Working at / Writing about / Reading / Listening to」分组行在 `layouts/index.html` 中硬编码——直接编辑该文件修改你自己的内容。

## 文件结构

```
antpress/
├── theme.toml                # 主题元数据
├── LICENSE # MIT
├── archetypes/
│   └── default.md            # 新文章默认 front matter
├── assets/
│   ├── css/
│   │   └── main.css          # 主样式（typewriter + 暗色 + print）
│   └── js/
│       ├── plum.js           # ArtPlum canvas 算法
│       └── theme.js          # 暗色切换 + 中文标签
├── layouts/
│   ├── _default/
│   │   ├── baseof.html       # 基础骨架
│   │   ├── list.html         # 列表页（年份水印 + 紧凑列表）
│   │   ├── single.html       # 文章详情
│   │   └── terms.html        # 标签 / 分类
│   ├── partials/
│   │   ├── header.html       # 顶部一行（logo + nav + social）
│   │   └── footer.html       # 页脚 + JS 加载
│   ├── index.html            # 首页 antfu /posts 风格
│   └── 404.html              # 错误页
└── static/                   # 静态资源（如截图）
```

## 致谢

- 设计灵感 + 算法来源：[antfu.me](https://antfu.me/)
- 适用于 [Hugo](https://gohugo.io/) 静态站点生成器

## License

[MIT](LICENSE)