import { spec } from "../spec";

export const PHP = spec({
  id: "php",
  separators: ["->", "::"],
  keywords: `abstract and array as break callable case catch class clone const continue declare default do echo else
    elseif empty enddeclare endfor endforeach endif endswitch endwhile enum extends final finally fn for foreach
    function global goto if implements include include_once instanceof insteadof interface isset list match
    namespace new or print private protected public readonly require require_once return static switch throw
    trait try unset use var while xor yield true false null`,
  types: `int float string bool array object mixed void null iterable callable self parent static`,
  known: `this argv argc STDIN STDOUT STDERR PHP_EOL PHP_INT_MAX PHP_INT_MIN __construct __toString`,
  builtins: `
    F echo :: Print one or more values.
    F print_r(mixed $value) :: Print arrays and objects readably.
    F var_dump(mixed $value) :: Print a value with its type.
    F printf(string $format, ...$values) :: Print formatted text.
    F sprintf(string $format, ...$values) :: Formatted string.
    F fgets(resource $stream) :: Read a line: fgets(STDIN).
    F trim(string $s) :: Remove surrounding white space.
    F intval(mixed $value) :: Convert to int.
    F floatval(mixed $value) :: Convert to float.
    F strval(mixed $value) :: Convert to string.
    F strlen(string $s) :: Length of a string.
    F strtoupper(string $s) :: Upper-case copy.
    F strtolower(string $s) :: Lower-case copy.
    F str_repeat(string $s, int $times) :: Repeat text.
    F str_replace($search, $replace, $subject) :: Replace text.
    F strpos(string $haystack, string $needle) :: Position of needle, or false.
    F substr(string $s, int $start, ?int $length) :: Part of a string.
    F explode(string $sep, string $s) :: Split into an array.
    F implode(string $sep, array $a) :: Join array elements.
    F str_split(string $s) :: Characters as an array.
    F strrev(string $s) :: Reverse a string.
    F ucfirst(string $s) :: Upper-case first letter.
    F count(array $a) :: Number of elements.
    F array_push(array &$a, ...$values) :: Add to the end.
    F array_pop(array &$a) :: Remove the last element.
    F array_shift(array &$a) :: Remove the first element.
    F array_unshift(array &$a, ...$values) :: Add to the start.
    F array_keys(array $a) :: The keys.
    F array_values(array $a) :: The values.
    F array_sum(array $a) :: Sum of the values.
    F array_map(callable $f, array $a) :: Transform each element.
    F array_filter(array $a, ?callable $f) :: Keep matching elements.
    F array_reverse(array $a) :: Reversed copy.
    F array_merge(array ...$arrays) :: Merge arrays.
    F array_slice(array $a, int $offset, ?int $length) :: Part of an array.
    F array_search($needle, array $a) :: Key of a value, or false.
    F in_array($needle, array $a) :: Is the value present?
    F array_key_exists($key, array $a) :: Is the key present?
    F range($start, $end, $step) :: An array of values.
    F sort(array &$a) :: Sort ascending.
    F rsort(array &$a) :: Sort descending.
    F usort(array &$a, callable $cmp) :: Sort with a comparison.
    F ksort(array &$a) :: Sort by key.
    F max(...$values) :: Largest value.
    F min(...$values) :: Smallest value.
    F abs($x) :: Absolute value.
    F sqrt(float $x) :: Square root.
    F pow($base, $exp) :: Power.
    F round($x, int $precision) :: Round.
    F floor($x) :: Round down.
    F ceil($x) :: Round up.
    F intdiv(int $a, int $b) :: Integer division.
    F rand(int $min, int $max) :: Random integer.
    F is_numeric(mixed $v) :: Is it a number or numeric string?
    F is_array(mixed $v) :: Is it an array?
    F isset(mixed $v) :: Is it set and not null?
    F json_encode(mixed $v) :: Value to JSON.
    F json_decode(string $json, bool $assoc) :: JSON to value.
    F file_get_contents(string $path) :: Read a whole file ("php://stdin" for input).
    F number_format(float $n, int $decimals) :: Format a number.
    F date(string $format) :: Format the current date.
  `,
  snippets: `
@php | PHP file
<?php

$0
@echo | echo a line
echo \${1:\\$value} . PHP_EOL;$0
@read | read a line
\\$\${1:line} = trim(fgets(STDIN));$0
@for | for loop
for (\\$\${1:i} = 0; \\$\${1:i} < \${2:\\$n}; \\$\${1:i}++) {
\t$0
}
@foreach | foreach loop
foreach (\${1:\\$items} as \\$\${2:item}) {
\t$0
}
@function | function
function \${1:name}(\${2:\\$x}) {
\t$0
\treturn \${2:\\$x};
}
@if | if statement
if (\${1:condition}) {
\t$0
}
@class | class
class \${1:Name} {
\tpublic function __construct() {
\t\t$0
\t}
}
  `,
});

