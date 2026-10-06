/**
 * Concept detection: which programming concept the code at the cursor is
 * about ("C++ -> Functions -> Function calls -> Arguments"), and which
 * concepts a file uses. Read from the same Tree-sitter syntax tree as the
 * live check, in the worker, so it costs the editor nothing.
 *
 * The concept names are fixed, human-written labels keyed by syntax node
 * type; nothing here is AI output.
 */

/** The subset of web-tree-sitter's Node API this module needs (keeps it testable). */
export interface ConceptNode {
  type: string;
  text: string;
  parent: ConceptNode | null;
  childCount: number;
  child(index: number): ConceptNode | null;
  childForFieldName(name: string): ConceptNode | null;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  descendantForPosition(start: { row: number; column: number }, end?: { row: number; column: number }): ConceptNode | null;
}

export interface ConceptInfo {
  /** From broad to specific, without the language: ["Functions", "Function calls", "Arguments"]. */
  path: string[];
  /** The enclosing function or class, e.g. "main()" or "class Main". */
  scope: string | null;
  /** The concept areas this file uses, in order of first appearance (at most 8). */
  inFile: string[];
}

const P = (...path: string[]) => path;

/** Node type -> concept path. Shared by every grammar (they reuse many names). */
const CONCEPTS: Record<string, string[]> = {
  // functions
  function_definition: P("Functions", "Function definition"),
  function_declaration: P("Functions", "Function definition"),
  function_item: P("Functions", "Function definition"),
  method_declaration: P("Functions", "Methods"),
  method_definition: P("Functions", "Methods"),
  method: P("Functions", "Methods"),
  constructor_declaration: P("Object-oriented", "Constructors"),
  arrow_function: P("Functions", "Arrow functions"),
  lambda: P("Functions", "Lambdas"),
  lambda_expression: P("Functions", "Lambdas"),
  closure_expression: P("Functions", "Closures"),
  call_expression: P("Functions", "Function calls"),
  call: P("Functions", "Function calls"),
  function_call: P("Functions", "Function calls"),
  function_call_expression: P("Functions", "Function calls"),
  method_invocation: P("Functions", "Method calls"),
  invocation_expression: P("Functions", "Method calls"),
  macro_invocation: P("Functions", "Macros"),
  parameter_list: P("Functions", "Parameters"),
  parameters: P("Functions", "Parameters"),
  formal_parameters: P("Functions", "Parameters"),
  function_value_parameters: P("Functions", "Parameters"),
  method_parameters: P("Functions", "Parameters"),
  return_statement: P("Functions", "Return values"),
  return_expression: P("Functions", "Return values"),
  // control flow
  if_statement: P("Control flow", "Conditionals", "if / else"),
  if_expression: P("Control flow", "Conditionals", "if / else"),
  if: P("Control flow", "Conditionals", "if / else"),
  unless: P("Control flow", "Conditionals", "unless"),
  else_clause: P("Control flow", "Conditionals", "if / else"),
  elif_clause: P("Control flow", "Conditionals", "if / elif / else"),
  switch_statement: P("Control flow", "Conditionals", "switch"),
  switch_expression: P("Control flow", "Conditionals", "switch"),
  case_statement: P("Control flow", "Conditionals", "switch"),
  match_expression: P("Control flow", "Conditionals", "match"),
  match_statement: P("Control flow", "Conditionals", "match"),
  when_expression: P("Control flow", "Conditionals", "when"),
  conditional_expression: P("Control flow", "Conditionals", "Ternary expression"),
  ternary_expression: P("Control flow", "Conditionals", "Ternary expression"),
  for_statement: P("Control flow", "Loops", "for loop"),
  for_range_loop: P("Control flow", "Loops", "Range-based for"),
  enhanced_for_statement: P("Control flow", "Loops", "for-each loop"),
  for_in_statement: P("Control flow", "Loops", "for-in loop"),
  foreach_statement: P("Control flow", "Loops", "foreach loop"),
  for_expression: P("Control flow", "Loops", "for loop"),
  for: P("Control flow", "Loops", "for loop"),
  while_statement: P("Control flow", "Loops", "while loop"),
  while_expression: P("Control flow", "Loops", "while loop"),
  while: P("Control flow", "Loops", "while loop"),
  until: P("Control flow", "Loops", "until loop"),
  do_statement: P("Control flow", "Loops", "do-while loop"),
  loop_expression: P("Control flow", "Loops", "loop"),
  repeat_statement: P("Control flow", "Loops", "repeat-until loop"),
  break_statement: P("Control flow", "Loops", "break"),
  continue_statement: P("Control flow", "Loops", "continue"),
  try_statement: P("Error handling", "Exceptions", "try"),
  catch_clause: P("Error handling", "Exceptions", "catch"),
  except_clause: P("Error handling", "Exceptions", "except"),
  throw_statement: P("Error handling", "Exceptions", "throw"),
  raise_statement: P("Error handling", "Exceptions", "raise"),
  with_statement: P("Error handling", "Resources", "with"),
  // variables
  declaration: P("Variables", "Declaration"),
  local_variable_declaration: P("Variables", "Declaration"),
  local_declaration_statement: P("Variables", "Declaration"),
  variable_declaration: P("Variables", "Declaration"),
  lexical_declaration: P("Variables", "Declaration"),
  let_declaration: P("Variables", "Declaration"),
  short_var_declaration: P("Variables", "Declaration"),
  var_declaration: P("Variables", "Declaration"),
  property_declaration: P("Variables", "Declaration"),
  field_declaration: P("Object-oriented", "Fields"),
  init_declarator: P("Variables", "Initialisation"),
  variable_declarator: P("Variables", "Initialisation"),
  assignment: P("Variables", "Assignment"),
  assignment_expression: P("Variables", "Assignment"),
  assignment_statement: P("Variables", "Assignment"),
  augmented_assignment: P("Variables", "Compound assignment"),
  augmented_assignment_expression: P("Variables", "Compound assignment"),
  operator_assignment: P("Variables", "Compound assignment"),
  variable_assignment: P("Variables", "Assignment"),
  update_expression: P("Expressions", "Increment and decrement"),
  inc_statement: P("Expressions", "Increment and decrement"),
  // expressions
  binary_expression: P("Expressions", "Operators"),
  binary_operator: P("Expressions", "Operators"),
  binary: P("Expressions", "Operators"),
  comparison_operator: P("Expressions", "Comparison"),
  boolean_operator: P("Expressions", "Logical operators"),
  unary_expression: P("Expressions", "Operators"),
  cast_expression: P("Data types", "Type casting"),
  sizeof_expression: P("Memory", "sizeof"),
  // data
  string_literal: P("Data types", "Strings"),
  string: P("Data types", "Strings"),
  interpreted_string_literal: P("Data types", "Strings"),
  raw_string_literal: P("Data types", "Strings"),
  template_string: P("Data types", "Strings", "Template strings"),
  encapsed_string: P("Data types", "Strings"),
  interpolated_string_expression: P("Data types", "Strings", "Interpolation"),
  char_literal: P("Data types", "Characters"),
  array: P("Data structures", "Arrays and lists"),
  list: P("Data structures", "Arrays and lists"),
  array_declarator: P("Data structures", "Arrays"),
  array_initializer: P("Data structures", "Arrays"),
  array_creation_expression: P("Data structures", "Arrays"),
  initializer_list: P("Data structures", "Arrays", "Initializer lists"),
  composite_literal: P("Data structures", "Composite literals"),
  list_comprehension: P("Data structures", "List comprehensions"),
  subscript_expression: P("Data structures", "Indexing"),
  subscript: P("Data structures", "Indexing"),
  array_access: P("Data structures", "Indexing"),
  index_expression: P("Data structures", "Indexing"),
  element_reference: P("Data structures", "Indexing"),
  element_access_expression: P("Data structures", "Indexing"),
  dictionary: P("Data structures", "Dictionaries"),
  hash: P("Data structures", "Hashes"),
  table_constructor: P("Data structures", "Tables"),
  object: P("Data structures", "Objects"),
  // memory
  pointer_declarator: P("Memory", "Pointers"),
  pointer_expression: P("Memory", "Pointers"),
  reference_expression: P("Memory", "References and borrowing"),
  // types and objects
  struct_specifier: P("Data structures", "Structures"),
  struct_item: P("Data structures", "Structures"),
  class_specifier: P("Object-oriented", "Classes"),
  class_declaration: P("Object-oriented", "Classes"),
  class_definition: P("Object-oriented", "Classes"),
  class: P("Object-oriented", "Classes"),
  interface_declaration: P("Object-oriented", "Interfaces"),
  impl_item: P("Object-oriented", "Implementations"),
  trait_item: P("Object-oriented", "Traits"),
  object_creation_expression: P("Object-oriented", "Creating objects"),
  new_expression: P("Object-oriented", "Creating objects"),
  field_expression: P("Object-oriented", "Members"),
  member_expression: P("Object-oriented", "Members"),
  field_access: P("Object-oriented", "Members"),
  member_access_expression: P("Object-oriented", "Members"),
  selector_expression: P("Object-oriented", "Members"),
  navigation_expression: P("Object-oriented", "Members"),
  attribute: P("Object-oriented", "Attributes"),
  dot_index_expression: P("Data structures", "Tables", "Fields"),
  // program structure
  preproc_include: P("Program structure", "Headers (#include)"),
  import_statement: P("Program structure", "Imports"),
  import_from_statement: P("Program structure", "Imports"),
  import_declaration: P("Program structure", "Imports"),
  using_directive: P("Program structure", "Imports (using)"),
  use_declaration: P("Program structure", "Imports (use)"),
  package_clause: P("Program structure", "Packages"),
  package_declaration: P("Program structure", "Packages"),
  namespace_definition: P("Program structure", "Namespaces"),
  template_declaration: P("Generics", "Templates"),
  comment: P("Program structure", "Comments"),
  line_comment: P("Program structure", "Comments"),
  block_comment: P("Program structure", "Comments"),
  echo_statement: P("Input & output", "Output (echo)"),
  command: P("Commands", "Running a command"),
  test_command: P("Control flow", "Conditions", "test [ ]"),
};

