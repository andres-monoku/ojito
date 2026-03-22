# Ojito

A standalone visual DOM inspector for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Runs as its own server — never modifies your project files.

## How it works

Ojito runs a small Express server on port 3131 that loads your project in an iframe. A minimal bridge script is injected dynamically into the iframe to detect clicks and send element info back to Ojito via `postMessage`. Your source code is never touched.

## Install

```bash
git clone https://github.com/donandresb/ojito.git ~/Documents/ojito
cd ~/Documents/ojito
bash install.sh
```

## Usage

In any Claude Code session:

```
/ojito
```

This will:
1. Start the Ojito server (port 3131) if not running
2. Detect your project's framework and dev server port
3. Start your project's dev server if needed
4. Open Ojito with your project loaded

Then open `http://localhost:3131` in your browser.

## Shortcuts

Click any element in the iframe to see its tag, class, and ID in the right panel.

## Supported frameworks

Astro, React/Vite, Next.js, plain HTML.

## Uninstall

```bash
cd ~/Documents/ojito
bash uninstall.sh
```

## License

MIT
