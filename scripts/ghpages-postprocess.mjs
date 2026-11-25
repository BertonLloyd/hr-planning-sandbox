#!/usr/bin/env node
/**
 * GitHub Pages 产物后处理：
 * 剥离妙搭平台模板占位符（{{...}}）与第三方监控脚本，
 * 生成干净的 index.html，并复制为 404.html 以支持 SPA 深链刷新。
 *
 * 用法：node scripts/ghpages-postprocess.mjs [distDir] [base]
 */
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.argv[2] || 'dist/ghpages');
const base = (process.argv[3] || '/hr-planning-sandbox').replace(/\/+$/, '');
const assetsDir = path.join(distDir, 'assets');

const find = (predicate) => {
  const hit = fs.readdirSync(assetsDir).find(predicate);
  if (!hit) throw new Error(`required asset not found in ${assetsDir}`);
  return hit;
};

const mainJs = find((f) => /^index-.*\.js$/.test(f));
const css = find((f) => f.endsWith('.css'));
const radix = find((f) => f.startsWith('radix-'));
const toolkit = find((f) => f.startsWith('toolkit-'));
const rolldown = find((f) => f.startsWith('rolldown-runtime-'));
const assetUrl = (f) => `${base}/assets/${f}`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>人力规划沙盘</title>
  <meta name="description" content="纯前端人力规划沙盘：导入 Excel 或套用模板，自动完成编制测算、成本预算与沙盘推演，数据仅保存在本地浏览器。" />
  <link rel="icon" href="${base}/favicon.svg" />
  <script>
    (function () {
      var needsPolyfill = (function () {
        try {
          if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") return true;
          if (typeof Object.hasOwn !== "function") return true;
          if (typeof [].at !== "function") return true;
          if (typeof [].findLast !== "function") return true;
          return false;
        } catch (e) { return true; }
      })();
      if (needsPolyfill) {
        document.write('<script src="${assetUrl('polyfills.js')}"><\\/script>');
      }
    })();
  </script>
  <link rel="stylesheet" crossorigin="${assetUrl(css)}" />
  <link rel="modulepreload" crossorigin="${assetUrl(rolldown)}" />
  <link rel="modulepreload" crossorigin="${assetUrl(radix)}" />
  <link rel="modulepreload" crossorigin="${assetUrl(toolkit)}" />
</head>
<body>
  <div id="root"></div>
  <script type="module" crossorigin src="${assetUrl(mainJs)}"></script>
</body>
</html>
`;

for (const name of ['index.html', '404.html']) {
  fs.writeFileSync(path.join(distDir, name), html, 'utf8');
}

const routes = path.join(distDir, 'routes.json');
if (fs.existsSync(routes)) fs.rmSync(routes);

console.log('ghpages post-process complete:', distDir);
