"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var BUILT_IN_FALLBACK_SNIPPETS = [
  {
    code: "// Offline fallback: add entries to docs/code-pack.json (or .md) to customize snippets.",
    languageId: "plaintext"
  }
];
var webviewPanel;
var idleTimer;
var lastRepositoryKey;
var lastKnownLanguageId = "plaintext";
var repoCooldowns = /* @__PURE__ */ new Map();
var resetIdleTimerRef;
var codePackSnippets = [];
var REPO_CACHE_DURATION_MS = 6 * 60 * 60 * 1e3;
var LANGUAGE_ALIASES = {
  "javascriptreact": "javascript",
  "typescriptreact": "typescript",
  "react": "javascript",
  "c++": "cpp",
  "objective-c++": "cpp",
  "objective-c": "c",
  "shellscript": "shell",
  "shell": "shell",
  "bash": "shell",
  "zsh": "shell",
  "sh": "shell",
  "jsonc": "json",
  "json5": "json",
  "md": "plaintext",
  "markdown": "plaintext",
  "c#": "csharp",
  "cs": "csharp",
  "ps": "powershell",
  "ps1": "powershell",
  "psm1": "powershell",
  "psd1": "powershell",
  "powershellscript": "powershell",
  "yml": "yaml",
  "ts": "typescript",
  "py": "python",
  "rb": "ruby"
};
var LANGUAGE_EXTENSION_MAP = {
  "brainfuck": [".bf"],
  "c": [".c", ".h"],
  "csharp": [".cs"],
  "cpp": [".cc", ".cpp", ".cxx", ".hpp", ".hh", ".hxx"],
  "css": [".css"],
  "go": [".go"],
  "html": [".html", ".htm"],
  "java": [".java"],
  "javascript": [".js", ".jsx", ".mjs", ".cjs"],
  "json": [".json"],
  "kotlin": [".kt"],
  "lua": [".lua"],
  "php": [".php"],
  "powershell": [".ps1", ".psm1"],
  "python": [".py"],
  "ruby": [".rb"],
  "rust": [".rs"],
  "scala": [".scala"],
  "shell": [".sh", ".bash", ".zsh"],
  "sql": [".sql"],
  "swift": [".swift"],
  "typescript": [".ts", ".tsx"],
  "yaml": [".yml", ".yaml"],
  "plaintext": [".md", ".markdown", ".txt"]
};
var KNOWN_TEXT_EXTENSIONS = new Set(Object.values(LANGUAGE_EXTENSION_MAP).flat());
var MAX_REPO_ATTEMPTS = 6;
var NON_PRINTABLE_THRESHOLD = 0.12;
function logWithTimestamp(message, level = "log", ...optionalParams) {
  const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  const formattedMessage = `[${timestamp}] ${message}`;
  switch (level) {
    case "warn":
      console.warn(formattedMessage, ...optionalParams);
      break;
    case "error":
      console.error(formattedMessage, ...optionalParams);
      break;
    default:
      console.log(formattedMessage, ...optionalParams);
      break;
  }
}
var SNIPPET_REPOSITORIES = [
  {
    label: "TheAlgorithms \xB7 Python",
    owner: "TheAlgorithms",
    repo: "Python",
    license: "MIT",
    licenseUrl: "https://github.com/TheAlgorithms/Python/blob/master/LICENSE",
    languages: ["python"]
  },
  {
    label: "TheAlgorithms \xB7 JavaScript",
    owner: "TheAlgorithms",
    repo: "JavaScript",
    license: "MIT",
    licenseUrl: "https://github.com/TheAlgorithms/JavaScript/blob/master/LICENSE",
    languages: ["javascript", "typescript"]
  },
  {
    label: "TheAlgorithms \xB7 Java",
    owner: "TheAlgorithms",
    repo: "Java",
    license: "MIT",
    licenseUrl: "https://github.com/TheAlgorithms/Java/blob/master/LICENSE",
    languages: ["java"]
  },
  {
    label: "TheAlgorithms \xB7 C",
    owner: "TheAlgorithms",
    repo: "C",
    license: "MIT",
    licenseUrl: "https://github.com/TheAlgorithms/C/blob/main/LICENSE",
    languages: ["c"]
  },
  {
    label: "TheAlgorithms \xB7 C++",
    owner: "TheAlgorithms",
    repo: "C-Plus-Plus",
    license: "MIT",
    licenseUrl: "https://github.com/TheAlgorithms/C-Plus-Plus/blob/master/LICENSE",
    languages: ["cpp"]
  },
  {
    label: "TheAlgorithms \xB7 Go",
    owner: "TheAlgorithms",
    repo: "Go",
    license: "MIT",
    licenseUrl: "https://github.com/TheAlgorithms/Go/blob/master/LICENSE",
    languages: ["go"]
  },
  {
    label: "TheAlgorithms \xB7 Rust",
    owner: "TheAlgorithms",
    repo: "Rust",
    license: "MIT",
    licenseUrl: "https://github.com/TheAlgorithms/Rust/blob/master/LICENSE",
    languages: ["rust"]
  },
  {
    label: "TheAlgorithms \xB7 Kotlin",
    owner: "TheAlgorithms",
    repo: "Kotlin",
    license: "MIT",
    licenseUrl: "https://github.com/TheAlgorithms/Kotlin/blob/master/LICENSE",
    languages: ["kotlin"]
  },
  {
    label: "30 Seconds of Code",
    owner: "30-seconds",
    repo: "30-seconds-of-code",
    license: "CC0 1.0 Universal",
    licenseUrl: "https://github.com/30-seconds/30-seconds-of-code/blob/master/LICENSE",
    languages: ["javascript", "typescript", "react"]
  },
  {
    label: "1loc",
    owner: "phuoc-ng",
    repo: "1loc",
    license: "MIT",
    licenseUrl: "https://github.com/phuoc-ng/1loc/blob/master/LICENSE",
    languages: ["javascript"]
  },
  {
    label: "leachim6 \xB7 Hello World",
    owner: "leachim6",
    repo: "hello-world",
    license: "CC BY 4.0",
    licenseUrl: "https://github.com/leachim6/hello-world/blob/master/LICENSE",
    languages: ["plaintext", "c", "cpp", "java", "javascript", "python", "ruby", "go", "rust", "swift", "kotlin", "brainfuck"]
  },
  {
    label: "LydiaHallie \xB7 JavaScript Questions",
    owner: "lydiahallie",
    repo: "javascript-questions",
    license: "MIT",
    licenseUrl: "https://github.com/lydiahallie/javascript-questions/blob/main/LICENSE",
    languages: ["javascript", "typescript", "plaintext"]
  },
  {
    label: "denysdovhan \xB7 wtfjs",
    owner: "denysdovhan",
    repo: "wtfjs",
    license: "MIT",
    licenseUrl: "https://github.com/denysdovhan/wtfjs/blob/master/LICENSE",
    languages: ["javascript", "typescript", "plaintext"]
  },
  {
    label: "satwikkansal \xB7 wtfpython",
    owner: "satwikkansal",
    repo: "wtfpython",
    license: "MIT",
    licenseUrl: "https://github.com/satwikkansal/wtfpython/blob/master/LICENSE",
    languages: ["python", "plaintext"]
  },
  {
    label: "30 Seconds of Interviews",
    owner: "30-seconds",
    repo: "30-seconds-of-interviews",
    license: "MIT",
    licenseUrl: "https://github.com/30-seconds/30-seconds-of-interviews/blob/master/LICENSE",
    languages: ["javascript", "typescript", "plaintext"]
  },
  {
    label: "awesome-programming-quotes",
    owner: "ashishb",
    repo: "awesome-programming-quotes",
    license: "See repository license",
    licenseUrl: "https://github.com/ashishb/awesome-programming-quotes",
    languages: ["plaintext"]
  },
  {
    label: "programming-memes",
    owner: "abhisheknaiidu",
    repo: "programming-memes",
    license: "See repository license",
    licenseUrl: "https://github.com/abhisheknaiidu/programming-memes",
    languages: ["plaintext"]
  }
];
var LANGUAGE_TO_REPOSITORIES = SNIPPET_REPOSITORIES.reduce((acc, repository) => {
  for (const lang of repository.languages) {
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(repository);
  }
  return acc;
}, {});
var repoCaches = /* @__PURE__ */ new Map();
var repoBranchCache = /* @__PURE__ */ new Map();
function normalizeLanguageId(languageId) {
  if (!languageId) {
    return "plaintext";
  }
  const lowered = languageId.toLowerCase();
  return LANGUAGE_ALIASES[lowered] ?? lowered;
}
function getActiveOrLastLanguageId() {
  const activeEditorLanguage = vscode.window.activeTextEditor?.document.languageId;
  if (activeEditorLanguage) {
    lastKnownLanguageId = activeEditorLanguage;
  }
  return lastKnownLanguageId;
}
function getExtensionsForLanguage(languageId) {
  return LANGUAGE_EXTENSION_MAP[languageId] ?? [];
}
function inferLanguageFromPath(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (!extension) {
    return void 0;
  }
  for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSION_MAP)) {
    if (extensions.includes(extension)) {
      return language;
    }
  }
  return void 0;
}
function isRepoFileMetadataSafe(filePath, size) {
  const lowerPath = filePath.toLowerCase();
  const fileExtension = path.extname(lowerPath);
  if (fileExtension && !KNOWN_TEXT_EXTENSIONS.has(fileExtension)) {
    return false;
  }
  if (typeof size === "number" && size > 12e4) {
    return false;
  }
  return true;
}
function isContentSafe(content) {
  if (!content || typeof content !== "string") {
    return false;
  }
  return !hasBinarySignature(content);
}
function hasBinarySignature(content) {
  if (!content.length) {
    return false;
  }
  let nonPrintable = 0;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13) {
      continue;
    }
    if (code === 0 || code === 65533 || code < 32) {
      nonPrintable++;
    }
  }
  return nonPrintable / content.length > NON_PRINTABLE_THRESHOLD;
}
function shuffle(items) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}
function getRepoCacheKey(repository) {
  return `${repository.owner}/${repository.repo}`;
}
function setRepositoryCooldown(repository, resetEpochMs) {
  const key = getRepoCacheKey(repository);
  const now = Date.now();
  const cooldownUntil = typeof resetEpochMs === "number" && resetEpochMs > now ? resetEpochMs : now + 15 * 60 * 1e3;
  repoCooldowns.set(key, cooldownUntil);
  const resumeAt = new Date(cooldownUntil).toLocaleTimeString();
  logWithTimestamp(`GitHub rate limit hit for ${repository.label}. Cooling down until ${resumeAt}.`, "warn");
}
function isRepositoryOnCooldown(repository) {
  const key = getRepoCacheKey(repository);
  const until = repoCooldowns.get(key);
  if (!until) {
    return false;
  }
  if (Date.now() < until) {
    return true;
  }
  repoCooldowns.delete(key);
  return false;
}
async function resolveBranch(repository) {
  const cacheKey = getRepoCacheKey(repository);
  if (repoBranchCache.has(cacheKey)) {
    return repoBranchCache.get(cacheKey);
  }
  if (repository.branch) {
    repoBranchCache.set(cacheKey, repository.branch);
    return repository.branch;
  }
  const repoMetaUrl = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
  try {
    const response = await fetch(repoMetaUrl);
    if (response.status === 403) {
      const resetHeader = response.headers.get("X-RateLimit-Reset");
      const resetEpochMs = resetHeader ? parseInt(resetHeader, 10) * 1e3 : void 0;
      setRepositoryCooldown(repository, resetEpochMs);
      throw new Error("GitHub API rate limit exceeded");
    }
    if (response.ok) {
      const data = await response.json();
      const defaultBranch = typeof data?.default_branch === "string" ? data.default_branch : "master";
      repoBranchCache.set(cacheKey, defaultBranch);
      return defaultBranch;
    }
    logWithTimestamp(
      `Failed to resolve default branch for ${repository.label}. Falling back to 'master'.`,
      "warn"
    );
  } catch (error) {
    logWithTimestamp(`Error resolving branch for ${repository.label}.`, "warn", error);
  }
  repoBranchCache.set(cacheKey, "master");
  return "master";
}
function buildTreeUrl(repository, branch) {
  return `https://api.github.com/repos/${repository.owner}/${repository.repo}/git/trees/${branch}?recursive=1`;
}
function buildRawUrl(repository, branch, filePath) {
  return `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${branch}/` + encodeURI(filePath).replace(/#/g, "%23");
}
function buildLicenseHeader(repository, branch, filePath) {
  const source = `// Source: https://github.com/${repository.owner}/${repository.repo}/blob/${branch}/${filePath}`;
  const license = repository.licenseUrl ? `// License: ${repository.license} (${repository.licenseUrl})` : `// License: ${repository.license}`;
  return `${source}
${license}

`;
}
function removeRepoFileFromCache(repository, filePath) {
  const cacheKey = getRepoCacheKey(repository);
  const cache = repoCaches.get(cacheKey);
  if (!cache) {
    return;
  }
  cache.entries = cache.entries.filter((entry) => entry.path !== filePath);
  repoCaches.set(cacheKey, cache);
}
async function refreshRepoCache(repository) {
  try {
    const branch = await resolveBranch(repository);
    logWithTimestamp(`Fetching repository tree from GitHub for ${repository.label} (${branch}).`);
    const response = await fetch(buildTreeUrl(repository, branch));
    if (response.status === 403) {
      const resetHeader = response.headers.get("X-RateLimit-Reset");
      const resetEpochMs = resetHeader ? parseInt(resetHeader, 10) * 1e3 : void 0;
      setRepositoryCooldown(repository, resetEpochMs);
      repoCaches.delete(getRepoCacheKey(repository));
      return;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch repository tree: ${response.status}`);
    }
    const data = await response.json();
    const treeEntries = Array.isArray(data?.tree) ? data.tree : [];
    const freshEntries = treeEntries.filter((entry) => entry?.type === "blob" && typeof entry?.path === "string").map((entry) => ({
      path: entry.path,
      size: typeof entry.size === "number" ? entry.size : 0
    })).filter((entry) => isRepoFileMetadataSafe(entry.path, entry.size));
    repoCaches.set(getRepoCacheKey(repository), {
      entries: freshEntries,
      timestamp: Date.now(),
      branch
    });
    logWithTimestamp(`Cached ${freshEntries.length} files from ${repository.label}.`);
  } catch (error) {
    logWithTimestamp(`Error refreshing repository cache for ${repository.label}.`, "error", error);
    repoCaches.delete(getRepoCacheKey(repository));
  }
}
async function ensureRepoCache(repository) {
  if (isRepositoryOnCooldown(repository)) {
    const key = getRepoCacheKey(repository);
    const until = repoCooldowns.get(key) ?? 0;
    logWithTimestamp(
      `${repository.label} is on cooldown until ${new Date(until).toLocaleTimeString()}. Skipping.`,
      "warn"
    );
    return void 0;
  }
  const cacheKey = getRepoCacheKey(repository);
  const cache = repoCaches.get(cacheKey);
  const now = Date.now();
  if (!cache || now - cache.timestamp > REPO_CACHE_DURATION_MS || cache.entries.length === 0) {
    await refreshRepoCache(repository);
  }
  return repoCaches.get(cacheKey);
}
async function tryFetchFromRepository(repository, normalizedLang, extensions) {
  const cache = await ensureRepoCache(repository);
  if (!cache || cache.entries.length === 0) {
    logWithTimestamp(`Repository cache empty for ${repository.label}.`, "warn");
    return void 0;
  }
  const { entries, branch } = cache;
  const repoLabel = repository.label;
  const candidatePool = extensions.length > 0 ? entries.filter((entry) => extensions.some((ext) => entry.path.toLowerCase().endsWith(ext))) : entries;
  if (candidatePool.length === 0) {
    logWithTimestamp(`No files with extensions ${extensions.join(", ")} in ${repoLabel}.`, "warn");
    if (!repository.languages.includes(normalizedLang)) {
      return void 0;
    }
  }
  const selectionPool = candidatePool.length > 0 ? candidatePool : entries;
  if (selectionPool.length === 0) {
    logWithTimestamp(`No entries available in ${repoLabel}.`, "warn");
    return void 0;
  }
  const attempts = Math.min(MAX_REPO_ATTEMPTS, selectionPool.length);
  const shuffledEntries = shuffle(selectionPool).slice(0, attempts);
  for (const entry of shuffledEntries) {
    try {
      const rawUrl = buildRawUrl(repository, branch, entry.path);
      const response = await fetch(rawUrl);
      if (!response.ok) {
        logWithTimestamp(`Failed to download ${entry.path} from ${repoLabel}.`, "warn");
        removeRepoFileFromCache(repository, entry.path);
        continue;
      }
      const content = await response.text();
      if (!isContentSafe(content)) {
        logWithTimestamp(`File flagged as unsafe: ${entry.path} (${repoLabel}).`, "warn");
        removeRepoFileFromCache(repository, entry.path);
        continue;
      }
      const finalCode = content.length > 2e4 ? "// Repository content is too large to display." : content;
      const inferredLanguage = inferLanguageFromPath(entry.path) ?? normalizedLang ?? "plaintext";
      const languageMatches = inferredLanguage === normalizedLang;
      const prefixMessage = languageMatches ? "" : `// Could not find a '${normalizedLang}' file. Displaying '${inferredLanguage}'.

`;
      const licenseHeader = buildLicenseHeader(repository, branch, entry.path);
      logWithTimestamp(`Loaded snippet from ${entry.path} (${repoLabel}).`);
      lastRepositoryKey = getRepoCacheKey(repository);
      return {
        code: licenseHeader + prefixMessage + finalCode,
        languageId: inferredLanguage
      };
    } catch (error) {
      logWithTimestamp(`Failed to process ${entry.path} from ${repoLabel}.`, "warn", error);
      removeRepoFileFromCache(repository, entry.path);
    }
  }
  return void 0;
}
async function fetchRandomRepoSnippet(languageId) {
  const normalizedLang = normalizeLanguageId(languageId);
  const extensions = getExtensionsForLanguage(normalizedLang);
  const preferredRepos = LANGUAGE_TO_REPOSITORIES[normalizedLang] ?? [];
  const preferredKeys = new Set(preferredRepos.map((repo) => getRepoCacheKey(repo)));
  const fallbackRepos = SNIPPET_REPOSITORIES.filter((repo) => !preferredKeys.has(getRepoCacheKey(repo)));
  const filteredPreferred = preferredRepos.filter((repo) => getRepoCacheKey(repo) !== lastRepositoryKey);
  const filteredFallback = fallbackRepos.filter((repo) => getRepoCacheKey(repo) !== lastRepositoryKey);
  const repositoriesToTry = [
    ...shuffle(filteredPreferred.length > 0 ? filteredPreferred : []),
    ...shuffle(filteredFallback)
  ];
  if (lastRepositoryKey) {
    const lastRepo = SNIPPET_REPOSITORIES.find((repo) => getRepoCacheKey(repo) === lastRepositoryKey);
    if (lastRepo) {
      repositoriesToTry.push(lastRepo);
    }
  }
  for (const repository of repositoriesToTry) {
    logWithTimestamp(`Trying ${repository.label} for '${normalizedLang}' snippets.`);
    const result = await tryFetchFromRepository(repository, normalizedLang, extensions);
    if (result) {
      return result;
    }
  }
  logWithTimestamp("No suitable repository file found after checking all sources. Using fallback snippet.", "warn");
  lastRepositoryKey = void 0;
  return getRandomFallbackSnippet(normalizedLang);
}
async function showScreenSaver(context) {
  if (webviewPanel) {
    logWithTimestamp("Screen saver already open. Revealing existing panel.");
    webviewPanel.reveal(vscode.ViewColumn.One);
    return;
  }
  logWithTimestamp("Creating screen saver webview.");
  webviewPanel = vscode.window.createWebviewPanel(
    "screenSaver",
    "Screen Saver",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")]
    }
  );
  webviewPanel.webview.html = getWebviewContent(context, webviewPanel.webview);
  webviewPanel.onDidDispose(() => {
    logWithTimestamp("Screen saver webview disposed.");
    webviewPanel = void 0;
  }, null, context.subscriptions);
  webviewPanel.webview.onDidReceiveMessage(async (message) => {
    const langId = getActiveOrLastLanguageId();
    switch (message.command) {
      case "exitScreenSaver":
        logWithTimestamp("Received exit command from webview.");
        if (webviewPanel)
          webviewPanel.dispose();
        break;
      case "requestNewGist":
        logWithTimestamp(`Webview requested new snippet for '${langId}'.`);
        const newContent = await fetchRandomRepoSnippet(langId);
        if (webviewPanel) {
          webviewPanel.webview.postMessage({ command: "loadCode", ...newContent });
        }
        break;
      case "userActivity":
        resetIdleTimerRef?.();
        break;
    }
  }, void 0, context.subscriptions);
  const initialLangId = getActiveOrLastLanguageId();
  const configuration = vscode.workspace.getConfiguration("screenSaver");
  const typingSpeed = configuration.get("typingSpeed", 40);
  logWithTimestamp(`Loading initial snippet for '${initialLangId}'.`);
  const initialContent = await fetchRandomRepoSnippet(initialLangId);
  if (webviewPanel) {
    webviewPanel.webview.postMessage({ command: "loadCode", typingSpeed, ...initialContent });
    logWithTimestamp("Initial snippet sent to webview.");
  }
}
function getWebviewContent(context, webview) {
  const htmlPath = vscode.Uri.joinPath(context.extensionUri, "media", "webview.html");
  if (!fs.existsSync(htmlPath.fsPath)) {
    return `<html><body><h1>Error: webview.html not found!</h1></body></html>`;
  }
  const baseHtml = fs.readFileSync(htmlPath.fsPath, "utf8");
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "media", "styles.css"));
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "media", "main.js"));
  return baseHtml.replace(/\{\{cspSource\}\}/g, webview.cspSource).replace(/\{\{styleUri\}\}/g, styleUri.toString()).replace(/\{\{scriptUri\}\}/g, scriptUri.toString());
}
function activate(context) {
  logWithTimestamp('"coding-screensaver" is now active.');
  try {
    loadCodePackSnippets(context);
    if (codePackSnippets.length > 0) {
      logWithTimestamp(`Loaded ${codePackSnippets.length} code-pack fallback snippets.`);
    }
  } catch (err) {
    logWithTimestamp("Failed to load code-pack snippets.", "warn", err);
  }
  const resetIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    getActiveOrLastLanguageId();
    if (!vscode.window.state.focused) {
      logWithTimestamp("Window not focused. Idle timer paused.");
      return;
    }
    const configuration = vscode.workspace.getConfiguration("screenSaver");
    const idleTime = configuration.get("idleTimeSeconds", 300);
    if (idleTime > 0) {
      const triggerAt = new Date(Date.now() + idleTime * 1e3);
      logWithTimestamp(
        `Idle timer armed for ${idleTime} seconds. Scheduled at ${triggerAt.toLocaleTimeString()}.`
      );
      idleTimer = setTimeout(() => {
        logWithTimestamp("Idle timer elapsed. Launching screen saver.");
        showScreenSaver(context);
      }, idleTime * 1e3);
    } else {
      logWithTimestamp("Idle timer disabled via configuration.");
    }
  };
  resetIdleTimerRef = resetIdleTimer;
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => resetIdleTimer()));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => resetIdleTimer()));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => resetIdleTimer()));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(() => resetIdleTimer()));
  context.subscriptions.push(vscode.window.onDidChangeActiveTerminal(() => resetIdleTimer()));
  context.subscriptions.push(vscode.window.onDidOpenTerminal(() => resetIdleTimer()));
  context.subscriptions.push(vscode.window.onDidCloseTerminal(() => resetIdleTimer()));
  if (vscode.window.onDidChangeActiveNotebookEditor) {
    context.subscriptions.push(vscode.window.onDidChangeActiveNotebookEditor(() => resetIdleTimer()));
  }
  if (vscode.window.onDidChangeVisibleNotebookEditors) {
    context.subscriptions.push(vscode.window.onDidChangeVisibleNotebookEditors(() => resetIdleTimer()));
  }
  const onDidWriteTerminalData = vscode.window.onDidWriteTerminalData;
  if (onDidWriteTerminalData) {
    context.subscriptions.push(onDidWriteTerminalData(() => resetIdleTimer()));
  }
  context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => resetIdleTimer()));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(() => resetIdleTimer()));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(() => resetIdleTimer()));
  if (vscode.workspace.onDidChangeNotebookDocument) {
    context.subscriptions.push(vscode.workspace.onDidChangeNotebookDocument(() => resetIdleTimer()));
  }
  if (typeof vscode.commands.onDidExecuteCommand === "function") {
    context.subscriptions.push(vscode.commands.onDidExecuteCommand((event) => {
      if (!event?.command?.startsWith("screenSaver.")) {
        resetIdleTimer();
      }
    }));
  }
  context.subscriptions.push(vscode.window.onDidChangeWindowState((windowState) => {
    if (windowState.focused) {
      resetIdleTimer();
    } else {
      if (idleTimer)
        clearTimeout(idleTimer);
      if (webviewPanel)
        webviewPanel.dispose();
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("screenSaver.test", () => {
    showScreenSaver(context);
  }));
  resetIdleTimer();
}
function deactivate() {
  if (webviewPanel)
    webviewPanel.dispose();
  if (idleTimer)
    clearTimeout(idleTimer);
  resetIdleTimerRef = void 0;
}
function getRandomFallbackSnippet(preferredLanguageId) {
  const basePool = codePackSnippets.length > 0 ? codePackSnippets : Array.from(BUILT_IN_FALLBACK_SNIPPETS);
  const normalized = preferredLanguageId ? normalizeLanguageId(preferredLanguageId) : void 0;
  const filtered = normalized ? basePool.filter((s) => normalizeLanguageId(s.languageId) === normalized) : [];
  const pool = filtered.length > 0 ? filtered : basePool;
  if (pool.length === 0) {
    return BUILT_IN_FALLBACK_SNIPPETS[0];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
function loadCodePackSnippets(context) {
  try {
    const jsonUri = vscode.Uri.joinPath(context.extensionUri, "docs", "code-pack.json");
    const mdUri = vscode.Uri.joinPath(context.extensionUri, "docs", "code-pack.md");
    if (fs.existsSync(jsonUri.fsPath)) {
      const json = fs.readFileSync(jsonUri.fsPath, "utf8");
      codePackSnippets = parseCodePackJson(json);
    } else if (fs.existsSync(mdUri.fsPath)) {
      const md = fs.readFileSync(mdUri.fsPath, "utf8");
      codePackSnippets = parseCodePackMarkdown(md);
    } else {
      codePackSnippets = [];
    }
  } catch (error) {
    codePackSnippets = [];
    logWithTimestamp("Failed to parse code-pack content.", "warn", error);
  }
  if (codePackSnippets.length === 0) {
    logWithTimestamp("No code-pack entries detected. Using built-in fallback snippets.", "warn");
  }
}
function parseCodePackMarkdown(md) {
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  const fenceRe = /```([A-Za-z0-9_+-]+)?\n([\s\S]*?)```/g;
  let m;
  while ((m = fenceRe.exec(md)) !== null) {
    const langRaw = (m[1] || "plaintext").trim();
    const lang = normalizeLanguageId(langRaw);
    const code = m[2];
    if (code.trim().length > 0) {
      const key = `${lang}::${code}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ code, languageId: lang });
      }
    }
  }
  const lines = md.split(/\r?\n/);
  let insideFence = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence)
      continue;
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const text = trimmed.slice(2).trim();
      if (text) {
        const key = `plaintext::${text}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ code: text, languageId: "plaintext" });
        }
      }
    }
  }
  return results;
}
function parseCodePackJson(json) {
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    logWithTimestamp("Invalid JSON in code-pack.", "warn", error);
    return results;
  }
  const entries = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.entries) ? parsed.entries : [];
  const pushEntry = (raw) => {
    if (!raw) {
      return;
    }
    const codeValue = typeof raw.code === "string" ? raw.code : typeof raw.text === "string" ? raw.text : void 0;
    if (!codeValue) {
      return;
    }
    const langRaw = typeof raw.languageId === "string" ? raw.languageId : typeof raw.language === "string" ? raw.language : typeof raw.lang === "string" ? raw.lang : "plaintext";
    const normalized = normalizeLanguageId(langRaw);
    const key = `${normalized}::${codeValue}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    results.push({ code: codeValue, languageId: normalized });
  };
  for (const entry of entries) {
    if (Array.isArray(entry?.variants)) {
      for (const variant of entry.variants) {
        pushEntry({ ...entry, ...variant, variants: void 0 });
      }
    } else {
      pushEntry(entry);
    }
  }
  return results;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
