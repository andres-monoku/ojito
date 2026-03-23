# Ojito

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-orange.svg)](https://docs.anthropic.com/en/docs/claude-code)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)

> Inspector visual de elementos para flujos de desarrollo con Claude Code.

Ojito es un servidor standalone que te permite inspeccionar cualquier proyecto web desde desktop y mobile, sin modificar archivos del proyecto ni depender del DevTools del navegador.

## El problema

Cuando trabajas en un proyecto web con Claude Code, necesitas inspeccionar elementos rapidamente para saber el tag, clase o ID de un componente. Abrir DevTools no siempre es practico (especialmente en mobile), y las herramientas de inspeccion tradicionales requieren inyectar codigo en tu proyecto.

## Caracteristicas

- **Inspector visual standalone** -- no toca ni modifica tu proyecto
- **Desktop y mobile** desde la misma sesion (acceso por IP local)
- **Un solo comando**: `/ojito` en Claude Code
- **Inspeccion de elementos** con tag, clase e ID
- **Compatible con cualquier framework**: Astro, React, Vite, Next.js, HTML puro
- **Servidor persistente** con launchd (macOS) -- arranca solo y se reinicia si cae
- **Target persistente** -- recuerda el ultimo proyecto entre reinicios

## Como funciona

```
Claude Code              Ojito Server (3131)           Tu Proyecto
    |                         |                            |
    |--- /ojito ------------->|                            |
    |                         |--- proxy reverse --------->|
    |                         |<-- HTML + bridge inject ---|
    |                         |                            |
    Browser (desktop/mobile)  |                            |
    |--- localhost:3131 ----->|                            |
    |    o IP:3131            |                            |
    |                         |                            |
    |   [iframe via proxy] ---|--- fetch assets ---------->|
    |   [bridge.js]           |                            |
    |     click element       |                            |
    |     postMessage ------->|                            |
    |                    [panel derecho muestra tag/class/id]
```

1. `/ojito` detecta tu proyecto, levanta su servidor dev, y registra la URL en Ojito
2. Ojito sirve tu proyecto a traves de un proxy reverse (mismo origen)
3. Un bridge script minimo se inyecta automaticamente en el HTML proxeado
4. Al hacer click en un elemento, el bridge envia tag/clase/ID al panel de Ojito

## Instalacion

### Requisitos

- Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- Git

### Pasos

```bash
git clone https://github.com/andres-monoku/ojito.git ~/Documents/ojito
cd ~/Documents/ojito
bash install.sh
```

El instalador:
- Instala dependencias del servidor
- Genera el comando `/ojito` en `~/.claude/commands/`

### Servicio persistente (opcional, macOS)

Para que Ojito arranque automaticamente al encender el Mac:

```bash
cp com.ojito.server.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ojito.server.plist
```

## Uso

1. Abre Claude Code en cualquier proyecto web
2. Escribe `/ojito`
3. Abre la URL que te muestra:
   - **Desktop**: `http://localhost:3131`
   - **Mobile**: `http://TU_IP:3131` (misma red WiFi)
4. Activa el inspector con el boton ojo o `Ctrl+Shift+X`
5. Haz click en cualquier elemento para ver su info

## Actualizacion

```bash
cd ~/Documents/ojito
bash update.sh
```

## Estructura del proyecto

```
ojito/
├── server/
│   ├── index.js          # Servidor Express + proxy reverse
│   └── package.json
├── app/
│   ├── index.html        # UI de Ojito
│   ├── app.js            # Logica del cliente
│   └── styles.css        # Estilos (responsive)
├── injector/
│   └── ojito-bridge.js   # Script minimo inyectado en el iframe
├── commands/
│   └── ojito.md          # Slash command para Claude Code
├── install.sh            # Instalador
├── uninstall.sh          # Desinstalador
└── update.sh             # Actualizador
```

## Desinstalar

```bash
cd ~/Documents/ojito
bash uninstall.sh
```

Para remover el servicio de launchd:

```bash
launchctl unload ~/Library/LaunchAgents/com.ojito.server.plist
rm ~/Library/LaunchAgents/com.ojito.server.plist
```

## Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b mi-feature`
3. Haz tus cambios y commitea
4. Push y abre un Pull Request

## Licencia

MIT
