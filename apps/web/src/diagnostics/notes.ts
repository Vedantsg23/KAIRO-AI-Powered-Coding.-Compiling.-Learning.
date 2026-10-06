import type { Category } from "../api/types";

/**
 * Short, plain-language notes keyed by diagnostic code.
 *
 * These are fixed reference texts written for beginners, NOT AI output; the
 * UI labels them "Quick note". Explanations for the student's own code come
 * from Saarthi and are always marked as AI.
 *
 * Lookup order: the exact code (C and the shared RUNTIME_/LIMIT_ codes),
 * then a language-neutral note chosen by the code's ending (every language
 * uses the same endings, e.g. PY_NAME_ERROR and JS_NOT_DEFINED are both
 * "name not defined"), then a note for the category.
 */
export interface Note {
  title: string;
  meaning: string;
  tip: string;
  concept: string;
}

export const NOTES: Record<string, Note> = {
  C_MISSING_SEMICOLON: {
    title: "Missing semicolon",
    meaning:
      "Most C statements end with ';'. When one is missing, the compiler only notices at the next token, so the error often points at the line after the real mistake.",
    tip: "Add ';' at the end of the statement before the highlighted token, usually the end of the previous line.",
    concept: "Statements and semicolons",
  },
  C_UNDECLARED_IDENTIFIER: {
    title: "Name not declared",
    meaning:
      "You used a name the compiler has not seen declared in this part of the program. Common causes are a typo, using a variable before declaring it, or declaring it inside a different { } block.",
    tip: "Check the spelling (GCC often suggests the name you meant) or declare the variable before its first use.",
    concept: "Variables and scope",
  },
  C_IMPLICIT_FUNCTION_DECLARATION: {
    title: "Function used without a declaration",
    meaning:
      "You called a function the compiler has not seen declared. For library functions such as printf or strlen this almost always means a missing #include.",
    tip: "Add the header the compiler suggests (for example #include <stdio.h> for printf) or declare your own function above main.",
    concept: "Headers and declarations",
  },
  C_UNKNOWN_TYPE_NAME: {
    title: "Unknown type",
    meaning: "The compiler does not recognise this type name. It may be misspelled, or it is defined in a header you did not include.",
    tip: "Check the spelling (int, char, double, ...) and include the header that defines it, e.g. <stdbool.h> for bool.",
    concept: "Data types",
  },
  C_REDEFINITION: {
    title: "Name defined twice",
    meaning: "The same name is declared or defined more than once in the same scope.",
    tip: "Rename one of them, or remove the duplicate definition.",
    concept: "Variables and scope",
  },
  C_MISSING_HEADER: {
    title: "Header file not found",
    meaning: "The file named in #include does not exist in the sandbox. It is often a typo in the header name.",
    tip: "Check the spelling: <stdio.h>, <stdlib.h>, <string.h>, <math.h> ...",
    concept: "Preprocessor and headers",
  },
  C_UNDEFINED_REFERENCE: {
    title: "Function declared but never defined",
    meaning:
      "The program compiled, but the linker could not find the body of a function you call. A declaration (prototype) tells the compiler a function exists; a definition provides its code.",
    tip: "Write the function's definition (with a body { ... }) or fix the spelling of its name.",
    concept: "Functions: declaration vs definition",
  },
  C_UNEXPECTED_END_OF_INPUT: {
    title: "The file ended too early",
    meaning: "The compiler reached the end of the file while a block was still open. Usually a closing brace } is missing.",
    tip: "Count your { and } braces; editors highlight matching pairs when you place the cursor next to one.",
    concept: "Blocks and braces",
  },
  C_EXPECTED_TOKEN: {
    title: "Something is missing here",
    meaning: "The compiler expected a different symbol at this point, e.g. a bracket, a parenthesis or an expression.",
    tip: "Look at the highlighted spot and the line before it for an unclosed ( or [, a missing operator, or a stray keyword.",
    concept: "Syntax",
  },
  C_STRAY_CHARACTER: {
    title: "Character that is not valid C",
    meaning: "The code contains a character C does not allow here. Code copied from documents often brings smart quotes or invisible characters.",
    tip: "Delete the character and retype it; use straight quotes \" and '.",
    concept: "Syntax",
  },
  C_UNTERMINATED_LITERAL: {
    title: "String or character not closed",
    meaning: "A string or character literal starts with a quote but never ends, so everything after it looks like part of the text.",
    tip: "Add the closing \" or ' on the same line.",
    concept: "Strings and characters",
  },
  C_WRONG_ARGUMENT_COUNT: {
    title: "Wrong number of arguments",
    meaning: "The call passes a different number of values than the function's parameter list expects.",
    tip: "Compare the call with the function's declaration (the note points to it) and pass one value per parameter.",
    concept: "Functions and parameters",
  },
  C_FORMAT_MISMATCH: {
    title: "printf/scanf format does not match",
    meaning: "A format specifier does not match the type of the value passed: %d expects an int, %f a double, %c a char, %s a string (char *).",
    tip: "Change the specifier or the argument so that they agree. With scanf, remember & before non-array variables.",
    concept: "Formatted input and output",
  },
  C_POINTER_INTEGER_CONVERSION: {
    title: "Pointer and integer mixed up",
    meaning: "A pointer is used where a number is expected, or the other way round. Assigning a string to an int is a common example.",
    tip: "Check the variable's type: text needs char * or a char array; numbers need int, double, ...",
    concept: "Pointers and data types",
  },
  C_TYPE_MISMATCH: {
    title: "Types do not fit together",
    meaning: "A value of one type is used where a different, incompatible type is required.",
    tip: "Check the types of both sides of the assignment or operation, and the types a function expects.",
    concept: "Data types",
  },
  C_RETURN_MISMATCH: {
    title: "Return value does not match the function",
    meaning: "A function returns a value although it is declared void, or returns nothing although it promises a value.",
    tip: "Make the return statements match the return type in the function's header.",
    concept: "Functions and return values",
  },
  C_MISSING_RETURN: {
    title: "A path ends without returning a value",
    meaning: "The function promises to return a value, but on some path it reaches the closing brace without a return.",
    tip: "Add a return statement for every possible path, including after if/else blocks.",
    concept: "Functions and return values",
  },
  C_UNINITIALIZED_VARIABLE: {
    title: "Variable used before it has a value",
    meaning: "The variable is read before anything was stored in it, so it holds whatever happened to be in memory.",
    tip: "Give the variable a starting value when you declare it, e.g. int total = 0;",
    concept: "Variables and initialisation",
  },
  C_ASSIGNMENT_IN_CONDITION: {
    title: "= used where == was probably meant",
    meaning: "x = 5 stores 5 in x; x == 5 compares. Inside an if or while condition, a single = is almost always a mistake.",
    tip: "Use == to compare. If you really meant to assign, wrap it in extra parentheses.",
    concept: "Operators: assignment vs comparison",
  },
  C_UNUSED: {
    title: "Declared but never used",
    meaning: "Something is declared but never used. It is harmless, but it often means a typo or unfinished code.",
    tip: "Remove it, or check whether you meant to use it somewhere.",
    concept: "Clean code",
  },
  C_ARRAY_BOUNDS: {
    title: "Array index out of range",
    meaning: "An index outside the array is used. An array of size n has valid indexes 0 to n-1.",
    tip: "Check loop bounds: for (i = 0; i < n; i++), not i <= n.",
    concept: "Arrays",
  },
  C_ASSERTION_FAILED: {
    title: "An assertion failed",
    meaning: "assert(condition) stops the program when the condition is false. The message shows the condition and the line of the assert.",
    tip: "Find out why the condition is false at that point: print the values involved just before the assert.",
    concept: "Debugging with assertions",
  },
  C_HEAP_CORRUPTION: {
    title: "Heap memory misused",
    meaning: "The C library detected misuse of malloc'd memory, such as freeing the same pointer twice or writing past the end of a block.",
    tip: "Free each pointer exactly once and set it to NULL afterwards; allocate enough bytes for what you store.",
    concept: "Dynamic memory (malloc/free)",
  },
  C_STACK_BUFFER_OVERFLOW: {
    title: "Wrote past the end of a local array",
    meaning: "The program wrote more data into a local array than it can hold, e.g. strcpy of a long string into a small buffer.",
    tip: "Make the buffer larger or use bounded functions such as snprintf and strncpy.",
    concept: "Arrays and strings",
  },
  RUNTIME_SEGMENTATION_FAULT: {
    title: "Segmentation fault",
    meaning:
      "The program touched memory it is not allowed to use. Typical causes: using a NULL or uninitialised pointer, an array index out of range, scanf without &, or recursion that never stops.",
    tip: "Check pointers before using them and array indexes against the array size. Print values before the crash to narrow it down.",
    concept: "Pointers and memory",
  },
  RUNTIME_ARITHMETIC_ERROR: {
    title: "Arithmetic error",
    meaning: "The processor refused a calculation, almost always an integer division or % by zero.",
    tip: "Check the divisor before dividing, especially when it comes from input.",
    concept: "Arithmetic and input validation",
  },
  RUNTIME_ABORTED: {
    title: "The program aborted itself",
    meaning: "abort() was called, directly or by the C library after it detected a serious problem.",
    tip: "Read the program's error output above; it usually says why.",
    concept: "Runtime errors",
  },
  RUNTIME_NONZERO_EXIT: {
    title: "Exited with an error status",
    meaning: "main returned (or exit was called with) a value other than 0. By convention 0 means success and anything else means failure.",
    tip: "If this is intended, ignore it; otherwise make main end with return 0;",
    concept: "Program exit status",
  },
  RUNTIME_KILLED: {
    title: "Forcibly stopped",
    meaning: "The sandbox stopped the program, usually because it exceeded a resource limit.",
    tip: "Look for loops or allocations that never end.",
    concept: "Resource limits",
  },
  LIMIT_TIMEOUT: {
    title: "Time limit reached",
    meaning: "The program ran longer than allowed. Usually a loop never ends, or the program waits for input that was never given.",
    tip: "Check that each loop's condition eventually becomes false, and put any input the program reads in the Input tab.",
    concept: "Loops and termination",
  },
  LIMIT_MEMORY: {
    title: "Memory limit reached",
    meaning: "The program (or the compiler) used more memory than the sandbox allows.",
    tip: "Look for allocations inside loops that are never freed, huge arrays, or recursion that never stops.",
    concept: "Memory usage",
  },
  LIMIT_OUTPUT: {
    title: "Too much output",
    meaning: "The program printed more than the output limit, usually a print inside a loop that never ends.",
    tip: "Check the loop around your printf calls.",
    concept: "Loops and termination",
  },
  LIMIT_FILE_SIZE: {
    title: "File too large",
    meaning: "The program tried to write a file bigger than the sandbox allows.",
    tip: "Write less data, or print the results instead.",
    concept: "Resource limits",
  },
  TOOLCHAIN_RESOURCE_LIMIT: {
    title: "The compiler hit a sandbox limit",
    meaning: "Compiling this file needed more memory or disk than allowed, e.g. because of a gigantic initialised array.",
    tip: "Reduce array sizes, or allocate large arrays with malloc at run time.",
    concept: "Resource limits",
  },
  UNPARSED: {
    title: "Output the platform could not interpret",
    meaning: "The toolchain printed something this adapter does not recognise yet. Nothing was thrown away: the raw text is in the Compiler log.",
    tip: "Read the raw output; if you see this often, the language adapter needs a new grammar rule.",
    concept: "About the platform",
  },
};

