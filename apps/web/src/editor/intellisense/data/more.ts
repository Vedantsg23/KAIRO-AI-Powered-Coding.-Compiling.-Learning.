import { spec } from "../spec";

export const ASM = spec({
  id: "asm",
  caseInsensitive: true,
  keywords: `section segment global extern bits default db dw dd dq dt resb resw resd resq times equ mov movzx movsx
    lea add sub mul imul div idiv inc dec neg and or xor not shl shr sal sar rol ror cmp test jmp je jne jz jnz jg
    jge jl jle ja jae jb jbe call ret push pop syscall int nop loop cld rep movsb stosb cqo cdq xchg`,
  types: `byte word dword qword`,
  known: `_start rax rbx rcx rdx rsi rdi rbp rsp r8 r9 r10 r11 r12 r13 r14 r15 eax ebx ecx edx esi edi ebp esp
    ax bx cx dx al bl cl dl ah bh ch dh text data bss rodata`,
  builtins: `
    K mov dest, src :: Copy src into dest.
    K add dest, src :: dest = dest + src.
    K sub dest, src :: dest = dest - src.
    K imul dest, src :: Signed multiply.
    K cmp a, b :: Compare a and b (sets flags for jumps).
    K jmp label :: Jump always.
    K syscall :: Ask the Linux kernel for a service (rax = number: 1 write, 0 read, 60 exit).
    K call label :: Call a subroutine.
    K ret :: Return from a subroutine.
  `,
  snippets: `
@start | program skeleton | Linux x86-64: print a message and exit
section .data
\tmsg db "Hello from assembly!", 10
\tlen equ \\$ - msg

section .text
\tglobal _start

_start:
\tmov rax, 1          ; write
\tmov rdi, 1          ; to standard output
\tmov rsi, msg
\tmov rdx, len
\tsyscall
\t$0
\tmov rax, 60         ; exit
\txor rdi, rdi        ; status 0
\tsyscall
@write | write syscall | Print len bytes at msg
mov rax, 1
mov rdi, 1
mov rsi, \${1:msg}
mov rdx, \${2:len}
syscall$0
@exit | exit syscall
mov rax, 60
mov rdi, \${1:0}
syscall$0
@loop | counted loop
mov rcx, \${1:10}
.\${2:again}:
\t$0
\tloop .\${2:again}
  `,
});

export const FORTRAN = spec({
  id: "fortran",
  caseInsensitive: true,
  keywords: `program end implicit none integer real double precision complex logical character parameter dimension
    allocatable allocate deallocate if then else elseif endif do enddo while exit cycle select case default
    function subroutine call return contains module use print write read format stop intent in out inout result
    recursive pure elemental type interface true false`,
  types: `integer real logical character complex`,
  known: `main`,
  builtins: `
    F print *, items :: Print values (list-directed).
    F write(*,*) items :: Write values to standard output.
    F read(*,*) vars :: Read values from standard input.
    F abs(x) :: Absolute value.
    F sqrt(x) :: Square root.
    F mod(a, p) :: Remainder.
    F max(a, b, ...) :: Largest argument.
    F min(a, b, ...) :: Smallest argument.
    F sum(array) :: Sum of the elements.
    F product(array) :: Product of the elements.
    F size(array) :: Number of elements.
    F maxval(array) :: Largest element.
    F minval(array) :: Smallest element.
    F real(x) :: Convert to real.
    F int(x) :: Convert to integer.
    F nint(x) :: Nearest integer.
    F trim(string) :: Without trailing blanks.
    F len(string) :: Length.
    F exp(x) :: e to the x.
    F log(x) :: Natural logarithm.
    F sin(x) :: Sine.
    F cos(x) :: Cosine.
  `,
  snippets: `
@program | program
program \${1:main}
\timplicit none
\t$0
end program \${1:main}
@do | do loop
do \${1:i} = 1, \${2:n}
\t$0
end do
@if | if block
if (\${1:condition}) then
\t$0
end if
@function | function
function \${1:square}(\${2:x}) result(r)
\treal, intent(in) :: \${2:x}
\treal :: r
\tr = \${2:x} * \${2:x}
end function \${1:square}$0
@read | read a number
integer :: \${1:n}
read(*,*) \${1:n}$0
  `,
});

