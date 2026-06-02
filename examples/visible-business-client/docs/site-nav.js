(function () {
  const scriptElement = document.currentScript;
  const siteRootUrl = new URL(".", scriptElement ? scriptElement.src : window.location.href);
  const navCollapsedStorageKey = "substrate-site-nav-collapsed";

  function normalizePagePath(url) {
    const parsed = new URL(url, window.location.href);
    let pathname = decodeURIComponent(parsed.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    return pathname.replace(/\/+/g, "/");
  }

  function isCurrentPage(targetUrl) {
    return normalizePagePath(targetUrl) === normalizePagePath(window.location.href);
  }

  function itemUrl(item) {
    return new URL(item.path, siteRootUrl);
  }

  function isFile(item) {
    return item && item.type === "file";
  }

  function isFolder(item) {
    return item && item.type === "folder" && Array.isArray(item.items);
  }

  function folderContainsCurrent(folder) {
    return (folder.items || []).some(item => {
      if (isFile(item)) return isCurrentPage(itemUrl(item).href);
      if (isFolder(item)) return folderContainsCurrent(item);
      return false;
    });
  }

  function normalizeSiteMap(rawSiteMap) {
    if (rawSiteMap && Array.isArray(rawSiteMap.items)) {
      return {
        label: rawSiteMap.label || "Documents",
        items: rawSiteMap.items
      };
    }

    if (Array.isArray(rawSiteMap)) {
      return {
        label: "Documents",
        items: rawSiteMap.map(group => ({
          type: "folder",
          name: group.group,
          title: group.group,
          items: (group.items || []).map(item => {
            const normalizedItem = {
              type: "file",
              name: item.path,
              title: item.title,
              path: item.path
            };
            if (item.specId) normalizedItem.specId = item.specId;
            return normalizedItem;
          })
        }))
      };
    }

    return null;
  }

  function injectStyles() {
    if (document.getElementById("substrate-site-nav-styles")) return;

    const style = document.createElement("style");
    style.id = "substrate-site-nav-styles";
    style.textContent = `
      body.substrate-has-injected-sidebar {
        display: flex;
        min-height: 100vh;
        padding: 0;
      }
      body.substrate-has-site-nav .sidebar {
        transition: width 160ms ease, min-width 160ms ease, padding 160ms ease, border-color 160ms ease;
      }
      body.substrate-has-site-nav.substrate-site-nav-collapsed .sidebar {
        border-right-color: var(--border, #2a2a2a);
        min-width: var(--substrate-site-nav-collapsed-width, 44px);
        overflow: hidden;
        padding-left: 0;
        padding-right: 0;
        width: var(--substrate-site-nav-collapsed-width, 44px) !important;
      }
      body.substrate-has-site-nav.substrate-site-nav-collapsed .sidebar > :not(.substrate-sidebar-control) {
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      }
      .substrate-sidebar-control {
        align-items: center;
        display: flex;
        justify-content: flex-end;
        padding: 8px 8px 6px;
      }
      body.substrate-has-site-nav.substrate-site-nav-collapsed .substrate-sidebar-control {
        justify-content: center;
      }
      .substrate-nav-toggle {
        align-items: center;
        background: var(--bg-3, #232323);
        border: 1px solid var(--border-2, #353535);
        border-radius: 6px;
        color: var(--fg-2, #a1a1a1);
        cursor: pointer;
        display: inline-flex;
        font: 600 11px/1 var(--font-mono, ui-monospace, monospace);
        height: 28px;
        justify-content: center;
        padding: 0;
        width: 28px;
      }
      .substrate-nav-toggle:hover,
      .substrate-nav-toggle:focus-visible {
        background: var(--bg-4, #2a2a2a);
        border-color: var(--primary, #4f8eff);
        color: var(--fg, #e4e4e7);
        outline: none;
      }
      body.substrate-has-injected-sidebar .substrate-site-main {
        flex: 1;
        min-width: 0;
        padding: 56px 72px 120px;
      }
      .substrate-generated-sidebar {
        background: var(--bg-2, #1f1f1f);
        border-right: 1px solid var(--border, #2a2a2a);
        flex-shrink: 0;
        height: 100vh;
        overflow-y: auto;
        padding: 24px 0;
        position: sticky;
        top: 0;
        width: var(--sidebar-w, 252px);
      }
      .substrate-generated-sidebar .sidebar-logo {
        align-items: center;
        border-bottom: 1px solid var(--border, #2a2a2a);
        display: flex;
        gap: 10px;
        margin-bottom: 8px;
        padding: 0 18px 16px;
      }
      .substrate-generated-sidebar .logo-mark {
        align-items: center;
        background: var(--bg-4, #2a2a2a);
        border: 1px solid var(--border-2, #353535);
        border-radius: 5px;
        color: var(--fg, #e4e4e7);
        display: flex;
        font-size: 12px;
        font-weight: 600;
        height: 24px;
        justify-content: center;
        width: 24px;
      }
      .substrate-generated-sidebar .sidebar-title {
        color: var(--fg, #e4e4e7);
        font-size: 13px;
        font-weight: 500;
      }
      .substrate-generated-sidebar .sidebar-sub {
        color: var(--fg-3, #6b6b6b);
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 11px;
        margin-top: 1px;
        max-width: 172px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .substrate-generated-sidebar .nav-section {
        padding: 6px 8px 0;
      }
      .substrate-generated-sidebar .nav-label {
        color: var(--fg-3, #6b6b6b);
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 10px;
        font-weight: 500;
        padding: 10px 10px 4px;
      }
      .substrate-generated-sidebar .nav-section[data-page-nav] {
        border-top: 1px solid var(--border, #2a2a2a);
        margin-top: 8px;
        padding-top: 8px;
      }
      .substrate-generated-sidebar .nav-item {
        align-items: flex-start;
        border-radius: 4px;
        color: var(--fg-2, #a1a1a1);
        display: flex;
        font-size: 12px;
        gap: 8px;
        line-height: 1.35;
        min-width: 0;
        overflow: hidden;
        padding: 5px 10px;
        text-decoration: none;
      }
      .substrate-generated-sidebar .nav-item:hover,
      .substrate-generated-sidebar .nav-item.active,
      .substrate-generated-sidebar .nav-item.current {
        background: var(--bg-4, #2a2a2a);
        color: var(--fg, #e4e4e7);
      }
      .substrate-generated-sidebar .nav-num {
        color: var(--fg-3, #6b6b6b);
        flex: 0 0 auto;
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 10px;
        padding-top: 1px;
        text-align: right;
        width: 18px;
      }
      .site-wide-nav {
        border-top: 1px solid var(--border, #2a2a2a);
        margin-top: 10px;
        padding-top: 8px;
      }
      .sidebar > .site-wide-nav:first-child,
      .sidebar > .sidebar-logo + .site-wide-nav {
        border-top: 0;
        margin-top: 0;
      }
      .site-nav-tree,
      .site-nav-folder-contents {
        display: block;
      }
      .site-nav-folder {
        margin: 1px 0;
      }
      .site-nav-summary {
        align-items: center;
        border-radius: 4px;
        color: var(--fg-3, #6b6b6b);
        cursor: pointer;
        display: flex;
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 10px;
        font-weight: 500;
        gap: 6px;
        line-height: 1.35;
        list-style: none;
        min-width: 0;
        padding: 6px 10px 5px calc(10px + (var(--site-nav-depth, 0) * 12px));
        user-select: none;
      }
      .site-nav-summary:hover {
        background: var(--bg-3, #232323);
        color: var(--fg-2, #a1a1a1);
      }
      .site-nav-summary::-webkit-details-marker {
        display: none;
      }
      .site-nav-summary::before {
        color: var(--fg-3, #6b6b6b);
        content: ">";
        flex: 0 0 auto;
        font-size: 9px;
        transform: rotate(0deg);
        transition: transform 120ms ease;
      }
      .site-nav-folder[open] > .site-nav-summary::before {
        transform: rotate(90deg);
      }
      .site-nav-folder-title,
      .site-nav-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .site-nav-link {
        align-items: flex-start;
        min-width: 0;
        padding-left: calc(10px + (var(--site-nav-depth, 0) * 12px));
      }
      .site-nav-link.current {
        background: var(--bg-4, #2a2a2a);
        color: var(--fg, #e4e4e7);
      }
      .site-nav-link .site-nav-dot {
        background: currentColor;
        border-radius: 999px;
        flex: 0 0 auto;
        height: 3px;
        margin-top: 8px;
        opacity: 0.45;
        width: 3px;
      }
      .site-nav-empty {
        color: var(--fg-3, #6b6b6b);
        font-size: 12px;
        padding: 4px 10px 8px;
      }
      @media (max-width: 760px) {
        body.substrate-has-injected-sidebar {
          display: block;
        }
        body.substrate-has-injected-sidebar .substrate-site-main {
          padding: 36px 22px 72px;
        }
        .substrate-generated-sidebar {
          border-bottom: 1px solid var(--border, #2a2a2a);
          border-right: 0;
          height: auto;
          max-height: 60vh;
          position: relative;
          width: 100%;
        }
        body.substrate-has-site-nav.substrate-site-nav-collapsed .sidebar {
          height: 44px;
          max-height: 44px;
          min-width: 100%;
          width: 100% !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function readStoredNavCollapsed() {
    try {
      return window.localStorage.getItem(navCollapsedStorageKey) === "true";
    } catch {
      return false;
    }
  }

  function writeStoredNavCollapsed(collapsed) {
    try {
      window.localStorage.setItem(navCollapsedStorageKey, collapsed ? "true" : "false");
    } catch {
      // Collapse state is a convenience preference; unavailable storage should not block docs.
    }
  }

  function setNavCollapsed(collapsed, { persist = true } = {}) {
    document.body.classList.toggle("substrate-site-nav-collapsed", collapsed);
    if (persist) writeStoredNavCollapsed(collapsed);
    document.querySelectorAll("[data-site-nav-toggle]").forEach(syncNavToggle);
    document.dispatchEvent(new CustomEvent("substrate:site-nav-toggle", { detail: { collapsed } }));
  }

  function syncNavToggle(button) {
    const collapsed = document.body.classList.contains("substrate-site-nav-collapsed");
    button.setAttribute("aria-pressed", collapsed ? "true" : "false");
    button.setAttribute("aria-label", collapsed ? "Show document navigation" : "Hide document navigation");
    button.title = collapsed ? "Show document navigation" : "Hide document navigation";
    button.textContent = collapsed ? ">>" : "<<";
  }

  function wireNavToggle(button) {
    if (button.dataset.siteNavToggleBound === "true") return;
    button.addEventListener("click", () => {
      setNavCollapsed(!document.body.classList.contains("substrate-site-nav-collapsed"));
    });
    button.dataset.siteNavToggleBound = "true";
  }

  function ensureNavToggle(sidebar) {
    const existing = sidebar.querySelector("[data-site-nav-toggle]");
    if (existing) {
      wireNavToggle(existing);
      syncNavToggle(existing);
      return;
    }

    const control = document.createElement("div");
    control.className = "substrate-sidebar-control";

    const button = document.createElement("button");
    button.className = "substrate-nav-toggle";
    button.type = "button";
    button.dataset.siteNavToggle = "true";
    wireNavToggle(button);
    control.appendChild(button);
    sidebar.insertBefore(control, sidebar.firstChild);
    syncNavToggle(button);
  }

  function currentDocumentTitle() {
    const heading = document.querySelector("h1");
    return ((heading && heading.textContent) || document.title || "Document").trim();
  }

  function ensureSidebar() {
    const existingSidebar = document.querySelector(".sidebar");
    if (existingSidebar) {
      if (!existingSidebar.getAttribute("aria-label")) existingSidebar.setAttribute("aria-label", "Documents");
      return { sidebar: existingSidebar, generated: false };
    }

    const sidebar = document.createElement("nav");
    sidebar.className = "sidebar substrate-generated-sidebar";
    sidebar.setAttribute("aria-label", "Documents");

    const logo = document.createElement("div");
    logo.className = "sidebar-logo";

    const mark = document.createElement("div");
    mark.className = "logo-mark";
    mark.textContent = "D";

    const copy = document.createElement("div");
    const title = document.createElement("div");
    title.className = "sidebar-title";
    title.textContent = "Documents";
    const subtitle = document.createElement("div");
    subtitle.className = "sidebar-sub";
    subtitle.textContent = currentDocumentTitle();
    subtitle.title = currentDocumentTitle();
    copy.append(title, subtitle);
    logo.append(mark, copy);
    sidebar.appendChild(logo);

    document.body.classList.add("substrate-has-injected-sidebar");
    const main = document.querySelector("main");
    if (main) main.classList.add("substrate-site-main");
    document.body.insertBefore(sidebar, document.body.firstChild);
    return { sidebar, generated: true };
  }

  function buildFileLink(item, depth) {
    const link = document.createElement("a");
    const targetUrl = itemUrl(item);
    link.className = "nav-item site-nav-link";
    link.href = targetUrl.href;
    link.style.setProperty("--site-nav-depth", String(depth));
    link.title = item.sourcePath || item.title;
    if (item.specId) link.dataset.specLink = item.specId;
    if (isCurrentPage(targetUrl.href)) link.classList.add("current");

    const dot = document.createElement("span");
    dot.className = "site-nav-dot";
    dot.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "site-nav-title";
    label.textContent = item.title || item.name || item.path;

    link.append(dot, label);
    return link;
  }

  function buildFolder(item, depth) {
    const details = document.createElement("details");
    details.className = "site-nav-folder";
    details.open = folderContainsCurrent(item);

    const summary = document.createElement("summary");
    summary.className = "site-nav-summary";
    summary.style.setProperty("--site-nav-depth", String(depth));
    summary.title = item.sourcePath || item.title || item.name;

    const label = document.createElement("span");
    label.className = "site-nav-folder-title";
    label.textContent = item.title || item.name;
    summary.appendChild(label);
    details.appendChild(summary);

    const contents = document.createElement("div");
    contents.className = "site-nav-folder-contents";
    for (const child of item.items || []) {
      const childNode = buildTreeItem(child, depth + 1);
      if (childNode) contents.appendChild(childNode);
    }
    details.appendChild(contents);
    return details;
  }

  function buildTreeItem(item, depth) {
    if (isFile(item)) return buildFileLink(item, depth);
    if (isFolder(item)) return buildFolder(item, depth);
    return null;
  }

  function buildPageSectionNav() {
    const sections = Array.from(document.querySelectorAll("main section[id], section[id]"));
    const seen = new Set();
    const items = sections
      .filter(section => {
        if (!section.id || seen.has(section.id)) return false;
        seen.add(section.id);
        return true;
      })
      .slice(0, 24);

    if (items.length === 0) return null;

    const section = document.createElement("div");
    section.className = "nav-section";

    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = "Sections";
    section.appendChild(label);

    items.forEach((item, index) => {
      const link = document.createElement("a");
      link.className = "nav-item" + (index === 0 ? " active" : "");
      link.href = `#${item.id}`;

      const number = document.createElement("span");
      number.className = "nav-num";
      number.textContent = String(index + 1).padStart(2, "0");

      const heading = item.querySelector("h1, h2, h3");
      const title = document.createTextNode(((heading && heading.textContent) || item.id).trim());
      link.append(number, title);
      section.appendChild(link);
    });

    return section;
  }

  function insertDocumentSection(sidebar, section) {
    const existingSections = Array.from(sidebar.children).filter(child => child.classList.contains("nav-section"));
    const firstSection = existingSections[0];
    if (!firstSection) sidebar.appendChild(section);
    else sidebar.insertBefore(section, firstSection);
  }

  function addSiteNav() {
    const siteMap = normalizeSiteMap(window.SubstrateSiteMap);
    if (!siteMap) return;

    injectStyles();
    const { sidebar, generated } = ensureSidebar();
    document.body.classList.add("substrate-has-site-nav");
    ensureNavToggle(sidebar);
    setNavCollapsed(readStoredNavCollapsed(), { persist: false });
    if (sidebar.querySelector("[data-site-nav]")) return;

    const section = document.createElement("div");
    section.className = "nav-section site-wide-nav";
    section.dataset.siteNav = "true";

    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = siteMap.label || "Documents";
    section.appendChild(label);

    if (!siteMap.items.length) {
      const empty = document.createElement("div");
      empty.className = "site-nav-empty";
      empty.textContent = "No pages found.";
      section.appendChild(empty);
    } else {
      const tree = document.createElement("div");
      tree.className = "site-nav-tree";
      for (const item of siteMap.items) {
        const node = buildTreeItem(item, 0);
        if (node) tree.appendChild(node);
      }
      section.appendChild(tree);
    }

    insertDocumentSection(sidebar, section);

    if (generated && !sidebar.querySelector("[data-page-nav]")) {
      const pageNav = buildPageSectionNav();
      if (pageNav) {
        pageNav.dataset.pageNav = "true";
        sidebar.appendChild(pageNav);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addSiteNav);
  } else {
    addSiteNav();
  }
})();
