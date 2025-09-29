import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const FALLBACK_SNIPPETS = [
    {
        code: '// Offline snippet · JavaScript matrix rain demo\n' +
            'class MatrixRain {\n' +
            '  constructor(canvas, speed = 50) {\n' +
            '    this.canvas = canvas;\n' +
            '    this.ctx = canvas.getContext(\'2d\');\n' +
            '    this.fontSize = 16;\n' +
            '    this.columns = Math.floor(canvas.width / this.fontSize);\n' +
            '    this.drops = Array.from({ length: this.columns }).fill(canvas.height);\n' +
            '    this.speed = speed;\n' +
            '  }\n\n' +
            '  draw() {\n' +
            '    this.ctx.fillStyle = \'rgba(0, 0, 0, 0.05)\';\n' +
            '    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);\n' +
            '    this.ctx.fillStyle = \'#0F0\';\n' +
            '    this.ctx.font = `${this.fontSize}px monospace`;\n' +
            '    this.drops.forEach((dropY, column) => {\n' +
            '      const char = String.fromCharCode(33 + Math.random() * 94);\n' +
            '      const x = column * this.fontSize;\n' +
            '      const y = dropY * this.fontSize;\n' +
            '      this.ctx.fillText(char, x, y);\n' +
            '      this.drops[column] = dropY * this.fontSize > this.canvas.height && Math.random() > 0.975 ? 0 : dropY + 1;\n' +
            '    });\n' +
            '  }\n\n' +
            '  animate() {\n' +
            '    setInterval(() => this.draw(), this.speed);\n' +
            '  }\n' +
            '}',
        languageId: 'javascript'
    },
    {
        code: '# Offline snippet · Python one-liner trivia\n' +
            'text = "banana"\n' +
            'print("내림차순정렬:", "".join(sorted(text, reverse=True)))\n' +
            'print("모두 a 포함?:", all(ch == "a" for ch in text))\n' +
            'print("하나라도 b 포함?:", any(ch == "b" for ch in text))\n' +
            'print("역순:", text[::-1])',
        languageId: 'python'
    },
    {
        code: '# Offline snippet · Python context manager\n' +
            'from pathlib import Path\n\n' +
            'def read_config(path: Path) -> str:\n' +
            '    with path.open() as handle:\n' +
            '        return handle.read().strip()\n\n' +
            'print(read_config(Path("settings.ini")))',
        languageId: 'python'
    },
    {
        code: '// Offline snippet · JavaScript console tricks\n' +
            'const squares = Array.from({ length: 5 }, (_, i) => ({ i, square: i * i }));\n' +
            'console.table(squares);\n' +
            'console.log("isFinite?", Number.isFinite(42 / 0));',
        languageId: 'javascript'
    },
    {
        code: '# Offline snippet · JavaScript debounce utility\n' +
            'function debounce(fn, delay = 200) {\n' +
            '  let timer;\n' +
            '  return (...args) => {\n' +
            '    clearTimeout(timer);\n' +
            '    timer = setTimeout(() => fn(...args), delay);\n' +
            '  };\n' +
            '}\n\n' +
            'const log = debounce(value => console.log("검색:", value), 300);\nlog("hello");',
        languageId: 'javascript'
    },
    {
        code: '/* Offline snippet · C 매크로와 포인터 챌린지 */\n#include <stdio.h>\n\n#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))\n\nint main(void) {\n    const char *words[] = {"VS", "Code", "Screensaver"};\n    for (size_t i = 0; i < ARRAY_SIZE(words); ++i) {\n        printf("%zu -> %s\\n", i, *(words + i));\n    }\n    return 0;\n}',
        languageId: 'c'
    },
    {
        code: '/* Offline snippet · C 메모리 덤프 */\n#include <stdio.h>\n\nvoid dump(const void *data, size_t len) {\n    const unsigned char *bytes = data;\n    for (size_t i = 0; i < len; ++i) {\n        printf("%02X%s", bytes[i], (i + 1) % 8 ? " " : "\\n");\n    }\n}\n\nint main(void) {\n    int value = 0x12345678;\n    dump(&value, sizeof value);\n    return 0;\n}',
        languageId: 'c'
    },
    {
        code: '# Offline snippet · Rust Option pattern\nfn main() {\n    let config = std::env::var("SCREENSAVER_THEME").ok();\n    match config.as_deref() {\n        Some("matrix") => println!("매트릭스 모드"),\n        Some(other) => println!("테마: {}", other),\n        None => println!("기본 테마"),\n    }\n}',
        languageId: 'rust'
    },
    {
        code: '// Offline snippet · TypeScript 타입 퀴즈\n' +
            'type Flatten<T> = T extends Array<infer U> ? U : T;\n' +
            'type Result = Flatten<number[]>; // Result는 number\n' +
            'const result: Result = 123;',
        languageId: 'typescript'
    },
    {
        code: '# Offline snippet · Brainfuck Hello World\n' +
            '++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.',
        languageId: 'brainfuck'
    },
    {
        code: '// Offline snippet · Plaintext 퀴즈\n' +
            'print("".join(sorted("banana")))  # 결과는?\n' +
            '# 버튼을 누르면 정답! -> aaabnn',
        languageId: 'plaintext'
    }
];

