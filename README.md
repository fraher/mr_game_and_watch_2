# Mr. Game & Watch: Pixel Rescue

A browser-based NES-inspired 2D side-scroller built with vanilla JavaScript, canvas rendering, and npm scripts that produce a static GitHub Pages-ready site.

## Play

- **Arrow Left / Arrow Right**: move
- **Arrow Up / Spacebar**: jump
- **Spacebar / Enter**: start, retry, or replay
- **P**: pause / resume

## Features

- Start menu, pause screen, win screen, and retry menu.
- Full side-scrolling level with parallax backgrounds, platforms, collectibles, and a final bell objective.
- Animated pixel-art player, enemies, items, props, and HUD rendered directly to canvas for a consistent 8-bit look.
- Score, best score persistence, lives, timer, stomp bonuses, item bonuses, extra life, and level-clear time bonus.
- Static build output in `dist/` so the game can be deployed directly to GitHub Pages.

## Development

```bash
npm install
npm run dev
```

Open the printed localhost URL and play in the browser.

## Build for GitHub Pages

```bash
npm run build
```

The generated `dist/` directory contains `index.html`, `src/main.js`, and `src/style.css`. Configure GitHub Pages to serve the repository root or publish the `dist/` folder through your preferred workflow.
