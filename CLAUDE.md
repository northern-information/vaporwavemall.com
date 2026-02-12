# vaporwavemall.com

Gallery of interactive streaming assets.

## Build

```sh
npm install
npm run build        # TypeScript + Tailwind CSS + Eleventy → dist/
npm run dev          # Eleventy dev server
npm run dev:css      # Tailwind CSS watch (separate terminal)
npm run dev:ts       # TypeScript watch (separate terminal)
npm run pretty       # Format with Prettier
```

## Structure

```
src/
  includes/
    layouts/         # Liquid layout templates
    head.liquid      # Shared <head> partial
  data/
    site.json        # Global site data (title, description, url)
  pages/             # Content pages (markdown)
    pages.json       # Default layout for all pages
  assets/
    stylesheets/
      style.css      # Tailwind 4 source CSS
    javascript/      # Compiled JS (build artifact, gitignored)
    images/
  index.md           # Home page
  404.html           # Error page
  ts/                # TypeScript source files
    lib/             # Shared modules (e.g. game-of-life.ts)
eleventy.config.js   # Eleventy config (ES module)
tsconfig.json        # TypeScript config
package.json
```

## Conventions

- Templates use Liquid (`.liquid`)
- Tailwind 4 CSS-first config (no `tailwind.config.js`); custom properties defined in `@theme` block in `style.css`
- Tailwind input: `src/assets/stylesheets/style.css` → output: `src/assets/stylesheets/style.built.css`
- Eleventy input: `src/` → output: `dist/`
- ES module syntax throughout (`"type": "module"` in package.json, `export default` in eleventy config, `type="module"` on script tags)
- TypeScript source in `src/ts/` compiles to `src/assets/javascript/` (build artifact, gitignored)
- Shared TS modules in `src/ts/lib/` (e.g. `GameOfLife` class)
- Each interactive page has its own layout and TS file
- Front matter `layout:` references are relative to `src/includes/layouts/`
- No jQuery, no Bootstrap — vanilla JS and Tailwind only
- Prettier with `@shopify/prettier-plugin-liquid` and `prettier-plugin-tailwindcss`
- Deployed via Cloudflare Pages (build command: `npm run build`, output dir: `dist`)
