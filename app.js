(function () {
  "use strict";

  const state = {
    index: null,
    currentTool: null,
    currentFile: null,
    search: "",
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const els = {
    sidebar: $("#sidebar"),
    toolList: $("#toolList"),
    searchInput: $("#searchInput"),
    metaStats: $("#metaStats"),
    content: $("#content"),
    homeView: $("#homeView"),
    toolView: $("#toolView"),
    fileView: $("#fileView"),
    loading: $("#loading"),
    error: $("#error"),
    toolGrid: $("#toolGrid"),
    toolTitle: $("#toolTitle"),
    toolDesc: $("#toolDesc"),
    fileTable: $("#fileTable tbody"),
    fileMeta: $("#fileMeta"),
    codeContent: $("#codeContent"),
    breadcrumb: $("#breadcrumb"),
    copyBtn: $("#copyBtn"),
    rawBtn: $("#rawBtn"),
    openSidebar: $("#openSidebar"),
    closeSidebar: $("#closeSidebar"),
    logo: $("#logo"),
    statTools: $("#statTools"),
    statFiles: $("#statFiles"),
  };

  // Tool short descriptions (fallback)
  const TOOL_DESCS = {
    Amp: "Sourcegraph Amp coding agent — prompts and tool schemas for Claude Sonnet 4 and GPT-5.",
    Anthropic: "Claude family prompts: Claude Code, Claude for Chrome, Sonnet & Fable system prompts.",
    "Augment Code": "Augment Code agent prompts and tool definitions for Claude Sonnet 4 and GPT-5.",
    Cluely: "Cluely real-time meeting/interview assistant — default and enterprise prompts.",
    "CodeBuddy Prompts": "Tencent CodeBuddy IDE assistant — Chat and Craft mode prompts.",
    "Comet Assistant": "Perplexity Comet browser assistant system prompt and tools.",
    "Cursor Prompts": "Cursor AI code editor — agent prompts, chat, tools and legacy variants.",
    "Devin AI": "Cognition Devin autonomous software engineer system prompt and DeepWiki.",
    Emergent: "Emergent.sh app-builder agent prompt and tools.",
    Google: "Google Antigravity IDE and Gemini AI Studio vibe-coder prompts.",
    Junie: "JetBrains Junie coding agent system prompt.",
    Kiro: "AWS Kiro spec-driven IDE — mode classifier, spec and vibe mode prompts.",
    "Leap.new": "Leap.new full-stack app generator prompts and tools.",
    Lovable: "Lovable app-builder agent prompt + tools and legacy variants.",
    "Manus Agent Tools & Prompt": "Manus general autonomous agent — prompt, loop, modules and tools.",
    NotionAi: "Notion AI assistant prompt and tools.",
    "Open Source prompts": "Officially open-sourced agent prompts: Bolt, Cline, Codex CLI, Gemini CLI, Lumo, RooCode.",
    "Orchids.app": "Orchids app-builder — system prompt and decision-making prompt.",
    Perplexity: "Perplexity answer-engine system prompt.",
    Poke: "Poke (Interaction Company) SMS/email agent — multi-part prompt set.",
    Qoder: "Qoder agentic IDE — base prompt plus Quest design/action prompts.",
    Replit: "Replit Agent prompt and tools, plus legacy variants.",
    "Same.dev": "Same.dev UI-cloning agent prompt and tools.",
    Trae: "ByteDance Trae IDE — Builder agent prompt/tools and Chat prompt.",
    "Traycer AI": "Traycer AI planning agent — phase-mode and plan-mode prompts with tools.",
    "VSCode Agent": "GitHub Copilot Chat agent in VS Code — model-specific prompts.",
    "Warp.dev": "Warp terminal AI agent system prompt.",
    Windsurf: "Codeium Windsurf — Wave 11 prompt and tools, plus legacy variants.",
    Xcode: "Apple Xcode coding assistant — system and per-action prompts.",
    "Z.ai Code": "Z.ai Code agent system prompt.",
    dia: "The Browser Company's Dia browser AI prompt.",
    "v0 Prompts and Tools": "Vercel v0 UI generator — prompt and tools, plus legacy variants.",
    Meta: "Repository metadata: README, INDEX, CHANGELOG, LICENSE.",
  };

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function langForExt(ext) {
    if (ext === "json") return "json";
    if (ext === "yaml" || ext === "yml") return "yaml";
    if (ext === "md") return "markdown";
    return "plaintext";
  }

  function show(view) {
    els.homeView.classList.add("hidden");
    els.toolView.classList.add("hidden");
    els.fileView.classList.add("hidden");
    els.loading.classList.add("hidden");
    els.error.classList.add("hidden");
    if (view) view.classList.remove("hidden");
  }

  function setBreadcrumb(parts) {
    els.breadcrumb.innerHTML = parts
      .map((p, i) =>
        i === parts.length - 1
          ? `<span>${escapeHtml(p)}</span>`
          : `<a href="#" data-nav="${escapeHtml(p)}">${escapeHtml(p)}</a><span class="sep">/</span>`
      )
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSidebar() {
    if (!state.index) return;
    const q = state.search.toLowerCase().trim();
    const tools = Object.keys(state.index.tools).sort((a, b) =>
      a === "Meta" ? 1 : b === "Meta" ? -1 : a.localeCompare(b)
    );

    let html = "";
    for (const tool of tools) {
      const files = state.index.files.filter((f) => f.tool === tool);
      if (q) {
        const matchTool = tool.toLowerCase().includes(q);
        const matchFile = files.some(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.path.toLowerCase().includes(q)
        );
        if (!matchTool && !matchFile) continue;
      }
      const active = state.currentTool === tool && !state.currentFile ? " active" : "";
      html += `<button class="tool-item${active}" data-tool="${escapeHtml(tool)}">
        ${escapeHtml(tool)}
        <span class="count">${files.length}</span>
      </button>`;
    }
    els.toolList.innerHTML = html || `<p style="padding:12px;color:var(--text-dim);font-size:13px">No matches</p>`;
  }

  function renderHome() {
    show(els.homeView);
    state.currentTool = null;
    state.currentFile = null;
    els.copyBtn.disabled = true;
    els.rawBtn.style.display = "none";
    setBreadcrumb(["Home"]);
    renderSidebar();

    const tools = Object.keys(state.index.tools)
      .filter((t) => t !== "Meta")
      .sort((a, b) => a.localeCompare(b));

    els.toolGrid.innerHTML = tools
      .map((tool) => {
        const count = state.index.tools[tool].length;
        return `<button class="tool-card" data-tool="${escapeHtml(tool)}">
          <div class="tool-card-name">${escapeHtml(tool)}</div>
          <div class="tool-card-meta">${count} file${count !== 1 ? "s" : ""}</div>
        </button>`;
      })
      .join("");
  }

  function renderTool(tool) {
    state.currentTool = tool;
    state.currentFile = null;
    show(els.toolView);
    els.copyBtn.disabled = true;
    els.rawBtn.style.display = "none";
    setBreadcrumb(["Home", tool]);
    renderSidebar();

    els.toolTitle.textContent = tool;
    els.toolDesc.textContent = TOOL_DESCS[tool] || "";

    const files = state.index.files.filter((f) => f.tool === tool);
    els.fileTable.innerHTML = files
      .map(
        (f) => `<tr>
        <td><a href="#" data-file="${escapeHtml(f.path)}">${escapeHtml(f.name)}</a></td>
        <td>${f.lines.toLocaleString()}</td>
        <td>${formatSize(f.size)}</td>
        <td><button class="btn btn-ghost view-btn" data-file="${escapeHtml(f.path)}">View</button></td>
      </tr>`
      )
      .join("");
  }

  async function renderFile(path) {
    const meta = state.index.files.find((f) => f.path === path);
    if (!meta) {
      show(els.error);
      els.error.textContent = "File not found in index.";
      return;
    }

    state.currentTool = meta.tool;
    state.currentFile = path;
    show(els.loading);
    setBreadcrumb(["Home", meta.tool, meta.name]);
    renderSidebar();

    els.copyBtn.disabled = true;
    els.rawBtn.style.display = "inline-flex";
    els.rawBtn.href = path;

    try {
      // Path is relative to site root (same as repo root)
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      show(els.fileView);
      els.fileMeta.innerHTML = `
        <span><strong>Tool</strong> ${escapeHtml(meta.tool)}</span>
        <span><strong>File</strong> ${escapeHtml(meta.name)}</span>
        <span><strong>Lines</strong> ${meta.lines.toLocaleString()}</span>
        <span><strong>Size</strong> ${formatSize(meta.size)}</span>
      `;

      const lang = langForExt(meta.ext);
      els.codeContent.className = `language-${lang} hljs`;
      els.codeContent.textContent = text;
      if (window.hljs) {
        hljs.highlightElement(els.codeContent);
      }
      els.copyBtn.disabled = false;
      els.copyBtn.dataset.content = text;
    } catch (err) {
      show(els.error);
      els.error.textContent = "Failed to load file: " + err.message;
    }
  }

  // Events
  els.toolList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tool]");
    if (btn) {
      renderTool(btn.dataset.tool);
      closeMobile();
    }
  });

  els.toolGrid.addEventListener("click", (e) => {
    const card = e.target.closest("[data-tool]");
    if (card) renderTool(card.dataset.tool);
  });

  document.body.addEventListener("click", (e) => {
    const fileLink = e.target.closest("[data-file]");
    if (fileLink) {
      e.preventDefault();
      renderFile(fileLink.dataset.file);
      closeMobile();
      return;
    }
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      if (nav.dataset.nav === "Home") renderHome();
      else renderTool(nav.dataset.nav);
    }
  });

  els.logo.addEventListener("click", (e) => {
    e.preventDefault();
    renderHome();
    closeMobile();
  });

  els.searchInput.addEventListener("input", () => {
    state.search = els.searchInput.value;
    renderSidebar();
  });

  els.copyBtn.addEventListener("click", async () => {
    const text = els.copyBtn.dataset.content;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const prev = els.copyBtn.textContent;
      els.copyBtn.textContent = "Copied!";
      setTimeout(() => (els.copyBtn.textContent = prev), 1500);
    } catch {
      els.copyBtn.textContent = "Failed";
      setTimeout(() => (els.copyBtn.textContent = "Copy"), 1500);
    }
  });

  function openMobile() {
    els.sidebar.classList.add("open");
  }
  function closeMobile() {
    els.sidebar.classList.remove("open");
  }
  els.openSidebar.addEventListener("click", openMobile);
  els.closeSidebar.addEventListener("click", closeMobile);

  // Init
  async function init() {
    try {
      const res = await fetch("data/index.json");
      if (!res.ok) throw new Error("Could not load index");
      state.index = await res.json();

      const toolCount = Object.keys(state.index.tools).filter((t) => t !== "Meta").length;
      const fileCount = state.index.files.length;
      els.statTools.textContent = toolCount;
      els.statFiles.textContent = fileCount;
      els.metaStats.textContent = `${toolCount} tools · ${fileCount} files`;

      // Hash routing
      const hash = location.hash.slice(1);
      if (hash.startsWith("file=")) {
        renderFile(decodeURIComponent(hash.slice(5)));
      } else if (hash.startsWith("tool=")) {
        renderTool(decodeURIComponent(hash.slice(5)));
      } else {
        renderHome();
      }
    } catch (err) {
      show(els.error);
      els.error.textContent = "Failed to initialize: " + err.message;
    }
  }

  // Optional: update hash on navigation
  const _renderTool = renderTool;
  renderTool = function (tool) {
    history.replaceState(null, "", "#tool=" + encodeURIComponent(tool));
    _renderTool(tool);
  };
  const _renderFile = renderFile;
  renderFile = function (path) {
    history.replaceState(null, "", "#file=" + encodeURIComponent(path));
    _renderFile(path);
  };
  const _renderHome = renderHome;
  renderHome = function () {
    history.replaceState(null, "", "#");
    _renderHome();
  };

  init();
})();