const CATEGORY_FALLBACK: Record<Category, Note> = {
  syntax: { title: "Syntax problem", meaning: "The code breaks the language's grammar rules.", tip: "Look at the highlighted spot and the line before it.", concept: "Syntax" },
  name: { title: "Name problem", meaning: "A name is unknown, misspelled or declared twice.", tip: "Check spelling and where the name is declared.", concept: "Variables and scope" },
  type: { title: "Type problem", meaning: "A value has a different type than the code expects.", tip: "Compare the types on both sides.", concept: "Data types" },
  build: { title: "Build problem", meaning: "Compiling or linking failed for a reason outside a single line.", tip: "Read the full message and the Compiler log.", concept: "How programs are built" },
  runtime: { title: "Runtime problem", meaning: "The program compiled but failed while running.", tip: "Print values before the failing point to narrow it down.", concept: "Runtime errors" },
  timeout: { title: "Time limit", meaning: "The program ran too long.", tip: "Look for loops that never end.", concept: "Loops and termination" },
  memory: { title: "Memory problem", meaning: "Invalid memory access or too much memory used.", tip: "Check pointers, array indexes and allocations.", concept: "Pointers and memory" },
  other: { title: "Worth a look", meaning: "The compiler noticed something that may be a mistake.", tip: "Read the message; warnings often point to real bugs.", concept: "Clean code" },
};

