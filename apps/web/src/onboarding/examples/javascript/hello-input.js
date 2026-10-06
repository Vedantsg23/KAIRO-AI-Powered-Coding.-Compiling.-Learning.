const input = require("fs").readFileSync(0, "utf8");
const name = input.trim();

if (name === "") {
  console.log("No name given (type one in the Input tab).");
} else {
  console.log(`Hello, ${name}!`);
}
