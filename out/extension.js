"use strict";var L=Object.create;var m=Object.defineProperty;var I=Object.getOwnPropertyDescriptor;var k=Object.getOwnPropertyNames;var A=Object.getPrototypeOf,P=Object.prototype.hasOwnProperty;var D=(e,n)=>{for(var t in n)m(e,t,{get:n[t],enumerable:!0})},x=(e,n,t,i)=>{if(n&&typeof n=="object"||typeof n=="function")for(let a of k(n))!P.call(e,a)&&a!==t&&m(e,a,{get:()=>n[a],enumerable:!(i=I(n,a))||i.enumerable});return e};var y=(e,n,t)=>(t=e!=null?L(A(e)):{},x(n||!e||!e.__esModule?m(t,"default",{value:e,enumerable:!0}):t,e)),R=e=>x(m({},"__esModule",{value:!0}),e);var K={};D(K,{activate:()=>X,deactivate:()=>J});module.exports=R(K);var s=y(require("vscode")),v=y(require("fs")),l=[{code:`class MatrixRain {
  constructor(canvas, speed = 50) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.fontSize = 16;
    this.columns = Math.floor(this.width / this.fontSize);
    this.drops = Array.from({ length: this.columns }).fill(this.height);
    this.speed = speed;
  }

  draw() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = '#0F0'; // Green text
    this.ctx.font = \`\${this.fontSize}px monospace\`;

    for (let i = 0; i < this.drops.length; i++) {
      const text = String.fromCharCode(Math.random() * 128);
      const x = i * this.fontSize;
      const y = this.drops[i] * this.fontSize;
      this.ctx.fillText(text, x, y);

      if (y > this.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }
      this.drops[i]++;
    }
  }

  animate() {
    setInterval(() => this.draw(), this.speed);
  }
}`,languageId:"javascript"},{code:`def quicksort(arr):
    if len(arr) <= 1:
        return arr
    else:
        pivot = arr[len(arr) // 2]
        left = [x for x in arr if x < pivot]
        middle = [x for x in arr if x == pivot]
        right = [x for x in arr if x > pivot]
        return quicksort(left) + middle + quicksort(right)`,languageId:"python"},{code:`#include <string.h>

void reverse(char *str) {
    char *end = str + strlen(str) - 1;
    while (str < end) {
        char temp = *str;
        *str = *end;
        *end = temp;
        str++;
        end--;
    }
}`,languageId:"c"}],o,h,u=[],C=0,U=15*60*1e3,E=[/\bcasino\b/i,/\bbetting\b/i,/\bpoker\b/i,/\bslots?\b/i,/\bgambling\b/i,/\bporn\b/i,/\bnsfw\b/i,/\bnude(s|r)?\b/i,/\bsex(ual|y)?\b/i,/\bhentai\b/i,/\bviagra\b/i,/\bcredit\s*card\b/i,/\bloan\b/i,/\bmalware\b/i,/\bhack\s*tool\b/i,/\bexploit\b/i],_=[".exe",".dll",".bin",".dat",".apk",".msi",".dmg",".pkg",".iso"],F=[/\bsex(?:ual|y)?\b/i,/\bporn\b/i,/\bnude\b/i,/\bnsfw\b/i,/\bhentai\b/i,/\bxxx\b/i,/\bporno\b/i,/\berotic\b/i,/\bfuck\b/i,/\bsuicide\b/i,/\bkill\b[^\n]*\bself\b/i,/\bbomb\b[^\n]*\bmake\b/i,/<\s*script/i,/<\s*iframe/i],N=/[\u0400-\u04FF]/,G=6,O=.12;function j(e){let n=e?.description??"";if(E.some(i=>i.test(n))||N.test(n))return!1;let t=e?.files?Object.entries(e.files):[];return t.length===0?!1:t.every(([i,a])=>W(i,a))}function W(e,n){let t=e.toLowerCase();return!(_.some(i=>t.endsWith(i))||E.some(i=>i.test(e))||n&&typeof n.size=="number"&&n.size>5e4)}function z(e,n){return(e?.files?Object.values(e.files):[]).some(i=>i?.language&&typeof i.language=="string"&&i.language.toLowerCase()===n)}function $(e,n){let t=e?.files?Object.values(e.files):[];if(t.length===0)return;let i=n.toLowerCase();return t.find(c=>c?.language&&typeof c.language=="string"&&c.language.toLowerCase()===i)||t[0]}function w(e){e&&(u=u.filter(n=>n.id!==e))}function H(e){return!e||typeof e!="string"||F.some(n=>n.test(e))?!1:!q(e)}function q(e){if(!e.length)return!1;let n=0;for(let t=0;t<e.length;t++){let i=e.charCodeAt(t);i===9||i===10||i===13||(i===0||i===65533||i<32)&&n++}return n/e.length>O}function B(e){let n=[...e];for(let t=n.length-1;t>0;t--){let i=Math.floor(Math.random()*(t+1));[n[t],n[i]]=[n[i],n[t]]}return n}async function T(e){let n=Date.now();if(u.length===0||n-C>U)try{console.log("Fetching new Gists from GitHub...");let r=Array.from({length:10},(g,p)=>p+1),b=await Promise.all(r.map(g=>fetch(`https://api.github.com/gists/public?per_page=100&page=${g}`))),d=[];for(let g of b)g.ok&&d.push(...await g.json());let f=d.filter(j);if(f.length>0)u=f,C=n,console.log(`Fetched and cached ${f.length} candidate gists.`);else return console.warn("No safe gists found during refresh. Using fallback snippet."),l[Math.floor(Math.random()*l.length)]}catch(r){return console.error("Error fetching gists, using fallback snippet:",r),l[Math.floor(Math.random()*l.length)]}else console.log("Using cached Gists.");if(u.length===0)return l[Math.floor(Math.random()*l.length)];let t=(e||"plaintext").toLowerCase(),i=u.filter(r=>z(r,t)),a=i.length>0?i:u,c=Math.min(G,a.length),S=B(a).slice(0,c);for(let r of S){let b=$(r,t);if(!b){console.warn("Selected gist had no accessible files. Removing from cache."),w(r?.id);continue}try{let d=await fetch(b.raw_url);if(!d.ok){console.warn(`Failed to download gist file: ${b.raw_url}`),w(r?.id);continue}let f=await d.text();if(!H(f)){console.warn("Gist content flagged as unsafe. Removing from cache."),w(r?.id);continue}let g=f.length>2e4?"// Fetched gist content is too large to display.":f,p=(b.language||"plaintext").toLowerCase();return{code:(p===t?"":`// Could not find a Gist for '${t}'. Displaying '${p}'.

`)+g,languageId:p}}catch(d){console.warn("Failed to read gist content. Removing from cache.",d),w(r?.id)}}return console.warn("No suitable gist could be loaded after several attempts. Using fallback snippet."),l[Math.floor(Math.random()*l.length)]}async function M(e){if(o){o.reveal(s.ViewColumn.One);return}o=s.window.createWebviewPanel("screenSaver","Screen Saver",s.ViewColumn.One,{enableScripts:!0,localResourceRoots:[s.Uri.joinPath(e.extensionUri,"media")]}),o.webview.html=V(e,o.webview),o.onDidDispose(()=>{o=void 0},null,e.subscriptions),o.webview.onDidReceiveMessage(async c=>{let S=s.window.activeTextEditor?.document.languageId||"plaintext";switch(c.command){case"exitScreenSaver":o&&o.dispose();break;case"requestNewGist":let r=await T(S);o&&o.webview.postMessage({command:"loadCode",...r});break}},void 0,e.subscriptions);let n=s.window.activeTextEditor?.document.languageId||"plaintext",i=s.workspace.getConfiguration("screenSaver").get("typingSpeed",40),a=await T(n);o&&o.webview.postMessage({command:"loadCode",typingSpeed:i,...a})}function V(e,n){let t=s.Uri.joinPath(e.extensionUri,"media","webview.html");if(!v.existsSync(t.fsPath))return"<html><body><h1>Error: webview.html not found!</h1></body></html>";let i=v.readFileSync(t.fsPath,"utf8"),a=n.asWebviewUri(s.Uri.joinPath(e.extensionUri,"media","styles.css")),c=n.asWebviewUri(s.Uri.joinPath(e.extensionUri,"media","main.js"));return i.replace(/\{\{cspSource\}\}/g,n.cspSource).replace(/\{\{styleUri\}\}/g,a.toString()).replace(/\{\{scriptUri\}\}/g,c.toString())}function X(e){console.log('"coding-screensaver" is now active.');let n=()=>{if(h&&clearTimeout(h),!s.window.state.focused)return;let i=s.workspace.getConfiguration("screenSaver").get("idleTimeSeconds",300);i>0&&(h=setTimeout(()=>M(e),i*1e3))};e.subscriptions.push(s.workspace.onDidChangeTextDocument(()=>n())),e.subscriptions.push(s.window.onDidChangeTextEditorSelection(()=>n())),e.subscriptions.push(s.window.onDidChangeActiveTextEditor(()=>n())),e.subscriptions.push(s.window.onDidChangeTextEditorVisibleRanges(()=>n())),e.subscriptions.push(s.window.onDidChangeWindowState(t=>{t.focused?n():(h&&clearTimeout(h),o&&o.dispose())})),e.subscriptions.push(s.commands.registerCommand("screenSaver.test",()=>{M(e)})),n()}function J(){o&&o.dispose(),h&&clearTimeout(h)}0&&(module.exports={activate,deactivate});