// Language-neutral notes, matched on the part of the code after the prefix.
const SHARED_NOTES: [RegExp, Note][] = [
  [/_(?:MISSING_SEMICOLON)$/, {
    title: "Missing semicolon",
    meaning: "The statement is not ended with ';'. The compiler often notices only at the next token, so the reported line can be the one after the real mistake.",
    tip: "Add ';' at the end of the statement just before the highlighted spot.",
    concept: "Statements and semicolons",
  }],
  [/_(?:MISSING_COLON|INDENTATION_ERROR|UNEXPECTED_INDENT|TAB_ERROR|MISMATCHED_INDENTATION)$/, {
    title: "Colon or indentation problem",
    meaning: "Blocks (after if, for, def, class...) start with ':' and their lines must be indented the same way.",
    tip: "Check the ':' at the end of the line that opens the block, and indent its body with the same number of spaces.",
    concept: "Blocks and indentation",
  }],
  [/_(?:SYNTAX_ERROR|EXPECTED_TOKEN|UNEXPECTED_END_OF_INPUT|UNEXPECTED_END_OF_FILE|UNBALANCED_BRACKETS|STRAY_CHARACTER|UNTERMINATED_LITERAL|UNTERMINATED_STRING|UNCLOSED_LITERAL|ILLEGAL_START|NOT_A_STATEMENT|PRINT_STATEMENT)$/, {
    title: "Syntax problem",
    meaning: "The code does not follow the language's grammar at this spot: a missing bracket, quote, keyword or punctuation mark.",
    tip: "Look at the highlighted spot and the line before it. Check that every (, [, { and quote is closed.",
    concept: "Syntax",
  }],
  [/_(?:UNDECLARED_IDENTIFIER|NAME_ERROR|NOT_DEFINED|UNDEFINED|UNDEFINED_VARIABLE|UNDEFINED_FUNCTION|NOT_FOUND|NAME_NOT_FOUND|NOT_IN_SCOPE|CANNOT_FIND_SYMBOL|CANNOT_FIND_NAME|UNRESOLVED_REFERENCE|REFERENCE_ERROR|UNBOUND_VARIABLE|UNBOUND_LOCAL)$/, {
    title: "Name not defined",
    meaning: "The program uses a name (variable, function, class) that does not exist at that point: usually a typo, or a name used before it is created or outside its block.",
    tip: "Check the spelling (the message may suggest the name you meant) and make sure the name is defined before it is used.",
    concept: "Variables and scope",
  }],
  [/_(?:TYPE_MISMATCH|INCOMPATIBLE_TYPES|TYPE_ERROR|BAD_OPERANDS|NO_MATCHING_OPERATOR|CLASS_CAST|RETURN_MISMATCH|IMPLICIT_ANY)$/, {
    title: "Type mismatch",
    meaning: "A value of one type is used where another type is needed, for example text where a number is expected.",
    tip: "Compare the types on both sides; convert explicitly (e.g. parse a number from text) where you really mean it.",
    concept: "Data types",
  }],
  [/_(?:WRONG_ARGUMENT_COUNT|WRONG_ARGUMENTS|ARGUMENT_MISMATCH|ARGUMENT_ERROR|NO_MATCHING_FUNCTION)$/, {
    title: "Wrong arguments",
    meaning: "A function was called with the wrong number or kind of values.",
    tip: "Compare the call with the function's definition: how many parameters does it take, and of which types?",
    concept: "Functions and parameters",
  }],
  [/_(?:INDEX_OUT_OF_BOUNDS|INDEX_OUT_OF_RANGE|INDEX_ERROR|ARRAY_BOUNDS|UNDEFINED_INDEX|RANGE_ERROR|KEY_ERROR)$/, {
    title: "Index out of range",
    meaning: "The program asked for an element that does not exist, e.g. item 5 of a list with 3 items. Indexes usually start at 0, so the last valid index is length - 1.",
    tip: "Check loop limits (< instead of <=) and print the index and the length just before the failing line.",
    concept: "Arrays, lists and indexes",
  }],
  [/_(?:DIVIDE_BY_ZERO|DIVISION_BY_ZERO|ZERO_DIVISION|ARITHMETIC_EXCEPTION)$/, {
    title: "Division by zero",
    meaning: "The program divided a number by zero, which has no result.",
    tip: "Check the divisor before dividing, e.g. if (count != 0).",
    concept: "Arithmetic",
  }],
  [/_(?:NULL_POINTER|NIL_POINTER|NULL_REFERENCE|NULL_SAFETY|POSSIBLY_NULL|POSSIBLE_NULL|NIL_UNWRAP|OPTIONAL_NOT_UNWRAPPED|CALL_NIL|INDEX_NIL|NIL_MAP|NO_METHOD_ERROR|UNWRAP_FAILED)$/, {
    title: "Missing value (null / nil / None)",
    meaning: "The program used something that holds no value: a variable that was never set, or a result that can be empty.",
    tip: "Find where the value should have been created and check for the empty case before using it.",
    concept: "Null values and optionals",
  }],
  [/_(?:STACK_OVERFLOW|RECURSION_ERROR)$/, {
    title: "Recursion too deep",
    meaning: "A function called itself (directly or indirectly) so many times that the call stack ran out, usually because the stopping case is never reached.",
    tip: "Check the base case of the recursive function and that each call moves closer to it.",
    concept: "Recursion and base cases",
  }],
  [/_(?:OUT_OF_MEMORY|MEMORY_ERROR|MEMORY_LIMIT)$/, {
    title: "Out of memory",
    meaning: "The program asked for more memory than it is allowed to use, often by growing a list or string forever.",
    tip: "Look for data structures that keep growing inside a loop, or a size computed from a wrong value.",
    concept: "Memory usage",
  }],
  [/_(?:THREAD_LIMIT)$/, {
    title: "Too many threads or processes",
    meaning: "The program kept starting threads or processes until the sandbox refused more.",
    tip: "Start a fixed number of workers, and wait for them to finish before starting new ones.",
    concept: "Processes and threads",
  }],
  [/_(?:UNUSED|UNUSED_VARIABLE|UNUSED_IMPORT|UNREACHABLE_CODE|UNASSIGNED_VARIABLE|UNINITIALIZED_VARIABLE)$/, {
    title: "Unused or uninitialised value",
    meaning: "Something is declared but never used, never given a value, or can never run. It is often a sign of a typo or leftover code.",
    tip: "Remove what you do not need, or check whether you meant to use this name somewhere else.",
    concept: "Clean code",
  }],
  [/_(?:UNCAUGHT_EXCEPTION|UNCAUGHT_ERROR|UNHANDLED_EXCEPTION|PANIC|TERMINATE|ASSERTION_ERROR|ASSERTION_FAILED|RUNTIME_CHECK_FAILED|VALUE_ERROR|NUMBER_FORMAT|INPUT_MISMATCH|EOF_ERROR|NO_MORE_INPUT)$/, {
    title: "The program stopped with an error",
    meaning: "While running, the program hit a situation it did not handle and stopped. For input errors: the program read something that was not there or not in the expected form.",
    tip: "Read the error's type and message, look at the reported line, and check the input in the Input tab.",
    concept: "Runtime errors and input",
  }],
];

export function noteFor(code: string, category: Category): Note {
  if (NOTES[code]) return NOTES[code];
  for (const [pattern, note] of SHARED_NOTES) if (pattern.test(code)) return note;
  return CATEGORY_FALLBACK[category];
}

/** How many quick notes KAIRO ships (shown by the boot sequence). */
export const NOTE_COUNT = Object.keys(NOTES).length + SHARED_NOTES.length + Object.keys(CATEGORY_FALLBACK).length;