let webviewPanel: vscode.WebviewPanel | undefined;
let idleTimer: NodeJS.Timeout | undefined;
let lastRepositoryKey: string | undefined;
let lastKnownLanguageId = 'plaintext';
const repoCooldowns = new Map<string, number>();

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
    'jsonc': 'json'
};

const LANGUAGE_EXTENSION_MAP: Record<string, string[]> = {
    'c': ['.c', '.h'],
    'cpp': ['.cc', '.cpp', '.cxx', '.hpp', '.hh', '.hxx'],
    'go': ['.go'],
    'java': ['.java'],
    'javascript': ['.js', '.jsx', '.mjs', '.cjs'],
    'json': ['.json'],
    'kotlin': ['.kt'],
    'ruby': ['.rb'],
    'python': ['.py'],
    'rust': ['.rs'],
    'swift': ['.swift'],
    'scala': ['.scala'],
    'shell': ['.sh'],
    'typescript': ['.ts', '.tsx'],
    'yaml': ['.yml', '.yaml'],
    'plaintext': ['.md', '.markdown', '.txt'],
    'brainfuck': ['.bf']
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
        languages: ['python']
    },
    {
        label: 'TheAlgorithms · JavaScript',
        owner: 'TheAlgorithms',
        repo: 'JavaScript',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/JavaScript/blob/master/LICENSE',
        languages: ['javascript', 'typescript']
    },
    {
        label: 'TheAlgorithms · Java',
        owner: 'TheAlgorithms',
        repo: 'Java',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Java/blob/master/LICENSE',
        languages: ['java']
    },
    {
        label: 'TheAlgorithms · C',
        owner: 'TheAlgorithms',
        repo: 'C',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/C/blob/main/LICENSE',
        languages: ['c']
    },
    {
        label: 'TheAlgorithms · C++',
        owner: 'TheAlgorithms',
        repo: 'C-Plus-Plus',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/C-Plus-Plus/blob/master/LICENSE',
        languages: ['cpp']
    },
    {
        label: 'TheAlgorithms · Go',
        owner: 'TheAlgorithms',
        repo: 'Go',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Go/blob/master/LICENSE',
        languages: ['go']
    },
    {
        label: 'TheAlgorithms · Rust',
        owner: 'TheAlgorithms',
        repo: 'Rust',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Rust/blob/master/LICENSE',
        languages: ['rust']
    },
    {
        label: 'TheAlgorithms · Kotlin',
        owner: 'TheAlgorithms',
        repo: 'Kotlin',
        license: 'MIT',
        licenseUrl: 'https://github.com/TheAlgorithms/Kotlin/blob/master/LICENSE',
        languages: ['kotlin']
    },
    {
        label: '30 Seconds of Code',
        owner: '30-seconds',
        repo: '30-seconds-of-code',
        license: 'CC0 1.0 Universal',
        licenseUrl: 'https://github.com/30-seconds/30-seconds-of-code/blob/master/LICENSE',
        languages: ['javascript', 'typescript', 'react']
    },
    {
        label: '1loc',
        owner: 'phuoc-ng',
        repo: '1loc',
        license: 'MIT',
        licenseUrl: 'https://github.com/phuoc-ng/1loc/blob/master/LICENSE',
        languages: ['javascript']
    },
    {
        label: 'leachim6 · Hello World',
        owner: 'leachim6',
        repo: 'hello-world',
        license: 'CC BY 4.0',
        licenseUrl: 'https://github.com/leachim6/hello-world/blob/master/LICENSE',
        languages: ['plaintext', 'c', 'cpp', 'java', 'javascript', 'python', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'brainfuck']
    },
    {
        label: 'LydiaHallie · JavaScript Questions',
        owner: 'lydiahallie',
        repo: 'javascript-questions',
        license: 'MIT',
        licenseUrl: 'https://github.com/lydiahallie/javascript-questions/blob/main/LICENSE',
        languages: ['javascript', 'typescript', 'plaintext']
    },
    {
        label: 'denysdovhan · wtfjs',
        owner: 'denysdovhan',
        repo: 'wtfjs',
        license: 'MIT',
        licenseUrl: 'https://github.com/denysdovhan/wtfjs/blob/master/LICENSE',
        languages: ['javascript', 'typescript', 'plaintext']
    },
    {
        label: 'satwikkansal · wtfpython',
        owner: 'satwikkansal',
        repo: 'wtfpython',
        license: 'MIT',
        licenseUrl: 'https://github.com/satwikkansal/wtfpython/blob/master/LICENSE',
        languages: ['python', 'plaintext']
    },
    {
        label: '30 Seconds of Interviews',
        owner: '30-seconds',
        repo: '30-seconds-of-interviews',
        license: 'MIT',
        licenseUrl: 'https://github.com/30-seconds/30-seconds-of-interviews/blob/master/LICENSE',
        languages: ['javascript', 'typescript', 'plaintext']
    },
    {
        label: 'awesome-programming-quotes',
        owner: 'ashishb',
        repo: 'awesome-programming-quotes',
        license: 'See repository license',
        licenseUrl: 'https://github.com/ashishb/awesome-programming-quotes',
        languages: ['plaintext']
    },
    {
        label: 'programming-memes',
        owner: 'abhisheknaiidu',
        repo: 'programming-memes',
        license: 'See repository license',
        licenseUrl: 'https://github.com/abhisheknaiidu/programming-memes',
        languages: ['plaintext']
    }
];

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
): Promise<{ code: string; languageId: string } | undefined> {
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

            logWithTimestamp(`Loaded snippet from ${entry.path} (${repoLabel}).`);
            lastRepositoryKey = getRepoCacheKey(repository);
            return {
                code: licenseHeader + prefixMessage + finalCode,
                languageId: inferredLanguage
            };
        } catch (error: any) {
            logWithTimestamp(`Failed to process ${entry.path} from ${repoLabel}.`, 'warn', error);
            removeRepoFileFromCache(repository, entry.path);
        }
    }

    return undefined;
}

