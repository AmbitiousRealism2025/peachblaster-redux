import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const indexHtmlPath = path.join(distDir, "index.html");
const outputHtmlPath = path.join(distDir, "peachblaster-arcade.html");

function stripQueryAndHash(url) {
  return url.split("#")[0].split("?")[0];
}

function isExternalUrl(url) {
  return /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(url);
}

function parseAttributes(tag) {
  const attributes = {};
  const attributeRegex = /([^\s=/>]+)\s*=\s*(["'])(.*?)\2/g;
  let match;
  while ((match = attributeRegex.exec(tag))) {
    const key = match[1].toLowerCase();
    attributes[key] = match[3];
  }
  return attributes;
}

function resolveHtmlAssetPath(url) {
  const cleaned = stripQueryAndHash(url);
  if (cleaned.startsWith("/")) return path.join(distDir, cleaned.slice(1));
  if (cleaned.startsWith("./")) return path.join(distDir, cleaned.slice(2));
  return path.join(distDir, cleaned);
}

function resolveCssAssetPath(url, cssFilePath) {
  const cleaned = stripQueryAndHash(url);
  if (cleaned.startsWith("/")) return path.join(distDir, cleaned.slice(1));
  return path.resolve(path.dirname(cssFilePath), cleaned);
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".js":
      return "text/javascript";
    case ".css":
      return "text/css";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    case ".otf":
      return "font/otf";
    case ".json":
      return "application/json";
    case ".webmanifest":
      return "application/manifest+json";
    default:
      return "application/octet-stream";
  }
}

function toDataUri(filePath) {
  const mimeType = getMimeType(filePath);
  const base64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function formatBytes(bytes) {
  const units = ["B", "kB", "MB", "GB"];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getDirectorySizeBytes(dirPath, excludeFilePaths = new Set()) {
  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (excludeFilePaths.has(fullPath)) continue;

    if (entry.isDirectory()) {
      total += getDirectorySizeBytes(fullPath, excludeFilePaths);
    } else if (entry.isFile()) {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

function buildJsSpecifierToDataUriMap() {
  const assetsDir = path.join(distDir, "assets");
  const map = new Map();

  if (!fileExists(assetsDir)) return map;

  const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".js")) continue;

    const jsFilePath = path.join(assetsDir, entry.name);
    const dataUri = toDataUri(jsFilePath);

    map.set(`./${entry.name}`, dataUri);
    map.set(`/assets/${entry.name}`, dataUri);
    map.set(`assets/${entry.name}`, dataUri);
    map.set(`./assets/${entry.name}`, dataUri);
  }

  return map;
}

function inlineJsChunkImports(jsText, jsSpecifierToDataUri) {
  const rewriteSpecifier = (specifier) => jsSpecifierToDataUri.get(specifier);

  let rewritten = jsText;

  rewritten = rewritten.replace(/\bfrom(\s*)(["'])([^"']+)\2/g, (match, whitespace, quote, specifier) => {
    const dataUri = rewriteSpecifier(specifier);
    if (!dataUri) return match;
    return `from${whitespace}${quote}${dataUri}${quote}`;
  });

  rewritten = rewritten.replace(/\bimport(\s*)(["'])([^"']+)\2/g, (match, whitespace, quote, specifier) => {
    const dataUri = rewriteSpecifier(specifier);
    if (!dataUri) return match;
    return `import${whitespace}${quote}${dataUri}${quote}`;
  });

  rewritten = rewritten.replace(/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g, (match, quote, specifier) => {
    const dataUri = rewriteSpecifier(specifier);
    if (!dataUri) return match;
    return `import(${quote}${dataUri}${quote})`;
  });

  return rewritten;
}

function inlineCssUrls(cssText, cssFilePath) {
  return cssText.replace(/url\(([^)]+)\)/g, (match, rawUrl) => {
    const unquoted = rawUrl.trim().replace(/^['"]|['"]$/g, "");
    if (!unquoted || unquoted.startsWith("#")) return match;
    if (isExternalUrl(unquoted) || unquoted.startsWith("data:")) return match;

    const assetPath = resolveCssAssetPath(unquoted, cssFilePath);
    if (!fileExists(assetPath)) return match;

    const dataUri = toDataUri(assetPath);
    return `url("${dataUri}")`;
  });
}

function inlineStylesheets(html) {
  return html.replace(/<link\b[^>]*>/g, (tag) => {
    const attributes = parseAttributes(tag);
    const rel = attributes.rel?.toLowerCase();
    const href = attributes.href;

    if (rel !== "stylesheet" || !href) return tag;
    if (isExternalUrl(href) || href.startsWith("data:")) return tag;

    const cssFilePath = resolveHtmlAssetPath(href);
    if (!fileExists(cssFilePath)) return tag;

    const cssText = fs.readFileSync(cssFilePath, "utf8");
    const inlinedCss = inlineCssUrls(cssText, cssFilePath);
    return `<style>\n${inlinedCss}\n</style>`;
  });
}

function inlineScripts(html, jsSpecifierToDataUri) {
  return html.replace(
    /<script\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>\s*<\/script>/g,
    (tag, _quote, src) => {
      if (!src) return tag;
      if (isExternalUrl(src) || src.startsWith("data:")) return tag;

      const scriptFilePath = resolveHtmlAssetPath(src);
      if (!fileExists(scriptFilePath)) return tag;

      const scriptText = fs.readFileSync(scriptFilePath, "utf8");
      const rewrittenScriptText = inlineJsChunkImports(scriptText, jsSpecifierToDataUri);
      const openTag = tag.slice(0, tag.indexOf(">") + 1);
      const openTagWithoutSrc = openTag.replace(/\s+src=(["'])(.*?)\1/i, "");
      return `${openTagWithoutSrc}\n${rewrittenScriptText}\n</script>`;
    }
  );
}

function removePreloadLinks(html) {
  return html.replace(/<link\b[^>]*>/g, (tag) => {
    const attributes = parseAttributes(tag);
    const rel = attributes.rel?.toLowerCase();
    const href = attributes.href;

    if (!href) return tag;
    if (rel !== "modulepreload" && rel !== "preload") return tag;
    if (isExternalUrl(href) || href.startsWith("data:")) return tag;

    const preloadPath = resolveHtmlAssetPath(href);
    if (!fileExists(preloadPath)) return tag;

    return "";
  });
}

function inlineRemainingHtmlAssets(html) {
  const preservedLinkRels = new Set(["manifest"]);
  const preservedHrefPlaceholders = new Map();
  let placeholderIndex = 0;

  let rewritten = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const attributes = parseAttributes(tag);
    const href = attributes.href;
    const rel = attributes.rel?.toLowerCase();

    if (!href || !rel) return tag;

    const relTokens = rel.split(/\s+/).filter(Boolean);
    const shouldPreserveHref = relTokens.some((token) => preservedLinkRels.has(token));
    if (!shouldPreserveHref) return tag;

    const placeholder = `__PEACHBLASTER_PRESERVE_HREF_${placeholderIndex}__`;
    placeholderIndex += 1;
    preservedHrefPlaceholders.set(placeholder, href);

    return tag.replace(/\bhref=(["'])(.*?)\1/i, (hrefMatch, quote) => {
      void hrefMatch;
      return `href=${quote}${placeholder}${quote}`;
    });
  });

  rewritten = rewritten.replace(/\b(src|href)=(["'])(.*?)\2/g, (match, attr, quote, value) => {
    if (!value) return match;
    if (value.startsWith("#")) return match;
    if (preservedHrefPlaceholders.has(value)) return match;
    if (isExternalUrl(value) || value.startsWith("data:")) return match;

    const assetPath = resolveHtmlAssetPath(value);
    if (!fileExists(assetPath)) return match;

    const dataUri = toDataUri(assetPath);
    return `${attr}=${quote}${dataUri}${quote}`;
  });

  for (const [placeholder, originalHref] of preservedHrefPlaceholders) {
    rewritten = rewritten.split(placeholder).join(originalHref);
  }

  return rewritten;
}

function addHeaderComment(html) {
  const generatedAt = new Date().toISOString();
  const banner = `<!-- Peach Blaster Redux - Single-file arcade build (generated ${generatedAt}) -->`;

  if (/<!doctype\s+html>/i.test(html)) {
    return html.replace(/<!doctype\s+html>\s*/i, (match) => `${match}\n${banner}\n`);
  }

  return `${banner}\n${html}`;
}

function main() {
  if (!fileExists(indexHtmlPath)) {
    console.error(`Missing ${indexHtmlPath}. Run "npm run build" first.`);
    process.exit(1);
  }

  const originalDistBytes = getDirectorySizeBytes(
    distDir,
    new Set([outputHtmlPath])
  );
  const originalIndexBytes = fs.statSync(indexHtmlPath).size;

  let html = fs.readFileSync(indexHtmlPath, "utf8");
  const jsSpecifierToDataUri = buildJsSpecifierToDataUriMap();
  html = addHeaderComment(html);
  html = removePreloadLinks(html);
  html = inlineStylesheets(html);
  html = inlineScripts(html, jsSpecifierToDataUri);
  html = inlineRemainingHtmlAssets(html);

  fs.writeFileSync(outputHtmlPath, html, "utf8");

  const singleFileBytes = fs.statSync(outputHtmlPath).size;

  console.log("Single-file arcade export generated:");
  console.log(`- dist/index.html: ${formatBytes(originalIndexBytes)}`);
  console.log(`- dist/ (total):   ${formatBytes(originalDistBytes)}`);
  console.log(`- output:          ${formatBytes(singleFileBytes)}`);
  console.log(`- file:            ${outputHtmlPath}`);
  console.log(
    "- note: JS chunk imports are rewritten to `data:` URLs; validate `dist/peachblaster-arcade.html` on each target browser/runtime (file:// or cabinet loader)."
  );
}

main();
