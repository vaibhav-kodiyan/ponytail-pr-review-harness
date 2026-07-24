<figure>
<img width="1012" height="506" alt="image" src="https://github.com/user-attachments/assets/c647015e-6538-43de-8c26-6d6358c89729" />
<figcaption>
  Foto de <a href="https://unsplash.com/@luandmario?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Maria Lupan</a> en <a href="https://unsplash.com/photos/red-and-black-metal-tower-during-sunset-hy97yy3e03A?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
</figcaption>
</figure>

---
Rig es una caja de herramientas curada e independiente del host para agentes de
programación. Tier 1 instala un flujo de trabajo solo de Markdown en cualquier
repositorio: un router compartido, una regla de implementación Ponytail siempre
activa y skills enfocadas para intención, diseño, ejecución, TDD, depuración y
revisión de código.

No inicia procesos, no necesita claves de API y no instala dependencias.

## Instalar Tier 1

Desde este checkout:

```sh
sh rig/bootstrap.sh --target /path/to/repository
```

Tier 1 actualmente se instala desde un checkout local de Rig. La ruta de
bootstrap con release/git-ref fijado que describe el diseño fundacional todavía
no está publicada.

El bootstrap pregunta por el tier cuando se ejecuta de forma interactiva. La
automatización puede tomar la misma decisión explícitamente:

```sh
sh rig/bootstrap.sh --tier 1 --target /path/to/repository
```

Para limitar la instalación a hosts concretos (el mismo gating que el materializer de Tier 2):

```sh
sh rig/bootstrap.sh --tier 1 --target /path/to/repository --hosts antigravity,codex
# o: RIG_HOSTS=antigravity,codex sh rig/bootstrap.sh --tier 1 --target /path/to/repository
```

La selección de hosts requiere `node` en el `PATH`. La instalación completa por
defecto sigue siendo solo POSIX `sh`.

Tier 1 instala el mismo conjunto de instrucciones para estos entrypoints de
host:

- Claude Code recibe skills de proyecto en `.claude/skills/` y un puntero al
  router en `CLAUDE.md`.
- Codex recibe skills nativas de proyecto en `.agents/skills/` más el puntero
  siempre activo al router en `AGENTS.md`.
- Antigravity co-lee ese mismo árbol `.agents/` (skills/rules), más `GEMINI.md`
  (los overrides específicos de Antigravity ganan sobre `AGENTS.md`) y workflows
  de slash commands en `.agents/workflows/`.
- OpenCode, CodeWhale, Swival y otros lectores de `AGENTS.md` reciben un puntero
  raíz.
- Gemini CLI recibe un puntero en `GEMINI.md`.
- Cursor, Windsurf, Cline, GitHub Copilot, Kiro y lectores de `.agents/rules`
  reciben sus archivos nativos de instrucciones de proyecto.

Cada adaptador lee `.rig/routing.md`. Claude y Codex también descubren las
mismas siete skills de forma nativa desde sus directorios de host. Los
entrypoints de host existentes se preservan.

Esos árboles de skills nativas están versionados en este repositorio en
`.claude/skills/` y `.agents/skills/`; el bootstrap los copia sin cambios en los
repositorios destino.

| Host | Entrypoint instalado |
|---|---|
| Claude Code | `CLAUDE.md`, `.claude/skills/rig-*/SKILL.md` |
| Cursor | `.cursor/rules/rig.mdc` |
| Windsurf | `.windsurf/rules/rig.md` |
| Cline | `.clinerules/rig.md` |
| GitHub Copilot editor/CLI | `.github/copilot-instructions.md`, `AGENTS.md` |
| Codex / VS Code Codex | `AGENTS.md`, `.agents/skills/rig-*/SKILL.md` |
| Gemini CLI | `GEMINI.md` |
| Antigravity | `AGENTS.md`, `GEMINI.md`, `.agents/rules/rig.md`, `.agents/skills/rig-*/SKILL.md`, `.agents/workflows/` |
| Kiro | `.kiro/steering/rig.md` |
| OpenCode, CodeWhale, Swival | `AGENTS.md` |
| Otros agentes | Configura el host para leer `.rig/routing.md`, o agrega el puntero de una línea de `rig/tier-1/adapters/pointer.md` a sus instrucciones de proyecto. |

### Hermes Agent

Instala Rig como plugin nativo de Hermes (`plugin.yaml`): inyecta el modo
activo vía `pre_llm_call`, registra el cambio de modo `/rig` y expone las
skills como `rig:<skill>`.

## Instalar Tier 2 (MCP)

