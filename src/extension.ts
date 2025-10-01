import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const BUILT_IN_FALLBACK_SNIPPETS: ReadonlyArray<{ code: string; languageId: string }> = [
    {
        code: '// Offline fallback: add entries to docs/code-pack.json (or .md) to customize snippets.',
        languageId: 'plaintext'
    }
];

let webviewPanel: vscode.WebviewPanel | undefined;
let idleTimer: NodeJS.Timeout | undefined;
let lastRepositoryKey: string | undefined;
let lastKnownLanguageId = 'plaintext';
const repoCooldowns = new Map<string, number>();
let resetIdleTimerRef: (() => void) | undefined;
let codePackSnippets: { code: string; languageId: string }[] = [];
let currentTypingSpeed = 40;

interface LoadCodePayload {
    code: string;
    languageId: string;
    typingSpeed?: number;
    sourceUrl?: string;
}

interface PendingLoad {
    payload: LoadCodePayload;
    reason: 'initial' | 'update';
}

let pendingLoad: PendingLoad | undefined;
let webviewReady = false;

// --- Repository cache ---
interface RepoFileEntry {
    path: string;
    size: number;
}

const REPO_CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

const LANGUAGE_ALIASES: Record<string, string> = {
    'javascriptreact': 'javascript',
    'typescriptreact': 'typescript',
    'react': 'javascript',
    'c++': 'cpp',
    'objective-c++': 'cpp',
    'objective-c': 'c',
    'shellscript': 'shell',
    'shell': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'sh': 'shell',
    'jsonc': 'json',
    'json5': 'json',
    'md': 'plaintext',
    'markdown': 'plaintext',
    'c#': 'csharp',
    'cs': 'csharp',
    'ps': 'powershell',
    'ps1': 'powershell',
    'psm1': 'powershell',
    'psd1': 'powershell',
    'powershellscript': 'powershell',
    'yml': 'yaml',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby'
};

const LANGUAGE_EXTENSION_MAP: Record<string, string[]> = {
    'brainfuck': ['.bf'],
    'c': ['.c', '.h'],
    'csharp': ['.cs'],
    'cpp': ['.cc', '.cpp', '.cxx', '.hpp', '.hh', '.hxx'],
    'css': ['.css'],
    'go': ['.go'],
    'html': ['.html', '.htm'],
    'java': ['.java'],
    'javascript': ['.js', '.jsx', '.mjs', '.cjs'],
    'json': ['.json'],
    'kotlin': ['.kt'],
    'lua': ['.lua'],
    'php': ['.php'],
    'powershell': ['.ps1', '.psm1'],
    'python': ['.py'],
    'ruby': ['.rb'],
    'rust': ['.rs'],
    'scala': ['.scala'],
    'shell': ['.sh', '.bash', '.zsh'],
    'sql': ['.sql'],
    'swift': ['.swift'],
    'typescript': ['.ts', '.tsx'],
    'yaml': ['.yml', '.yaml'],
    'plaintext': ['.md', '.markdown', '.txt']
};

const KNOWN_TEXT_EXTENSIONS = new Set(Object.values(LANGUAGE_EXTENSION_MAP).flat());

const MAX_REPO_ATTEMPTS = 6;
const NON_PRINTABLE_THRESHOLD = 0.12;

function logWithTimestamp(
    message: string,
    level: 'log' | 'warn' | 'error' = 'log',
    ...optionalParams: unknown[]
): void {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;
    switch (level) {
        case 'warn':
            console.warn(formattedMessage, ...optionalParams);
            break;
        case 'error':
            console.error(formattedMessage, ...optionalParams);
            break;
        default:
            console.log(formattedMessage, ...optionalParams);
            break;
    }
}

interface SnippetRepository {
    label: string;
    owner: string;
    repo: string;
    branch?: string;
    license: string;
    licenseUrl?: string;
    languages: string[];
    configId?: string;
}

interface RepositoryQuickPickItem extends vscode.QuickPickItem {
    repository: SnippetRepository;
}

interface RepoCache {
    entries: RepoFileEntry[];
    timestamp: number;
    branch: string;
}

