"use strict";var W=Object.create;var y=Object.defineProperty;var G=Object.getOwnPropertyDescriptor;var K=Object.getOwnPropertyNames;var J=Object.getPrototypeOf,q=Object.prototype.hasOwnProperty;var B=(e,n)=>{for(var t in n)y(e,t,{get:n[t],enumerable:!0})},k=(e,n,t,i)=>{if(n&&typeof n=="object"||typeof n=="function")for(let s of K(n))!q.call(e,s)&&s!==t&&y(e,s,{get:()=>n[s],enumerable:!(i=G(n,s))||i.enumerable});return e};var I=(e,n,t)=>(t=e!=null?W(J(e)):{},k(n||!e||!e.__esModule?y(t,"default",{value:e,enumerable:!0}):t,e)),X=e=>k(y({},"__esModule",{value:!0}),e);var ve={};B(ve,{activate:()=>be,deactivate:()=>we});module.exports=X(ve);var a=I(require("vscode")),E=I(require("fs")),U=I(require("path")),M=[{code:`// Offline snippet \xB7 JavaScript matrix rain demo
class MatrixRain {
  constructor(canvas, speed = 50) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fontSize = 16;
    this.columns = Math.floor(canvas.width / this.fontSize);
    this.drops = Array.from({ length: this.columns }).fill(canvas.height);
    this.speed = speed;
  }

  draw() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#0F0';
    this.ctx.font = \`\${this.fontSize}px monospace\`;
    this.drops.forEach((dropY, column) => {
      const char = String.fromCharCode(33 + Math.random() * 94);
      const x = column * this.fontSize;
      const y = dropY * this.fontSize;
      this.ctx.fillText(char, x, y);
      this.drops[column] = dropY * this.fontSize > this.canvas.height && Math.random() > 0.975 ? 0 : dropY + 1;
    });
  }

  animate() {
    setInterval(() => this.draw(), this.speed);
  }
}`,languageId:"javascript"},{code:`# Offline snippet \xB7 Python one-liner trivia
text = "banana"
print("\uB0B4\uB9BC\uCC28\uC21C\uC815\uB82C:", "".join(sorted(text, reverse=True)))
print("\uBAA8\uB450 a \uD3EC\uD568?:", all(ch == "a" for ch in text))
print("\uD558\uB098\uB77C\uB3C4 b \uD3EC\uD568?:", any(ch == "b" for ch in text))
print("\uC5ED\uC21C:", text[::-1])`,languageId:"python"},{code:`# Offline snippet \xB7 Python context manager
from pathlib import Path

def read_config(path: Path) -> str:
    with path.open() as handle:
        return handle.read().strip()

print(read_config(Path("settings.ini")))`,languageId:"python"},{code:`// Offline snippet \xB7 JavaScript console tricks
const squares = Array.from({ length: 5 }, (_, i) => ({ i, square: i * i }));
console.table(squares);
console.log("isFinite?", Number.isFinite(42 / 0));`,languageId:"javascript"},{code:`# Offline snippet \xB7 JavaScript debounce utility
function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const log = debounce(value => console.log("\uAC80\uC0C9:", value), 300);
log("hello");`,languageId:"javascript"},{code:`/* Offline snippet \xB7 C \uB9E4\uD06C\uB85C\uC640 \uD3EC\uC778\uD130 \uCC4C\uB9B0\uC9C0 */
#include <stdio.h>

#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))

int main(void) {
    const char *words[] = {"VS", "Code", "Screensaver"};
    for (size_t i = 0; i < ARRAY_SIZE(words); ++i) {
        printf("%zu -> %s\\n", i, *(words + i));
    }
    return 0;
}`,languageId:"c"},{code:`/* Offline snippet \xB7 C \uBA54\uBAA8\uB9AC \uB364\uD504 */
#include <stdio.h>

void dump(const void *data, size_t len) {
    const unsigned char *bytes = data;
    for (size_t i = 0; i < len; ++i) {
        printf("%02X%s", bytes[i], (i + 1) % 8 ? " " : "\\n");
    }
}

int main(void) {
    int value = 0x12345678;
    dump(&value, sizeof value);
    return 0;
}`,languageId:"c"},{code:`# Offline snippet \xB7 Rust Option pattern
fn main() {
    let config = std::env::var("SCREENSAVER_THEME").ok();
    match config.as_deref() {
        Some("matrix") => println!("\uB9E4\uD2B8\uB9AD\uC2A4 \uBAA8\uB4DC"),
        Some(other) => println!("\uD14C\uB9C8: {}", other),
        None => println!("\uAE30\uBCF8 \uD14C\uB9C8"),
    }
}`,languageId:"rust"},{code:`// Offline snippet \xB7 TypeScript \uD0C0\uC785 \uD034\uC988
type Flatten<T> = T extends Array<infer U> ? U : T;
type Result = Flatten<number[]>; // Result\uB294 number
const result: Result = 123;`,languageId:"typescript"},{code:`# Offline snippet \xB7 Brainfuck Hello World
++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.`,languageId:"brainfuck"},{code:`// Offline snippet \xB7 Plaintext \uD034\uC988
print("".join(sorted("banana")))  # \uACB0\uACFC\uB294?
# \uBC84\uD2BC\uC744 \uB204\uB974\uBA74 \uC815\uB2F5! -> aaabnn`,languageId:"plaintext"}],l,g,w,N="plaintext",T=new Map,Y=6*60*60*1e3,V={javascriptreact:"javascript",typescriptreact:"typescript",react:"javascript","c++":"cpp","objective-c++":"cpp","objective-c":"c",shellscript:"shell",jsonc:"json"},j={c:[".c",".h"],cpp:[".cc",".cpp",".cxx",".hpp",".hh",".hxx"],go:[".go"],java:[".java"],javascript:[".js",".jsx",".mjs",".cjs"],json:[".json"],kotlin:[".kt"],ruby:[".rb"],python:[".py"],rust:[".rs"],swift:[".swift"],scala:[".scala"],shell:[".sh"],typescript:[".ts",".tsx"],yaml:[".yml",".yaml"],plaintext:[".md",".markdown",".txt"],brainfuck:[".bf"]},Z=new Set(Object.values(j).flat()),Q=6,ee=.12;function o(e,n="log",...t){let s=`[${new Date().toLocaleTimeString()}] ${e}`;switch(n){case"warn":console.warn(s,...t);break;case"error":console.error(s,...t);break;default:console.log(s,...t);break}}var A=[{label:"TheAlgorithms \xB7 Python",owner:"TheAlgorithms",repo:"Python",license:"MIT",licenseUrl:"https://github.com/TheAlgorithms/Python/blob/master/LICENSE",languages:["python"]},{label:"TheAlgorithms \xB7 JavaScript",owner:"TheAlgorithms",repo:"JavaScript",license:"MIT",licenseUrl:"https://github.com/TheAlgorithms/JavaScript/blob/master/LICENSE",languages:["javascript","typescript"]},{label:"TheAlgorithms \xB7 Java",owner:"TheAlgorithms",repo:"Java",license:"MIT",licenseUrl:"https://github.com/TheAlgorithms/Java/blob/master/LICENSE",languages:["java"]},{label:"TheAlgorithms \xB7 C",owner:"TheAlgorithms",repo:"C",license:"MIT",licenseUrl:"https://github.com/TheAlgorithms/C/blob/main/LICENSE",languages:["c"]},{label:"TheAlgorithms \xB7 C++",owner:"TheAlgorithms",repo:"C-Plus-Plus",license:"MIT",licenseUrl:"https://github.com/TheAlgorithms/C-Plus-Plus/blob/master/LICENSE",languages:["cpp"]},{label:"TheAlgorithms \xB7 Go",owner:"TheAlgorithms",repo:"Go",license:"MIT",licenseUrl:"https://github.com/TheAlgorithms/Go/blob/master/LICENSE",languages:["go"]},{label:"TheAlgorithms \xB7 Rust",owner:"TheAlgorithms",repo:"Rust",license:"MIT",licenseUrl:"https://github.com/TheAlgorithms/Rust/blob/master/LICENSE",languages:["rust"]},{label:"TheAlgorithms \xB7 Kotlin",owner:"TheAlgorithms",repo:"Kotlin",license:"MIT",licenseUrl:"https://github.com/TheAlgorithms/Kotlin/blob/master/LICENSE",languages:["kotlin"]},{label:"30 Seconds of Code",owner:"30-seconds",repo:"30-seconds-of-code",license:"CC0 1.0 Universal",licenseUrl:"https://github.com/30-seconds/30-seconds-of-code/blob/master/LICENSE",languages:["javascript","typescript","react"]},{label:"1loc",owner:"phuoc-ng",repo:"1loc",license:"MIT",licenseUrl:"https://github.com/phuoc-ng/1loc/blob/master/LICENSE",languages:["javascript"]},{label:"leachim6 \xB7 Hello World",owner:"leachim6",repo:"hello-world",license:"CC BY 4.0",licenseUrl:"https://github.com/leachim6/hello-world/blob/master/LICENSE",languages:["plaintext","c","cpp","java","javascript","python","ruby","go","rust","swift","kotlin","brainfuck"]},{label:"LydiaHallie \xB7 JavaScript Questions",owner:"lydiahallie",repo:"javascript-questions",license:"MIT",licenseUrl:"https://github.com/lydiahallie/javascript-questions/blob/main/LICENSE",languages:["javascript","typescript","plaintext"]},{label:"denysdovhan \xB7 wtfjs",owner:"denysdovhan",repo:"wtfjs",license:"MIT",licenseUrl:"https://github.com/denysdovhan/wtfjs/blob/master/LICENSE",languages:["javascript","typescript","plaintext"]},{label:"satwikkansal \xB7 wtfpython",owner:"satwikkansal",repo:"wtfpython",license:"MIT",licenseUrl:"https://github.com/satwikkansal/wtfpython/blob/master/LICENSE",languages:["python","plaintext"]},{label:"30 Seconds of Interviews",owner:"30-seconds",repo:"30-seconds-of-interviews",license:"MIT",licenseUrl:"https://github.com/30-seconds/30-seconds-of-interviews/blob/master/LICENSE",languages:["javascript","typescript","plaintext"]},{label:"awesome-programming-quotes",owner:"ashishb",repo:"awesome-programming-quotes",license:"See repository license",licenseUrl:"https://github.com/ashishb/awesome-programming-quotes",languages:["plaintext"]},{label:"programming-memes",owner:"abhisheknaiidu",repo:"programming-memes",license:"See repository license",licenseUrl:"https://github.com/abhisheknaiidu/programming-memes",languages:["plaintext"]}],ne=A.reduce((e,n)=>{for(let t of n.languages)e[t]||(e[t]=[]),e[t].push(n);return e},{}),f=new Map,S=new Map;function te(e){if(!e)return"plaintext";let n=e.toLowerCase();return V[n]??n}function $(){let e=a.window.activeTextEditor?.document.languageId;return e&&(N=e),N}function ie(e){return j[e]??[]}function se(e){let n=U.extname(e).toLowerCase();if(n){for(let[t,i]of Object.entries(j))if(i.includes(n))return t}}function oe(e,n){let t=e.toLowerCase(),i=U.extname(t);return!(i&&!Z.has(i)||typeof n=="number"&&n>12e4)}function re(e){return!e||typeof e!="string"?!1:!ae(e)}function ae(e){if(!e.length)return!1;let n=0;for(let t=0;t<e.length;t++){let i=e.charCodeAt(t);i===9||i===10||i===13||(i===0||i===65533||i<32)&&n++}return n/e.length>ee}function L(e){let n=[...e];for(let t=n.length-1;t>0;t--){let i=Math.floor(Math.random()*(t+1));[n[t],n[i]]=[n[i],n[t]]}return n}function h(e){return`${e.owner}/${e.repo}`}function F(e,n){let t=h(e),i=Date.now(),s=typeof n=="number"&&n>i?n:i+15*60*1e3;T.set(t,s);let c=new Date(s).toLocaleTimeString();o(`GitHub rate limit hit for ${e.label}. Cooling down until ${c}.`,"warn")}function ce(e){let n=h(e),t=T.get(n);return t?Date.now()<t?!0:(T.delete(n),!1):!1}async function le(e){let n=h(e);if(S.has(n))return S.get(n);if(e.branch)return S.set(n,e.branch),e.branch;let t=`https://api.github.com/repos/${e.owner}/${e.repo}`;try{let i=await fetch(t);if(i.status===403){let s=i.headers.get("X-RateLimit-Reset"),c=s?parseInt(s,10)*1e3:void 0;throw F(e,c),new Error("GitHub API rate limit exceeded")}if(i.ok){let s=await i.json(),c=typeof s?.default_branch=="string"?s.default_branch:"master";return S.set(n,c),c}o(`Failed to resolve default branch for ${e.label}. Falling back to 'master'.`,"warn")}catch(i){o(`Error resolving branch for ${e.label}.`,"warn",i)}return S.set(n,"master"),"master"}function pe(e,n){return`https://api.github.com/repos/${e.owner}/${e.repo}/git/trees/${n}?recursive=1`}function he(e,n,t){return`https://raw.githubusercontent.com/${e.owner}/${e.repo}/${n}/`+encodeURI(t).replace(/#/g,"%23")}function de(e,n,t){let i=`// Source: https://github.com/${e.owner}/${e.repo}/blob/${n}/${t}`,s=e.licenseUrl?`// License: ${e.license} (${e.licenseUrl})`:`// License: ${e.license}`;return`${i}
${s}

`}function x(e,n){let t=h(e),i=f.get(t);i&&(i.entries=i.entries.filter(s=>s.path!==n),f.set(t,i))}async function ue(e){try{let n=await le(e);o(`Fetching repository tree from GitHub for ${e.label} (${n}).`);let t=await fetch(pe(e,n));if(t.status===403){let r=t.headers.get("X-RateLimit-Reset"),u=r?parseInt(r,10)*1e3:void 0;F(e,u),f.delete(h(e));return}if(!t.ok)throw new Error(`Failed to fetch repository tree: ${t.status}`);let i=await t.json(),c=(Array.isArray(i?.tree)?i.tree:[]).filter(r=>r?.type==="blob"&&typeof r?.path=="string").map(r=>({path:r.path,size:typeof r.size=="number"?r.size:0})).filter(r=>oe(r.path,r.size));f.set(h(e),{entries:c,timestamp:Date.now(),branch:n}),o(`Cached ${c.length} files from ${e.label}.`)}catch(n){o(`Error refreshing repository cache for ${e.label}.`,"error",n),f.delete(h(e))}}async function ge(e){if(ce(e)){let s=h(e),c=T.get(s)??0;o(`${e.label} is on cooldown until ${new Date(c).toLocaleTimeString()}. Skipping.`,"warn");return}let n=h(e),t=f.get(n),i=Date.now();return(!t||i-t.timestamp>Y||t.entries.length===0)&&await ue(e),f.get(n)}async function fe(e,n,t){let i=await ge(e);if(!i||i.entries.length===0){o(`Repository cache empty for ${e.label}.`,"warn");return}let{entries:s,branch:c}=i,r=e.label,u=t.length>0?s.filter(d=>t.some(v=>d.path.toLowerCase().endsWith(v))):s;if(u.length===0&&(o(`No files with extensions ${t.join(", ")} in ${r}.`,"warn"),!e.languages.includes(n)))return;let m=u.length>0?u:s;if(m.length===0){o(`No entries available in ${r}.`,"warn");return}let p=Math.min(Q,m.length),b=L(m).slice(0,p);for(let d of b)try{let v=he(e,c,d.path),P=await fetch(v);if(!P.ok){o(`Failed to download ${d.path} from ${r}.`,"warn"),x(e,d.path);continue}let C=await P.text();if(!re(C)){o(`File flagged as unsafe: ${d.path} (${r}).`,"warn"),x(e,d.path);continue}let D=C.length>2e4?"// Repository content is too large to display.":C,R=se(d.path)??n??"plaintext",z=R===n?"":`// Could not find a '${n}' file. Displaying '${R}'.

`,H=de(e,c,d.path);return o(`Loaded snippet from ${d.path} (${r}).`),w=h(e),{code:H+z+D,languageId:R}}catch(v){o(`Failed to process ${d.path} from ${r}.`,"warn",v),x(e,d.path)}}async function O(e){let n=te(e),t=ie(n),i=ne[n]??[],s=new Set(i.map(p=>h(p))),c=A.filter(p=>!s.has(h(p))),r=i.filter(p=>h(p)!==w),u=c.filter(p=>h(p)!==w),m=[...L(r.length>0?r:[]),...L(u)];if(w){let p=A.find(b=>h(b)===w);p&&m.push(p)}for(let p of m){o(`Trying ${p.label} for '${n}' snippets.`);let b=await fe(p,n,t);if(b)return b}return o("No suitable repository file found after checking all sources. Using fallback snippet.","warn"),w=void 0,M[Math.floor(Math.random()*M.length)]}async function _(e){if(l){o("Screen saver already open. Revealing existing panel."),l.reveal(a.ViewColumn.One);return}o("Creating screen saver webview."),l=a.window.createWebviewPanel("screenSaver","Screen Saver",a.ViewColumn.One,{enableScripts:!0,localResourceRoots:[a.Uri.joinPath(e.extensionUri,"media")]}),l.webview.html=me(e,l.webview),l.onDidDispose(()=>{o("Screen saver webview disposed."),l=void 0},null,e.subscriptions),l.webview.onDidReceiveMessage(async c=>{let r=$();switch(c.command){case"exitScreenSaver":o("Received exit command from webview."),l&&l.dispose();break;case"requestNewGist":o(`Webview requested new snippet for '${r}'.`);let u=await O(r);l&&l.webview.postMessage({command:"loadCode",...u});break}},void 0,e.subscriptions);let n=$(),i=a.workspace.getConfiguration("screenSaver").get("typingSpeed",40);o(`Loading initial snippet for '${n}'.`);let s=await O(n);l&&(l.webview.postMessage({command:"loadCode",typingSpeed:i,...s}),o("Initial snippet sent to webview."))}function me(e,n){let t=a.Uri.joinPath(e.extensionUri,"media","webview.html");if(!E.existsSync(t.fsPath))return"<html><body><h1>Error: webview.html not found!</h1></body></html>";let i=E.readFileSync(t.fsPath,"utf8"),s=n.asWebviewUri(a.Uri.joinPath(e.extensionUri,"media","styles.css")),c=n.asWebviewUri(a.Uri.joinPath(e.extensionUri,"media","main.js"));return i.replace(/\{\{cspSource\}\}/g,n.cspSource).replace(/\{\{styleUri\}\}/g,s.toString()).replace(/\{\{scriptUri\}\}/g,c.toString())}function be(e){o('"coding-screensaver" is now active.');let n=()=>{if(g&&clearTimeout(g),$(),!a.window.state.focused){o("Window not focused. Idle timer paused.");return}let i=a.workspace.getConfiguration("screenSaver").get("idleTimeSeconds",300);if(i>0){let s=new Date(Date.now()+i*1e3);o(`Idle timer armed for ${i} seconds. Scheduled at ${s.toLocaleTimeString()}.`),g=setTimeout(()=>{o("Idle timer elapsed. Launching screen saver."),_(e)},i*1e3)}else o("Idle timer disabled via configuration.")};e.subscriptions.push(a.workspace.onDidChangeTextDocument(()=>n())),e.subscriptions.push(a.window.onDidChangeTextEditorSelection(()=>n())),e.subscriptions.push(a.window.onDidChangeActiveTextEditor(()=>n())),e.subscriptions.push(a.window.onDidChangeTextEditorVisibleRanges(()=>n())),e.subscriptions.push(a.window.onDidChangeWindowState(t=>{t.focused?n():(g&&clearTimeout(g),l&&l.dispose())})),e.subscriptions.push(a.commands.registerCommand("screenSaver.test",()=>{_(e)})),n()}function we(){l&&l.dispose(),g&&clearTimeout(g)}0&&(module.exports={activate,deactivate});