export const RUBY = spec({
  id: "ruby",
  keywords: `BEGIN END alias and begin break case class def defined? do else elsif end ensure false for if in module
    next nil not or redo rescue retry return self super then true undef unless until when while yield`,
  types: `Integer Float String Symbol Array Hash Range NilClass TrueClass FalseClass Proc Struct Object Comparable
    Enumerable Kernel Math StandardError ArgumentError TypeError ZeroDivisionError NameError NoMethodError
    RuntimeError IndexError KeyError IOError Set Time`,
  known: `puts print p gets require attr_accessor attr_reader attr_writer initialize to_s STDIN ARGV`,
  builtins: `
    F puts(*values) :: Print each value on its own line.
    F print(*values) :: Print without a newline.
    F p(value) :: Print the value's inspect form (debugging).
    F gets :: Read a line (with the newline); gets.chomp removes it.
    F require(name) :: Load a library.
    F rand(max) :: Random number.
    F sleep(seconds) :: Pause.
    F format(fmt, *args) :: Formatted string.
    F loop :: Repeat a block forever (until break).
    F raise(message) :: Raise an error.
    F attr_accessor(*names) :: Define reader and writer methods.
    F attr_reader(*names) :: Define reader methods.
  `,
  modules: {
    Math: `
      F sqrt(x) :: Square root.
      F cbrt(x) :: Cube root.
      F sin(x) :: Sine.
      F cos(x) :: Cosine.
      F log(x) :: Natural logarithm.
      F log10(x) :: Base-10 logarithm.
      F hypot(x, y) :: sqrt(x*x + y*y).
      C PI :: 3.14159...
      C E :: 2.71828...
    `,
  },
  members: `
    M chomp :: Remove the trailing newline.
    M strip :: Remove surrounding white space.
    M to_i :: Convert to Integer.
    M to_f :: Convert to Float.
    M to_s :: Convert to String.
    M to_a :: Convert to Array.
    M to_sym :: Convert to Symbol.
    M split(sep) :: Split into an array.
    M length :: Number of elements/characters.
    M size :: Number of elements.
    M upcase :: Upper-case copy.
    M downcase :: Lower-case copy.
    M capitalize :: First letter upper case.
    M reverse :: Reversed copy.
    M include?(x) :: Is x present?
    M empty? :: True when empty.
    M each :: Run a block for each element.
    M each_with_index :: Block with element and index.
    M map :: Transform each element.
    M select :: Keep matching elements.
    M reject :: Drop matching elements.
    M reduce(init) :: Combine elements.
    M sum :: Sum of the elements.
    M sort :: Sorted copy.
    M sort_by :: Sort by a key.
    M max :: Largest element.
    M min :: Smallest element.
    M push(x) :: Add to the end.
    M pop :: Remove the last element.
    M shift :: Remove the first element.
    M join(sep) :: Join elements into text.
    M first :: First element.
    M last :: Last element.
    M keys :: Keys of a hash.
    M values :: Values of a hash.
    M times :: Repeat a block n times.
    M upto(n) :: Count up to n.
    M downto(n) :: Count down to n.
    M even? :: Is it even?
    M odd? :: Is it odd?
    M abs :: Absolute value.
    M round :: Round.
    M count :: Number of elements (matching a block).
    M uniq :: Without duplicates.
    M flatten :: Nested arrays flattened.
    M zip(other) :: Pair elements.
  `,
  snippets: `
@def | method
def \${1:name}(\${2:x})
\t$0
end
@each | each loop
\${1:items}.each do |\${2:item}|
\t$0
end
@times | repeat n times
\${1:n}.times do |\${2:i}|
\t$0
end
@if | if statement
if \${1:condition}
\t$0
end
@class | class
class \${1:Name}
\tdef initialize(\${2:value})
\t\t@\${2:value} = \${2:value}
\tend
\t$0
end
@read | read a number
\${1:n} = gets.to_i$0
@puts | puts
puts \${1:value}$0
  `,
});

