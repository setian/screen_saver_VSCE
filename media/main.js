(function () {
    const vscode = acquireVsCodeApi();
    const container = document.getElementById('container');
    const codeBlock = document.getElementById('code-block');

    let animationTimeout;
    let hasPostedReady = false;
    const grammarCache = new Map();
    let lastUserActivityPost = 0;
    const USER_ACTIVITY_DEBOUNCE_MS = 1500;

    const CL_LIKE_KEYWORDS = [
        'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
        'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'finally', 'for', 'from',
        'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'package',
        'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'throw', 'try', 'typeof', 'var',
        'void', 'while', 'with', 'yield'
    ];

    const PYTHON_KEYWORDS = [
        'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
        'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None',
        'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield'
    ];

    const GO_KEYWORDS = [
        'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for', 'func',
        'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var'
    ];

    const RUST_KEYWORDS = [
        'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'fn', 'for', 'if',
        'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static',
        'struct', 'super', 'trait', 'type', 'unsafe', 'use', 'where', 'while'
    ];

    const SQL_KEYWORDS = [
        'select', 'from', 'where', 'insert', 'into', 'update', 'delete', 'create', 'table', 'inner', 'outer', 'join',
        'left', 'right', 'on', 'group', 'by', 'order', 'having', 'limit', 'offset', 'values', 'set', 'as', 'and', 'or',
        'not', 'null', 'is', 'primary', 'key', 'foreign'
    ];

    const BUILTIN_IDENTIFIERS = {
        javascript: ['console', 'Math', 'Number', 'String', 'Array', 'Promise', 'Date', 'JSON', 'window', 'document'],
        typescript: ['console', 'Math', 'Number', 'String', 'Array', 'Promise', 'Date', 'JSON'],
        python: ['print', 'range', 'len', 'dict', 'list', 'tuple', 'set', 'int', 'float', 'str', 'bool'],
        go: ['fmt', 'len', 'cap', 'append', 'make', 'new', 'panic', 'recover'],
        rust: ['println', 'format', 'Vec', 'Option', 'Result', 'String'],
        sql: ['count', 'sum', 'avg', 'min', 'max']
    };

    function escapeForRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function createWordPattern(words) {
        if (!words.length) {
            return null;
        }
        const source = `\\b(?:${words.map(escapeForRegExp).join('|')})\\b`;
        return new RegExp(source, 'y');
    }

    function getGrammar(languageId) {
        const normalized = (languageId || 'plaintext').toLowerCase();
        if (grammarCache.has(normalized)) {
            return grammarCache.get(normalized);
        }

        const grammar = buildGrammar(normalized);
        grammarCache.set(normalized, grammar);
        return grammar;
    }

    function buildGrammar(languageId) {
        const patterns = [];

        patterns.push({ regex: /\r?\n/y });
        patterns.push({ regex: /\s+/y });

        const numberPattern = /0[xX][0-9a-fA-F]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
        const stringPattern = /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y;
        const singleLineComment = /\/\/[^\n]*/y;
        const multiLineComment = /\/\*[\s\S]*?\*\//y;

        const pythonStringPattern = /'''[\s\S]*?'''|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y;
        const pythonComment = /#[^\n]*/y;

        const sqlStringPattern = /'(?:''|[^'])*'/y;
        const sqlComment = /--[^\n]*/y;

        const functionCallPattern = /[A-Za-z_][\w$]*(?=\s*\()/y;

        let keywordPattern = null;
        let builtinPattern = null;
        let literalPattern = null;

        switch (languageId) {
            case 'javascript':
            case 'typescript':
            case 'java':
            case 'c':
            case 'cpp':
            case 'csharp':
            case 'kotlin':
            case 'swift':
            case 'scala':
                keywordPattern = createWordPattern(CL_LIKE_KEYWORDS);
                literalPattern = /\b(?:true|false|null|undefined|NaN|Infinity)\b/y;
                builtinPattern = createWordPattern(BUILTIN_IDENTIFIERS.javascript);
                patterns.push({ regex: singleLineComment, className: 'token-comment' });
                patterns.push({ regex: multiLineComment, className: 'token-comment' });
                patterns.push({ regex: stringPattern, className: 'token-string' });
                break;
            case 'python':
                keywordPattern = createWordPattern(PYTHON_KEYWORDS);
                literalPattern = /\b(?:True|False|None)\b/y;
                builtinPattern = createWordPattern(BUILTIN_IDENTIFIERS.python);
                patterns.push({ regex: pythonComment, className: 'token-comment' });
                patterns.push({ regex: pythonStringPattern, className: 'token-string' });
                break;
            case 'go':
                keywordPattern = createWordPattern(GO_KEYWORDS);
                literalPattern = /\b(?:true|false|iota|nil)\b/y;
                builtinPattern = createWordPattern(BUILTIN_IDENTIFIERS.go);
                patterns.push({ regex: singleLineComment, className: 'token-comment' });
                patterns.push({ regex: multiLineComment, className: 'token-comment' });
                patterns.push({ regex: stringPattern, className: 'token-string' });
                break;
            case 'rust':
                keywordPattern = createWordPattern(RUST_KEYWORDS);
                literalPattern = /\b(?:true|false|Some|None|Ok|Err)\b/y;
                builtinPattern = createWordPattern(BUILTIN_IDENTIFIERS.rust);
                patterns.push({ regex: singleLineComment, className: 'token-comment' });
                patterns.push({ regex: /\/\/[!#][^\n]*/y, className: 'token-comment' });
                patterns.push({ regex: multiLineComment, className: 'token-comment' });
                patterns.push({ regex: stringPattern, className: 'token-string' });
                break;
            case 'sql':
            case 'postgresql':
            case 'mysql':
                keywordPattern = createWordPattern(SQL_KEYWORDS);
                builtinPattern = createWordPattern(BUILTIN_IDENTIFIERS.sql);
                patterns.push({ regex: sqlComment, className: 'token-comment' });
                patterns.push({ regex: sqlStringPattern, className: 'token-string' });
                break;
            default:
                patterns.push({ regex: singleLineComment, className: 'token-comment' });
                patterns.push({ regex: multiLineComment, className: 'token-comment' });
                patterns.push({ regex: stringPattern, className: 'token-string' });
                break;
        }

        patterns.push({ regex: numberPattern, className: 'token-number' });

        if (keywordPattern) {
            patterns.push({ regex: keywordPattern, className: 'token-keyword' });
        }
        if (builtinPattern) {
            patterns.push({ regex: builtinPattern, className: 'token-builtin' });
        }
        if (literalPattern) {
            patterns.push({ regex: literalPattern, className: 'token-literal' });
        }

        patterns.push({ regex: functionCallPattern, className: 'token-function' });

        return patterns;
    }

    function tokenize(code, languageId) {
        const patterns = getGrammar(languageId);
        const tokens = [];
        let index = 0;

        outer: while (index < code.length) {
            for (const pattern of patterns) {
                pattern.regex.lastIndex = index;
                const match = pattern.regex.exec(code);
                if (!match || match.index !== index) {
                    continue;
                }
                tokens.push({ text: match[0], className: pattern.className || '' });
                index += match[0].length;
                continue outer;
            }

            tokens.push({ text: code[index], className: '' });
            index += 1;
        }

        return tokens;
    }

    function postUserActivity() {
        const now = Date.now();
        if (now - lastUserActivityPost < USER_ACTIVITY_DEBOUNCE_MS) {
            return;
        }
        lastUserActivityPost = now;
        vscode.postMessage({ command: 'userActivity' });
    }

    function signalReady() {
        if (hasPostedReady) {
            return;
        }
        hasPostedReady = true;
        vscode.postMessage({ command: 'webviewReady' });
    }

    function clearAnimation() {
        if (animationTimeout) {
            clearTimeout(animationTimeout);
            animationTimeout = undefined;
        }
    }

    function appendStatus(message) {
        const status = document.createElement('span');
        status.className = 'status-message';
        status.textContent = message;
        codeBlock.appendChild(status);
        container.scrollTop = container.scrollHeight;
    }

    function startAnimation(code, lang, speed) {
        clearAnimation();

        codeBlock.textContent = '';

        const sourceCode = String(code ?? '');
        const lines = sourceCode.split('\n');
        const licenseLineSet = new Set();
        lines.forEach((line, index) => {
            const trimmed = line.trimStart();
            if (trimmed.startsWith('// Source:') || trimmed.startsWith('// License:')) {
                licenseLineSet.add(index);
            }
        });

        const charsToAnimate = [];
        let currentLine = 0;

        const pushChar = (char, classNames) => {
            const span = document.createElement('span');
            const isLicenseLine = licenseLineSet.has(currentLine);
            span.style.display = isLicenseLine ? 'inline' : 'none';
            span.textContent = char;
            span.className = classNames || 'hljs';
            charsToAnimate.push(span);
            codeBlock.appendChild(span);
            if (char === '\n') {
                currentLine += 1;
            }
        };

        let usedHighlight = false;
        if (window.hljs) {
            try {
                const result = window.hljs.highlight(sourceCode, { language: lang, ignoreIllegals: true });
                const temp = document.createElement('div');
                temp.innerHTML = result.value;

                const traverse = (node, activeClasses) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.nodeValue || '';
                        for (const char of text) {
                            pushChar(char, activeClasses.join(' '));
                        }
                        return;
                    }

                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const elementClasses = Array.from(node.classList || []);
                        const nextClasses = [...activeClasses, ...elementClasses];
                        node.childNodes.forEach(child => traverse(child, nextClasses));
                    }
                };

                temp.childNodes.forEach(child => traverse(child, ['hljs']));
                usedHighlight = true;
            } catch (error) {
                console.warn('highlight.js failed, falling back to manual tokenization.', error);
            }
        }

        if (!usedHighlight) {
            currentLine = 0;
            const tokens = tokenize(sourceCode, lang);
            tokens.forEach(token => {
                const classNames = token.className ? `hljs ${token.className}` : 'hljs';
                for (const char of token.text) {
                    pushChar(char, classNames);
                }
            });
        }

        let revealIndex = 0;
        const typingSpeed = typeof speed === 'number' ? Math.max(5, speed) : 40;

        const reveal = () => {
            while (revealIndex < charsToAnimate.length && charsToAnimate[revealIndex].style.display !== 'none') {
                revealIndex += 1;
            }
            if (revealIndex < charsToAnimate.length) {
                charsToAnimate[revealIndex].style.display = 'inline';
                container.scrollTop = container.scrollHeight;
                revealIndex += 1;
                const variance = Math.random() * typingSpeed + 40;
                animationTimeout = window.setTimeout(reveal, variance);
                return;
            }

            animationTimeout = window.setTimeout(() => {
                appendStatus('--- Finished. Fetching new snippet... ---');
                vscode.postMessage({ command: 'requestNewGist' });
            }, 3000);
        };

        reveal();
    }

    function exit() {
        clearAnimation();
        vscode.postMessage({ command: 'exitScreenSaver' });
    }

    window.addEventListener('message', event => {
        const message = event.data;
        if (message?.command === 'loadCode') {
            const lang = (message.languageId || 'plaintext').toLowerCase();
            const parsedSpeed = Number(message.typingSpeed);
            const speed = Number.isFinite(parsedSpeed) ? parsedSpeed : 40;
            startAnimation(String(message.code ?? ''), lang, speed);

            const sourceLink = document.getElementById('source-link');
            if (sourceLink) {
                if (message.sourceUrl) {
                    sourceLink.href = message.sourceUrl;
                    sourceLink.classList.remove('hidden');
                } else {
                    sourceLink.classList.add('hidden');
                }
            }
        }
    });

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'wheel', 'touchstart'];
    activityEvents.forEach(eventName => {
        window.addEventListener(eventName, () => postUserActivity(), { passive: true });
    });

    window.addEventListener('keydown', exit);
    window.addEventListener('mousedown', exit);
    window.addEventListener('click', exit);

    const sourceLink = document.getElementById('source-link');
    if (sourceLink) {
        sourceLink.addEventListener('mousedown', (e) => {
            // Stop mousedown from bubbling to the window listener, which would exit
            e.stopPropagation();
        });

        sourceLink.addEventListener('click', (e) => {
            // Stop the click from bubbling and also prevent the default link navigation
            e.stopPropagation();
            e.preventDefault();

            const url = sourceLink.getAttribute('href');
            if (url && url !== '#') {
                vscode.postMessage({ command: 'openExternalUrl', url: url });
            }
        });
    }

    // Allow the extension side to know when it's safe to stream snippets in.
    setTimeout(signalReady, 0);
})();