export const PASCAL = spec({
  id: "pascal",
  caseInsensitive: true,
  keywords: `and array begin case const div do downto else end file for function goto if in label mod nil not of or
    packed procedure program record repeat set then to type until var while with uses true false break continue
    exit string`,
  types: `integer real boolean char string longint int64 byte word double extended cardinal`,
  known: `input output crt sysutils math`,
  builtins: `
    F writeln(args) :: Print values and a newline.
    F write(args) :: Print values.
    F readln(vars) :: Read a line into variables.
    F read(vars) :: Read values.
    F length(s) :: Length of a string or array.
    F inc(x) :: x := x + 1.
    F dec(x) :: x := x - 1.
    F abs(x) :: Absolute value.
    F sqr(x) :: x * x.
    F sqrt(x) :: Square root.
    F round(x) :: Round to an integer.
    F trunc(x) :: Drop the fraction.
    F ord(c) :: Code of a character.
    F chr(n) :: Character with code n.
    F upcase(c) :: Upper-case character.
    F copy(s, index, count) :: Part of a string.
    F pos(sub, s) :: Position of sub in s.
    F random(n) :: Random integer below n.
    F randomize :: Seed the random generator.
    F high(x) :: Highest index / value.
    F low(x) :: Lowest index / value.
    F halt(code) :: End the program.
    F IntToStr(n) :: Integer to string (sysutils).
    F StrToInt(s) :: String to integer (sysutils).
  `,
  snippets: `
@program | program
program \${1:Main};

begin
\t$0
end.
@for | for loop
for \${1:i} := 1 to \${2:n} do
begin
\t$0
end;
@while | while loop
while \${1:condition} do
begin
\t$0
end;
@if | if statement
if \${1:condition} then
begin
\t$0
end;
@function | function
function \${1:Square}(\${2:x}: integer): integer;
begin
\t\${1:Square} := \${2:x} * \${2:x};
end;$0
@read | read a number
readln(\${1:n});$0
  `,
});

export const PROLOG = spec({
  id: "prolog",
  keywords: `is not true false fail halt`,
  types: ``,
  known: `main initialization`,
  builtins: `
    F write(Term) :: Print a term.
    F writeln(Term) :: Print a term and a newline.
    F format(Format, Args) :: Formatted output: format("~w~n", [X]).
    F nl :: Print a newline.
    F read(Term) :: Read a term (ending with a full stop).
    F read_term(Term, Options) :: Read a term with options.
    F member(X, List) :: X is an element of List.
    F append(A, B, AB) :: AB is A followed by B.
    F length(List, N) :: N is the length of List.
    F nth0(I, List, X) :: X is element I (from 0).
    F nth1(I, List, X) :: X is element I (from 1).
    F reverse(List, Reversed) :: Reverse a list.
    F msort(List, Sorted) :: Sort, keeping duplicates.
    F sort(List, Sorted) :: Sort, removing duplicates.
    F sum_list(List, Sum) :: Sum of numbers.
    F max_list(List, Max) :: Largest number.
    F min_list(List, Min) :: Smallest number.
    F between(Low, High, X) :: X from Low to High.
    F findall(Template, Goal, List) :: All solutions of Goal.
    F forall(Cond, Action) :: Action holds for every Cond.
    F atom_length(Atom, N) :: Length of an atom.
    F atom_chars(Atom, Chars) :: Atom to characters.
    F number_codes(N, Codes) :: Number to character codes.
    F assert(Clause) :: Add a clause.
    F retract(Clause) :: Remove a clause.
    F halt :: End the program.
  `,
  snippets: `
@main | program with main | Runs main when loaded
:- initialization(main).

main :-
\t$0
\thalt.
@rule | rule
\${1:grandparent}(\${2:X}, \${3:Z}) :-
\t\${4:parent}(\${2:X}, Y),
\t\${4:parent}(Y, \${3:Z}).$0
@fact | fact
\${1:parent}(\${2:tom}, \${3:bob}).$0
@format | format
format("~w~n", [\${1:X}])$0
  `,
});