/** Calls that are input or output, per language. */
const IO_CALLS: Record<string, string> = {
  printf: "Formatted output (printf)",
  puts: "Output (puts)",
  putchar: "Output (putchar)",
  scanf: "Reading input (scanf)",
  getchar: "Reading input (getchar)",
  fgets: "Reading input (fgets)",
  gets: "Reading input (gets)",
  print: "Output (print)",
  println: "Output (println)",
  input: "Reading input (input)",
  "System.out.println": "Output (System.out.println)",
  "System.out.print": "Output (System.out.print)",
  "System.out.printf": "Formatted output (printf)",
  "console.log": "Output (console.log)",
  "fmt.Println": "Output (fmt.Println)",
  "fmt.Printf": "Formatted output (fmt.Printf)",
  "fmt.Scan": "Reading input (fmt.Scan)",
  "Console.WriteLine": "Output (Console.WriteLine)",
  "Console.ReadLine": "Reading input (Console.ReadLine)",
  readLine: "Reading input (readLine)",
  "io.read": "Reading input (io.read)",
  "io.write": "Output (io.write)",
  echo: "Output (echo)",
  read: "Reading input (read)",
};

/** Literals: the concept only when they are not an argument of a call (then the call is the concept). */
const LITERAL_TYPES = new Set(["string_literal", "string", "interpreted_string_literal", "raw_string_literal", "template_string", "encapsed_string", "char_literal"]);

