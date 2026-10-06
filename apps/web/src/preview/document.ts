/**
 * The page shown in the preview frame for HTML, CSS and React code.
 *
 * The frame is sandboxed with scripts allowed but without same-origin access
 * (see PreviewPanel), so the student's code cannot reach KAIRO's page, its
 * storage or its session. A small script at the top of every document sends
 * console messages and uncaught errors to the panel with postMessage.
 *
 * Line numbers: the capture script is inserted on the first line (after the
 * doctype, without a newline), so errors in an HTML page keep the student's
 * line numbers. For React, `codeLine` is the document line where the
 * compiled code starts; Sucrase keeps the student's line numbers.
 */

/** Sent from the frame to the panel. */
export interface PreviewMessage {
  __kairo: "preview";
  token: string;
  kind: "console" | "error" | "ready";
  level?: "log" | "info" | "warn" | "error" | "debug";
  text?: string;
  /** For errors: a line in the preview document, when the browser gives one. */
  line?: number;
  /** For errors: the stack trace text, to find the student's line in it. */
  stack?: string;
}

export interface PreviewDocument {
  html: string;
  /** Document line of the student's line 1 (null when the student's lines cannot be mapped). */
  codeLine: number | null;
}

/** A page for the CSS language: the student's CSS styles this markup. */
export const CSS_SAMPLE_PAGE = `<header class="site-header">
  <h1>KAIRO Cafe</h1>
  <nav><a href="#menu">Menu</a> <a href="#about">About</a> <a href="#contact">Contact</a></nav>
</header>
<main>
  <section class="hero">
    <h2>Fresh code, served hot</h2>
    <p>Pick a drink, then style this page with your CSS on the left.</p>
    <button class="btn">Order now</button>
    <button class="btn btn-outline">See the menu</button>
  </section>
  <section class="cards" id="menu">
    <article class="card"><h3>Espresso</h3><p>Short, strong and quick to compile.</p><span class="price">₹120</span></article>
    <article class="card"><h3>Cappuccino</h3><p>Foamy, with a hint of recursion.</p><span class="price">₹160</span></article>
    <article class="card"><h3>Cold brew</h3><p>Steeped for 12 hours, like a long build.</p><span class="price">₹180</span></article>
  </section>
  <form class="signup" id="contact" onsubmit="return false">
    <label for="email">Email</label>
    <input id="email" type="email" placeholder="you@example.com">
    <button class="btn" type="submit">Sign up</button>
  </form>
  <table class="menu-table">
    <thead><tr><th>Item</th><th>Size</th><th>Price</th></tr></thead>
    <tbody>
      <tr><td>Espresso</td><td>Small</td><td>₹120</td></tr>
      <tr><td>Cappuccino</td><td>Medium</td><td>₹160</td></tr>
      <tr><td>Cold brew</td><td>Large</td><td>₹180</td></tr>
    </tbody>
  </table>
</main>
<footer id="about">Made in the KAIRO CSS playground</footer>`;

/** The capture script, one line (no newlines), for the given run token. */
export function captureScript(token: string): string {
  const t = JSON.stringify(token);
  return (
    `<script>(function(){var T=${t};` +
    `function post(m){m.__kairo="preview";m.token=T;try{parent.postMessage(m,"*")}catch(e){}}` +
    `function fmt(v){if(typeof v==="string")return v;if(v instanceof Error)return v.name+": "+v.message;` +
    `try{var s=JSON.stringify(v);return s===undefined?String(v):s}catch(e){return String(v)}}` +
    `["log","info","warn","error","debug"].forEach(function(l){var o=console[l];console[l]=function(){` +
    `post({kind:"console",level:l,text:Array.prototype.map.call(arguments,fmt).join(" ")});if(o)o.apply(console,arguments)}});` +
    `window.addEventListener("error",function(e){post({kind:"error",text:e.message||"Script error",line:e.lineno||undefined,` +
    `stack:e.error&&e.error.stack?String(e.error.stack):undefined})});` +
    `window.addEventListener("unhandledrejection",function(e){var r=e.reason;post({kind:"error",` +
    `text:"Unhandled promise rejection: "+(r&&r.message?r.message:String(r)),stack:r&&r.stack?String(r.stack):undefined})});` +
    `window.addEventListener("load",function(){post({kind:"ready"})});` +
    `})();</script>`
  );
}

