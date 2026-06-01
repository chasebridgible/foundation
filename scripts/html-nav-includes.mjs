import path from "node:path";

function toWebPath(value) {
  return value.split(path.sep).join("/");
}

export function siteNavScriptTags({ repoRoot, htmlPath }) {
  if (!repoRoot || !htmlPath) return "";
  const fromDir = path.dirname(htmlPath);
  const siteMap = toWebPath(path.relative(fromDir, path.join(repoRoot, "docs", "site-map.js")));
  const siteNav = toWebPath(path.relative(fromDir, path.join(repoRoot, "docs", "site-nav.js")));
  return `<script src="${siteMap}"></script>
<script src="${siteNav}"></script>`;
}