async function fetchRandomRepoSnippet(languageId: string): Promise<{ code: string; languageId: string }> {
    const normalizedLang = normalizeLanguageId(languageId);
    const extensions = getExtensionsForLanguage(normalizedLang);

    const preferredRepos = LANGUAGE_TO_REPOSITORIES[normalizedLang] ?? [];
    const preferredKeys = new Set(preferredRepos.map(repo => getRepoCacheKey(repo)));
    const fallbackRepos = SNIPPET_REPOSITORIES.filter(repo => !preferredKeys.has(getRepoCacheKey(repo)));

    const filteredPreferred = preferredRepos.filter(repo => getRepoCacheKey(repo) !== lastRepositoryKey);
    const filteredFallback = fallbackRepos.filter(repo => getRepoCacheKey(repo) !== lastRepositoryKey);

    const repositoriesToTry: SnippetRepository[] = [
        ...shuffle(filteredPreferred.length > 0 ? filteredPreferred : []),
        ...shuffle(filteredFallback)
    ];

    if (lastRepositoryKey) {
        const lastRepo = SNIPPET_REPOSITORIES.find(repo => getRepoCacheKey(repo) === lastRepositoryKey);
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

    logWithTimestamp('No suitable repository file found after checking all sources. Using fallback snippet.', 'warn');
    lastRepositoryKey = undefined;
    return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
}

async function showScreenSaver(context: vscode.ExtensionContext) {
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

    webviewPanel.webview.html = getWebviewContent(context, webviewPanel.webview);

    webviewPanel.onDidDispose(() => {
        logWithTimestamp('Screen saver webview disposed.');
        webviewPanel = undefined;
    }, null, context.subscriptions);

    webviewPanel.webview.onDidReceiveMessage(async message => {
        const langId = getActiveOrLastLanguageId();
        switch (message.command) {
            case 'exitScreenSaver':
                logWithTimestamp('Received exit command from webview.');
                if (webviewPanel) webviewPanel.dispose();
                break;
            case 'requestNewGist':
                logWithTimestamp(`Webview requested new snippet for '${langId}'.`);
                const newContent = await fetchRandomRepoSnippet(langId);
                if (webviewPanel) {
                    webviewPanel.webview.postMessage({ command: 'loadCode', ...newContent });
                }
                break;
        }
    }, undefined, context.subscriptions);

    const initialLangId = getActiveOrLastLanguageId();
    const configuration = vscode.workspace.getConfiguration('screenSaver');
    const typingSpeed = configuration.get<number>('typingSpeed', 40);

    logWithTimestamp(`Loading initial snippet for '${initialLangId}'.`);
    const initialContent = await fetchRandomRepoSnippet(initialLangId);

    if (webviewPanel) {
        webviewPanel.webview.postMessage({ command: 'loadCode', typingSpeed, ...initialContent });
        logWithTimestamp('Initial snippet sent to webview.');
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

    const resetIdleTimer = () => {
        if (idleTimer) {
            clearTimeout(idleTimer);
        }
        getActiveOrLastLanguageId();
        if (!vscode.window.state.focused) {
            logWithTimestamp('Window not focused. Idle timer paused.');
            return;
        }

        const configuration = vscode.workspace.getConfiguration('screenSaver');
        const idleTime = configuration.get<number>('idleTimeSeconds', 300);
        if (idleTime > 0) {
            const triggerAt = new Date(Date.now() + idleTime * 1000);
            logWithTimestamp(
                `Idle timer armed for ${idleTime} seconds. Scheduled at ${triggerAt.toLocaleTimeString()}.`
            );
            idleTimer = setTimeout(() => {
                logWithTimestamp('Idle timer elapsed. Launching screen saver.');
                showScreenSaver(context);
            }, idleTime * 1000);
        } else {
            logWithTimestamp('Idle timer disabled via configuration.');
        }
    };

    // Reset timer on any text change, selection change, editor change, or scroll.
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => resetIdleTimer()));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => resetIdleTimer()));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => resetIdleTimer()));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(() => resetIdleTimer())); // For scrolling

    context.subscriptions.push(vscode.window.onDidChangeWindowState(windowState => {
        if (windowState.focused) {
            resetIdleTimer();
        } else {
            if (idleTimer) clearTimeout(idleTimer);
            if (webviewPanel) webviewPanel.dispose();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('screenSaver.test', () => {
        showScreenSaver(context);
    }));

    resetIdleTimer();
}

export function deactivate() {
    if (webviewPanel) webviewPanel.dispose();
    if (idleTimer) clearTimeout(idleTimer);
}
