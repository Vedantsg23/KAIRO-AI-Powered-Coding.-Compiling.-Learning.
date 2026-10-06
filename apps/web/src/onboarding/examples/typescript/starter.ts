// Welcome to TypeScript! Press Run (Ctrl+Enter): tsc checks the types, then Node runs the program.

interface Student {
  name: string;
  score: number;
}

const students: Student[] = [
  { name: "Asha", score: 88 },
  { name: "Ravi", score: 72 },
  { name: "Meera", score: 95 },
];

const best = students.reduce((a, b) => (b.score > a.score ? b : a));
const average = students.reduce((sum, s) => sum + s.score, 0) / students.length;

console.log(`Best: ${best.name} (${best.score})`);
console.log(`Average: ${average.toFixed(1)}`);
