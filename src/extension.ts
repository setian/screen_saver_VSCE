import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

async function fetchRandomGistSnippet(languageId: string): Promise<{code: string, languageId: string}> {
    const now = Date.now();

    if (gistCache.length === 0 || (now - cacheTimestamp > CACHE_DURATION_MS)) {
        try {
            console.log("Fetching new Gists from GitHub...");
            const pageNumbers = Array.from({ length: 10 }, (_, i) => i + 1);
            const promises = pageNumbers.map(page =>
                fetch(`https://api.github.com/gists/public?per_page=100&page=${page}`)
            );
            const responses = await Promise.all(promises);

            let freshGists: any[] = [];
            for (const response of responses) {
                if (response.ok) {
                    freshGists = freshGists.concat(await response.json());
                }
            }

            // --- ADVANCED SPAM FILTER ---
            const spamKeywords = ['casino', 'online', 'betting', 'poker', 'slot', 'gambling'];
            const cyrillicRegex = /[\u0400-\u04FF]/; // Cyrillic script characters

            const cleanGists = freshGists.filter(gist => {
                const description = gist.description || '';
                const lowerDesc = description.toLowerCase();

                if (spamKeywords.some(keyword => lowerDesc.includes(keyword))) {
                    return false;
                }

                if (cyrillicRegex.test(description)) {
                    return false;
                }

                return true;
            });

            if (cleanGists.length > 0) {
                gistCache = cleanGists;
                cacheTimestamp = now;
                console.log(`Fetched and cached ${cleanGists.length} non-spam gists.`);
            } else {
                console.warn("Failed to fetch any non-spam gists. Using fallback snippet.");
                return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
            }
        } catch (error: any) {
            console.error("Error fetching gists, using fallback snippet:", error);
            return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
        }
    } else {
        console.log("Using cached Gists.");
    }

    const matchingGists = gistCache.filter((gist: any) => {
        return Object.values(gist.files).some((file: any) => file.language && file.language.toLowerCase() === languageId.toLowerCase());
    });

    let chosenGist: any;
    let fallbackMessage = '';

    if (matchingGists.length > 0) {
        chosenGist = matchingGists[Math.floor(Math.random() * matchingGists.length)];
    } else {
        fallbackMessage = `// Could not find a Gist for '${languageId}' in the cache. Showing a random one instead.\n\n`;
        chosenGist = gistCache[Math.floor(Math.random() * gistCache.length)];
    }

    let fileToFetch: any = Object.values(chosenGist.files).find((file: any) => file.language && file.language.toLowerCase() === languageId.toLowerCase());
    if (!fileToFetch) {
        fileToFetch = Object.values(chosenGist.files)[0];
    }

    if (!fileToFetch) {
        console.warn("Chosen Gist appears to have no files. Using fallback snippet.");
        return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
    }

    try {
        const contentResponse = await fetch(fileToFetch.raw_url);
        if (!contentResponse.ok) {
            return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
        }
        const content = await contentResponse.text();
        const finalCode = content.length > 20000 ? "// Fetched gist content is too large to display." : content;
        
        const actualLanguage = (fileToFetch.language || 'plaintext').toLowerCase();
        return { code: fallbackMessage + finalCode, languageId: actualLanguage };

    } catch (error: any) {
        return FALLBACK_SNIPPETS[Math.floor(Math.random() * FALLBACK_SNIPPETS.length)];
    }
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

    webviewPanel.webview.html = getWebviewContent(context);

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

function getWebviewContent(context: vscode.ExtensionContext): string {
    const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview.html');
    if (!fs.existsSync(htmlPath.fsPath)) {
        return `<html><body><h1>Error: webview.html not found!</h1></body></html>`;
    }
    return fs.readFileSync(htmlPath.fsPath, 'utf8');
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
