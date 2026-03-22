#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  Installing Ojito..."
echo ""

# Install server dependencies
cd "$SCRIPT_DIR/server"
npm install --silent

# Create command directory
mkdir -p ~/.claude/commands

# Generate slash command
cat > ~/.claude/commands/ojito.md << 'OJITO_CMD'
Activa Ojito (inspector visual standalone) y muestra las URLs de acceso.

## Paso 1: Verificar/levantar servidor de Ojito

Ejecuta: `lsof -ti:3131` para ver si el servidor de Ojito ya corre.

Si NO corre:
- Ejecuta en background: `cd ~/Documents/ojito/server && npm start`
- Espera 2 segundos
- Verifica de nuevo con `lsof -ti:3131`

Si YA corre: continua al Paso 2.

## Paso 2: Detectar proyecto y URL del target

1. Si el directorio actual tiene `package.json`, ese es PROYECTO_ROOT.
2. Si NO, escanea subcarpetas (maximo 3 niveles):
   `find . -maxdepth 3 -name "package.json" -not -path "*/node_modules/*" -not -path "*/.git/*"`
3. Si hay multiples resultados, detecta el framework de cada uno y usa `AskUserQuestion` para que el usuario elija.
4. Si no hay ningun package.json, busca index.html (HTML puro).

Detectar framework y puerto:
- `astro.config.*` → Astro, default 4321
- `vite.config.*` (sin astro) → Vite, default 5173
- `next.config.*` → Next.js, default 3000
- Sin config → HTML puro, default 8080

Busca puerto custom en config del framework o en scripts de package.json.

## Paso 3: Verificar/levantar servidor del proyecto

Ejecuta: `lsof -ti:PUERTO` para ver si el servidor del proyecto corre.

Si NO corre, levantalo segun el framework:
- Astro: `cd PROYECTO_ROOT && npx astro dev --host --port PUERTO`
- Vite: `cd PROYECTO_ROOT && npx vite --host --port PUERTO`
- Next.js: `cd PROYECTO_ROOT && npx next dev -H 0.0.0.0 -p PUERTO`
- HTML puro: `cd PROYECTO_ROOT && npx --yes serve -l tcp://0.0.0.0:PUERTO .`

Si hay script `dev:mobile` con --host en package.json, usa `npm run dev:mobile` en su lugar.

Espera 4 segundos y verifica.

## Paso 4: Registrar target y mostrar URLs

Ejecuta:
`curl -s -X POST http://localhost:3131/api/target -H "Content-Type: application/json" -d '{"url":"http://localhost:PUERTO"}'`

Obtiene IP de red con: `ipconfig getifaddr en0` (Mac) o `hostname -I` (Linux)

Muestra SOLO esto, nada mas:
```
👁 Ojito listo
  Desktop: http://localhost:3131
  Mobile:  http://IP:3131
```

## REGLAS
- NUNCA modificar archivos del proyecto del usuario
- NUNCA inyectar scripts en el proyecto
- NUNCA usar python, open, xdg-open
- NUNCA crear archivos HTML de demo/mockup
- El servidor de Ojito siempre es puerto 3131
- Solo usar npx serve para proyectos HTML puro sin framework
OJITO_CMD

echo "  ✓ Ojito instalado correctamente"
echo "    Usa /ojito en Claude Code para activarlo"
echo ""
