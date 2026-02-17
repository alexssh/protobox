#!/usr/bin/env node
import { existsSync, cpSync, readdirSync, mkdirSync, writeFileSync, rmSync, readFileSync, watch as watch$1 } from "fs";
import { resolve, dirname, join, extname } from "path";
import { fileURLToPath } from "url";
import { spawnSync, spawn } from "child_process";
import { createServer } from "http";
const __dirname$3 = dirname(fileURLToPath(import.meta.url));
function init(_args) {
  const cwd = process.cwd();
  const templateDir = resolve(__dirname$3, "../templates/project");
  if (existsSync(resolve(cwd, "package.json"))) {
    console.error("Project already exists (package.json found)");
    process.exit(1);
  }
  cpSync(templateDir, cwd, { recursive: true });
  console.log("Project scaffolded. Run: npm install && proto build");
}
async function build(_args) {
  const cwd = process.cwd();
  const appsDir = resolve(cwd, "src/apps");
  if (!existsSync(appsDir)) {
    console.error("No src/apps directory. Run proto init first.");
    process.exit(1);
  }
  const apps = readdirSync(appsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  if (apps.length === 0) {
    console.error("No apps found in src/apps");
    process.exit(1);
  }
  const buildDir = resolve(cwd, "build");
  if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });
  for (const app of apps) {
    const appDir = resolve(appsDir, app);
    const configPath = resolve(appDir, "config.ts");
    if (!existsSync(configPath)) {
      console.warn(`Skipping ${app}: no config.ts`);
      continue;
    }
    const outDir = join(buildDir, app);
    mkdirSync(outDir, { recursive: true });
    const meta = extractMetadata(appDir, app);
    const defaultParams = meta.parameters?.reduce((acc, p) => {
      acc[p.key] = p.default;
      return acc;
    }, {}) ?? {};
    const tempDir = join(buildDir, ".proto-temp", app);
    mkdirSync(tempDir, { recursive: true });
    cpSync(appDir, tempDir, { recursive: true });
    writeFileSync(resolve(tempDir, "index.html"), generateAppHtml(app, meta.title, defaultParams));
    try {
      const result = spawnSync(
        "npx",
        [
          "vite",
          "build",
          "--config",
          resolve(dirname(fileURLToPath(import.meta.url)), "../vite.project.config.ts"),
          "--outDir",
          outDir,
          "--emptyOutDir",
          "true"
        ],
        {
          cwd,
          stdio: "inherit",
          shell: true,
          env: { ...process.env, PROTO_APP_NAME: app, PROTO_APP_ROOT: tempDir }
        }
      );
      if (result.status !== 0) process.exit(result.status ?? 1);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
    const appIndexHtml = resolve(appDir, "index.html");
    if (existsSync(appIndexHtml)) rmSync(appIndexHtml);
    writeFileSync(resolve(outDir, "metadata.json"), JSON.stringify(meta, null, 2));
  }
  console.log(`Built ${apps.length} app(s) in build/`);
}
function extractMetadata(appDir, appName) {
  const configPath = resolve(appDir, "config.ts");
  const content = readFileSync(configPath, "utf-8");
  const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
  const descMatch = content.match(/description:\s*["']([^"']*)["']/);
  return {
    appName,
    title: titleMatch?.[1] ?? appName,
    description: descMatch?.[1] ?? "",
    parameters: parseParametersFromSource(content)
  };
}
function parseParametersFromSource(content) {
  const params = [];
  for (const m of content.matchAll(/paramBoolean\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*(true|false)\s*\)/g)) {
    params.push({ type: "boolean", key: m[1], label: m[2], default: m[3] === "true" });
  }
  for (const m of content.matchAll(/paramNumber\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*(\d+(?:\.\d+)?)/g)) {
    params.push({ type: "number", key: m[1], label: m[2], default: parseFloat(m[3]) });
  }
  for (const m of content.matchAll(/paramString\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*\)/g)) {
    params.push({ type: "string", key: m[1], label: m[2], default: m[3] });
  }
  for (const m of content.matchAll(
    /paramOption\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g
  )) {
    const opts = parseOptionsArray(m[4]);
    params.push({ type: "option", key: m[1], label: m[2], default: m[3], options: opts });
  }
  for (const m of content.matchAll(
    /paramOptionMulti\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*\[([\s\S]*?)\]\s*,\s*\[([\s\S]*?)\]\s*\)/g
  )) {
    const opts = parseOptionsArray(m[4]);
    const defaultArr = parseStringArray(m[3]);
    params.push({ type: "option-multi", key: m[1], label: m[2], default: defaultArr, options: opts });
  }
  return params;
}
function parseOptionsArray(s) {
  const opts = [];
  for (const m of s.matchAll(/\{\s*value:\s*["']([^"']*)["']\s*,\s*label:\s*["']([^"']*)["']\s*\}/g)) {
    opts.push({ value: m[1], label: m[2] });
  }
  return opts;
}
function generateAppHtml(appName, title, defaultParams) {
  const paramsJson = JSON.stringify(defaultParams);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script>window.__PROTO_PARAMS__=${paramsJson};<\/script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"><\/script>
  </body>
</html>
`;
}
function parseStringArray(s) {
  const arr = [];
  for (const m of s.matchAll(/["']([^"']*)["']/g)) {
    arr.push(m[1]);
  }
  return arr;
}
async function watch(_args) {
  const cwd = process.cwd();
  const srcDir = resolve(cwd, "src");
  const runBuild = () => build();
  await runBuild();
  watch$1(srcDir, { recursive: true }, (event, filename) => {
    if (filename && !filename.includes("node_modules")) {
      console.log(`
[${event}] ${filename}`);
      runBuild();
    }
  });
  console.log("Watching for changes...");
}
const __dirname$2 = dirname(fileURLToPath(import.meta.url));
const PORT = 5174;
async function run(_args) {
  const cwd = process.cwd();
  const protoRoot = resolve(__dirname$2, "..");
  const previewDir = resolve(protoRoot, "dist/preview");
  if (!existsSync(resolve(previewDir, "index.html"))) {
    console.error("Preview not built. Run: npm run build (from proto package)");
    process.exit(1);
  }
  const mimes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".ico": "image/x-icon"
  };
  const server = createServer((req, res) => {
    let path = req.url ?? "/";
    const q = path.indexOf("?");
    if (q >= 0) path = path.slice(0, q);
    if (path === "/") path = "/index.html";
    if (path === "/api/apps") {
      const buildDir = resolve(cwd, "build");
      if (!existsSync(buildDir)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify([]));
        return;
      }
      const apps = readdirSync(buildDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => {
        const metaPath = join(buildDir, d.name, "metadata.json");
        let meta = { appName: d.name, title: d.name, parameters: [] };
        if (existsSync(metaPath)) {
          meta = JSON.parse(readFileSync(metaPath, "utf-8"));
        }
        return meta;
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(apps));
      return;
    }
    if (path.startsWith("/apps/")) {
      const rel = path.slice(6);
      const buildDir = resolve(cwd, "build");
      const filePath2 = resolve(buildDir, rel);
      if (existsSync(filePath2)) {
        const ext = extname(filePath2);
        res.writeHead(200, { "Content-Type": mimes[ext] ?? "application/octet-stream" });
        res.end(readFileSync(filePath2));
        return;
      }
    }
    const filePath = resolve(previewDir, path.slice(1));
    if (existsSync(filePath)) {
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": mimes[ext] ?? "application/octet-stream" });
      res.end(readFileSync(filePath));
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });
  server.listen(PORT, () => {
    console.log(`Preview: http://localhost:${PORT}`);
    const url = `http://localhost:${PORT}`;
    const cmd2 = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    spawn(cmd2, [url], { stdio: "ignore" }).unref();
  });
}
const __dirname$1 = dirname(fileURLToPath(import.meta.url));
async function add(args2) {
  const entity = args2[0];
  const name = args2[1];
  if (!entity || !name) {
    console.error("Usage: proto add <app|component|view> <name>");
    process.exit(1);
  }
  const cwd = process.cwd();
  resolve(__dirname$1, "../templates/presets");
  const presets = {
    app: (n) => addApp(cwd, n),
    component: (n) => addComponent(cwd, n),
    view: (n) => addView(cwd, n)
  };
  const fn = presets[entity];
  if (!fn) {
    console.error(`Unknown entity: ${entity}. Use: app, component, or view`);
    process.exit(1);
  }
  fn(name);
}
function addApp(cwd, name) {
  const appDir = resolve(cwd, "src/apps", name);
  if (existsSync(appDir)) {
    console.error(`App ${name} already exists`);
    process.exit(1);
  }
  mkdirSync(appDir, { recursive: true });
  const template = readTemplate("app");
  const files = template.replace(/\{\{NAME\}\}/g, name).replace(/\{\{NAMEPASCAL\}\}/g, toPascal(name));
  const parts = files.split("---FILE---");
  const configTs = parts[1]?.trim() ?? "";
  const appTsx = parts[2]?.trim() ?? "";
  const typesDir = resolve(cwd, "src/types", name);
  mkdirSync(typesDir, { recursive: true });
  writeFileSync(
    resolve(typesDir, "index.ts"),
    `/** Types specific to the ${name} app. Import from "@/types/${name}". */
export {};
`
  );
  writeFileSync(
    resolve(appDir, "App.scss"),
    `.${name}-app {
  padding: 1rem;
  font-family: system-ui;
}

.${name}-app__title {
  margin: 0 0 1rem;
}

.${name}-app__params {
  font-size: 0.875rem;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}
`
  );
  writeFileSync(resolve(appDir, "config.ts"), configTs);
  writeFileSync(resolve(appDir, "App.tsx"), appTsx);
  writeFileSync(
    resolve(appDir, "main.tsx"),
    `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
  );
  console.log(`Created app: src/apps/${name}`);
}
function addComponent(cwd, name) {
  const baseDir = resolve(cwd, "src/components", name);
  const v1Dir = resolve(baseDir, "v1");
  mkdirSync(v1Dir, { recursive: true });
  const template = readTemplate("component");
  const content = template.replace(/\{\{NAME\}\}/g, name).replace(/\{\{NAMEPASCAL\}\}/g, toPascal(name));
  writeFileSync(resolve(v1Dir, `${toPascal(name)}.tsx`), content);
  writeFileSync(resolve(v1Dir, `${toPascal(name)}.scss`), `.${name} {
  margin: 0;
}
`);
  writeFileSync(resolve(baseDir, "index.ts"), `export { ${toPascal(name)} } from './v1/${toPascal(name)}'
`);
  console.log(`Created component: src/components/${name}`);
}
function addView(cwd, name) {
  const baseDir = resolve(cwd, "src/views", name);
  const v1Dir = resolve(baseDir, "v1");
  mkdirSync(v1Dir, { recursive: true });
  const template = readTemplate("view");
  const content = template.replace(/\{\{NAME\}\}/g, name).replace(/\{\{NAMEPASCAL\}\}/g, toPascal(name));
  writeFileSync(resolve(v1Dir, `${toPascal(name)}.tsx`), content);
  writeFileSync(resolve(v1Dir, `${toPascal(name)}.scss`), `.${name}-view {
  margin-top: 1rem;
}
`);
  writeFileSync(resolve(baseDir, "index.ts"), `export { ${toPascal(name)} } from './v1/${toPascal(name)}'
`);
  console.log(`Created view: src/views/${name}`);
}
function readTemplate(type) {
  const path = resolve(__dirname$1, "../templates/presets", `${type}.txt`);
  if (existsSync(path)) return readFileSync(path, "utf-8");
  return getDefaultTemplate(type);
}
function getDefaultTemplate(type) {
  if (type === "app") {
    return `---FILE---
import { paramBoolean, paramString } from "proto/parameters";

export default {
  title: "{{NAMEPASCAL}}",
  description: "{{NAMEPASCAL}} app",
  parameters: [
    paramBoolean("enabled", "Enabled", true),
    paramString("name", "Name", "{{NAME}}"),
  ],
};
---FILE---
import React from "react";

export default function App() {
  return <div>{{NAMEPASCAL}} App</div>;
}
`;
  }
  if (type === "component") {
    return `import React from "react";

export function {{NAMEPASCAL}}() {
  return <div>{{NAMEPASCAL}}</div>;
}
`;
  }
  if (type === "view") {
    return `import React from "react";

export function {{NAMEPASCAL}}() {
  return <div>{{NAMEPASCAL}} View</div>;
}
`;
  }
  return "";
}
function toPascal(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
}
const args = process.argv.slice(2);
const cmd = args[0];
const rest = args.slice(1);
const commands = {
  init,
  build,
  watch,
  run,
  add
};
async function main() {
  if (!cmd || !commands[cmd]) {
    console.log(`
Proto - React prototyping framework

Usage: proto <command> [options]

Commands:
  init              Scaffold a new project
  build             Build all apps
  watch             Build and watch for changes
  run               Start preview server
  add app           Add a new app
  add component     Add a new component
  add view          Add a new view
`);
    process.exit(1);
  }
  await commands[cmd](rest);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