export const LUA = spec({
  id: "lua",
  separators: [".", ":"],
  keywords: `and break do else elseif end false for function goto if in local nil not or repeat return then true
    until while`,
  types: ``,
  known: `self arg _G _VERSION`,
  builtins: `
    F print(...) :: Print values separated by tabs.
    F type(v) :: Type name of v.
    F tostring(v) :: Value as a string.
    F tonumber(v, base) :: Value as a number (nil if impossible).
    F pairs(t) :: Iterate over all key/value pairs.
    F ipairs(t) :: Iterate over array elements 1, 2, 3...
    F select(n, ...) :: Arguments from n on ("#" for the count).
    F error(message) :: Raise an error.
    F assert(v, message) :: Error if v is false or nil.
    F pcall(f, ...) :: Call f in protected mode.
    F require(name) :: Load a module.
    F setmetatable(t, mt) :: Set a metatable.
    F getmetatable(t) :: The metatable of t.
    F rawget(t, k) :: Get without metamethods.
    F next(t, k) :: Next key/value.
    F unpack(t) :: Table elements as values (table.unpack in 5.4).
  `,
  modules: {
    io: `
      F read(format) :: Read input: io.read("n") number, io.read("l") line.
      F write(...) :: Write values without a newline.
      F lines() :: Iterate over input lines.
      F open(file, mode) :: Open a file.
    `,
    string: `
      F format(fmt, ...) :: Formatted string (like printf).
      F len(s) :: Length.
      F sub(s, i, j) :: Substring from i to j.
      F upper(s) :: Upper-case copy.
      F lower(s) :: Lower-case copy.
      F rep(s, n) :: s repeated n times.
      F reverse(s) :: Reversed string.
      F find(s, pattern) :: Position of pattern.
      F gsub(s, pattern, repl) :: Replace matches.
      F gmatch(s, pattern) :: Iterate over matches.
      F byte(s, i) :: Character code.
      F char(...) :: Characters from codes.
    `,
    table: `
      F insert(t, value) :: Append (or insert at a position).
      F remove(t, pos) :: Remove an element.
      F concat(t, sep) :: Join elements into a string.
      F sort(t, comp) :: Sort in place.
      F unpack(t) :: Elements as values.
    `,
    math: `
      F floor(x) :: Round down.
      F ceil(x) :: Round up.
      F sqrt(x) :: Square root.
      F abs(x) :: Absolute value.
      F max(...) :: Largest value.
      F min(...) :: Smallest value.
      F random(m, n) :: Random number.
      F fmod(x, y) :: Remainder.
      C pi :: 3.14159...
      C huge :: Infinity.
      C maxinteger :: Largest integer.
    `,
    os: `
      F time() :: Current time.
      F clock() :: CPU time used.
      F exit(code) :: End the program.
      F date(format) :: Formatted date.
    `,
  },
  snippets: `
@function | function
local function \${1:name}(\${2:x})
\t$0
end
@for | numeric for
for \${1:i} = 1, \${2:n} do
\t$0
end
@forp | for with ipairs
for \${1:i}, \${2:v} in ipairs(\${3:t}) do
\t$0
end
@while | while loop
while \${1:condition} do
\t$0
end
@if | if statement
if \${1:condition} then
\t$0
end
@read | read a number
local \${1:n} = io.read("n")$0
  `,
});