const SNIPPET_REPOSITORIES: SnippetRepository[] = [
    {
        label: 'TheAlgorithms · Python',
        owner: 'TheAlgorithms',
        repo: 'Python',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Python/blob/master/LICENSE',
        languages: ['python'],
        configId: 'theAlgorithmsPython'
    },
    {
        label: 'TheAlgorithms · JavaScript',
        owner: 'TheAlgorithms',
        repo: 'JavaScript',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/JavaScript/blob/master/LICENSE',
        languages: ['javascript', 'typescript'],
        configId: 'theAlgorithmsJavaScript'
    },
    {
        label: 'TheAlgorithms · Java',
        owner: 'TheAlgorithms',
        repo: 'Java',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Java/blob/master/LICENSE',
        languages: ['java'],
        configId: 'theAlgorithmsJava'
    },
    {
        label: 'TheAlgorithms · C',
        owner: 'TheAlgorithms',
        repo: 'C',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/C/blob/main/LICENSE',
        languages: ['c'],
        configId: 'theAlgorithmsC'
    },
    {
        label: 'TheAlgorithms · C++',
        owner: 'TheAlgorithms',
        repo: 'C-Plus-Plus',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/C-Plus-Plus/blob/master/LICENSE',
        languages: ['cpp'],
        configId: 'theAlgorithmsCpp'
    },
    {
        label: 'TheAlgorithms · Go',
        owner: 'TheAlgorithms',
        repo: 'Go',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Go/blob/master/LICENSE',
        languages: ['go'],
        configId: 'theAlgorithmsGo'
    },
    {
        label: 'TheAlgorithms · Rust',
        owner: 'TheAlgorithms',
        repo: 'Rust',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Rust/blob/master/LICENSE',
        languages: ['rust'],
        configId: 'theAlgorithmsRust'
    },
    {
        label: 'TheAlgorithms · Kotlin',
        owner: 'TheAlgorithms',
        repo: 'Kotlin',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Kotlin/blob/master/LICENSE',
        languages: ['kotlin'],
        configId: 'theAlgorithmsKotlin'
    },
    {
        label: '30 Seconds of Code',
        owner: '30-seconds',
        repo: '30-seconds-of-code',
        license: 'CC0 1.0 Universal',
        licenseUrl: 'https://github.com/30-seconds/30-seconds-of-code/blob/master/LICENSE',
        languages: ['javascript', 'typescript', 'react'],
        configId: 'thirtySecondsOfCode'
    },
    {
        label: '1loc',
        owner: 'phuoc-ng',
        repo: '1loc',
        license: 'MIT',
        licenseUrl: 'https://github.com/phuoc-ng/1loc/blob/master/LICENSE',
        languages: ['javascript'],
        configId: 'oneLoc'
    },
    {
        label: 'leachim6 · Hello World',
        owner: 'leachim6',
        repo: 'hello-world',
        license: 'CC BY 4.0',
        licenseUrl: 'https://github.com/leachim6/hello-world/blob/master/LICENSE',
        languages: ['plaintext', 'c', 'cpp', 'java', 'javascript', 'python', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'brainfuck'],
        configId: 'helloWorld'
    },
    {
        label: 'LydiaHallie · JavaScript Questions',
        owner: 'lydiahallie',
        repo: 'javascript-questions',
        license: 'MIT',
        licenseUrl: 'https://github.com/lydiahallie/javascript-questions/blob/main/LICENSE',
        languages: ['javascript', 'typescript', 'plaintext'],
        configId: 'javascriptQuestions'
    },
    {
        label: 'denysdovhan · wtfjs',
        owner: 'denysdovhan',
        repo: 'wtfjs',
        license: 'MIT',
        licenseUrl: 'https://github.com/denysdovhan/wtfjs/blob/master/LICENSE',
        languages: ['javascript', 'typescript', 'plaintext'],
        configId: 'wtfjs'
    },
    {
        label: 'satwikkansal · wtfpython',
        owner: 'satwikkansal',
        repo: 'wtfpython',
        license: 'MIT',
        licenseUrl: 'https://github.com/satwikkansal/wtfpython/blob/master/LICENSE',
        languages: ['python', 'plaintext'],
        configId: 'wtfpython'
    },
    {
        label: '30 Seconds of Interviews',
        owner: '30-seconds',
        repo: '30-seconds-of-interviews',
        license: 'MIT',
        licenseUrl: 'https://github.com/30-seconds/30-seconds-of-interviews/blob/master/LICENSE',
        languages: ['javascript', 'typescript', 'plaintext'],
        configId: 'thirtySecondsOfInterviews'
    },
    {
        label: 'awesome-programming-quotes',
        owner: 'ashishb',
        repo: 'awesome-programming-quotes',
        license: 'See repository license',
        licenseUrl: 'https://github.com/ashishb/awesome-programming-quotes',
        languages: ['plaintext'],
        configId: 'awesomeProgrammingQuotes'
    },
    {
        label: 'programming-memes',
        owner: 'abhisheknaiidu',
        repo: 'programming-memes',
        license: 'See repository license',
        licenseUrl: 'https://github.com/abhisheknaiidu/programming-memes',
        languages: ['plaintext'],
        configId: 'programmingMemes'
    }
];