export const COBOL = spec({
  id: "cobol",
  caseInsensitive: true,
  keywords: `IDENTIFICATION DIVISION PROGRAM-ID ENVIRONMENT DATA WORKING-STORAGE SECTION PROCEDURE PIC PICTURE VALUE
    DISPLAY ACCEPT MOVE TO ADD SUBTRACT MULTIPLY DIVIDE COMPUTE GIVING BY FROM INTO IF ELSE END-IF PERFORM UNTIL
    VARYING TIMES END-PERFORM STOP RUN EVALUATE WHEN OTHER END-EVALUATE AND OR NOT EQUAL GREATER LESS THAN ZERO
    SPACES OCCURS INDEXED STRING DELIMITED SIZE REMAINDER GOBACK`,
  types: ``,
  known: ``,
  builtins: `
    K DISPLAY item :: Print items.
    K ACCEPT item :: Read a line into an item.
    K MOVE value TO item :: Copy a value.
    K COMPUTE item = expression :: Calculate.
    K PERFORM paragraph :: Run a paragraph (or an inline loop).
  `,
  snippets: `
@program | program skeleton
       IDENTIFICATION DIVISION.
       PROGRAM-ID. \${1:MAIN}.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-N PIC 9(4) VALUE 0.
       PROCEDURE DIVISION.
           $0
           STOP RUN.
@perform | PERFORM VARYING loop
           PERFORM VARYING \${1:WS-I} FROM 1 BY 1 UNTIL \${1:WS-I} > \${2:10}
               $0
           END-PERFORM
  `,
});

export const LEX = spec({
  id: "lex",
  keywords: `%% %{ %} %option %x %s yytext yyleng yylval yylex yywrap yyin yyout ECHO BEGIN REJECT`,
  types: `int char void`,
  known: `main printf yytext yyleng yylex yywrap noyywrap`,
  builtins: `
    F yylex() :: Run the scanner: returns the next token (0 at the end).
    V yytext :: The text of the current match.
    V yyleng :: Length of the current match.
    F yywrap() :: Called at the end of input; return 1 to stop.
    K ECHO :: Copy the matched text to the output.
    F printf(const char *format, ...) :: Print formatted text.
  `,
  snippets: `
@lex | scanner skeleton | Definitions, rules and C code
%option noyywrap
%{
#include <stdio.h>
int count = 0;
%}

%%
[0-9]+      { printf("NUMBER(%s)\\n", yytext); }
[a-zA-Z_]+  { printf("WORD(%s)\\n", yytext); }
[ \\t\\n]+    { /* skip white space */ }
.           { printf("OTHER(%s)\\n", yytext); }
%%

int main(void) {
\tyylex();
\treturn 0;
}
@rule | rule
\${1:[0-9]+}\t{ \${2:printf("%s\\n", yytext);} }$0
  `,
});

export const VERILOG = spec({
  id: "verilog",
  keywords: `module endmodule input output inout wire reg integer real parameter localparam assign always initial
    begin end if else case casez casex endcase default for while repeat forever posedge negedge or and not
    function endfunction task endtask generate endgenerate genvar signed timescale`,
  types: `wire reg integer real time logic`,
  known: `clk rst`,
  builtins: `
    F $display(format, args) :: Print a line (simulation).
    F $monitor(format, args) :: Print whenever a value changes.
    F $write(format, args) :: Print without a newline.
    F $finish :: End the simulation.
    F $time :: Current simulation time.
    F $dumpfile(name) :: Name of the waveform file.
    F $dumpvars :: Record signal changes.
  `,
  snippets: `
@module | module with a testbench
module \${1:half_adder}(input a, input b, output sum, output carry);
\tassign sum = a ^ b;
\tassign carry = a & b;
endmodule

module tb;
\treg a, b;
\twire sum, carry;
\t\${1:half_adder} uut(a, b, sum, carry);
\tinitial begin
\t\t\\$monitor("a=%b b=%b sum=%b carry=%b", a, b, sum, carry);
\t\ta = 0; b = 0; #10;
\t\ta = 0; b = 1; #10;
\t\ta = 1; b = 0; #10;
\t\ta = 1; b = 1; #10;
\t\t\\$finish;
\tend
endmodule
@always | always block
always @(posedge \${1:clk}) begin
\t$0
end
  `,
});