export const BASH = spec({
  id: "bash",
  keywords: `if then else elif fi case esac for select while until do done in function time coproc return exit
    break continue local declare readonly export unset shift true false`,
  types: ``,
  known: `echo printf read cd ls pwd cat grep sed awk sort uniq wc head tail cut tr seq expr test let bc date sleep
    mkdir rm cp mv touch chmod find xargs tee basename dirname source eval exec set trap wait kill jobs printenv
    env which type command mapfile readarray getopts true false yes REPLY HOME PATH PWD RANDOM SECONDS LINENO IFS`,
  builtins: `
    F echo [-n] [-e] args... :: Print arguments.
    F printf format args... :: Print formatted text.
    F read [-r] [-p prompt] name... :: Read a line into variables.
    F test expression :: Evaluate a condition (same as [ ... ]).
    F let expression :: Arithmetic: let "x = x + 1".
    F local name=value :: Variable local to a function.
    F declare [-a] [-A] [-i] name :: Declare a variable (array, associative array, integer).
    F export name=value :: Make a variable visible to child processes.
    F shift [n] :: Drop the first n positional parameters.
    F exit [status] :: End the script.
    F return [status] :: Leave a function.
    F seq first last :: Print a sequence of numbers.
    F expr expression :: Evaluate an expression.
    F bc :: Calculator for decimals: echo "3/2" | bc -l.
    F cat file... :: Print files.
    F grep pattern file... :: Lines matching a pattern.
    F sed script file... :: Stream editor.
    F awk program file... :: Pattern scanning and processing.
    F sort file... :: Sort lines.
    F uniq :: Drop repeated adjacent lines.
    F wc [-l] [-w] [-c] :: Count lines, words, characters.
    F head [-n N] :: First lines.
    F tail [-n N] :: Last lines.
    F cut -d DELIM -f FIELDS :: Select fields.
    F tr set1 set2 :: Translate characters.
    F mapfile -t array :: Read lines into an array.
  `,
  snippets: `
@shebang | script header
#!/usr/bin/env bash
set -euo pipefail

$0
@if | if statement
if [[ \${1:condition} ]]; then
\t$0
fi
@for | for over a range
for \${1:i} in \\$(seq 1 \${2:10}); do
\t$0
done
@fori | C-style for
for ((\${1:i} = 0; \${1:i} < \${2:n}; \${1:i}++)); do
\t$0
done
@while | while loop
while \${1:condition}; do
\t$0
done
@func | function
\${1:name}() {
\tlocal \${2:x}="\\$1"
\t$0
}
@read | read a line
read -r \${1:line}$0
@case | case statement
case "\${1:\\$x}" in
\t\${2:pattern})
\t\t$0
\t\t;;
\t*)
\t\t;;
esac
  `,
});

export const SQL = spec({
  id: "sql",
  caseInsensitive: true,
  keywords: `SELECT FROM WHERE AND OR NOT INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP ALTER ADD COLUMN
    PRIMARY KEY FOREIGN REFERENCES UNIQUE CHECK DEFAULT NULL IS IN BETWEEN LIKE GLOB ORDER BY ASC DESC GROUP
    HAVING LIMIT OFFSET JOIN INNER LEFT RIGHT FULL OUTER CROSS ON AS DISTINCT UNION ALL EXCEPT INTERSECT CASE WHEN
    THEN ELSE END EXISTS INDEX VIEW TRIGGER BEGIN COMMIT ROLLBACK TRANSACTION WITH RECURSIVE AUTOINCREMENT IF
    REPLACE CAST COLLATE NOCASE`,
  types: `INTEGER TEXT REAL BLOB NUMERIC INT VARCHAR CHAR BOOLEAN DATE DATETIME DECIMAL FLOAT DOUBLE`,
  known: ``,
  builtins: `
    F COUNT(expr) :: Number of rows (COUNT(*) counts all).
    F SUM(expr) :: Sum of the values.
    F AVG(expr) :: Average.
    F MIN(expr) :: Smallest value.
    F MAX(expr) :: Largest value.
    F LENGTH(text) :: Length of text.
    F UPPER(text) :: Upper-case text.
    F LOWER(text) :: Lower-case text.
    F SUBSTR(text, start, length) :: Part of the text.
    F TRIM(text) :: Without surrounding spaces.
    F ROUND(x, digits) :: Round a number.
    F ABS(x) :: Absolute value.
    F COALESCE(a, b, ...) :: First non-NULL argument.
    F IFNULL(a, b) :: a, or b if a is NULL.
    F GROUP_CONCAT(expr, sep) :: Join values of a group.
    F DATE(value) :: A date.
    F STRFTIME(format, value) :: Format a date.
    F RANDOM() :: A random integer.
    F TYPEOF(x) :: The type of a value.
    F printf(format, ...) :: Formatted text (SQLite).
  `,
  snippets: `
@create | CREATE TABLE
CREATE TABLE \${1:students} (
\tid INTEGER PRIMARY KEY,
\t\${2:name} TEXT NOT NULL$0
);
@insert | INSERT
INSERT INTO \${1:students} (\${2:name}) VALUES (\${3:'Asha'});$0
@select | SELECT
SELECT \${1:*} FROM \${2:students}\${3: WHERE \${4:condition}};$0
@join | SELECT with JOIN
SELECT \${1:*}
FROM \${2:a}
JOIN \${3:b} ON \${3:b}.\${4:a_id} = \${2:a}.id;$0
@group | GROUP BY
SELECT \${1:column}, COUNT(*) FROM \${2:table} GROUP BY \${1:column};$0
  `,
});