const BASE_STYLE =
  "<style>html{color-scheme:light}body{margin:0;padding:16px;font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#111;background:#fff}</style>";

/** HTML: the student's page, with the capture script after the doctype. */
export function htmlDocument(source: string, token: string): PreviewDocument {
  const capture = captureScript(token);
  const doctype = /^\s*<!doctype[^>]*>/i.exec(source);
  if (doctype) {
    return { html: source.slice(0, doctype[0].length) + capture + source.slice(doctype[0].length), codeLine: 1 };
  }
  // A fragment: the browser builds the html/head/body around it.
  return { html: capture + source, codeLine: 1 };
}

/** CSS: the sample page styled by the student's CSS. */
export function cssDocument(source: string, token: string): PreviewDocument {
  // "</style" inside the CSS would end the style element early.
  const css = source.replace(/<\/style/gi, "<\\/style");
  return {
    html: `<!doctype html>${captureScript(token)}<html><head><meta charset="utf-8">${BASE_STYLE}<style>\n${css}\n</style></head><body>${CSS_SAMPLE_PAGE}</body></html>`,
    codeLine: null,
  };
}

/**
 * React: React 18 and ReactDOM (UMD builds, as globals), a small `require`
 * for the imports the student may write, then the compiled code. When the
 * code does not render anything itself, its default export is rendered into
 * #root.
 */
export function reactDocument(compiled: string, token: string, react: string, reactDom: string): PreviewDocument {
  const safe = (js: string) => js.replace(/<\/script/gi, "<\\/script");
  const head =
    `<!doctype html>${captureScript(token)}<html><head><meta charset="utf-8">${BASE_STYLE}</head><body><div id="root"></div>\n` +
    `<script>${safe(react)}</script>\n` +
    `<script>${safe(reactDom)}</script>\n` +
    `<script>(function(){var module={exports:{}},exports=module.exports;` +
    `function require(n){if(n==="react")return React;if(n==="react-dom"||n==="react-dom/client")return ReactDOM;` +
    `throw new Error("Cannot import '"+n+"' here: the preview has React and ReactDOM only.")}` +
    // Remember whether the code renders by itself (then its default export is not rendered again).
    `["createRoot","render","hydrateRoot"].forEach(function(f){var o=ReactDOM[f];if(o)ReactDOM[f]=function(){window.__kairoRendered=true;return o.apply(this,arguments)}});\n`;
  const tail =
    `\n;var root=document.getElementById("root");var App=module.exports&&(module.exports.default||module.exports.App);` +
    `if(typeof App==="function"&&!root.hasChildNodes()&&!window.__kairoRendered){ReactDOM.createRoot(root).render(React.createElement(App))}` +
    `})();</script></body></html>`;
  const codeLine = head.split("\n").length;
  return { html: head + safe(compiled) + tail, codeLine };
}

/**
 * The student's line for an error: the first stack frame inside their code,
 * else the error's own line, mapped with `codeLine`. Null when unknown.
 */
export function studentLine(message: Pick<PreviewMessage, "line" | "stack">, doc: PreviewDocument, codeLines: number): number | null {
  if (doc.codeLine == null) return null;
  const inCode = (documentLine: number) => {
    const line = documentLine - doc.codeLine! + 1;
    return line >= 1 && line <= codeLines ? line : null;
  };
  if (message.stack) {
    for (const m of message.stack.matchAll(/about:srcdoc:(\d+):\d+/g)) {
      const line = inCode(Number(m[1]));
      if (line) return line;
    }
  }
  return message.line ? inCode(message.line) : null;
}
