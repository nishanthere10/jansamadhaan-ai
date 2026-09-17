# UX4G CSS — vendored, intentionally **not** linked

These stylesheets are the **UX4G (User Experience for Government)** design system,
India's official government design standard.

| | |
|---|---|
| **Version** | UX4G v2.0.8 |
| **Upstream** | https://doc.ux4g.gov.in |
| **Authors** | The UX4G Authors · © 2024-2025 NeGD, MeitY |
| **Licence** | MIT |
| **`ux4g.css`** | 12,619 lines · ~349 KB · 2,172 class selectors · 369 `--bs-*` custom properties · 1,689 `!important` · **0 `@layer`** |

## What it actually is

It is a **forked and extended Bootstrap 5 distribution**, rebranded for Indian
government use. The `--bs-*` variable prefix, plus `.navbar`, `.form-control`,
`.modal`, `.accordion`, `.dropdown`, `.btn-group`, `.nav-link`, `.table-striped`,
`.col-md` and `.progress-bar`, all come straight from Bootstrap. NeGD/MeitY then
layered on government-specific additions (see the `/* v10.2 new code */` blocks):
`.gov-icons`, state/UT/country/social icon sprites, avatars, progress circles,
a custom dual range slider, `nav-underline-rounded` and table radius variants.

Its theme colour is **`#613AF5` (purple)** — `--bs-primary` and `--bs-link-color`
both resolve to it.

## Why it is not linked from `index.html`

1. **It is unlayered CSS.** Per the CSS Cascade Layers spec, unlayered
   declarations beat declarations inside `@layer`. Tailwind v4 emits *all* of its
   utilities into `@layer utilities`. So UX4G's rules silently outranked
   Tailwind on every colliding class name — `body`, `a`, `.border`, `.text-center`,
   `.gap-*`, `.p-*`, `.mb-*`, `.shadow-*`, `.bg-primary`, `.bg-secondary`, and so on —
   regardless of source order or intent.
2. **It hijacked our theme.** `.bg-primary`/`.bg-secondary` carried
   `!important` with UX4G's purple, overriding our `--primary`/`--secondary`
   tokens on 14 buttons/badges.
3. **It imposed a foreign spacing scale.** UX4G's spacer scale is
   `3 = 1rem, 4 = 1.5rem, 5 = 3rem`; Tailwind's is `0.75 / 1 / 1.25rem`. Roughly 200
   spacing utilities across the app were rendering at UX4G's larger values.
4. **Its own assets 404.** `ux4g.css` references `../fonts/NotoSans-*.woff2`,
   `../img/common-gov-icons/…`, `../img/state-icon/…`, `../img/ut-icon/…`,
   `../img/country-icons/…`, `../img/social-icons/…` and `../images/search.svg`.
   None of those directories exist in `public/`, so the `@font-face` and every
   government icon class were silently broken.
5. **We were not using it anyway.** Of 2,172 UX4G classes, ~83 appeared as class
   tokens in markup — and essentially all of those were Tailwind utilities that
   merely collide by name. `d-flex`, `nav-link`, `form-control` and
   `table-striped` had **zero** usages, and `--bs-*` had **zero** references
   anywhere in the app (vs. 450 references to our own `--cr-*` tokens).

The values UX4G was genuinely imposing were re-declared by us in
`frontend/index.css` under **"UX4G CONTINUITY TOKENS"**, so the rendered result is
unchanged while ownership sits with us.

## Files here

`ux4g.css` is the only file that was ever referenced. The other 16 files
(`ux4g-min.css`, `ux4g-grid*`, `ux4g-reboot*`, `ux4g-utilities*`, `ux4g-date-time.css`,
`ux4g.rtl*`) are **not** referenced by any HTML, CSS or TS/TSX file — verified: no
`@import` statements exist in any file in this directory. They are retained on
purpose (see `DEAD_CODE_REGISTER.md`): they are part of the official design
standard and we may want the grid, RTL, utilities or date-time layer later.

## Policy

- **Do not edit these files.** Treat them as read-only vendor code.
- **Do not bridge `--bs-*` into `--cr-*`.** Our design system lives in
  `frontend/index.css`; if we need a UX4G value, copy the value across
  explicitly and document it.
- **Do not re-link `ux4g.css` globally.** If a specific screen genuinely needs
  UX4G components, scope it to that route instead of applying it application-wide.

## If you must re-enable it

Uncomment the link in `frontend/index.html`, but first neutralise the cascade
problem by importing it into a low-priority layer (rather than a plain
`<link>`), so our Tailwind layers keep winning:

```css
/* frontend/index.css — must come before other layer declarations */
@import url("/css/ux4g.css") layer(vendor);
```

Then restage the `--spacing-3/4/5` and `--shadow-*` overrides in
`frontend/index.css`, since `ux4g.css` will otherwise reintroduce its own
`!important` values for those names.