export const PERL = spec({
  id: "perl",
  separators: ["->", "::"],
  keywords: `my our local sub if elsif else unless while until for foreach do last next redo return use no package
    require BEGIN END and or not eq ne lt gt le ge cmp x q qq qw qr m s tr y`,
  types: ``,
  known: `STDIN STDOUT STDERR ARGV ENV strict warnings print say shift`,
  builtins: `
    F print LIST :: Print values.
    F say LIST :: Print values and a newline (use feature 'say').
    F printf FORMAT, LIST :: Print formatted text.
    F chomp(VAR) :: Remove a trailing newline.
    F length(EXPR) :: Length of a string.
    F substr(EXPR, OFFSET, LENGTH) :: Part of a string.
    F index(STR, SUBSTR) :: Position of SUBSTR, or -1.
    F uc(EXPR) :: Upper-case copy.
    F lc(EXPR) :: Lower-case copy.
    F split(/PATTERN/, EXPR) :: Split into a list.
    F join(EXPR, LIST) :: Join a list into a string.
    F push(ARRAY, LIST) :: Add to the end.
    F pop(ARRAY) :: Remove the last element.
    F shift(ARRAY) :: Remove the first element.
    F unshift(ARRAY, LIST) :: Add to the start.
    F scalar(EXPR) :: Scalar context (array length).
    F sort LIST :: Sorted list.
    F reverse LIST :: Reversed list.
    F keys HASH :: The keys.
    F values HASH :: The values.
    F exists EXPR :: Is the hash key present?
    F defined EXPR :: Is the value defined?
    F delete EXPR :: Remove a hash key.
    F sprintf FORMAT, LIST :: Formatted string.
    F int(EXPR) :: Integer part.
    F abs(EXPR) :: Absolute value.
    F sqrt(EXPR) :: Square root.
    F rand(EXPR) :: Random number.
    F die LIST :: Stop with an error.
    F warn LIST :: Print a warning.
    F open(FH, MODE, PATH) :: Open a file.
    F close(FH) :: Close a file.
    F map BLOCK LIST :: Transform each element.
    F grep BLOCK LIST :: Keep matching elements.
  `,
  snippets: `
@perl | script header
use strict;
use warnings;

$0
@sub | subroutine
sub \${1:name} {
\tmy (\${2:\\$x}) = @_;
\t$0
}
@for | foreach loop
foreach my \\$\${1:item} (\${2:@items}) {
\t$0
}
@read | read a line
my \\$\${1:line} = <STDIN>;
chomp(\\$\${1:line});$0
@if | if statement
if (\${1:condition}) {
\t$0
}
  `,
});

