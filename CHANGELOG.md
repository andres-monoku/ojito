# Changelog

## v0.1.0 — MVP inicial

### Arquitectura
- Servidor standalone Express en puerto 3131
- Proxy reverse para cargar proyectos en iframe (mismo origen)
- Bridge script minimo inyectado automaticamente via proxy
- No modifica archivos del proyecto del usuario

### Inspector
- Inspeccion de elementos: tag, clase principal, ID
- FAB flotante con toggle de modo inspeccion
- Shortcut Ctrl+Shift+X (desktop)
- Highlight azul al hacer click en elementos

### Compatibilidad
- Astro, React/Vite, Next.js, HTML puro
- Deteccion automatica de framework y puerto
- Desktop y mobile (acceso por IP de red local)

### Integracion con Claude Code
- Slash command `/ojito` para activar desde cualquier proyecto
- Deteccion automatica del proyecto y servidor dev
- Muestra URLs de desktop y mobile

### Persistencia
- Target URL persiste en disco entre reinicios del servidor
- Servicio launchd para macOS (auto-start, auto-restart)

### Instalacion
- `install.sh` para setup inicial
- `update.sh` para actualizaciones desde GitHub
- `uninstall.sh` para limpieza completa