const CALL_TYPES = new Set(["call_expression", "call", "function_call", "function_call_expression", "method_invocation", "invocation_expression", "macro_invocation", "command"]);
const ARGUMENT_TYPES = new Set(["argument_list", "arguments", "value_arguments"]);
const SCOPE_TYPES = new Set([
  "function_definition",
  "function_declaration",
  "function_item",
  "method_declaration",
  "method_definition",
  "method",
  "constructor_declaration",
  "class_declaration",
  "class_definition",
  "class_specifier",
  "class",
  "struct_specifier",
  "struct_item",
  "impl_item",
]);

/** The name a call is made to: "printf", "System.out.println", "fmt.Println", "std::cout"... */
function calleeName(call: ConceptNode): string {
  if (call.type === "command") return call.childForFieldName("name")?.text ?? "";
  const target =
    call.childForFieldName("function") ??
    call.childForFieldName("name") ??
    call.childForFieldName("macro") ??
    call.child(0);
  if (!target) return "";
  let name = target.text.replace(/\s+/g, "");
  if (call.type === "method_invocation") {
    const object = call.childForFieldName("object")?.text.replace(/\s+/g, "");
    if (object) name = `${object}.${name}`;
  }
  return name.replace(/!$/, "").slice(0, 60);
}

/** C++ streams: std::cout << x and std::cin >> x. */
function streamConcept(node: ConceptNode): string[] | null {
  if (node.type !== "binary_expression") return null;
  let left: ConceptNode | null = node;
  while (left && left.type === "binary_expression") left = left.childForFieldName("left");
  const name = left?.text.replace(/\s+/g, "") ?? "";
  if (/^(?:std::)?cout$|^(?:std::)?cerr$/.test(name)) return P("Input & output", "Output streams (std::cout)");
  if (/^(?:std::)?cin$/.test(name)) return P("Input & output", "Input streams (std::cin)");
  return null;
}

