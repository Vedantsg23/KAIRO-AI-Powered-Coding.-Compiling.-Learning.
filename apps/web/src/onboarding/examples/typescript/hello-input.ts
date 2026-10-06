import * as fs from "fs";

const name: string = fs.readFileSync(0, "utf8").trim();
console.log(name ? `Hello, ${name}!` : "No name given (type one in the Input tab).");
