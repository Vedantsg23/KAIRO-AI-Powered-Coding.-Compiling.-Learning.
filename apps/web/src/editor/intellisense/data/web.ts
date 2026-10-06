import { spec } from "../spec";

// JavaScript and TypeScript get full IntelliSense from Monaco's TypeScript
// language service (types, members, signatures, "did you mean"...). These
// specs add KAIRO's snippets on top and give the Typo Guard the keywords.

const JS_KEYWORDS = `await break case catch class const continue debugger default delete do else export extends false
  finally for function if import in instanceof let new null of return static super switch this throw true try
  typeof undefined var void while with yield async`;

const JS_SNIPPETS = `
@log | console.log | Print a value
console.log(\${1:value});$0
@for | for loop
for (let \${1:i} = 0; \${1:i} < \${2:n}; \${1:i}++) {
\t$0
}
@forof | for...of loop | Visit every element
for (const \${1:item} of \${2:items}) {
\t$0
}
@forin | for...in loop | Visit every key
for (const \${1:key} in \${2:object}) {
\t$0
}
@while | while loop
while (\${1:condition}) {
\t$0
}
@if | if statement
if (\${1:condition}) {
\t$0
}
@ife | if / else
if (\${1:condition}) {
\t$2
} else {
\t$0
}
@fn | function
function \${1:name}(\${2:x}) {
\t$0
\treturn \${2:x};
}
@af | arrow function
const \${1:name} = (\${2:x}) => {
\t$0
};
@class | class
class \${1:Name} {
\tconstructor(\${2:value}) {
\t\tthis.\${2:value} = \${2:value};
\t}
\t$0
}
@try | try / catch
try {
\t$1
} catch (\${2:error}) {
\t$0
}
@readall | read all input (Node.js)
const input = require("fs").readFileSync(0, "utf8").trim().split("\\n");
$0
@readline | read lines with readline (Node.js)
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on("line", (line) => lines.push(line));
rl.on("close", () => {
\t$0
});
@map | array map
\${1:items}.map((\${2:x}) => \${3:x * 2})$0
@filter | array filter
\${1:items}.filter((\${2:x}) => \${3:x > 0})$0
@reduce | array reduce
\${1:items}.reduce((\${2:sum}, \${3:x}) => \${2:sum} + \${3:x}, 0)$0
@timeout | setTimeout
setTimeout(() => {
\t$0
}, \${1:1000});
@promise | async function
async function \${1:main}() {
\t$0
}

\${1:main}();
`;

export const JAVASCRIPT = spec({
  id: "javascript",
  keywords: JS_KEYWORDS,
  types: `Array Object String Number Boolean Map Set Promise Date Math JSON RegExp Error BigInt Symbol`,
  known: `console require module exports process Buffer __dirname __filename globalThis window document`,
  snippets: JS_SNIPPETS,
});

export const TYPESCRIPT = spec({
  id: "typescript",
  keywords: `${JS_KEYWORDS} abstract as asserts any boolean declare enum implements infer interface is keyof
    namespace never number object private protected public readonly string symbol type unknown`,
  types: `Array Object String Number Boolean Map Set Promise Date Math JSON RegExp Error Record Partial Readonly
    Pick Omit`,
  known: `console require module exports process Buffer`,
  snippets: `
@interface | interface
interface \${1:Name} {
\t\${2:id}: \${3:number};
\t$0
}
@type | type alias
type \${1:Name} = \${2:string | number};$0
@fnt | typed function
function \${1:name}(\${2:x}: \${3:number}): \${4:number} {
\t$0
\treturn \${2:x};
}
${JS_SNIPPETS}`,
});

export const REACT = spec({
  id: "react",
  keywords: JS_KEYWORDS,
  types: `React`,
  known: `React useState useEffect useMemo useRef useCallback useContext useReducer props children console`,
  snippets: `
@rfc | React component | A function component
function \${1:Card}({ \${2:title} }) {
\treturn (
\t\t<div className="\${3:card}">
\t\t\t<h2>{\${2:title}}</h2>
\t\t\t$0
\t\t</div>
\t);
}
@app | App component with state
export default function App() {
\tconst [\${1:count}, \${2:setCount}] = useState(0);
\treturn (
\t\t<main>
\t\t\t<h1>{\${1:count}}</h1>
\t\t\t<button onClick={() => \${2:setCount}(\${1:count} + 1)}>Add one</button>
\t\t\t$0
\t\t</main>
\t);
}
@us | useState
const [\${1:value}, \${2:setValue}] = useState(\${3:0});$0
@ue | useEffect
useEffect(() => {
\t$0
}, [\${1}]);
@list | render a list
{\${1:items}.map((\${2:item}) => (
\t<li key={\${2:item}.id}>{\${2:item}.\${3:name}}</li>
))}$0
@onclick | button with onClick
<button onClick={() => \${1:handle}()}>\${2:Click}</button>$0
${JS_SNIPPETS}`,
});

export const HTML = spec({
  id: "html",
  keywords: ``,
  snippets: `
@html5 | HTML page | A complete HTML5 page
<!doctype html>
<html lang="en">
<head>
\t<meta charset="utf-8">
\t<meta name="viewport" content="width=device-width, initial-scale=1">
\t<title>\${1:My page}</title>
\t<style>
\t\tbody { font-family: system-ui, sans-serif; margin: 2rem; }
\t</style>
</head>
<body>
\t$0
\t<script>
\t</script>
</body>
</html>
@btn | button with a click handler
<button onclick="\${1:greet}()">\${2:Click me}</button>$0
@form | form
<form id="\${1:form}">
\t<label>\${2:Name} <input name="\${3:name}" required></label>
\t<button type="submit">Send</button>
</form>$0
@table | table
<table>
\t<thead><tr><th>\${1:Name}</th><th>\${2:Marks}</th></tr></thead>
\t<tbody>
\t\t<tr><td>$3</td><td>$4</td></tr>
\t</tbody>
</table>$0
@ul | list
<ul>
\t<li>\${1:item}</li>
</ul>$0
@img | image
<img src="\${1:https://picsum.photos/300}" alt="\${2:description}">$0
@script | script tag
<script>
\t$0
</script>
@style | style tag
<style>
\t$0
</style>
  `,
});

export const CSS = spec({
  id: "css",
  keywords: ``,
  snippets: `
@flex | flex row
display: flex;
align-items: \${1:center};
gap: \${2:1rem};$0
@grid | grid
display: grid;
grid-template-columns: repeat(\${1:3}, 1fr);
gap: \${2:1rem};$0
@center | center anything
display: grid;
place-items: center;$0
@media | media query
@media (max-width: \${1:600px}) {
\t$0
}
@keyframes | animation
@keyframes \${1:fade} {
\tfrom { opacity: 0; }
\tto { opacity: 1; }
}$0
@var | CSS variable
--\${1:brand}: \${2:#22c55e};$0
  `,
});