function callConcept(call: ConceptNode): string[] {
  const name = calleeName(call);
  const short = name.split(/::|\./).pop() ?? name;
  const io = IO_CALLS[name] ?? (name.includes(".") ? undefined : IO_CALLS[short]);
  if (io) return P("Input & output", io);
  if (name === "range") return P("Control flow", "Loops", "range()");
  return CONCEPTS[call.type] ?? P("Functions", "Function calls");
}

function conceptOf(node: ConceptNode): string[] | null {
  const stream = streamConcept(node);
  if (stream) return stream;
  if (CALL_TYPES.has(node.type)) return node.type === "command" && !IO_CALLS[calleeName(node)] ? CONCEPTS.command : callConcept(node);
  if (ARGUMENT_TYPES.has(node.type) && node.parent && CALL_TYPES.has(node.parent.type)) return [...callConcept(node.parent), "Arguments"];
  return CONCEPTS[node.type] ?? null;
}

/** "main()", "class Main": the function or class around a node. */
function scopeName(node: ConceptNode | null): string | null {
  for (let current = node; current; current = current.parent) {
    if (!SCOPE_TYPES.has(current.type)) continue;
    let name = current.childForFieldName("name");
    // C and C++ keep a function's name inside its declarator.
    let declarator = current.childForFieldName("declarator");
    while (!name && declarator) {
      if (/identifier$/.test(declarator.type) || declarator.type === "qualified_identifier") name = declarator;
      else declarator = declarator.childForFieldName("declarator");
    }
    if (!name) continue;
    const isClass = /class|struct|impl/.test(current.type);
    return isClass ? `${current.type.startsWith("struct") ? "struct" : "class"} ${name.text}` : `${name.text}()`;
  }
  return null;
}

/** The concept at a position (0-based row and UTF-16 column). */
export function conceptAt(root: ConceptNode, row: number, column: number): Omit<ConceptInfo, "inFile"> {
  const node = root.descendantForPosition({ row, column });
  for (let current = node; current; current = current.parent) {
    if (LITERAL_TYPES.has(current.type) && current.parent && ARGUMENT_TYPES.has(current.parent.type)) continue;
    const concept = conceptOf(current);
    if (concept) return { path: concept, scope: scopeName(current) };
  }
  return { path: P("Program structure"), scope: null };
}

/** Concept areas used in a file, in order of first appearance. */
export function conceptsInFile(root: ConceptNode, limit = 8, maxNodes = 30_000): string[] {
  const found: string[] = [];
  const stack: ConceptNode[] = [root];
  let seen = 0;
  while (stack.length && seen < maxNodes && found.length < limit) {
    const node = stack.pop()!;
    seen++;
    const concept = conceptOf(node);
    const area = concept?.[0];
    if (area && area !== "Program structure" && !found.includes(area)) found.push(area);
    for (let i = node.childCount - 1; i >= 0; i--) {
      const child = node.child(i);
      if (child) stack.push(child);
    }
  }
  return found;
}