export const R = spec({
  id: "r",
  separators: ["$", "::"],
  keywords: `if else repeat while function for in next break TRUE FALSE NULL Inf NaN NA NA_integer_ NA_real_
    NA_character_ return`,
  types: `numeric integer character logical complex list vector matrix data.frame factor`,
  known: `T F pi LETTERS letters month.name stdin`,
  builtins: `
    F print(x) :: Print a value.
    F cat(..., sep = " ") :: Print values without quotes.
    F paste(..., sep = " ") :: Join values into text.
    F paste0(...) :: Join values without a separator.
    F readline(prompt) :: Read a line (interactive sessions).
    F readLines(con, n) :: Read lines: readLines("stdin", n = 1).
    F scan(file = "stdin") :: Read numbers or words.
    F c(...) :: Combine values into a vector.
    F seq(from, to, by) :: A sequence of numbers.
    F rep(x, times) :: Repeat values.
    F length(x) :: Number of elements.
    F sum(...) :: Sum.
    F mean(x) :: Average.
    F median(x) :: Middle value.
    F sd(x) :: Standard deviation.
    F var(x) :: Variance.
    F max(...) :: Largest value.
    F min(...) :: Smallest value.
    F range(...) :: Minimum and maximum.
    F round(x, digits) :: Round.
    F sqrt(x) :: Square root.
    F abs(x) :: Absolute value.
    F exp(x) :: e to the x.
    F log(x, base) :: Logarithm.
    F sort(x) :: Sorted copy.
    F order(...) :: Positions that would sort the data.
    F rev(x) :: Reversed copy.
    F unique(x) :: Without duplicates.
    F table(...) :: Count occurrences.
    F which(x) :: Positions where x is TRUE.
    F ifelse(test, yes, no) :: Vectorised if/else.
    F sapply(X, FUN) :: Apply a function to each element (simplified result).
    F lapply(X, FUN) :: Apply a function to each element (list result).
    F apply(X, MARGIN, FUN) :: Apply over rows (1) or columns (2).
    F nchar(x) :: Number of characters.
    F toupper(x) :: Upper case.
    F tolower(x) :: Lower case.
    F substr(x, start, stop) :: Part of a string.
    F strsplit(x, split) :: Split text.
    F as.numeric(x) :: Convert to numbers.
    F as.integer(x) :: Convert to integers.
    F as.character(x) :: Convert to text.
    F is.na(x) :: Which values are missing.
    F matrix(data, nrow, ncol) :: A matrix.
    F data.frame(...) :: A table of columns.
    F list(...) :: A list.
    F names(x) :: Names of the elements.
    F head(x, n) :: First elements/rows.
    F tail(x, n) :: Last elements/rows.
    F summary(object) :: Summary statistics.
    F str(object) :: Structure of an object.
    F nrow(x) :: Number of rows.
    F ncol(x) :: Number of columns.
    F sprintf(fmt, ...) :: Formatted text.
    F format(x, nsmall) :: Format values.
    F stop(message) :: Raise an error.
    F sample(x, size) :: Random sample.
    F set.seed(seed) :: Seed the random generator.
    F cumsum(x) :: Running totals.
    F prod(x) :: Product.
    F factorial(x) :: x!
    F choose(n, k) :: Binomial coefficient.
    F Sys.time() :: Current time.
  `,
  snippets: `
@function | function
\${1:name} <- function(\${2:x}) {
\t$0
}
@for | for loop
for (\${1:i} in 1:\${2:n}) {
\t$0
}
@if | if statement
if (\${1:condition}) {
\t$0
}
@read | read numbers from input
\${1:x} <- scan(file("stdin"), quiet = TRUE)$0
@readline | read a line
\${1:line} <- readLines(file("stdin"), n = 1)$0
@cat | print with cat
cat(\${1:value}, "\\n")$0
  `,
});

export const TCL = spec({
  id: "tcl",
  keywords: `set puts gets if elseif else for foreach while proc return break continue expr incr append lappend lindex
    llength list lsort lrange lsearch string switch catch error global upvar array dict namespace source format
    scan split join regexp regsub info exit after`,
  types: ``,
  known: `stdin stdout stderr argv argc`,
  builtins: `
    F puts ?-nonewline? ?channel? string :: Print a line.
    F gets channel ?varName? :: Read a line: gets stdin line.
    F set varName ?value? :: Set or read a variable.
    F expr arg ?arg ...? :: Evaluate an arithmetic expression.
    F incr varName ?increment? :: Add to a variable.
    F proc name args body :: Define a procedure.
    F llength list :: Number of list elements.
    F lindex list index :: A list element.
    F lappend varName ?value ...? :: Append to a list variable.
    F format formatString ?arg ...? :: Formatted text.
  `,
  snippets: `
@proc | procedure
proc \${1:name} {\${2:x}} {
\t$0
}
@for | for loop
for {set \${1:i} 0} {\\$\${1:i} < \${2:10}} {incr \${1:i}} {
\t$0
}
@if | if statement
if {\${1:condition}} {
\t$0
}
@read | read a line
gets stdin \${1:line}$0
  `,
});
