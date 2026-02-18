# protobox

React 18 + TypeScript prototyping framework for rapid project development.

## Overview

- **Scaffold** projects from templates
- **Build** each app separately into `build/AppName`
- **Preview** apps in a standard shell with parameter controls
- **Declarative** utilities: context, parameters, useProtoParams

## CLI

```bash
pbox init             # scaffold project
pbox build            # build all apps
pbox watch            # build + watch
pbox run              # start preview server (or npm run server)
pbox add app Chart    # add app  → src/apps/Chart/
pbox add component Card  # add component → src/components/Card/v1/
pbox add view Dashboard  # add view → src/views/Dashboard/v1/
```

## Preview

- Lists apps from `build/`
- Switch between apps via dropdown
- Parameter UI (boolean, number, string, option, option-multi) from app config
- Renders each app in an iframe; passes parameters via `postMessage`
- Apps use `useProtoParams()` from `protobox/useProtoParams` for default + live params

## Project Architecture

```
src/
  apps/          # one folder per app (PascalCase: Chart/, Demo/)
  components/    # shared components (Name/v1/Name.tsx + Name.scss)
  views/         # composite views (Name/v1/Name.tsx + Name.scss)
  data/          # shared data
  types/         # global/ (all apps), AppName/ (per-app, PascalCase)
```

### Naming Convention

All entity directories use **PascalCase**: `Chart`, `DemoView`, `Card`.

| Entity    | Directory               | Files                                          |
| --------- | ----------------------- | ---------------------------------------------- |
| App       | `src/apps/Chart/`       | `Chart.tsx`, `Chart.scss`, `main.tsx`, `config.ts`, `context.tsx` |
| Component | `src/components/Card/`  | `v1/Card.tsx`, `v1/Card.scss`, `index.ts`      |
| View      | `src/views/ChartView/`  | `v1/ChartView.tsx`, `v1/ChartView.scss`, `index.ts` |

- App files are named after the app (`Chart.tsx`, not `App.tsx`)
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

### Imports

Use hard-coded versioned paths: `import { X } from "@/components/Card/v1/Card"` or `@/components/Card/v2/Card`. One view per app. All components and views define an interface.

### Types

- `types/global/` — shared across all apps (Window augmentation)
- `types/AppName/` — app-specific (PascalCase); only that app should import

### Workflow

1. `pbox init` → scaffold
2. `pbox add app MyApp` → new app (creates `src/apps/MyApp/`, `src/types/MyApp/`)
3. `pbox add view MyView` → new view (`src/views/MyView/v1/`)
4. `pbox add component Button` → new component (`src/components/Button/v1/`)
5. Edit `config.ts`, `MyApp.tsx`
6. `npm run watch` + `npm run server` → iterate

## Framework

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

### Extension

- Add templates in `templates/presets/` (`*.txt` with `{{NAME}}` for kebab-case, `{{NAMEPASCAL}}` for PascalCase)
- Customize project template in `templates/project/`
- Libs are minimal; extend via new modules

## Development

```bash
npm run build          # build framework
npm run dev:preview   # dev preview
```

For project dev with local protobox: `npm install /path/to/protobox` or `npm link`.