export const ELIXIR = spec({
  id: "elixir",
  keywords: `def defp defmodule do end fn if else unless case cond with when in and or not true false nil import
    alias require use receive after rescue try catch raise quote unquote`,
  types: `Integer Float String List Map Enum IO Kernel Tuple Atom Keyword Process Agent Task`,
  known: `main`,
  modules: {
    IO: `
      F puts(item) :: Print a line.
      F inspect(item) :: Print any value (debugging).
      F gets(prompt) :: Read a line.
      F write(item) :: Print without a newline.
    `,
    Enum: `
      F map(enum, fun) :: Transform each element.
      F filter(enum, fun) :: Keep matching elements.
      F reduce(enum, acc, fun) :: Combine elements.
      F sum(enum) :: Sum.
      F sort(enum) :: Sorted list.
      F count(enum) :: Number of elements.
      F each(enum, fun) :: Run fun for each element.
      F join(enum, sep) :: Join into a string.
      F max(enum) :: Largest element.
      F min(enum) :: Smallest element.
    `,
    String: `
      F trim(s) :: Without surrounding white space.
      F split(s, pattern) :: Split into a list.
      F to_integer(s) :: Text to integer.
      F upcase(s) :: Upper case.
      F length(s) :: Length.
      F reverse(s) :: Reversed.
    `,
  },
  snippets: `
@defmodule | module
defmodule \${1:Main} do
\tdef \${2:run} do
\t\t$0
\tend
end

\${1:Main}.\${2:run}()
@def | function
def \${1:name}(\${2:x}) do
\t$0
end
@puts | IO.puts
IO.puts(\${1:value})$0
@read | read a number
\${1:n} = IO.gets("") |> String.trim() |> String.to_integer()$0
  `,
});

export const ERLANG = spec({
  id: "erlang",
  keywords: `module export import fun end case of if when receive after try catch throw begin andalso orelse not
    div rem band bor bxor bnot bsl bsr true false`,
  types: ``,
  known: `main start io lists`,
  modules: {
    io: `
      F format(Format, Args) :: Formatted output: io:format("~p~n", [X]).
      F fwrite(Format, Args) :: Formatted output.
      F read(Prompt) :: Read a term.
      F get_line(Prompt) :: Read a line.
    `,
    lists: `
      F map(Fun, List) :: Transform each element.
      F filter(Pred, List) :: Keep matching elements.
      F foldl(Fun, Acc, List) :: Combine elements.
      F sum(List) :: Sum.
      F sort(List) :: Sorted list.
      F reverse(List) :: Reversed list.
      F seq(From, To) :: Numbers from From to To.
      F nth(N, List) :: Element N.
    `,
  },
  snippets: `
@module | module with main
-module(main).
-export([main/0]).

main() ->
\t$0
\tok.
@fun | function
\${1:name}(\${2:X}) ->
\t$0.
@format | io:format
io:format("~p~n", [\${1:X}])$0
  `,
});