const DEFAULT_REPOSITORY_IDS: string[] = SNIPPET_REPOSITORIES
    .map(repo => repo.configId)
    .filter((id): id is string => typeof id === 'string');

const LANGUAGE_TO_REPOSITORIES = SNIPPET_REPOSITORIES.reduce<Record<string, SnippetRepository[]>>((acc, repository) => {
    for (const lang of repository.languages) {
        if (!acc[lang]) {
            acc[lang] = [];
        }
        acc[lang].push(repository);
    }
    return acc;
}, {});

const repoCaches = new Map<string, RepoCache>();
const repoBranchCache = new Map<string, string>();

function normalizeLanguageId(languageId: string | undefined): string {
    if (!languageId) {
        return 'plaintext';
    }
    const lowered = languageId.toLowerCase();
    return LANGUAGE_ALIASES[lowered] ?? lowered;
}

function getEnabledRepositoryIds(): Set<string> {
    const config = vscode.workspace.getConfiguration('screenSaver');
    const configured = config.get<string[]>('repositories.enabled');
    if (Array.isArray(configured)) {
        return new Set(configured);
    }
    return new Set(DEFAULT_REPOSITORY_IDS);
}

function getActiveOrLastLanguageId(): string {
    const activeEditorLanguage = vscode.window.activeTextEditor?.document.languageId;
    if (activeEditorLanguage) {
        lastKnownLanguageId = activeEditorLanguage;
    }
    return lastKnownLanguageId;
}

function getExtensionsForLanguage(languageId: string): string[] {
    return LANGUAGE_EXTENSION_MAP[languageId] ?? [];
}

function inferLanguageFromPath(filePath: string): string | undefined {
    const extension = path.extname(filePath).toLowerCase();
    if (!extension) {
        return undefined;
    }

    for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSION_MAP)) {
        if (extensions.includes(extension)) {
            return language;
        }
    }

    return undefined;
}

function isRepoFileMetadataSafe(filePath: string, size: number | undefined): boolean {
    const lowerPath = filePath.toLowerCase();
    const fileExtension = path.extname(lowerPath);

    if (fileExtension && !KNOWN_TEXT_EXTENSIONS.has(fileExtension)) {
        return false;
    }

    if (typeof size === 'number' && size > 120000) {
        return false;
    }

    return true;
}

function isContentSafe(content: string): boolean {
    if (!content || typeof content !== 'string') {
        return false;
    }

    return !hasBinarySignature(content);
}

function hasBinarySignature(content: string): boolean {
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

    return (nonPrintable / content.length) > NON_PRINTABLE_THRESHOLD;
}

function shuffle<T>(items: T[]): T[] {
    const clone = [...items];
    for (let i = clone.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [clone[i], clone[j]] = [clone[j], clone[i]];
    }
    return clone;
}

function getRepoCacheKey(repository: SnippetRepository): string {
    return `${repository.owner}/${repository.repo}`;
}

function setRepositoryCooldown(repository: SnippetRepository, resetEpochMs?: number) {
    const key = getRepoCacheKey(repository);
    const now = Date.now();
    const cooldownUntil = typeof resetEpochMs === 'number' && resetEpochMs > now
        ? resetEpochMs
        : now + 15 * 60 * 1000;
    repoCooldowns.set(key, cooldownUntil);
    const resumeAt = new Date(cooldownUntil).toLocaleTimeString();
    logWithTimestamp(`GitHub rate limit hit for ${repository.label}. Cooling down until ${resumeAt}.`, 'warn');
}

