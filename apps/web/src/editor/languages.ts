/**
 * Syntax colouring for languages Monaco has no tokenizer for (NASM, Fortran,
 * Prolog, COBOL, Lex, Erlang, Haskell, Octave, Lisp, Ada, D, Nim, VHDL).
 * Each is a small Monarch tokenizer built from the language's keywords and
 * comment/string rules, plus brackets and auto-closing pairs.
 */
import type * as Monaco from "monaco-editor/editor/editor.api";

interface Simple {
  id: string;
  keywords: string;
  types?: string;
  builtins?: string;
  lineComment?: string;
  blockComment?: [string, string];
  caseInsensitive?: boolean;
  /** Extra tokenizer rules tried before the defaults (e.g. directives, atoms). */
  extra?: Monaco.languages.IMonarchLanguageRule[];
  /** Characters that may appear in identifiers besides letters, digits and _. */
  identChars?: string;
  strings?: string[];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
/** Escape characters for use inside a [...] class ("-" and "^" matter there). */
const escClass = (s: string) => s.replace(/[\]\\^-]/g, "\\$&");

function define(monaco: typeof Monaco, lang: Simple) {
  if (monaco.languages.getLanguages().some((l) => l.id === lang.id)) return;
  monaco.languages.register({ id: lang.id });
  const words = (s?: string) => (s ? s.split(/\s+/).filter(Boolean) : []);
  const keywords = words(lang.keywords);
  const types = words(lang.types);
  const builtins = words(lang.builtins);
  const ident = `[A-Za-z_${escClass(lang.identChars ?? "")}][\\w${escClass(lang.identChars ?? "")}]*`;
  const strings = lang.strings ?? ['"', "'"];
  const root: Monaco.languages.IMonarchLanguageRule[] = [...(lang.extra ?? [])];
  if (lang.lineComment) root.push([new RegExp(`${esc(lang.lineComment)}.*$`), "comment"]);
  if (lang.blockComment) root.push([new RegExp(esc(lang.blockComment[0])), "comment", "@comment"]);
  for (const q of strings) root.push([new RegExp(`${esc(q)}(?:[^${esc(q)}\\\\]|\\\\.)*${esc(q)}`), "string"]);
  root.push(
    [/\b0[xX][0-9a-fA-F]+\b/, "number"],
    [/\b\d+(\.\d+)?([eE][-+]?\d+)?\b/, "number"],
    [
      new RegExp(ident),
      {
        cases: {
          "@keywords": "keyword",
          "@types": "type",
          "@builtins": "variable.predefined",
          "@default": "identifier",
        },
      },
    ],
    [/[{}()[\]]/, "@brackets"],
    [/[;,.]/, "delimiter"],
    [/[=<>!+\-*/%&|^~?:]+/, "operator"],
  );
  const tokenizer: Monaco.languages.IMonarchLanguage["tokenizer"] = { root };
  if (lang.blockComment) {
    tokenizer.comment = [
      [new RegExp(esc(lang.blockComment[1])), "comment", "@pop"],
      [/./, "comment"],
    ];
  }
  monaco.languages.setMonarchTokensProvider(lang.id, {
    ignoreCase: lang.caseInsensitive ?? false,
    keywords: lang.caseInsensitive ? keywords.flatMap((k) => [k, k.toLowerCase(), k.toUpperCase()]) : keywords,
    types: lang.caseInsensitive ? types.flatMap((k) => [k, k.toLowerCase(), k.toUpperCase()]) : types,
    builtins,
    tokenizer,
  } as Monaco.languages.IMonarchLanguage);
  monaco.languages.setLanguageConfiguration(lang.id, {
    comments: {
      lineComment: lang.lineComment,
      blockComment: lang.blockComment,
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      ...strings.map((q) => ({ open: q, close: q, notIn: ["string", "comment"] })),
    ],
    surroundingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      ...strings.map((q) => ({ open: q, close: q })),
    ],
  });
}