export const LISP = spec({
  id: "lisp",
  caseInsensitive: true,
  keywords: `defun defvar defparameter defconstant defmacro let let* lambda if when unless cond case loop do dolist
    dotimes progn setf setq return quote function and or not t nil`,
  types: ``,
  known: ``,
  builtins: `
    F format(destination control-string &rest args) :: Formatted output: (format t "~a~%" x).
    F print(object) :: Print an object.
    F princ(object) :: Print without quotes.
    F terpri() :: Print a newline.
    F read() :: Read an object.
    F read-line() :: Read a line.
    F parse-integer(string) :: Text to integer.
    F car(list) :: First element.
    F cdr(list) :: The rest of the list.
    F cons(a b) :: A new pair.
    F list(&rest items) :: A new list.
    F length(sequence) :: Length.
    F reverse(sequence) :: Reversed copy.
    F mapcar(fn list) :: Transform each element.
    F reduce(fn sequence) :: Combine elements.
    F sort(sequence predicate) :: Sort.
    F append(&rest lists) :: Join lists.
    F nth(n list) :: Element n.
    F apply(fn args) :: Call fn with a list of arguments.
    F funcall(fn &rest args) :: Call fn.
  `,
  snippets: `
@defun | function
(defun \${1:square} (\${2:x})
  $0)
@format | print with format
(format t "~a~%" \${1:x})$0
@dotimes | dotimes loop
(dotimes (\${1:i} \${2:10})
  $0)
@let | let
(let ((\${1:x} \${2:1}))
  $0)
  `,
});

export const SCHEME = spec({
  id: "scheme",
  keywords: `define lambda let let* letrec if cond case else and or not begin do set! quote quasiquote delay
    define-syntax syntax-rules #t #f`,
  types: ``,
  known: ``,
  builtins: `
    F display(obj) :: Print a value.
    F newline() :: Print a newline.
    F write(obj) :: Print a value in machine-readable form.
    F read() :: Read a value.
    F read-line() :: Read a line.
    F car(pair) :: First element.
    F cdr(pair) :: Rest of the list.
    F cons(a b) :: A new pair.
    F list(items ...) :: A new list.
    F length(list) :: Length.
    F reverse(list) :: Reversed list.
    F map(fn list) :: Transform each element.
    F apply(fn list) :: Call fn with a list of arguments.
    F null?(obj) :: Is it the empty list?
    F string->number(s) :: Text to number.
    F number->string(n) :: Number to text.
  `,
  snippets: `
@define | function
(define (\${1:square} \${2:x})
  $0)
@display | display a value
(display \${1:x})
(newline)$0
@let | let
(let ((\${1:x} \${2:1}))
  $0)
  `,
});

export const CLOJURE = spec({
  id: "clojure",
  keywords: `def defn defn- fn let if if-not when when-not cond case do loop recur doseq dotimes for ns require
    import try catch finally throw quote nil true false and or not`,
  types: ``,
  known: `main -main`,
  builtins: `
    F println(& more) :: Print values and a newline.
    F print(& more) :: Print values.
    F prn(& more) :: Print values readably.
    F read-line() :: Read a line.
    F str(& xs) :: Concatenate into a string.
    F count(coll) :: Number of elements.
    F first(coll) :: First element.
    F rest(coll) :: All but the first.
    F conj(coll x) :: Add an element.
    F map(f coll) :: Transform each element.
    F filter(pred coll) :: Keep matching elements.
    F reduce(f init coll) :: Combine elements.
    F range(start end) :: Numbers from start below end.
    F apply(f args) :: Call f with a sequence of arguments.
    F Integer/parseInt(s) :: Text to integer.
    F sort(coll) :: Sorted sequence.
    F assoc(map k v) :: Map with k set to v.
    F get(map k) :: Value for k.
  `,
  snippets: `
@defn | function
(defn \${1:square} [\${2:x}]
  $0)
@println | println
(println \${1:x})$0
@let | let
(let [\${1:x} \${2:1}]
  $0)
@read | read a number
(def \${1:n} (Integer/parseInt (clojure.string/trim (read-line))))$0
  `,
});