function isRepositoryOnCooldown(repository: SnippetRepository): boolean {
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

async function resolveBranch(repository: SnippetRepository): Promise<string> {
    const cacheKey = getRepoCacheKey(repository);
    if (repoBranchCache.has(cacheKey)) {
        return repoBranchCache.get(cacheKey)!;
    }

    if (repository.branch) {
        repoBranchCache.set(cacheKey, repository.branch);
        return repository.branch;
    }

    const repoMetaUrl = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
    try {
        const response = await fetch(repoMetaUrl);
        if (response.status === 403) {
            const resetHeader = response.headers.get('X-RateLimit-Reset');
            const resetEpochMs = resetHeader ? parseInt(resetHeader, 10) * 1000 : undefined;
            setRepositoryCooldown(repository, resetEpochMs);
            throw new Error('GitHub API rate limit exceeded');
        }
        if (response.ok) {
            const data = await response.json();
            const defaultBranch = typeof data?.default_branch === 'string' ? data.default_branch : 'master';
            repoBranchCache.set(cacheKey, defaultBranch);
            return defaultBranch;
        }
        logWithTimestamp(
            `Failed to resolve default branch for ${repository.label}. Falling back to 'master'.`,
            'warn'
        );
    } catch (error: any) {
        logWithTimestamp(`Error resolving branch for ${repository.label}.`, 'warn', error);
    }

    repoBranchCache.set(cacheKey, 'master');
    return 'master';
}

function buildTreeUrl(repository: SnippetRepository, branch: string): string {
    return `https://api.github.com/repos/${repository.owner}/${repository.repo}/git/trees/${branch}?recursive=1`;
}

function buildRawUrl(repository: SnippetRepository, branch: string, filePath: string): string {
    return `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${branch}/` +
        encodeURI(filePath).replace(/#/g, '%23');
}

function buildLicenseHeader(repository: SnippetRepository, branch: string, filePath: string): string {
    const source = `// Source: https://github.com/${repository.owner}/${repository.repo}/blob/${branch}/${filePath}`;
    const license = repository.licenseUrl
        ? `// License: ${repository.license} (${repository.licenseUrl})`
        : `// License: ${repository.license}`;
    return `${source}\n${license}\n\n`;
}

function removeRepoFileFromCache(repository: SnippetRepository, filePath: string) {
    const cacheKey = getRepoCacheKey(repository);
    const cache = repoCaches.get(cacheKey);
    if (!cache) {
        return;
    }

    cache.entries = cache.entries.filter(entry => entry.path !== filePath);
    repoCaches.set(cacheKey, cache);
}

async function refreshRepoCache(repository: SnippetRepository): Promise<void> {
    try {
        const branch = await resolveBranch(repository);
        logWithTimestamp(`Fetching repository tree from GitHub for ${repository.label} (${branch}).`);
        const response = await fetch(buildTreeUrl(repository, branch));
        if (response.status === 403) {
            const resetHeader = response.headers.get('X-RateLimit-Reset');
            const resetEpochMs = resetHeader ? parseInt(resetHeader, 10) * 1000 : undefined;
            setRepositoryCooldown(repository, resetEpochMs);
            repoCaches.delete(getRepoCacheKey(repository));
            return;
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch repository tree: ${response.status}`);
        }

        const data = await response.json();
        const treeEntries = Array.isArray(data?.tree) ? data.tree : [];

        const freshEntries: RepoFileEntry[] = treeEntries
            .filter((entry: any) => entry?.type === 'blob' && typeof entry?.path === 'string')
            .map((entry: any) => ({
                path: entry.path as string,
                size: typeof entry.size === 'number' ? entry.size : 0
            }))
            .filter(entry => isRepoFileMetadataSafe(entry.path, entry.size));

        repoCaches.set(getRepoCacheKey(repository), {
            entries: freshEntries,
            timestamp: Date.now(),
            branch
        });
        logWithTimestamp(`Cached ${freshEntries.length} files from ${repository.label}.`);
    } catch (error: any) {
        logWithTimestamp(`Error refreshing repository cache for ${repository.label}.`, 'error', error);
        repoCaches.delete(getRepoCacheKey(repository));
    }
}

async function ensureRepoCache(repository: SnippetRepository): Promise<RepoCache | undefined> {
    if (isRepositoryOnCooldown(repository)) {
        const key = getRepoCacheKey(repository);
        const until = repoCooldowns.get(key) ?? 0;
        logWithTimestamp(
            `${repository.label} is on cooldown until ${new Date(until).toLocaleTimeString()}. Skipping.`,
            'warn'
        );
        return undefined;
    }

    const cacheKey = getRepoCacheKey(repository);
    const cache = repoCaches.get(cacheKey);
    const now = Date.now();

    if (!cache || (now - cache.timestamp > REPO_CACHE_DURATION_MS) || cache.entries.length === 0) {
        await refreshRepoCache(repository);
    }

    return repoCaches.get(cacheKey);
}

async function tryFetchFromRepository(
    repository: SnippetRepository,
    normalizedLang: string,
    extensions: string[]
): Promise<{ code: string; languageId: string; sourceUrl: string } | undefined> {
    const cache = await ensureRepoCache(repository);
    if (!cache || cache.entries.length === 0) {
        logWithTimestamp(`Repository cache empty for ${repository.label}.`, 'warn');
        return undefined;
    }

    const { entries, branch } = cache;
    const repoLabel = repository.label;
    const candidatePool = extensions.length > 0
        ? entries.filter(entry => extensions.some(ext => entry.path.toLowerCase().endsWith(ext)))
        : entries;

    if (candidatePool.length === 0) {
        logWithTimestamp(`No files with extensions ${extensions.join(', ')} in ${repoLabel}.`, 'warn');
        if (!repository.languages.includes(normalizedLang)) {
            return undefined;
        }
    }

    const selectionPool = candidatePool.length > 0 ? candidatePool : entries;
    if (selectionPool.length === 0) {
        logWithTimestamp(`No entries available in ${repoLabel}.`, 'warn');
        return undefined;
    }

    const attempts = Math.min(MAX_REPO_ATTEMPTS, selectionPool.length);
    const shuffledEntries = shuffle(selectionPool).slice(0, attempts);

    for (const entry of shuffledEntries) {
        try {
            const rawUrl = buildRawUrl(repository, branch, entry.path);
            const response = await fetch(rawUrl);
            if (!response.ok) {
                logWithTimestamp(`Failed to download ${entry.path} from ${repoLabel}.`, 'warn');
                removeRepoFileFromCache(repository, entry.path);
                continue;
            }

            const content = await response.text();
            if (!isContentSafe(content)) {
                logWithTimestamp(`File flagged as unsafe: ${entry.path} (${repoLabel}).`, 'warn');
                removeRepoFileFromCache(repository, entry.path);
                continue;
            }

            const finalCode = content.length > 20000
                ? '// Repository content is too large to display.'
                : content;

            const inferredLanguage = inferLanguageFromPath(entry.path) ?? normalizedLang ?? 'plaintext';
            const languageMatches = inferredLanguage === normalizedLang;
            const prefixMessage = languageMatches
                ? ''
                : `// Could not find a '${normalizedLang}' file. Displaying '${inferredLanguage}'.\n\n`;

            const licenseHeader = buildLicenseHeader(repository, branch, entry.path);
            const sourceUrl = `https://github.com/${repository.owner}/${repository.repo}/blob/${branch}/${entry.path}`;

            logWithTimestamp(`Loaded snippet from ${entry.path} (${repoLabel}).`);
            lastRepositoryKey = getRepoCacheKey(repository);
            return {
                code: licenseHeader + prefixMessage + finalCode,
                languageId: inferredLanguage,
                sourceUrl
            };
        } catch (error: any) {
            logWithTimestamp(`Failed to process ${entry.path} from ${repoLabel}.`, 'warn', error);
            removeRepoFileFromCache(repository, entry.path);
        }
    }

    return undefined;
}

async function fetchRandomRepoSnippet(languageId: string): Promise<{ code: string; languageId: string; sourceUrl?: string }> {
    const normalizedLang = normalizeLanguageId(languageId);
    const extensions = getExtensionsForLanguage(normalizedLang);

    const enabledRepositoryIds = getEnabledRepositoryIds();
    const isEnabled = (repository: SnippetRepository) => {
        if (!repository.configId) {
            return true;
        }
        return enabledRepositoryIds.has(repository.configId);
    };

    const preferredRepos = (LANGUAGE_TO_REPOSITORIES[normalizedLang] ?? []).filter(isEnabled);
    const preferredKeys = new Set(preferredRepos.map(repo => getRepoCacheKey(repo)));
    const fallbackRepos = SNIPPET_REPOSITORIES.filter(
        repo => isEnabled(repo) && !preferredKeys.has(getRepoCacheKey(repo))
    );

    const filteredPreferred = preferredRepos.filter(repo => getRepoCacheKey(repo) !== lastRepositoryKey);
    const filteredFallback = fallbackRepos.filter(repo => getRepoCacheKey(repo) !== lastRepositoryKey);

    const repositoriesToTry: SnippetRepository[] = [
        ...shuffle(filteredPreferred.length > 0 ? filteredPreferred : []),
        ...shuffle(filteredFallback)
    ];

    if (lastRepositoryKey) {
        const lastRepo = SNIPPET_REPOSITORIES.find(repo => getRepoCacheKey(repo) === lastRepositoryKey);
        if (lastRepo && isEnabled(lastRepo)) {
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

    logWithTimestamp('No suitable repository file found after checking all sources. Using fallback snippet.', 'warn');
    lastRepositoryKey = undefined;
    return getRandomFallbackSnippet(normalizedLang);
}

function queueLoadCodeDelivery(payload: LoadCodePayload, reason: 'initial' | 'update', attempt = 0): void {
    if (!webviewPanel) {
        pendingLoad = undefined;
        return;
    }

    const entry: PendingLoad = { payload, reason };
    pendingLoad = entry;

    if (!webviewReady) {
        return;
    }

    const panel = webviewPanel;
    if (!panel) {
        pendingLoad = undefined;
        return;
    }
    (async () => {
        const accepted = await panel.webview.postMessage({ command: 'loadCode', ...payload });
        if (!accepted) {
            if (attempt >= 3) {
                logWithTimestamp(
                    `Webview rejected ${reason} snippet delivery after ${attempt + 1} attempts.`,
                    'warn'
                );
                return;
            }
            const delay = Math.min(500, 100 * (attempt + 1));
            setTimeout(() => queueLoadCodeDelivery(payload, reason, attempt + 1), delay);
            return;
        }

        if (pendingLoad === entry) {
            pendingLoad = undefined;
        }
        logWithTimestamp(reason === 'initial' ? 'Initial snippet sent to webview.' : 'Next snippet sent to webview.');
    })().catch(error => {
        logWithTimestamp(`Failed to deliver ${reason} snippet to webview.`, 'warn', error);
        if (attempt < 3) {
            const delay = Math.min(500, 100 * (attempt + 1));
            setTimeout(() => queueLoadCodeDelivery(payload, reason, attempt + 1), delay);
        }
    });
}

async function showScreenSaver(context: vscode.ExtensionContext) {
    if (!vscode.window.state.focused) {
        logWithTimestamp('Skipping screen saver launch because VS Code window is not focused.');
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = undefined;
        }
        return;
    }

    if (webviewPanel) {
        logWithTimestamp('Screen saver already open. Revealing existing panel.');
        webviewPanel.reveal(vscode.ViewColumn.One);
        return;
    }

    logWithTimestamp('Creating screen saver webview.');
    webviewPanel = vscode.window.createWebviewPanel(
        'screenSaver',
        'Screen Saver',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
        }
    );

    webviewReady = false;
    pendingLoad = undefined;
    webviewPanel.webview.html = getWebviewContent(context, webviewPanel.webview);

    webviewPanel.onDidDispose(() => {
        logWithTimestamp('Screen saver webview disposed.');
        webviewPanel = undefined;
        pendingLoad = undefined;
        webviewReady = false;
    }, null, context.subscriptions);

    webviewPanel.webview.onDidReceiveMessage(async message => {
        const langId = getActiveOrLastLanguageId();
        switch (message.command) {
            case 'exitScreenSaver':
                logWithTimestamp('Received exit command from webview.');
                pendingLoad = undefined;
                webviewReady = false;
                if (webviewPanel) webviewPanel.dispose();
                break;
            case 'requestNewGist':
                logWithTimestamp(`Webview requested new snippet for '${langId}'.`);
                const newContent = await fetchRandomRepoSnippet(langId);
                if (webviewPanel) {
                    currentTypingSpeed = vscode.workspace.getConfiguration('screenSaver').get<number>('typingSpeed', 40);
                    queueLoadCodeDelivery({ typingSpeed: currentTypingSpeed, ...newContent }, 'update');
                }
                break;
            case 'userActivity':
                resetIdleTimerRef?.();
                break;
            case 'webviewReady': {
                webviewReady = true;
                const pending = pendingLoad;
                if (pending) {
                    queueLoadCodeDelivery(pending.payload, pending.reason);
                }
                break;
            }
            case 'openExternalUrl': {
                const url = message.url;
                if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
                break;
            }
        }
    }, undefined, context.subscriptions);

    const initialLangId = getActiveOrLastLanguageId();
    currentTypingSpeed = vscode.workspace.getConfiguration('screenSaver').get<number>('typingSpeed', 40);

    logWithTimestamp(`Loading initial snippet for '${initialLangId}'.`);
    const initialContent = await fetchRandomRepoSnippet(initialLangId);

    if (webviewPanel) {
        queueLoadCodeDelivery({ typingSpeed: currentTypingSpeed, ...initialContent }, 'initial');
    }
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview.html');
    if (!fs.existsSync(htmlPath.fsPath)) {
        return `<html><body><h1>Error: webview.html not found!</h1></body></html>`;
    }
    const baseHtml = fs.readFileSync(htmlPath.fsPath, 'utf8');

    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'styles.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js'));

    return baseHtml
        .replace(/\{\{cspSource\}\}/g, webview.cspSource)
        .replace(/\{\{styleUri\}\}/g, styleUri.toString())
        .replace(/\{\{scriptUri\}\}/g, scriptUri.toString());
}