Tier 2 "Basic" agrega una capacidad sobre Tier 1: un **configurador de MCP
multi-host con credenciales**. Declara un servidor MCP y sus slots de credencial
una vez, y Rig emite la config correcta para cada host que seleccionaste, escribe
`.env.example`, agrega `.env` al gitignore e instala un guard de secretos para
que ninguna clave llegue a git. Sigue sin iniciar procesos y sin almacenar
valores de secretos.

```sh
node rig/materialize.js --target /path/to/repository --manifest rig.config.json
```

La desinstalación elimina solo los archivos y entradas MCP que Rig posee:

```sh
node rig/materialize.js --target /path/to/repository --uninstall
```

### Manifiesto

`rig.config.json` selecciona hosts y declara servidores MCP. Las credenciales
son **solo nombres de variables de entorno**, nunca valores; el validador
rechaza cualquier cosa con forma de clave.

```json
{
  "hosts": ["claude", "cursor", "codex"],
  "mcp_servers": [
    {
      "name": "app-db",
      "variants": [
        {
          "id": "stdio",
          "transport": "stdio",
          "credential_safety": "manual_note_required",
          "command": "npx",
          "args": ["-y", "@example/db-mcp"],
          "credentials": ["APP_DB_TOKEN"]
        }
      ]
    }
  ]
}
```

Para un servidor remoto usa `"transport": "http"` con `"url"` en vez de
`command`/`args`.

### Comportamiento MCP por host

Rig emite un archivo de config MCP nativo para cada host que soporta uno, y una
nota manual para el resto. Cursor y GitHub Copilot cargan el secreto desde
`.env` / inputs por sí solos; los demás hosts que emiten también imprimen una
nota para cablear la variable de entorno.

| Host | Archivo MCP emitido |
|---|---|
| Claude Code | `.mcp.json` |
| Cursor | `.cursor/mcp.json` |
| Codex / VS Code Codex | `.codex/config.toml` |
| GitHub Copilot | `.vscode/mcp.json` |
| OpenCode | `opencode.json` |
| pi | `.omp/mcp.json` |
| Gemini CLI | `.gemini/settings.json` |
| Kiro | `.kiro/settings/mcp.json` |
| Devin | `.devin/config.json` |
| OpenClaw | `.openclaw/openclaw.json` |
| CodeWhale | `.codewhale/mcp.json` |
| Swival | `.swival/mcp.json` |
| Windsurf, Cline, Hermes, Copilot CLI, Antigravity | solo nota — sin archivo MCP nativo |
| `generic` | no soportado para MCP |

La sintaxis de token y la mecánica de credenciales por host están documentadas
en `docs/agent-portability.md` y
`project-dev-docs/tier-2-design-docs/basic/basic-design.md`.

## Columna vertebral de curaduría

| Fase | Owner de Rig |
|---|---|
| Intención y pruebas de aceptación | Grilling |
| Diseño de producto y técnico | Product design |
| Implementación | Ponytail |
| Ejecución y paralelismo | Execution |
| TDD | Injerto curado |
| Depuración | Injerto curado |
| Revisión de código | Injerto curado |

Las skills curadas etiquetan sus checks por fase del flujo de trabajo. Fusionan
las partes distintivas de cada flujo en vez de concatenar documentos fuente.

## Límite de Tier 1

Tier 1 es intencionalmente un bootstrap tonto con una lista fija de archivos por
defecto. No tiene motor de sincronización, runtime, claves ni manejo de `.env`.
`--hosts` / `RIG_HOSTS` opcionales reutilizan el filtro de payload de Tier 2
(`rig/lib/payload.js`) para que una instalación estrecha coincida con el
materializer; sin ese flag, la lista fija completa sigue siendo el oráculo. El
layout compartido es predecible para que Tier 2 (arriba) lo describa sin
cambiar la forma instalada.

El flujo de trabajo es asesor porque Tier 1 solo entrega Markdown. Claude y
otros hosts con hooks pueden proveer enforcement real en los límites de
herramientas en un tier posterior; Cursor no puede. Rig declara esa limitación
en vez de afirmar que la prosa es una guardrail dura.

## Verificar

```sh
npm run test:rig
```

La prueba bootstrapea un repositorio temporal limpio y verifica el payload
compartido completo, cada adaptador de instrucciones, la preservación de los
archivos de host existentes, el límite solo-Markdown y la ausencia de
placeholders de secretos.

Para el materializer de Tier 2 y la puerta completa de CI (copias de reglas,
pines de versión y la suite Node completa), ejecuta:

```sh
npm test
```