export const HASKELL = spec({
  id: "haskell",
  keywords: `module where import qualified as hiding data type newtype class instance deriving do let in if then
    else case of where infix infixl infixr forall True False`,
  types: `Int Integer Double Float Bool Char String IO Maybe Either Just Nothing Left Right`,
  known: `main`,
  builtins: `
    F putStrLn :: String -> IO () :: Print a line.
    F putStr :: String -> IO () :: Print without a newline.
    F print :: Show a => a -> IO () :: Print any showable value.
    F getLine :: IO String :: Read a line.
    F getContents :: IO String :: Read all input.
    F read :: Read a => String -> a :: Parse a value: read line :: Int.
    F show :: Show a => a -> String :: Value to text.
    F map :: (a -> b) -> [a] -> [b] :: Transform each element.
    F filter :: (a -> Bool) -> [a] -> [a] :: Keep matching elements.
    F foldr :: Combine from the right.
    F foldl :: Combine from the left.
    F sum :: Sum of a list.
    F product :: Product of a list.
    F length :: Length of a list.
    F reverse :: Reversed list.
    F head :: First element.
    F tail :: All but the first.
    F take :: First n elements.
    F drop :: Drop n elements.
    F zip :: Pair elements.
    F words :: Split text on white space.
    F lines :: Split text into lines.
    F unwords :: Join words.
    F unlines :: Join lines.
    F maximum :: Largest element.
    F minimum :: Smallest element.
    F mapM_ :: Run an action for each element.
    F replicate :: A list with n copies.
    F div :: Integer division.
    F mod :: Remainder.
  `,
  snippets: `
@main | main
main :: IO ()
main = do
\t$0
@fn | function with a type
\${1:square} :: \${2:Int} -> \${2:Int}
\${1:square} x = $0
@read | read a number
n <- readLn :: IO Int$0
  `,
});

export const D = spec({
  id: "d",
  keywords: `module import void int long short byte ubyte uint ulong float double real bool char string auto if else
    for foreach while do switch case default break continue return struct class interface enum immutable const
    static public private protected new delete null true false this super import alias template mixin in out ref
    scope pure nothrow`,
  types: `int long short byte ubyte uint ulong float double real bool char string size_t`,
  known: `main std stdio writeln write readln`,
  builtins: `
    F writeln(args...) :: Print values and a newline (std.stdio).
    F write(args...) :: Print values (std.stdio).
    F writefln(format, args...) :: Formatted print and newline.
    F readln() :: Read a line (std.stdio).
    F to!T(value) :: Convert (std.conv): to!int("42").
    F strip(s) :: Without surrounding white space (std.string).
  `,
  snippets: `
@main | main
import std.stdio;

void main() {
\t$0
}
@foreach | foreach loop
foreach (\${1:i}; 0 .. \${2:n}) {
\t$0
}
  `,
});

export const ADA = spec({
  id: "ada",
  caseInsensitive: true,
  keywords: `with use procedure function is begin end if then else elsif loop for while in out return declare
    package body type subtype record array of range constant null exit when case others and or not mod rem`,
  types: `Integer Float Boolean Character String Natural Positive`,
  known: `Ada Text_IO Integer_Text_IO Put_Line Put Get Get_Line New_Line Main`,
  builtins: `
    F Put_Line(Item) :: Print a line (Ada.Text_IO).
    F Put(Item) :: Print text.
    F New_Line :: Print a newline.
    F Get(Item) :: Read a value.
    F Get_Line :: Read a line.
  `,
  snippets: `
@main | procedure Main
with Ada.Text_IO; use Ada.Text_IO;

procedure Main is
begin
\t$0
end Main;
@for | for loop
for \${1:I} in 1 .. \${2:10} loop
\t$0
end loop;
  `,
});

export const NIM = spec({
  id: "nim",
  keywords: `proc func var let const if elif else when case of for in while block break continue return result
    import from include type object enum tuple seq array discard echo true false nil and or not div mod shl shr
    iterator template macro`,
  types: `int float string bool char seq array int64 uint`,
  known: `echo readLine stdin parseInt strutils`,
  builtins: `
    F echo(x) :: Print values and a newline.
    F readLine(f) :: Read a line: stdin.readLine().
    F parseInt(s) :: Text to int (strutils).
    F len(x) :: Length.
    F add(s, x) :: Append.
    F inc(x) :: Add one.
  `,
  snippets: `
@proc | procedure
proc \${1:square}(\${2:x}: int): int =
\t$0
@for | for loop
for \${1:i} in 0 ..< \${2:n}:
\t$0
@read | read a number
import strutils
let \${1:n} = stdin.readLine().strip().parseInt()$0
  `,
});

