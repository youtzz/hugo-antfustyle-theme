# hugo-antfustyle-theme

> A Hugo theme inspired by [antfu.me](https://antfu.me/).

复古打字 / 印刷感 / 工程师低调美学。

## 特性

- **纯文本紧凑列表**：首页展示最近文章，文章归档按年份分组（年份作为大水印字）
- **Typewriter 字体**：纯系统字体 fallback（JetBrains Mono → IBM Plex Mono → SF Mono → Menlo），无外部 CDN 依赖
- **印刷感配色**：off-white `#FAFAF7` 纸面 + 深炭 `#1A1A1A` 文字 + 链接继承文字色（无蓝色强调）
- **自动暗色**：`prefers-color-scheme` + 手动 sun/moon 切换 + localStorage 持久化
- **ArtPlum / ArtDots 装饰**：对齐 antfu.me；`[params.art]` 注册表 + `active`/`pool`（可 `extra` 扩展）；尊重 `prefers-reduced-motion`
- **手绘 `af` logo**：使用 antfu.me 真实 SVG path
- **星号行 `* * *`**：标志性 antfu 风格分节符号
- **打印 stylesheet**：自动隐藏导航 / 评论 / 页脚，外链附带 URL

## 安装

```bash
# 作为 Hugo 站点的主题使用
cd /path/to/your-hugo-site/themes
git clone https://github.com/youtzz/hugo-antfustyle-theme.git hugo-antfustyle-theme

# 在 hugo.toml 中启用
echo 'theme = "hugo-antfustyle-theme"' >> hugo.toml
```

或者作为 git submodule：

```bash
git submodule add https://github.com/youtzz/hugo-antfustyle-theme.git themes/hugo-antfustyle-theme
```

## 配置

主题通过 `hugo.toml` 的 `[params]` 块配置：

```toml
[params]
  description = "你的站点副标题"
  homeIntro = "一段支持 **Markdown** 的首页介绍"
  homeAbout = "一段更完整的自我介绍"
  homeRecentCount = 8
  homeRecentTitle = "最近文章"
  homeAllPostsLabel = "查看全部文章"

  [[params.homeGroups]]
    label = "Writing about"
    [[params.homeGroups.items]]
      name = "Web"
      url = "/tags/web/"
    [[params.homeGroups.items]]
      name = "Design"
```

`homeGroups.items.url` 可省略；没有链接的项目会渲染为普通文本，不会生成假链接。`footerNote` 可用于页脚附加文本。

### 页面装饰（art）

主题内置注册表：`plum` → `js/plum.js`，`dots` → `js/dots.js`。Loader **只按注册表**挂载，不硬编码种类。

#### 三种常见用法

只要树枝：

```toml
[params.art]
  active = "plum"
  pool = ["plum", "dots"]
```

只要原点：

```toml
[params.art]
  active = "dots"
  pool = ["plum", "dots"]
```

在启用列表里随机（每次加载均匀抽取）：

```toml
[params.art]
  active = "random"
  pool = ["plum", "dots"]
```

`active`：`off` | 已注册 name | `random`。未知 name / 空 `pool` → fail soft 为关闭。主题未配置时默认 `active=plum`（兼容旧站）。

#### 自定义 art（extra）

```toml
[params.art]
  active = "random"
  pool = ["plum", "dots", "spark"]

[params.art.extra.spark]
  # 相对 assets/ 的路径；key 即 name，可进 pool / 被 active 点名
  script = "js/art-spark.js"
```

挂载约定：清空 `.page-decoration` → 建 `canvas#{name}-canvas`（如 `plum-canvas` / `dots-canvas`）→ 只加载对应脚本。

#### 页面覆盖与兼容

单页 front matter 只覆盖 `active`：

```yaml
---
title: 某篇文章
art: dots
---
```

向后兼容：旧式 `params.art = "dots"`（字符串）视作 `active`；未写 `pool` 时 pool = 全部内置。

`prefers-reduced-motion: reduce` 等价 `off`（不挂载、不下载脚本）。

## 项目级扩展

主题提供以下可选扩展点：

- `layouts/partials/custom_head.html`：`head` 相关扩展
- `layouts/partials/custom_body.html`：页面底部脚本
- `layouts/partials/hugo-antfustyle-theme/hero-extend.html`：首页补充内容
- `layouts/partials/hugo-antfustyle-theme/post-extend.html`：文章页补充内容
- `layouts/partials/hugo-antfustyle-theme/footer-extend.html`：页脚补充内容
- `assets/custom.css`：项目样式；支持 Hugo template 表达式，主题会压缩并生成指纹

## 本地验证

仓库内置最小示例站点。在主题仓库根目录运行：

```bash
hugo --source exampleSite --themesDir ../..
```

## 文件结构

```
hugo-antfustyle-theme/
├── theme.toml                # 主题元数据
├── LICENSE # MIT
├── archetypes/
│   └── default.md            # 新文章默认 front matter
├── assets/
│   ├── css/
│   │   └── main.css          # 主样式（typewriter + 暗色 + print）
│   └── js/
│       ├── plum.js           # ArtPlum canvas 算法
│       ├── dots.js           # ArtDots 原点场（canvas + simplex）
│       └── theme.js          # 暗色切换 + 回到顶部
├── layouts/
│   ├── _default/
│   │   ├── baseof.html       # 基础骨架
│   │   ├── list.html         # 列表页（年份水印 + 紧凑列表）
│   │   ├── single.html       # 文章详情
│   │   └── terms.html        # 标签 / 分类
│   ├── partials/hugo-antfustyle-theme/
│   │   ├── header.html       # 顶部一行（logo + nav + social）
│   │   └── footer.html       # 页脚 + JS 加载
│   ├── index.html            # 首页简介 + 最近文章
│   └── 404.html              # 错误页
└── exampleSite/              # 最小可构建示例
```

## 致谢

- 设计灵感 + 算法来源：[antfu.me](https://antfu.me/)
- 适用于 [Hugo](https://gohugo.io/) 静态站点生成器

## License

[MIT](LICENSE)
