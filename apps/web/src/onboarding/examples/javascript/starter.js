// Welcome to JavaScript (Node.js)! Press Run (Ctrl+Enter) to run this program.
// Then break something on purpose, or open Examples to see how errors are explained.

const scores = [72, 88, 95, 64, 81];
const total = scores.reduce((sum, score) => sum + score, 0);

console.log(`Total: ${total}`);
console.log(`Average: ${(total / scores.length).toFixed(1)}`);
