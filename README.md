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

## Install

```bash
# Clone into your site's themes directory
cd /path/to/your-hugo-site/themes
git clone https://github.com/youtzz/hugo-antfustyle-theme.git hugo-antfustyle-theme

# Enable in hugo.toml
echo 'theme = "hugo-antfustyle-theme"' >> hugo.toml
```

Or as a git submodule:

```bash
git submodule add https://github.com/youtzz/hugo-antfustyle-theme.git themes/hugo-antfustyle-theme
```

Requires **Hugo Extended** ≥ `0.161.1` (developed against ~0.166.x).

### Keeping a submodule up to date

```bash
git -C themes/hugo-antfustyle-theme fetch --tags
git -C themes/hugo-antfustyle-theme checkout <tag-or-main>
git add themes/hugo-antfustyle-theme && git commit -m "chore: bump hugo-antfustyle-theme"
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

### Theme credit (`themeCredit`)

The footer shows a muted **Powered by [Hugo Antfustyle Theme](https://github.com/youtzz/hugo-antfustyle-theme)** line by default (common practice; not antfu branding).

```toml
[params]
  # Omit or true → show credit (default)
  themeCredit = false   # hide the default credit line
```

To replace the whole footer (or credit copy), soft-override `layouts/partials/hugo-antfustyle-theme/footer.html` in your site. To append extras without removing the credit, use `footer-extend.html` (see Project-level hooks).

### Page decoration (`[params.art]`)

Built-in registry: `plum` → `js/plum.js`, `dots` → `js/dots.js`. The loader mounts **only** from the registry.

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
- `layouts/partials/hugo-antfustyle-theme/brand-logo.html` — replace the default「石」logo via Hugo lookup order
- `layouts/partials/hugo-antfustyle-theme/hero-extend.html` — home extras
- `layouts/partials/hugo-antfustyle-theme/post-extend.html` — post extras (e.g. comments)
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

- **Visual language / ArtPlum / ArtDots inspiration**: [antfu.me](https://antfu.me/) by [Anthony Fu](https://github.com/antfu). This theme’s **default logo is an Awakestone-style「石」mark**, not antfu’s `af` path. antfu.me’s **brand marks, images, and page content** remain under Anthony’s own rights; do not treat them as free for commercial reuse just because its site code is MIT. Sites can swap the logo via `layouts/partials/hugo-antfustyle-theme/brand-logo.html`.
- Related Astro inspiration (not a dependency): [lin-stephanie/astro-antfustyle-theme](https://github.com/lin-stephanie/astro-antfustyle-theme)
- Built for [Hugo](https://gohugo.io/) (Extended)

## Contributing

Issues and small PRs welcome. Prefer project-level hooks and `[params.art.extra]` over growing the theme into a kitchen sink. Please keep the visual language restrained.

## License

[MIT](LICENSE) © keishi
