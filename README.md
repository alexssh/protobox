# protobox

React 18 + TypeScript prototyping environment for project development.

## Overview

- **Scaffold** projects from templates
- **Build** each app separately into `build/AppName`
- **Preview** apps in a standard shell with parameter controls
- **Declarative** utilities: context, parameters, useProtoParams

## CLI

```bash
pbox init                  # scaffold project
pbox build                 # build all apps
pbox build Chart           # build only Chart
pbox build Chart Lists     # build Chart and Lists
pbox watch                 # watch + rebuild all apps
pbox watch Chart           # watch + rebuild only Chart
pbox watch Chart Lists     # watch + rebuild Chart and Lists
pbox run                   # start preview server with live reload
pbox dev                   # run server + watch (one command for development)
pbox add app Chart         # add app  → src/apps/ChartApp/ (App suffix auto-added)
pbox add component Card    # add component → src/components/Card/v1/
pbox add view Dashboard    # add view → src/views/DashboardView/ (View suffix auto-added)
```

## Preview

- Lists apps from `build/`
- Switch between apps via dropdown; selection and params per app persist in localStorage (survives reload)
- Parameter UI (boolean, number, string, option, option-multi) from app config
- Renders each app in an iframe; passes parameters via `postMessage`
- **Live reload**: `pbox run` watches `build/` and auto-reloads iframe via SSE when files change
- Apps use `useProtoParams()` from `protobox/useProtoParams` for default + live params

## Project Architecture

```
src/
  apps/          # one folder per app (PascalCase: Chart/, Demo/)
  components/    # shared components (Name/v1/Name.tsx + Name.scss)
  views/         # composite views (Name/v1/Name.tsx + Name.scss)
  assets/        # images, fonts, etc. — copied once to build/assets/
  data/          # shared data
  types/         # global/ (all apps), AppName/ (per-app, PascalCase)
```

### Naming Convention

All entity directories use **PascalCase**: `Chart`, `DemoView`, `Card`.

| Entity    | Directory               | Files                                          |
| --------- | ----------------------- | ---------------------------------------------- |
| App       | `src/apps/ChartApp/`     | `ChartApp.tsx`, `ChartApp.scss`, `main.tsx`, `config.ts`, `context.tsx` |
| Component | `src/components/Card/`  | `v1/Card.tsx`, `v1/Card.scss`, `index.ts`      |
| View      | `src/views/ChartView/`  | `v1/ChartView.tsx`, `v1/ChartView.scss`, `index.ts` |

- App and view names get `App`/`View` suffix automatically (`pbox add app Chart` → ChartApp)
- CSS classes use **kebab-case**: `.chart-app`, `.card--v1`, `.demo-view`
- `main.tsx` and `config.ts` keep generic names (entry point and config)
- Components and views do **not** have `main.tsx`, `config.ts`, or parameters

### Context

```tsx
import { createProtoContext } from "protobox/context";

const { Provider, useValue } = createProtoContext({
  name: "User",
  initialState: { name: "", count: 0 },
  useImmer: true,  // optional
});

<Provider>
  <App />
</Provider>

// in App
const { state, setState, update } = useValue();
```

### Parameters

Parameters are defined only in app `config.ts`:

```tsx
import { paramBoolean, paramString, paramOption } from "protobox/parameters";

// In config.ts
parameters: [
  paramBoolean("enabled", "Enabled", true),
  paramString("name", "Name", ""),
  paramOption("theme", "Theme", "light", [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ]),
]
```

### Assets

Place images, fonts, and other static files in `src/assets/`. On build, contents are copied once to `build/assets/` and served at `/assets/...`. Use the absolute path so all apps share the same files (no duplication):

**TSX/TS:**
```tsx
<img src="/assets/images/logo.jpg" alt="Logo" />
```

**SCSS:**
```scss
@font-face {
  font-family: 'MyFont';
  src: url('/assets/fonts/MyFont.otf') format('opentype');
}

.hero {
  background-image: url('/assets/images/bg.jpg');
}
```

Suggested structure: `src/assets/images/`, `src/assets/fonts/`, etc.

### Imports

Use hard-coded versioned paths: `import { X } from "@/components/Card/v1/Card"` or `@/components/Card/v2/Card`. One view per app. All components and views define an interface.

### Types

- `types/global/` — shared across all apps (Window augmentation)
- `types/AppName/` — app-specific (PascalCase); only that app should import

### Workflow

1. `pbox init` → scaffold
2. `pbox add app Chart` → new app (creates `src/apps/ChartApp/`, `src/@types/ChartApp/`)
3. `pbox add view Dashboard` → new view (`src/views/DashboardView/v1/`)
4. `pbox add component Button` → new component (`src/components/Button/v1/`)
5. Edit `config.ts`, `ChartApp.tsx`
6. `pbox dev` → server + watch in one command (or `npm run watch` + `npm run server` separately)
7. `npx pbox watch MyApp` → watch only MyApp for faster rebuilds

## Environment

### Structure

```
src/
  cli.ts          # CLI entry
  commands/       # init, build, watch, run, add
  libs/           # context, parameters, useProtoParams
  preview/        # React preview shell
templates/
  project/        # scaffold
  presets/        # app, component, view generators
```

### Build

- CLI, libs, preview build separately
- Import `protobox/context` → only context code (tree-shaking)
- Preview never imports project code; loads built apps only

### Smart Watch

- `pbox watch` detects which app was changed and rebuilds only that app
- Changes in `src/apps/ChartApp/` → rebuild only ChartApp
- Changes in `src/components/`, `src/views/`, `src/types/` → rebuild all apps (shared code)
- `pbox watch Chart` → watch only Chart; ignore changes to other apps
- Debounced (200ms) to batch rapid file changes into a single rebuild

### Extension

- Add templates in `templates/presets/` (`*.txt` with `---FILE---` separators, `{{NAME}}` for kebab-case, `{{NAMEPASCAL}}` for PascalCase)
- Customize project template in `templates/project/`
- Libs are minimal; extend via new modules

## Development

```bash
npm run build         # build environment
npm run dev:preview   # dev preview
```

For project dev with local protobox: `npm install /path/to/protobox` or `npm link`.
