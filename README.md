# hugo-antfustyle-theme

[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://youtzz.github.io/hugo-antfustyle-theme/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A **minimal** Hugo port of [antfu.me](https://antfu.me/) visuals — restrained typewriter / print aesthetic, not a kitchen-sink theme.

> 复古打字机 / 印刷感 / 工程师低调美学。克制移植，不为功能堆料。

| | |
| --- | --- |
| **Demo** | [youtzz.github.io/hugo-antfustyle-theme](https://youtzz.github.io/hugo-antfustyle-theme/) |
| **Real use / In production** | [keiwake.com](https://keiwake.com) |

## Features

- **Compact text lists** — home shows recent posts; archive groups by year (large year watermark)
- **Typewriter fonts** — system fallbacks only (JetBrains Mono → IBM Plex Mono → SF Mono → Menlo); no CDN
- **Print-like palette** — off-white `#FAFAF7` paper + charcoal `#1A1A1A` text; links inherit text color
- **Auto dark mode** — `prefers-color-scheme` + sun/moon toggle + `localStorage`
- **ArtPlum / ArtDots** — `[params.art]` registry + `active` / `pool` (extend via `extra`); respects `prefers-reduced-motion`
- **Awakestone-style「石」logo** — default brand mark (醒石 / Awakestone); replace via documented project override
- **Star dividers `* * *`** — antfu-style section breaks
- **Print stylesheet** — hides nav / comments / footer; appends URLs to external links
- **Theme credit** — footer defaults to a muted “Powered by Hugo Antfustyle Theme” line (disable via `themeCredit = false`)

## Quick Start (from zero)

Copy-paste path for an empty directory. You do **not** need this repo’s `exampleSite` to get a running site.

**Requirements:** Hugo ≥ `0.164.0` (developed against ~0.166.x; `theme.toml` `min_version`). Plain Hugo is enough — **Extended is not required** (plain CSS + minify/fingerprint, no Sass). Install from [gohugo.io](https://gohugo.io/installation/).

### 1. Create a site

```bash
hugo new site my-blog
cd my-blog
```

### 2. Add the theme (pick one)

**A. Git submodule** — the site directory must already be a git repo (`git submodule` fails with `fatal: not a git repository` otherwise):

```bash
git init
git submodule add https://github.com/youtzz/hugo-antfustyle-theme.git themes/hugo-antfustyle-theme
```

**B. Plain clone** (no git required in the site root):

```bash
mkdir -p themes
git clone https://github.com/youtzz/hugo-antfustyle-theme.git themes/hugo-antfustyle-theme
```

### 3. Minimal `hugo.toml`

Create or replace `hugo.toml` in the site root:

```toml
baseURL = "http://localhost:1313/"
title = "My Blog"
theme = "hugo-antfustyle-theme"

[params]
  description = "A short subtitle"

[[menus.main]]
  name = "Posts"
  url = "/posts/"
  weight = 10
```

### 4. First published post

```bash
hugo new content posts/hello.md
```

Edit `content/posts/hello.md` so it is **not** a draft (remove `draft: true`, or set `draft: false`), for example:

```markdown
---
title: "Hello"
date: 2026-09-22
draft: false
---

First post with **hugo-antfustyle-theme**.
```

### 5. Run & build

```bash
hugo server
# open http://localhost:1313/

hugo --minify
# success: site written under public/ with no errors
```

To preview drafts instead of publishing: `hugo server -D`.

### Already have a Hugo site?

```bash
# Clone into themes/
mkdir -p themes
git clone https://github.com/youtzz/hugo-antfustyle-theme.git themes/hugo-antfustyle-theme
# or, from a git-managed site root:
# git submodule add https://github.com/youtzz/hugo-antfustyle-theme.git themes/hugo-antfustyle-theme

# Enable in hugo.toml
echo 'theme = "hugo-antfustyle-theme"' >> hugo.toml
```

Requires Hugo ≥ `0.164.0` (developed against ~0.166.x; `theme.toml` `min_version`). **Hugo Extended is not required**. See [Configuration](#configuration) for params.

## Versioning & updates

This theme follows a **rolling `main`** model for now (no release tags yet). Track `main` tip for the latest, or **pin a commit SHA** when you need a frozen tree.

### Submodule

```bash
git -C themes/hugo-antfustyle-theme fetch origin
git -C themes/hugo-antfustyle-theme checkout main
git -C themes/hugo-antfustyle-theme pull --ff-only origin main
# pin instead of tip:
# git -C themes/hugo-antfustyle-theme checkout <commit-sha>
git add themes/hugo-antfustyle-theme
git commit -m "chore: bump hugo-antfustyle-theme"
```

Note: `checkout main` alone may leave a stale local `main` unchanged; the `pull --ff-only` (or explicit `checkout <sha>`) is what advances the pin. Prefer that over `git submodule update --remote` unless you have configured the submodule to track `main`.

### Plain clone

```bash
git -C themes/hugo-antfustyle-theme pull --ff-only origin main
# or pin:
# git -C themes/hugo-antfustyle-theme fetch origin && git -C themes/hugo-antfustyle-theme checkout <commit-sha>
```

## Configuration

Configure via `[params]` in your site `hugo.toml`:

```toml
[params]
  description = "Site subtitle"
  homeIntro = "A short intro; **Markdown** is fine"
  homeAbout = "A longer about blurb"
  homeRecentCount = 8
  homeRecentTitle = "Recent posts"
  homeAllPostsLabel = "View all posts"

  [[params.homeGroups]]
    label = "Writing about"
    [[params.homeGroups.items]]
      name = "Web"
      url = "/tags/web/"
    [[params.homeGroups.items]]
      name = "Design"
```

Omit `homeGroups.items.url` to render plain text (no fake links). Use `footerNote` for optional footer text.

Optional icons (omit either to skip that `<link>`):

```toml
[params]
  favicon = "/favicon.ico"
  appleTouchIcon = "/apple-touch-icon.png"
```

### Social share image

Used for `og:image` / `twitter:image`, and fills `BlogPosting.image` in the
JSON-LD. Use a 1200×630 image:

```toml
[params]
  socialImage = "/social-image.png"
```

By default a page in `mainSections` **never** falls back to it — its share image
must be its own (`image` / `cover` / `featuredImage` front matter). Set
`socialImageFallback = true` to let those pages fall back to the site image too:

```toml
[params]
  socialImageFallback = true
```

### Theme credit (`themeCredit`)

The footer shows a muted **Powered by [Hugo Antfustyle Theme](https://github.com/youtzz/hugo-antfustyle-theme)** line by default (common practice; not antfu branding).

```toml
[params]
  # Omit or true → show credit (default)
  themeCredit = false   # hide the default credit line
```

To replace the whole footer (or credit copy), soft-override `layouts/partials/hugo-antfustyle-theme/footer.html` in your site. To append extras without removing the credit, use `footer-extend.html` (see Project-level hooks).

### Page decoration (`[params.art]`)

Built-in registry: `plum` → `js/plum.js`, `dots` → `js/dots.js`. The loader mounts **only** from the registry. It waits for `load` / `requestIdleCallback` (2s timeout) before mounting, so the decoration script does not contend with first paint.

**Plum only:**

```toml
[params.art]
  active = "plum"
  pool = ["plum", "dots"]
```

**Dots only:**

```toml
[params.art]
  active = "dots"
  pool = ["plum", "dots"]
```

**Random from pool (uniform each load):**

```toml
[params.art]
  active = "random"
  pool = ["plum", "dots"]
```

`active`: `off` | registered name | `random`. Unknown name / empty `pool` → fail soft to off. Unconfigured default: `active=plum`.

#### Custom art (`extra`)

```toml
[params.art]
  active = "random"
  pool = ["plum", "dots", "spark"]

[params.art.extra.spark]
  # Path relative to assets/; key is the name for pool / active
  script = "js/art-spark.js"
```

Mount contract: clear `.page-decoration` → create `canvas#{name}-canvas` → load that script only.

#### Per-page override & compatibility

Front matter overrides `active` only:

```yaml
---
title: Some post
art: dots
---
```

Legacy `params.art = "dots"` (string) is treated as `active`. Missing `pool` → all built-ins.

`prefers-reduced-motion: reduce` acts as `off` (no mount, no script download).

## Project-level hooks

Optional extension points (define in your site, not the theme):

- `layouts/partials/custom_head.html` — head extras
- `layouts/partials/custom_body.html` — bottom-of-page scripts
- `layouts/partials/brand-logo.html` — replace the built-in brand logo (explicit hook, checked with `templates.Exists`; the theme renders its own default when absent)
- `layouts/partials/hugo-antfustyle-theme/hero-extend.html` — home extras
- `layouts/partials/hugo-antfustyle-theme/post-body-extend.html` — inside `.post-body` after content (e.g. signature)
- `layouts/partials/hugo-antfustyle-theme/post-extend.html` — post extras below the body (e.g. comments)
- `layouts/partials/hugo-antfustyle-theme/footer-extend.html` — footer extras (appends after the default credit)
- `layouts/partials/hugo-antfustyle-theme/footer.html` — soft-override to replace the entire footer (incl. credit)
- `layouts/partials/reading-time.html` — override reading-time label (theme ships a default)
- `assets/custom.css` — project CSS; Hugo template expressions OK; fingerprinted & minified

## Local preview (this repo)

```bash
mkdir -p exampleSite/themes
ln -sfn "$(pwd)" exampleSite/themes/hugo-antfustyle-theme
hugo --source exampleSite --minify
# or: hugo server --source exampleSite
```

For local serving, override baseURL if needed:

```bash
hugo server --source exampleSite --baseURL http://localhost:1313/
```

## Credits

- **Visual language / ArtPlum / ArtDots inspiration**: [antfu.me](https://antfu.me/) by [Anthony Fu](https://github.com/antfu). This theme’s **default logo is an Awakestone-style「石」mark**, not antfu’s `af` path. antfu.me’s **brand marks, images, and page content** remain under Anthony’s own rights; do not treat them as free for commercial reuse just because its site code is MIT. Sites can swap the logo via the `layouts/partials/brand-logo.html` hook (see Project-level hooks).
- Related Astro inspiration (not a dependency): [lin-stephanie/astro-antfustyle-theme](https://github.com/lin-stephanie/astro-antfustyle-theme)
- Built for [Hugo](https://gohugo.io/) ≥ 0.164.0 (Extended optional)

## Contributing

Issues and small PRs welcome. Prefer project-level hooks and `[params.art.extra]` over growing the theme into a kitchen sink. Please keep the visual language restrained.

## License

[MIT](LICENSE) © keishi
