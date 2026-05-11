(function () {
  const scriptElement = document.currentScript;
  const siteRootUrl = new URL(".", scriptElement ? scriptElement.src : window.location.href);

  function normalizePath(url) {
    return decodeURIComponent(new URL(url, window.location.href).pathname).replace(/\/index\.html$/, "/index.html");
  }

  function isCurrentPage(targetUrl) {
    return normalizePath(targetUrl) === normalizePath(window.location.href);
  }

  function injectStyles() {
    if (document.getElementById("foundation-site-nav-styles")) return;

    const style = document.createElement("style");
    style.id = "foundation-site-nav-styles";
    style.textContent = `
      .site-wide-nav {
        border-top: 1px solid var(--border, #2a2a2a);
        margin-top: 10px;
        padding-top: 8px;
      }
      .site-nav-group {
        margin: 2px 0 8px;
      }
      .site-nav-summary {
        align-items: center;
        color: var(--fg-3, #6b6b6b);
        cursor: pointer;
        display: flex;
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 10px;
        font-weight: 500;
        gap: 6px;
        list-style: none;
        padding: 7px 10px 4px;
        text-transform: none;
      }
      .site-nav-summary::-webkit-details-marker {
        display: none;
      }
      .site-nav-summary::before {
        color: var(--fg-3, #6b6b6b);
        content: ">";
        font-size: 9px;
        transform: rotate(0deg);
        transition: transform 120ms ease;
      }
      .site-nav-group[open] > .site-nav-summary::before {
        transform: rotate(90deg);
      }
      .site-nav-link.current {
        background: var(--bg-4, #2a2a2a);
        color: var(--fg, #e4e4e7);
      }
      .site-nav-link .nav-num {
        width: 18px;
      }
      .site-nav-empty {
        color: var(--fg-3, #6b6b6b);
        font-size: 12px;
        padding: 4px 10px 8px;
      }
    `;
    document.head.appendChild(style);
  }

  function buildLink(item, index) {
    const link = document.createElement("a");
    const targetUrl = new URL(item.path, siteRootUrl);
    link.className = "nav-item site-nav-link";
    link.href = targetUrl.href;
    if (item.specId) link.dataset.specLink = item.specId;
    if (isCurrentPage(targetUrl.href)) link.classList.add("current");

    const number = document.createElement("span");
    number.className = "nav-num";
    number.textContent = String(index + 1).padStart(2, "0");

    const label = document.createElement("span");
    label.textContent = item.title;

    link.append(number, label);
    return link;
  }

  function addSiteNav() {
    const sidebar = document.querySelector(".sidebar");
    const siteMap = window.FoundationSiteMap;
    if (!sidebar || !Array.isArray(siteMap) || sidebar.querySelector("[data-site-nav]")) return;

    injectStyles();

    const section = document.createElement("div");
    section.className = "nav-section site-wide-nav";
    section.dataset.siteNav = "true";

    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = "All HTML";
    section.appendChild(label);

    if (!siteMap.length) {
      const empty = document.createElement("div");
      empty.className = "site-nav-empty";
      empty.textContent = "No pages found.";
      section.appendChild(empty);
      sidebar.appendChild(section);
      return;
    }

    for (const group of siteMap) {
      const details = document.createElement("details");
      details.className = "site-nav-group";

      const activeGroup = (group.items || []).some(item => isCurrentPage(new URL(item.path, siteRootUrl).href));
      details.open = activeGroup;

      const summary = document.createElement("summary");
      summary.className = "site-nav-summary";
      summary.textContent = group.group;
      details.appendChild(summary);

      (group.items || []).forEach((item, index) => details.appendChild(buildLink(item, index)));
      section.appendChild(details);
    }

    const existingSections = Array.from(sidebar.querySelectorAll(":scope > .nav-section"));
    const firstSection = existingSections[0];
    const firstLabel = firstSection?.querySelector(".nav-label")?.textContent?.trim();

    if (!firstSection) {
      sidebar.appendChild(section);
    } else if (firstLabel === "Documents") {
      firstSection.after(section);
    } else {
      sidebar.insertBefore(section, firstSection);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addSiteNav);
  } else {
    addSiteNav();
  }
})();