export function registerExtraLanguages(monaco: typeof Monaco) {
  define(monaco, {
    id: "nasm",
    caseInsensitive: true,
    lineComment: ";",
    identChars: ".$",
    keywords: `section segment global extern bits default db dw dd dq dt resb resw resd resq times equ mov movzx movsx
      lea add sub mul imul div idiv inc dec neg and or xor not shl shr sal sar rol ror cmp test jmp je jne jz jnz jg
      jge jl jle ja jae jb jbe call ret push pop syscall int nop loop cld rep movsb stosb cqo cdq xchg`,
    types: "byte word dword qword",
    builtins: `rax rbx rcx rdx rsi rdi rbp rsp r8 r9 r10 r11 r12 r13 r14 r15 eax ebx ecx edx esi edi ebp esp ax bx cx dx
      al bl cl dl ah bh ch dh`,
    extra: [[/^\s*[A-Za-z_.][\w.]*:/, "type.identifier"]],
  });
  define(monaco, {
    id: "fortran",
    caseInsensitive: true,
    lineComment: "!",
    keywords: `program end implicit none parameter dimension allocatable allocate deallocate if then else elseif endif
      do enddo while exit cycle select case default function subroutine call return contains module use print write
      read format stop intent in out inout result recursive pure elemental type interface`,
    types: "integer real double precision complex logical character",
    builtins: "abs sqrt mod max min sum product size maxval minval real int nint trim len exp log sin cos",
    extra: [[/\.(true|false|and|or|not|eq|ne|lt|le|gt|ge)\./i, "keyword"]],
  });
  define(monaco, {
    id: "prolog",
    lineComment: "%",
    blockComment: ["/*", "*/"],
    keywords: "is not true false fail halt",
    builtins: "write writeln format nl read member append length nth0 nth1 reverse msort sort sum_list max_list min_list between findall forall assert retract",
    extra: [
      [/:-|-->|\?-/, "keyword"],
      [/\b[A-Z_]\w*/, "variable"],
    ],
  });
  define(monaco, {
    id: "cobol",
    caseInsensitive: true,
    lineComment: "*>",
    identChars: "-",
    keywords: `IDENTIFICATION DIVISION PROGRAM-ID ENVIRONMENT DATA WORKING-STORAGE SECTION PROCEDURE PIC PICTURE VALUE
      DISPLAY ACCEPT MOVE TO ADD SUBTRACT MULTIPLY DIVIDE COMPUTE GIVING BY FROM INTO IF ELSE END-IF PERFORM UNTIL
      VARYING TIMES END-PERFORM STOP RUN EVALUATE WHEN OTHER END-EVALUATE AND OR NOT EQUAL GREATER LESS THAN ZERO
      SPACES OCCURS INDEXED STRING DELIMITED SIZE REMAINDER GOBACK`,
  });
  define(monaco, {
    id: "lex",
    lineComment: "//",
    blockComment: ["/*", "*/"],
    keywords: `%% %{ %} %option %x %s int char void return if else while for include define struct static const`,
    builtins: "yytext yyleng yylval yylex yywrap yyin yyout ECHO BEGIN REJECT printf",
    extra: [
      [/^%%|^%\{|^%\}|^%\w+/, "keyword"],
      [/^\s*#\s*\w+/, "keyword"],
    ],
  });
  define(monaco, {
    id: "erlang",
    lineComment: "%",
    keywords: "module export import fun end case of if when receive after try catch throw begin andalso orelse not div rem band bor bxor bnot bsl bsr",
    builtins: "io format lists map filter foldl sum sort reverse seq nth",
    extra: [
      [/-\w+/, "keyword"],
      [/\b[A-Z_]\w*/, "variable"],
    ],
  });
  define(monaco, {
    id: "haskell",
    lineComment: "--",
    blockComment: ["{-", "-}"],
    keywords: "module where import qualified as hiding data type newtype class instance deriving do let in if then else case of infix infixl infixr forall",
    types: "Int Integer Double Float Bool Char String IO Maybe Either Just Nothing Left Right True False",
    builtins: "putStrLn putStr print getLine getContents read show map filter foldr foldl sum product length reverse head tail take drop zip words lines unwords unlines maximum minimum mapM_ replicate div mod readLn",
    strings: ['"'],
  });
  define(monaco, {
    id: "octave",
    lineComment: "%",
    keywords: `if elseif else end endif for endfor while endwhile do until switch case otherwise endswitch function
      endfunction return break continue try catch end_try_catch global persistent true false`,
    builtins: "disp printf fprintf input zeros ones eye rand size length numel sum mean max min sort inv det transpose linspace sqrt abs round mod num2str str2num pi",
  });
  define(monaco, {
    id: "lisp",
    caseInsensitive: true,
    lineComment: ";",
    blockComment: ["#|", "|#"],
    identChars: "-*+!?<>=/",
    keywords: "defun defvar defparameter defconstant defmacro let let* lambda if when unless cond case loop do dolist dotimes progn setf setq return quote function and or not t nil",
    builtins: "format print princ terpri read read-line parse-integer car cdr cons list length reverse mapcar reduce sort append nth apply funcall",
    strings: ['"'],
  });
  define(monaco, {
    id: "ada",
    caseInsensitive: true,
    lineComment: "--",
    keywords: "with use procedure function is begin end if then else elsif loop for while in out return declare package body type subtype record array of range constant null exit when case others and or not mod rem",
    types: "Integer Float Boolean Character String Natural Positive",
    builtins: "Put_Line Put New_Line Get Get_Line Text_IO",
    strings: ['"'],
  });
  define(monaco, {
    id: "d",
    lineComment: "//",
    blockComment: ["/*", "*/"],
    keywords: `module import void auto if else for foreach while do switch case default break continue return struct class
      interface enum immutable const static public private protected new delete null true false this super alias
      template mixin in out ref scope pure nothrow`,
    types: "int long short byte ubyte uint ulong float double real bool char string size_t",
    builtins: "writeln write writefln readln to strip",
  });
  define(monaco, {
    id: "nim",
    lineComment: "#",
    keywords: `proc func var let const if elif else when case of for in while block break continue return result import
      from include type object enum tuple discard echo true false nil and or not div mod shl shr iterator template macro`,
    types: "int float string bool char seq array int64 uint",
    builtins: "echo readLine stdin parseInt len add inc strip",
  });
  define(monaco, {
    id: "vhdl",
    caseInsensitive: true,
    lineComment: "--",
    keywords: `library use entity is port end architecture of begin signal variable constant process if then else elsif
      case when others for loop in out inout downto to generic map component wait until report severity`,
    types: "std_logic std_logic_vector bit bit_vector integer natural boolean",
    strings: ['"'],
  });
}
