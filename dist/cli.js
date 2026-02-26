#!/usr/bin/env node
import { existsSync, cpSync, readdirSync, mkdirSync, rmSync, writeFileSync, readFileSync, watch as watch$1 } from "fs";
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
  console.log("Project scaffolded. Run: npm install && pbox build");
}
async function build(args2) {
  const cwd = process.cwd();
  const appsDir = resolve(cwd, "src/apps");
  if (!existsSync(appsDir)) {
    console.error("No src/apps directory. Run pbox init first.");
    process.exit(1);
  }
  const allApps = readdirSync(appsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  if (allApps.length === 0) {
    console.error("No apps found in src/apps");
    process.exit(1);
  }
  const filter = args2.filter((a) => !a.startsWith("-"));
  const apps = filter.length > 0 ? allApps.filter((a) => filter.includes(a)) : allApps;
  if (apps.length === 0) {
    console.error(`No matching apps found. Available: ${allApps.join(", ")}`);
    process.exit(1);
  }
  const buildDir = resolve(cwd, "build");
  if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });
  const start = Date.now();
  for (const app of apps) {
    buildApp(cwd, app);
  }
  const ms = Date.now() - start;
  const ts = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", { hour12: false });
  console.log(`${ts} [${apps.join(", ")}] built (${ms}ms)`);
}
function buildApp(cwd, appName) {
  const appsDir = resolve(cwd, "src/apps");
  const appDir = resolve(appsDir, appName);
  const buildDir = resolve(cwd, "build");
  const configPath = resolve(appDir, "config.ts");
  if (!existsSync(configPath)) {
    console.warn(`Skipping ${appName}: no config.ts`);
    return;
  }
  if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true });
  const assetsSrc = resolve(cwd, "src", "assets");
  const assetsDest = join(buildDir, "assets");
  if (existsSync(assetsDest)) {
    rmSync(assetsDest, { recursive: true, force: true });
  }
  if (existsSync(assetsSrc)) {
    mkdirSync(assetsDest, { recursive: true });
    cpSync(assetsSrc, assetsDest, { recursive: true });
  }
  const outDir = join(buildDir, appName);
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });
  const meta = extractMetadata(appDir, appName);
  const defaultParams = meta.parameters?.reduce((acc, p) => {
    acc[p.key] = p.default;
    return acc;
  }, {}) ?? {};
  const tempDir = join(buildDir, ".pbox-temp", appName);
  mkdirSync(tempDir, { recursive: true });
  cpSync(appDir, tempDir, { recursive: true });
  writeFileSync(resolve(tempDir, "index.html"), generateAppHtml(appName, meta.title, defaultParams));
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
        stdio: "pipe",
        shell: true,
        env: { ...process.env, PBOX_APP_NAME: appName, PBOX_APP_ROOT: tempDir }
      }
    );
    if (result.status !== 0) {
      const stderr = result.stderr?.toString().trim();
      if (stderr) console.error(stderr);
      console.error(`Build failed for ${appName}`);
      return;
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
  const appIndexHtml = resolve(appDir, "index.html");
  if (existsSync(appIndexHtml)) rmSync(appIndexHtml);
  writeFileSync(resolve(outDir, "metadata.json"), JSON.stringify(meta, null, 2));
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
  const indexed = [];
  for (const m of content.matchAll(/paramBoolean\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*(true|false)\s*\)/g)) {
    indexed.push({ index: m.index, param: { type: "boolean", key: m[1], label: m[2], default: m[3] === "true" } });
  }
  for (const m of content.matchAll(/paramNumber\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*(\d+(?:\.\d+)?)/g)) {
    indexed.push({ index: m.index, param: { type: "number", key: m[1], label: m[2], default: parseFloat(m[3]) } });
  }
  for (const m of content.matchAll(/paramString\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*\)/g)) {
    indexed.push({ index: m.index, param: { type: "string", key: m[1], label: m[2], default: m[3] } });
  }
  for (const m of content.matchAll(
    /paramOption\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g
  )) {
    indexed.push({ index: m.index, param: { type: "option", key: m[1], label: m[2], default: m[3], options: parseOptionsArray(m[4]) } });
  }
  for (const m of content.matchAll(
    /paramOptionMulti\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']*)["']\s*,\s*\[([\s\S]*?)\]\s*,\s*\[([\s\S]*?)\]\s*\)/g
  )) {
    indexed.push({ index: m.index, param: { type: "option-multi", key: m[1], label: m[2], default: parseStringArray(m[3]), options: parseOptionsArray(m[4]) } });
  }
  return indexed.sort((a, b) => a.index - b.index).map((e) => e.param);
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
    <script>window.__PBOX_PARAMS__=${paramsJson};<\/script>
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
async function watch(args2) {
  const cwd = process.cwd();
  const srcDir = resolve(cwd, "src");
  const appsDir = resolve(cwd, "src/apps");
  const filterApps = args2.filter((a) => !a.startsWith("-"));
  if (filterApps.length > 0) {
    const allApps = existsSync(appsDir) ? readdirSync(appsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
    const invalid = filterApps.filter((a) => !allApps.includes(a));
    if (invalid.length > 0) {
      console.error(`Unknown app(s): ${invalid.join(", ")}. Available: ${allApps.join(", ")}`);
      process.exit(1);
    }
    console.log(`Watching app(s): ${filterApps.join(", ")}`);
  }
  await build(filterApps);
  let debounce = null;
  const pendingApps = /* @__PURE__ */ new Set();
  let building = false;
  let lastTrigger = "";
  async function flush() {
    if (building || pendingApps.size === 0) return;
    building = true;
    const apps = new Set(pendingApps);
    pendingApps.clear();
    const start = Date.now();
    try {
      for (const app of apps) {
        buildApp(cwd, app);
      }
      const ms = Date.now() - start;
      const ts = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", { hour12: false });
      const trigger = lastTrigger ? ` ${lastTrigger} →` : "";
      console.log(`${ts}${trigger} [${[...apps].join(", ")}] rebuilt (${ms}ms)`);
    } catch (e) {
      console.error("Build error:", e);
    }
    building = false;
    if (pendingApps.size > 0) flush();
  }
  watch$1(srcDir, { recursive: true }, (_event, filename) => {
    if (!filename || filename.includes("node_modules")) return;
    const normalized = filename.replace(/\\/g, "/");
    const appMatch = normalized.match(/^apps\/([^/]+)/);
    const assetsMatch = normalized.startsWith("assets/");
    if (assetsMatch) {
      lastTrigger = normalized;
      const allApps = existsSync(appsDir) ? readdirSync(appsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
      const scope = filterApps.length > 0 ? allApps.filter((a) => filterApps.includes(a)) : allApps;
      scope.forEach((a) => pendingApps.add(a));
    } else if (appMatch) {
      const appName = appMatch[1];
      if (filterApps.length > 0 && !filterApps.includes(appName)) return;
      lastTrigger = `apps/${appName}/${normalized.split("/").pop()}`;
      pendingApps.add(appName);
    } else {
      const affected = findAffectedApps(cwd, normalized, filterApps);
      lastTrigger = normalized.split("/").slice(0, 2).join("/");
      affected.forEach((a) => pendingApps.add(a));
    }
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(flush, 200);
  });
  console.log("Watching for changes...");
}
function getModuleKey(relPath) {
  const parts = relPath.split("/");
  if ((parts[0] === "components" || parts[0] === "views") && parts.length > 1) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}
function extractAtImports(content) {
  const imports = [];
  for (const m of content.matchAll(/from\s+['"]@\/([^'"]+)['"]/g)) {
    imports.push(m[1]);
  }
  return imports;
}
function findTsFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}
function dirImportsAny(dir, modules) {
  for (const file of findTsFiles(dir)) {
    const content = readFileSync(file, "utf-8");
    for (const imp of extractAtImports(content)) {
      if (modules.has(getModuleKey(imp))) return true;
    }
  }
  return false;
}
function findAffectedApps(cwd, changedRelPath, filterApps) {
  const srcDir = resolve(cwd, "src");
  const appsDir = resolve(srcDir, "apps");
  const changedModule = getModuleKey(changedRelPath);
  const depModules = /* @__PURE__ */ new Set([changedModule]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const dir of ["components", "views"]) {
      const baseDir = resolve(srcDir, dir);
      if (!existsSync(baseDir)) continue;
      for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const key = `${dir}/${entry.name}`;
        if (depModules.has(key)) continue;
        if (dirImportsAny(resolve(baseDir, entry.name), depModules)) {
          depModules.add(key);
          grew = true;
        }
      }
    }
  }
  const allApps = readdirSync(appsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const scope = filterApps.length > 0 ? allApps.filter((a) => filterApps.includes(a)) : allApps;
  return scope.filter((app) => dirImportsAny(resolve(appsDir, app), depModules));
}
const __dirname$2 = dirname(fileURLToPath(import.meta.url));
const PORT = 5174;
async function run(_args) {
  const cwd = process.cwd();
  const pboxRoot = resolve(__dirname$2, "..");
  const previewDir = resolve(pboxRoot, "dist/preview");
  const buildDir = resolve(cwd, "build");
  if (!existsSync(resolve(previewDir, "index.html"))) {
    console.error("Preview not built. Run: npm run build (from protobox package)");
    process.exit(1);
  }
  const mimes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject"
  };
  const sseClients = /* @__PURE__ */ new Set();
  let reloadTimer = null;
  function notifyReload() {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      for (const client of sseClients) {
        client.write("data: reload\n\n");
      }
    }, 300);
  }
  if (existsSync(buildDir)) {
    watch$1(buildDir, { recursive: true }, () => notifyReload());
  }
  watch$1(cwd, (_, filename) => {
    if (filename === "build" && existsSync(buildDir)) {
      watch$1(buildDir, { recursive: true }, () => notifyReload());
      notifyReload();
    }
  });
  const server = createServer((req, res) => {
    let path = req.url ?? "/";
    const q = path.indexOf("?");
    if (q >= 0) path = path.slice(0, q);
    if (path === "/") path = "/index.html";
    if (path === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write("data: connected\n\n");
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }
    if (path === "/api/apps") {
      if (!existsSync(buildDir)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify([]));
        return;
      }
      const apps = readdirSync(buildDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "assets").map((d) => {
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
    if (path.startsWith("/assets/")) {
      const rel = path.slice(8);
      const filePath2 = resolve(buildDir, "assets", rel);
      if (existsSync(filePath2)) {
        const ext = extname(filePath2);
        res.writeHead(200, {
          "Content-Type": mimes[ext] ?? "application/octet-stream",
          "Cache-Control": "no-cache"
        });
        res.end(readFileSync(filePath2));
        return;
      }
    }
    if (path.startsWith("/apps/")) {
      const rel = path.slice(6);
      const filePath2 = resolve(buildDir, rel);
      if (existsSync(filePath2)) {
        const ext = extname(filePath2);
        let body = readFileSync(filePath2);
        if (ext === ".html") {
          const html = body.toString("utf-8");
          if (html.includes("</body>")) {
            const script = `<script>(function(){document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key==='.'){e.preventDefault();window.parent.postMessage({type:'pbox-toggle-ui'},'*');}});})();<\/script>`;
            body = html.replace("</body>", script + "</body>");
          }
        }
        res.writeHead(200, {
          "Content-Type": mimes[ext] ?? "application/octet-stream",
          "Cache-Control": "no-cache"
        });
        res.end(body);
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
async function dev(args2) {
  const runProc = spawn(process.execPath, [process.argv[1], "run"], {
    stdio: "inherit",
    env: process.env
  });
  runProc.on("error", (err) => {
    console.error("Server failed:", err);
    process.exit(1);
  });
  process.on("SIGINT", () => {
    runProc.kill();
    process.exit(0);
  });
  await watch(args2);
}
const __dirname$1 = dirname(fileURLToPath(import.meta.url));
async function add(args2) {
  const entity = args2[0];
  const name = args2[1];
  if (!entity || !name) {
    console.error("Usage: pbox add <app|component|view> <name>");
    process.exit(1);
  }
  const cwd = process.cwd();
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
  const pascal = toPascal(name);
  const kebab = toKebab(name);
  const appDir = resolve(cwd, "src/apps", pascal);
  if (existsSync(appDir)) {
    console.error(`App ${pascal} already exists`);
    process.exit(1);
  }
  mkdirSync(appDir, { recursive: true });
  const template = readTemplate("app");
  const files = template.replace(/\{\{NAME\}\}/g, kebab).replace(/\{\{NAMEPASCAL\}\}/g, pascal);
  const parts = files.split("---FILE---");
  const configTs = parts[1]?.trim() ?? "";
  const appTsx = parts[2]?.trim() ?? "";
  const appScss = parts[3]?.trim() ?? "";
  const mainTsx = parts[4]?.trim() ?? "";
  const typesIndex = parts[5]?.trim() ?? "";
  const typesDir = resolve(cwd, "src/@types", pascal);
  mkdirSync(typesDir, { recursive: true });
  writeFileSync(resolve(appDir, "config.ts"), configTs);
  writeFileSync(resolve(appDir, `${pascal}.tsx`), appTsx);
  writeFileSync(resolve(appDir, `${pascal}.scss`), appScss);
  writeFileSync(resolve(appDir, "main.tsx"), mainTsx);
  writeFileSync(resolve(typesDir, "index.ts"), typesIndex);
  console.log(`Created app: src/apps/${pascal}`);
}
function addComponent(cwd, name) {
  const pascal = toPascal(name);
  const kebab = toKebab(name);
  const baseDir = resolve(cwd, "src/components", pascal);
  const v1Dir = resolve(baseDir, "v1");
  mkdirSync(v1Dir, { recursive: true });
  const template = readTemplate("component");
  const files = template.replace(/\{\{NAME\}\}/g, kebab).replace(/\{\{NAMEPASCAL\}\}/g, pascal);
  const parts = files.split("---FILE---");
  const componentTsx = parts[1]?.trim() ?? "";
  const componentScss = parts[2]?.trim() ?? "";
  const indexTs = parts[3]?.trim() ?? "";
  writeFileSync(resolve(v1Dir, `${pascal}.tsx`), componentTsx);
  writeFileSync(resolve(v1Dir, `${pascal}.scss`), componentScss);
  writeFileSync(resolve(baseDir, "index.ts"), indexTs);
  console.log(`Created component: src/components/${pascal}`);
}
function addView(cwd, name) {
  const pascal = toPascal(name);
  const kebab = toKebab(name);
  const baseDir = resolve(cwd, "src/views", pascal);
  const v1Dir = resolve(baseDir, "v1");
  mkdirSync(v1Dir, { recursive: true });
  const template = readTemplate("view");
  const files = template.replace(/\{\{NAME\}\}/g, kebab).replace(/\{\{NAMEPASCAL\}\}/g, pascal);
  const parts = files.split("---FILE---");
  const dataTs = parts[1]?.trim() ?? "";
  const viewTsx = parts[2]?.trim() ?? "";
  const viewScss = parts[3]?.trim() ?? "";
  const indexTs = parts[4]?.trim() ?? "";
  writeFileSync(resolve(v1Dir, `${pascal}Data.ts`), dataTs);
  writeFileSync(resolve(v1Dir, `${pascal}.tsx`), viewTsx);
  writeFileSync(resolve(v1Dir, `${pascal}.scss`), viewScss);
  writeFileSync(resolve(baseDir, "index.ts"), indexTs);
  console.log(`Created view: src/views/${pascal}`);
}
function readTemplate(type) {
  const path = resolve(__dirname$1, "../templates/presets", `${type}.txt`);
  if (!existsSync(path)) {
    console.error(`Template not found: ${path}`);
    process.exit(1);
  }
  return readFileSync(path, "utf-8");
}
function toPascal(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
}
function toKebab(s) {
  return s.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/\s+/g, "-").toLowerCase();
}
const args = process.argv.slice(2);
const cmd = args[0];
const rest = args.slice(1);
const commands = {
  init,
  build,
  watch,
  run,
  dev,
  add
};
async function main() {
  if (!cmd || !commands[cmd]) {
    console.log(`
Protobox - React prototyping framework

Usage: pbox <command> [options]

Commands:
  init              Scaffold a new project
  build [App...]    Build apps (all if no args)
  watch [App...]    Watch & rebuild (all if no args)
  run               Start preview server
  dev [App...]      Run server + watch (all apps if no args)
  add app           Add a new app
  add component     Add a new component
  add view          Add a new view

Examples:
  pbox build                Build all apps
  pbox build Chart          Build only Chart
  pbox watch Lists          Watch & rebuild only Lists
  pbox watch Chart Lists    Watch & rebuild Chart and Lists
`);
    process.exit(1);
  }
  await commands[cmd](rest);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
