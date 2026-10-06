import { readFileSync } from "fs";

const name: string = readFileSync(0, "utf8").trim();
console.log(`Hello, ${name}!`);