export function activate(context: vscode.ExtensionContext) {
    logWithTimestamp('"coding-screensaver" is now active.');

    // Try to load dynamic code-pack snippets from docs/code-pack.md (optional).
    try {
        loadCodePackSnippets(context);
        if (codePackSnippets.length > 0) {
            logWithTimestamp(`Loaded ${codePackSnippets.length} code-pack fallback snippets.`);
        }
    } catch (err: any) {
        logWithTimestamp('Failed to load code-pack snippets.', 'warn', err);
    }

    const resetIdleTimer = () => {
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = undefined;
        }
        getActiveOrLastLanguageId();
        if (!vscode.window.state.focused) {
            logWithTimestamp('Window not focused. Idle timer paused.');
            return;
        }

        const configuration = vscode.workspace.getConfiguration('screenSaver');
        let idleTime = configuration.get<number>('idleTimeSeconds', 300);
        if (idleTime > 0 && idleTime < 5) {
            logWithTimestamp(`Configured idle time of ${idleTime}s is too short. Using minimum of 5s.`, 'warn');
            idleTime = 5;
        }

        if (idleTime > 0) {
            const triggerAt = new Date(Date.now() + idleTime * 1000);
            logWithTimestamp(
                `Idle timer armed for ${idleTime} seconds. Scheduled at ${triggerAt.toLocaleTimeString()}.`
            );
            idleTimer = setTimeout(() => {
                idleTimer = undefined;
                logWithTimestamp('Idle timer elapsed. Launching screen saver.');
                showScreenSaver(context);
            }, idleTime * 1000);
        } else {
            logWithTimestamp('Idle timer disabled via configuration.');
        }
    };
    resetIdleTimerRef = resetIdleTimer;

    // Reset timer on any text change, selection change, editor change, or scroll.
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => resetIdleTimer()));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => resetIdleTimer()));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => resetIdleTimer()));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(() => resetIdleTimer())); // For scrolling
    context.subscriptions.push(vscode.window.onDidChangeActiveTerminal(() => resetIdleTimer()));
    context.subscriptions.push(vscode.window.onDidOpenTerminal(() => resetIdleTimer()));
    context.subscriptions.push(vscode.window.onDidCloseTerminal(() => resetIdleTimer()));
    if (vscode.window.onDidChangeActiveNotebookEditor) {
        context.subscriptions.push(vscode.window.onDidChangeActiveNotebookEditor(() => resetIdleTimer()));
    }
    if (vscode.window.onDidChangeVisibleNotebookEditors) {
        context.subscriptions.push(vscode.window.onDidChangeVisibleNotebookEditors(() => resetIdleTimer()));
    }
    context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => resetIdleTimer()));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(() => resetIdleTimer()));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(() => resetIdleTimer()));
    if ((vscode.workspace as any).onDidChangeNotebookDocument) {
        context.subscriptions.push((vscode.workspace as any).onDidChangeNotebookDocument(() => resetIdleTimer()));
    }
    if (typeof (vscode.commands as any).onDidExecuteCommand === 'function') {
        context.subscriptions.push(vscode.commands.onDidExecuteCommand(event => {
            if (!event?.command?.startsWith('screenSaver.')) {
                resetIdleTimer();
            }
        }));
    }

    context.subscriptions.push(vscode.window.onDidChangeWindowState(windowState => {
        if (windowState.focused) {
            setTimeout(() => resetIdleTimer(), 0);
        } else {
            if (idleTimer) {
                clearTimeout(idleTimer);
                idleTimer = undefined;
                logWithTimestamp('Window lost focus. Idle timer reset.');
            }
            if (webviewPanel) webviewPanel.dispose();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('screenSaver.test', () => {
        showScreenSaver(context);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('screenSaver.configureRepositories', async () => {
        await showRepositoryPicker();
    }));

    resetIdleTimer();
}

export function deactivate() {
    if (webviewPanel) webviewPanel.dispose();
    if (idleTimer) clearTimeout(idleTimer);
    resetIdleTimerRef = undefined;
}

// --- Fallback helpers ---
function getRandomFallbackSnippet(preferredLanguageId?: string): { code: string; languageId: string; sourceUrl?: string } {
    const basePool = codePackSnippets.length > 0
        ? codePackSnippets
        : Array.from(BUILT_IN_FALLBACK_SNIPPETS);
    const normalized = preferredLanguageId ? normalizeLanguageId(preferredLanguageId) : undefined;
    const filtered = normalized ? basePool.filter(s => normalizeLanguageId(s.languageId) === normalized) : [];
    const pool = filtered.length > 0 ? filtered : basePool;
    if (pool.length === 0) {
        return BUILT_IN_FALLBACK_SNIPPETS[0];
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

async function showRepositoryPicker(): Promise<void> {
    const enabledIds = getEnabledRepositoryIds();
    const items: RepositoryQuickPickItem[] = SNIPPET_REPOSITORIES.map(repository => ({
        label: repository.label,
        description: repository.languages.join(', '),
        picked: !repository.configId || enabledIds.has(repository.configId),
        repository
    }));

    const selection = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        title: 'Select repositories for Coding Screen Saver'
    });

    if (!selection) {
        return;
    }

    const selectedIds = selection
        .map(item => item.repository.configId)
        .filter((id): id is string => typeof id === 'string');

    const configuration = vscode.workspace.getConfiguration('screenSaver');
    await configuration.update('repositories.enabled', selectedIds, vscode.ConfigurationTarget.Workspace);
    logWithTimestamp(`Repository selection updated. ${selectedIds.length} enabled.`);
}

function loadCodePackSnippets(context: vscode.ExtensionContext): void {
    try {
        const jsonUri = vscode.Uri.joinPath(context.extensionUri, 'docs', 'code-pack.json');
        const mdUri = vscode.Uri.joinPath(context.extensionUri, 'docs', 'code-pack.md');

        if (fs.existsSync(jsonUri.fsPath)) {
            const json = fs.readFileSync(jsonUri.fsPath, 'utf8');
            codePackSnippets = parseCodePackJson(json);
        } else if (fs.existsSync(mdUri.fsPath)) {
            const md = fs.readFileSync(mdUri.fsPath, 'utf8');
            codePackSnippets = parseCodePackMarkdown(md);
        } else {
            codePackSnippets = [];
        }
    } catch (error) {
        codePackSnippets = [];
        logWithTimestamp('Failed to parse code-pack content.', 'warn', error);
    }

    if (codePackSnippets.length === 0) {
        logWithTimestamp('No code-pack entries detected. Using built-in fallback snippets.', 'warn');
    }
}

function parseCodePackMarkdown(md: string): { code: string; languageId: string }[] {
    const results: { code: string; languageId: string }[] = [];
    const seen = new Set<string>();

    // Extract fenced code blocks ```lang\n...\n```
    const fenceRe = /```([A-Za-z0-9_+-]+)?\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = fenceRe.exec(md)) !== null) {
        const langRaw = (m[1] || 'plaintext').trim();
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

    // Extract simple bullet lines as plaintext snippets from non-code sections
    // Keep it lightweight to avoid over-parsing. Ignore lines inside code fences.
    const lines = md.split(/\r?\n/);
    let insideFence = false;
    for (const line of lines) {
        if (line.startsWith('```')) {
            insideFence = !insideFence;
            continue;
        }
        if (insideFence) continue;
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
            const text = trimmed.slice(2).trim();
            if (text) {
                const key = `plaintext::${text}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ code: text, languageId: 'plaintext' });
                }
            }
        }
    }

    return results;
}

function parseCodePackJson(json: string): { code: string; languageId: string }[] {
    const results: { code: string; languageId: string }[] = [];
    const seen = new Set<string>();

    let parsed: any;
    try {
        parsed = JSON.parse(json);
    } catch (error) {
        logWithTimestamp('Invalid JSON in code-pack.', 'warn', error);
        return results;
    }

    const entries: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.entries)
            ? parsed.entries
            : [];

    const pushEntry = (raw: any) => {
        if (!raw) {
            return;
        }
        const codeValue = typeof raw.code === 'string'
            ? raw.code
            : typeof raw.text === 'string'
                ? raw.text
                : undefined;
        if (!codeValue) {
            return;
        };
        const langRaw = typeof raw.languageId === 'string'
            ? raw.languageId
            : typeof raw.language === 'string'
                ? raw.language
                : typeof raw.lang === 'string'
                    ? raw.lang
                    : 'plaintext';
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
                pushEntry({ ...entry, ...variant, variants: undefined });
            }
        } else {
            pushEntry(entry);
        }
    }

    return results;
}
