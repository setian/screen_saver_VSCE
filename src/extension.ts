import * as vscode from 'vscode';
import * as fs from 'fs';

const FALLBACK_SNIPPETS = [
    {
        code: 'class MatrixRain {\n' +
            '  constructor(canvas, speed = 50) {\n' +
            '    this.canvas = canvas;\n' +
            '    this.ctx = canvas.getContext(\'2d\');\n' +
            '    this.width = canvas.width;\n' +
            '    this.height = canvas.height;\n' +
            '    this.fontSize = 16;\n' +
            '    this.columns = Math.floor(this.width / this.fontSize);\n' +
            '    this.drops = Array.from({ length: this.columns }).fill(this.height);\n' +
            '    this.speed = speed;\n' +
            '  }\n\n' +
            '  draw() {\n' +
            '    this.ctx.fillStyle = \'rgba(0, 0, 0, 0.05)\';\n' +
            '    this.ctx.fillRect(0, 0, this.width, this.height);\n' +
            '    this.ctx.fillStyle = \'#0F0\'; // Green text\n' +
            '    this.ctx.font = `${this.fontSize}px monospace`;\n\n' +
            '    for (let i = 0; i < this.drops.length; i++) {\n' +
            '      const text = String.fromCharCode(Math.random() * 128);\n' +
            '      const x = i * this.fontSize;\n' +
            '      const y = this.drops[i] * this.fontSize;\n' +
            '      this.ctx.fillText(text, x, y);\n\n' +
            '      if (y > this.height && Math.random() > 0.975) {\n' +
            '        this.drops[i] = 0;\n' +
            '      }\n' +
            '      this.drops[i]++;\n' +
            '    }\n' +
            '  }\n\n' +
            '  animate() {\n' +
            '    setInterval(() => this.draw(), this.speed);\n' +
            '  }\n' +
            '}',
        languageId: 'javascript'
    },
    {
        code: 'def quicksort(arr):\n' +
            '    if len(arr) <= 1:\n' +
            '        return arr\n' +
            '    else:\n' +
            '        pivot = arr[len(arr) // 2]\n' +
            '        left = [x for x in arr if x < pivot]\n' +
            '        middle = [x for x in arr if x == pivot]\n' +
            '        right = [x for x in arr if x > pivot]\n' +
            '        return quicksort(left) + middle + quicksort(right)',
        languageId: 'python'
    },
    {
        code: '#include <string.h>\n\n' +
            'void reverse(char *str) {\n' +
            '    char *end = str + strlen(str) - 1;\n' +
            '    while (str < end) {\n' +
            '        char temp = *str;\n' +
            '        *str = *end;\n' +
            '        *end = temp;\n' +
            '        str++;\n' +
            '        end--;\n' +
            '    }\n' +
            '}',
        languageId: 'c'
    }
];

let webviewPanel: vscode.WebviewPanel | undefined;
let idleTimer: NodeJS.Timeout | undefined;

// --- Cache variables ---
let gistCache: any[] = [];
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const DISALLOWED_METADATA_PATTERNS = [
    /\bcasino\b/i,
    /\bbetting\b/i,
    /\bpoker\b/i,
    /\bslots?\b/i,
    /\bgambling\b/i,
    /\bporn\b/i,
    /\bnsfw\b/i,
    /\bnude(s|r)?\b/i,
    /\bsex(ual|y)?\b/i,
    /\bhentai\b/i,
    /\bviagra\b/i,
    /\bcredit\s*card\b/i,
    /\bloan\b/i,
    /\bmalware\b/i,
    /\bhack\s*tool\b/i,
    /\bexploit\b/i
];

const DISALLOWED_FILENAME_EXTENSIONS = ['.exe', '.dll', '.bin', '.dat', '.apk', '.msi', '.dmg', '.pkg', '.iso'];

const DISALLOWED_CONTENT_PATTERNS = [
    /\bsex(?:ual|y)?\b/i,
    /\bporn\b/i,
    /\bnude\b/i,
    /\bnsfw\b/i,
    /\bhentai\b/i,
    /\bxxx\b/i,
    /\bporno\b/i,
    /\berotic\b/i,
    /\bfuck\b/i,
    /\bsuicide\b/i,
    /\bkill\b[^\n]*\bself\b/i,
    /\bbomb\b[^\n]*\bmake\b/i,
    /<\s*script/i,
    /<\s*iframe/i
];

const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const MAX_GIST_ATTEMPTS = 6;
const NON_PRINTABLE_THRESHOLD = 0.12;

function isMetadataSafe(gist: any): boolean {
    const description: string = gist?.description ?? '';

    if (DISALLOWED_METADATA_PATTERNS.some(pattern => pattern.test(description))) {
        return false;
    }

    if (CYRILLIC_REGEX.test(description)) {
        return false;
    }

    const files = gist?.files ? Object.entries(gist.files) : [];
    if (files.length === 0) {
        return false;
    }

    return files.every(([fileName, fileData]) => isFileMetadataSafe(fileName, fileData));
}

function isFileMetadataSafe(fileName: string, fileData: any): boolean {
    const lowerName = fileName.toLowerCase();

    if (DISALLOWED_FILENAME_EXTENSIONS.some(extension => lowerName.endsWith(extension))) {
        return false;
    }

    if (DISALLOWED_METADATA_PATTERNS.some(pattern => pattern.test(fileName))) {
        return false;
    }

    if (fileData && typeof fileData.size === 'number' && fileData.size > 50000) {
        return false;
    }

    return true;
}

function gistContainsLanguage(gist: any, languageId: string): boolean {
    const files = gist?.files ? Object.values(gist.files) : [];
    return files.some(file => file?.language && typeof file.language === 'string' && file.language.toLowerCase() === languageId);
}