export const OCTAVE = spec({
  id: "octave",
  keywords: `if elseif else end endif for endfor while endwhile do until switch case otherwise endswitch function
    endfunction return break continue try catch end_try_catch unwind_protect global persistent true false`,
  types: ``,
  known: `pi e Inf NaN eps ans`,
  builtins: `
    F disp(x) :: Display a value.
    F printf(template, args) :: Formatted output.
    F fprintf(template, args) :: Formatted output.
    F input(prompt) :: Read input.
    F zeros(n, m) :: Matrix of zeros.
    F ones(n, m) :: Matrix of ones.
    F eye(n) :: Identity matrix.
    F rand(n, m) :: Random matrix.
    F size(A) :: Dimensions.
    F length(A) :: Longest dimension.
    F numel(A) :: Number of elements.
    F sum(A) :: Sum.
    F mean(A) :: Average.
    F max(A) :: Largest value.
    F min(A) :: Smallest value.
    F sort(A) :: Sorted copy.
    F inv(A) :: Matrix inverse.
    F det(A) :: Determinant.
    F transpose(A) :: Transpose.
    F linspace(a, b, n) :: n points from a to b.
    F sqrt(x) :: Square root.
    F abs(x) :: Absolute value.
    F round(x) :: Round.
    F mod(a, b) :: Remainder.
    F num2str(x) :: Number to text.
    F str2num(s) :: Text to number.
  `,
  snippets: `
@function | function
function \${1:y} = \${2:square}(\${3:x})
\t\${1:y} = \${3:x} .^ 2;
end$0
@for | for loop
for \${1:i} = 1:\${2:n}
\t$0
end
@if | if block
if \${1:condition}
\t$0
end
  `,
});

export const VBNET = spec({
  id: "vbnet",
  caseInsensitive: true,
  keywords: `Module End Sub Function Dim As Integer String Double Boolean If Then Else ElseIf For To Step Next While
    Do Loop Until Select Case Return Class Public Private Shared New Nothing True False And Or Not AndAlso OrElse
    Imports Try Catch Finally Throw Each In`,
  types: `Integer Long Double Single Decimal Boolean Char String Object`,
  known: `Console WriteLine ReadLine Main System`,
  modules: {
    Console: `
      M WriteLine(value) :: Print a line.
      M Write(value) :: Print without a newline.
      M ReadLine() :: Read a line.
    `,
  },
  snippets: `
@module | Module with Main
Module Program
\tSub Main()
\t\t$0
\tEnd Sub
End Module
@for | For loop
For \${1:i} As Integer = 1 To \${2:10}
\t$0
Next
  `,
});

export const FSHARP = spec({
  id: "fsharp",
  keywords: `let mutable rec fun function match with if then elif else for in to do while yield return type of
    module open namespace member static new true false not and or`,
  types: `int float string bool char unit list array seq option Map Set`,
  known: `printfn printf stdin main`,
  builtins: `
    F printfn format args :: Print formatted text and a newline: printfn "%d" x.
    F printf format args :: Print formatted text.
    F int value :: Convert to int.
    F float value :: Convert to float.
    F string value :: Convert to string.
  `,
  modules: {
    List: `
      F map f list :: Transform each element.
      F filter f list :: Keep matching elements.
      F sum list :: Sum.
      F length list :: Length.
      F rev list :: Reversed list.
    `,
  },
  snippets: `
@let | function
let \${1:square} \${2:x} =
\t$0
@for | for loop
for \${1:i} in 1 .. \${2:10} do
\t$0
  `,
});
