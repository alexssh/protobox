# protobox

React 18 + TypeScript prototyping framework for rapid project development.

## Overview

- **Scaffold** projects from templates
- **Build** each app separately into `build/appName`
- **Preview** apps in a standard shell with parameter controls
- **Declarative** utilities: context, parameters, useProtoParams

## CLI

```bash
pbox init             # scaffold project
pbox build            # build all apps
pbox watch            # build + watch
pbox run              # start preview server (or npm run server)
pbox add app foo      # add app
pbox add component Bar
pbox add view Dashboard
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
  apps/          # one folder per app
  components/    # shared components (Name/v1/Name.tsx + Name.scss)
  views/         # composite views (Name/v1/Name.tsx + Name.scss)
  data/          # shared data
  types/         # global/ (all apps), {{appName}}/ (per-app)
```

Each app has `config.ts`, `App.tsx`, `main.tsx`. `index.html` is generated at build with default params. Apps use shared components/views/data but build in isolation.

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

Use hard-coded paths: `import { X } from "@/components/Card/v1/Card"` or `@/components/Card/v2/Card`. One view per app. All components and views define an interface.

### Types

- `types/global/` — shared across all apps (Window augmentation)
- `types/{{appName}}/` — app-specific; only that app should import

### Workflow

1. `pbox init` → scaffold
2. `pbox add app myapp` → new app (creates `types/myapp/`)
3. `pbox add view Chart` → new view
4. Edit `config.ts`, `App.tsx`
5. `npm run watch` + `npm run server` → iterate

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

- Add templates in `templates/presets/` (`*.txt` with `{{NAME}}`, `{{NAMEPASCAL}}`)
- Customize project template in `templates/project/`
- Libs are minimal; extend via new modules

## Development

```bash
npm run build          # build framework
npm run dev:preview   # dev preview
```

For project dev with local protobox: `npm install /path/to/protobox` or `npm link`.