function selectGistFile(gist: any, languageId: string): any | undefined {
    const files = gist?.files ? Object.values(gist.files) : [];
    if (files.length === 0) {
        return undefined;
    }

    const normalized = languageId.toLowerCase();
    const matchingFile = files.find(file => file?.language && typeof file.language === 'string' && file.language.toLowerCase() === normalized);
    return matchingFile || files[0];
}

function removeGistFromCache(gistId: string | undefined) {
    if (!gistId) {
        return;
    }
    gistCache = gistCache.filter(gist => gist.id !== gistId);
}

function isContentSafe(content: string): boolean {
    if (!content || typeof content !== 'string') {
        return false;
    }

    if (DISALLOWED_CONTENT_PATTERNS.some(pattern => pattern.test(content))) {
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

async function fetchRandomGistSnippet(languageId: string): Promise<{code: string, languageId: string}> {
    const now = Date.now();

    if (gistCache.length === 0 || (now - cacheTimestamp > CACHE_DURATION_MS)) {
        try {
            console.log('Fetching new Gists from GitHub...');
            const pageNumbers = Array.from({ length: 10 }, (_, i) => i + 1);
            const responses = await Promise.all(
                pageNumbers.map(page => fetch(`https://api.github.com/gists/public?per_page=100&page=${page}`))
            );

            const freshGists: any[] = [];
            for (const response of responses) {
                if (response.ok) {
                    freshGists.push(...await response.json());
                }
            }

            const safeGists = freshGists.filter(isMetadataSafe);
            if (safeGists.length > 0) {
                gistCache = safeGists;
                cacheTimestamp = now;
                console.log(`Fetched and cached ${safeGists.length} candidate gists.`);
            } else {
                console.warn('No safe gists found during refresh. Using fallback snippet.');
                return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
            }
        } catch (error: any) {
            console.error('Error fetching gists, using fallback snippet:', error);
            return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
        }
    } else {
        console.log('Using cached Gists.');
    }

    if (gistCache.length === 0) {
        return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
    }

    const normalizedLang = (languageId || 'plaintext').toLowerCase();
    const matchingGists = gistCache.filter(gist => gistContainsLanguage(gist, normalizedLang));
    const candidatePool = matchingGists.length > 0 ? matchingGists : gistCache;
    const attempts = Math.min(MAX_GIST_ATTEMPTS, candidatePool.length);

    const shuffledGists = shuffle(candidatePool).slice(0, attempts);

    for (const gist of shuffledGists) {
        const fileToFetch = selectGistFile(gist, normalizedLang);
        if (!fileToFetch) {
            console.warn('Selected gist had no accessible files. Removing from cache.');
            removeGistFromCache(gist?.id);
            continue;
        }

        try {
            const contentResponse = await fetch(fileToFetch.raw_url);
            if (!contentResponse.ok) {
                console.warn(`Failed to download gist file: ${fileToFetch.raw_url}`);
                removeGistFromCache(gist?.id);
                continue;
            }

            const content = await contentResponse.text();
            if (!isContentSafe(content)) {
                console.warn('Gist content flagged as unsafe. Removing from cache.');
                removeGistFromCache(gist?.id);
                continue;
            }

            const finalCode = content.length > 20000
                ? '// Fetched gist content is too large to display.'
                : content;

            const actualLanguage = (fileToFetch.language || 'plaintext').toLowerCase();
            const languageMatches = actualLanguage === normalizedLang;
            const prefixMessage = languageMatches
                ? ''
                : `// Could not find a Gist for '${normalizedLang}'. Displaying '${actualLanguage}'.\n\n`;

            return { code: prefixMessage + finalCode, languageId: actualLanguage };
        } catch (error: any) {
            console.warn('Failed to read gist content. Removing from cache.', error);
            removeGistFromCache(gist?.id);
        }
    }

    console.warn('No suitable gist could be loaded after several attempts. Using fallback snippet.');
    return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
}

async function showScreenSaver(context: vscode.ExtensionContext) {
    if (webviewPanel) {
        webviewPanel.reveal(vscode.ViewColumn.One);
        return;
    }

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
        webviewPanel = undefined;
    }, null, context.subscriptions);

    webviewPanel.webview.onDidReceiveMessage(async message => {
        const langId = vscode.window.activeTextEditor?.document.languageId || 'plaintext';
        switch (message.command) {
            case 'exitScreenSaver':
                if (webviewPanel) webviewPanel.dispose();
                break;
            case 'requestNewGist':
                const newContent = await fetchRandomGistSnippet(langId);
                if (webviewPanel) {
                    webviewPanel.webview.postMessage({ command: 'loadCode', ...newContent });
                }
                break;
        }
    }, undefined, context.subscriptions);

    const initialLangId = vscode.window.activeTextEditor?.document.languageId || 'plaintext';
    const configuration = vscode.workspace.getConfiguration('screenSaver');
    const typingSpeed = configuration.get<number>('typingSpeed', 40);

    const initialContent = await fetchRandomGistSnippet(initialLangId);

    if (webviewPanel) {
        webviewPanel.webview.postMessage({ command: 'loadCode', typingSpeed, ...initialContent });
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
    console.log('"coding-screensaver" is now active.');

    const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        if (!vscode.window.state.focused) return;

        const configuration = vscode.workspace.getConfiguration('screenSaver');
        const idleTime = configuration.get<number>('idleTimeSeconds', 300);
        if (idleTime > 0) {
            idleTimer = setTimeout(() => showScreenSaver(context), idleTime * 1000);
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
