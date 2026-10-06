import type { LiveTopic } from "./analyze";

/**
 * Why a live syntax problem matters and which concept it belongs to. Fixed
 * reference texts written by people (like the diagnostics' quick notes), not
 * AI output: the UI labels them as such.
 */
export interface TopicNote {
  title: string;
  why: string;
  /** Concept path without the language, e.g. ["Statements", "Statement termination"]. */
  concept: string[];
}

const TOPICS: Record<LiveTopic, TopicNote> = {
  semicolon: {
    title: "Missing semicolon",
    why: "Statements end with ';'. Without it, the compiler reads on into the next line as if it belonged to the same statement, which is why the error is often reported one line late.",
    concept: ["Statements", "Statement termination"],
  },
  colon: {
    title: "Missing ':'",
    why: "A line that starts a block (if, for, while, def, class...) must end with ':'. The indented lines below it are the block.",
    concept: ["Control flow", "Blocks", "Block headers"],
  },
  bracket: {
    title: "Unbalanced brackets",
    why: "Every '(', '[' and '{' needs its partner. Until it is closed, everything after it is read as being inside it, so later lines can be misread too.",
    concept: ["Syntax", "Brackets and nesting"],
  },
  comparison: {
    title: "Assignment in a condition",
    why: "'=' stores a value in a variable; '==' asks whether two values are equal. A condition asks a question, so it needs '=='.",
    concept: ["Operators", "Comparison vs assignment"],
  },
  elif: {
    title: "'else if' in Python",
    why: "Python spells 'else if' as one keyword, 'elif'. 'else if' on one line is not valid Python.",
    concept: ["Control flow", "Conditionals", "if / elif / else"],
  },
  indent: {
    title: "Indentation",
    why: "Python groups statements by indentation instead of braces: lines of one block start at the same column, and a block header needs at least one indented line below it.",
    concept: ["Syntax", "Indentation and blocks"],
  },
  block: {
    title: "Block keywords",
    why: "Here blocks are written with words: a condition is followed by 'then' or 'do', and the block is closed with 'end' (Ruby, Lua) or 'fi' / 'done' (Bash).",
    concept: ["Control flow", "Block keywords"],
  },
  incomplete: {
    title: "Incomplete expression",
    why: "An operator such as '+', '*' or '=' needs a value on each side. The line ends before the expression is finished.",
    concept: ["Expressions", "Operators and operands"],
  },
  print: {
    title: "print is a function",
    why: "In Python 3, print is a function, so what it prints goes inside parentheses: print(\"hi\").",
    concept: ["Functions", "Function calls"],
  },
  missing: {
    title: "Missing token",
    why: "The parser expected one more piece of syntax here to complete the construct.",
    concept: ["Syntax", "Grammar"],
  },
  syntax: {
    title: "Syntax error",
    why: "This code does not fit the language's grammar. Check the punctuation and keywords around the highlighted spot.",
    concept: ["Syntax", "Grammar"],
  },
  typo: {
    title: "Possible typo",
    why: "This name is not declared in your file and is not part of the language or its library, but it is one or two keystrokes away from a name that is. Compilers reject names they do not know, so a misspelt name is an error when you run.",
    concept: ["Names", "Identifiers and spelling"],
  },
  tip: {
    title: "Saarthi tip",
    why: "This code is valid, so the compiler may accept it, but it is a pattern that usually does not do what beginners expect. The message says what happens and how to write it instead.",
    concept: ["Good practice", "Common slips"],
  },
};

export function topicNote(topic: LiveTopic | undefined): TopicNote {
  return TOPICS[topic ?? "syntax"];
}

/** A short code for a live problem, e.g. LIVE_SEMICOLON. */
export function topicCode(topic: LiveTopic | undefined): string {
  return `LIVE_${(topic ?? "syntax").toUpperCase()}`;
}
