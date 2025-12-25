# Oraxen Documentation Site

This is the documentation site for Oraxen, a Minecraft plugin for custom items, blocks, and furniture.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + Nextra 4 (Docs theme) + React 19 + TypeScript 5
- **Runtime/PM**: Bun (see `bun.lock`)
- **Deployment**: Vercel (auto-deploys from `main` branch)

## Commands

```bash
bun install      # Install dependencies
bun run dev      # Start dev server
bun run build    # Production build (includes type checking)
bunx tsc --noEmit # Type-only check (faster local check)
```

## Project Structure

```
app/
├── layout.tsx                 # Wraps pages with nextra-theme-docs Layout/Navbar
└── [[...mdxPath]]/page.tsx    # Dynamic MDX route using nextra/pages

content/                       # MDX docs and _meta.js for sidebar ordering
├── _meta.js                   # Root sidebar configuration
├── configuration/             # Configuration docs
├── mechanics/                 # Mechanics docs
├── themes/                    # Theme examples
└── ...

public/                        # Static assets
├── logo_lowres.png           # Pixel art logo (render with imageRendering: pixelated)
└── ...
```

## Content Authoring

- Create `.mdx` files in `content/`
- Update `_meta.js` for navigation order
- Use `nextra/components` (`Callout`, `Tabs`, `Bleed`) in MDX
- KaTeX/LaTeX is enabled: use `$...$` or `$$...$$`
- Images: Markdown `![Alt](...)` works; Next/Image is also supported

## Conventions

- **Strict TypeScript**: Keep `tsconfig` strict; no `any` unless necessary
- **ESM only**: Use modern ESM imports; no CommonJS
- **Server components by default**: Add `"use client"` only when needed
- **Prefer early returns**: Avoid unnecessary try/catch
- **Descriptive names**: Avoid 1-2 char identifiers

## Logo Rendering

The logo (`/public/logo_lowres.png`) is pixel art and must render with:
```css
imageRendering: "pixelated"
```

## Verification

Always verify the site builds and types are correct after edits:
```bash
bun run build
```
