import { spec } from "../spec";

export const GO = spec({
  id: "go",
  keywords: `break case chan const continue default defer else fallthrough for func go goto if import interface map
    package range return select struct switch type var true false nil iota`,
  types: `int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 uintptr float32 float64 complex64 complex128
    string bool byte rune error any`,
  known: `main fmt os bufio strings strconv math sort errors time`,
  imports: `fmt os bufio strings strconv math sort errors time math/rand unicode container/heap sync`,
  builtins: `
    F len(v) :: Length of a string, slice, map, array or channel.
    F cap(v) :: Capacity of a slice or channel.
    F append(slice, elems...) :: A slice with elements added; use s = append(s, x).
    F make(T, size...) :: Create a slice, map or channel.
    F new(T) :: Pointer to a new zero value of T.
    F copy(dst, src) :: Copy slice elements; returns how many.
    F delete(m, key) :: Remove a key from a map.
    F panic(v) :: Stop with an error.
    F recover() :: Regain control after a panic (in a deferred function).
    F min(a, b) :: The smaller value (Go 1.21+).
    F max(a, b) :: The larger value (Go 1.21+).
    F clear(v) :: Empty a map or zero a slice (Go 1.21+).
    F print(args...) :: Low-level print to stderr (use fmt instead).
    F println(args...) :: Low-level print to stderr (use fmt instead).
  `,
  modules: {
    fmt: `
      F Println(a ...any) :: Print values separated by spaces, then a newline.
      F Printf(format string, a ...any) :: Print formatted text: %d, %s, %v, %.2f, %T.
      F Print(a ...any) :: Print values.
      F Sprintf(format string, a ...any) string :: Format into a string.
      F Sprint(a ...any) string :: Values as a string.
      F Scan(a ...any) (int, error) :: Read space-separated values: fmt.Scan(&n).
      F Scanln(a ...any) (int, error) :: Read values on one line.
      F Scanf(format string, a ...any) (int, error) :: Read formatted input.
      F Errorf(format string, a ...any) error :: Build an error with a message.
      F Fprintln(w io.Writer, a ...any) :: Print to a writer (os.Stderr...).
      F Fprintf(w io.Writer, format string, a ...any) :: Formatted print to a writer.
      F Sscanf(str string, format string, a ...any) :: Read formatted values from a string.
    `,
    strings: `
      F Split(s, sep string) []string :: Split into parts.
      F Fields(s string) []string :: Split on white space.
      F Join(elems []string, sep string) string :: Join with a separator.
      F Contains(s, substr string) bool :: Does s contain substr?
      F Index(s, substr string) int :: Position of substr, or -1.
      F ToUpper(s string) string :: Upper-case copy.
      F ToLower(s string) string :: Lower-case copy.
      F TrimSpace(s string) string :: Without surrounding white space.
      F Trim(s, cutset string) string :: Remove leading/trailing characters.
      F Replace(s, old, new string, n int) string :: Replace n occurrences (-1 for all).
      F ReplaceAll(s, old, new string) string :: Replace every occurrence.
      F HasPrefix(s, prefix string) bool :: Does s start with prefix?
      F HasSuffix(s, suffix string) bool :: Does s end with suffix?
      F Repeat(s string, count int) string :: s repeated.
      F Count(s, substr string) int :: Non-overlapping occurrences.
      T Builder :: Build strings efficiently.
    `,
    strconv: `
      F Atoi(s string) (int, error) :: Text to int.
      F Itoa(i int) string :: int to text.
      F ParseFloat(s string, bitSize int) (float64, error) :: Text to float.
      F ParseInt(s string, base int, bitSize int) (int64, error) :: Text to int64.
      F FormatInt(i int64, base int) string :: int64 to text in a base.
      F ParseBool(str string) (bool, error) :: Text to bool.
    `,
    math: `
      F Sqrt(x float64) float64 :: Square root.
      F Pow(x, y float64) float64 :: x raised to y.
      F Abs(x float64) float64 :: Absolute value.
      F Max(x, y float64) float64 :: Larger value.
      F Min(x, y float64) float64 :: Smaller value.
      F Floor(x float64) float64 :: Round down.
      F Ceil(x float64) float64 :: Round up.
      F Round(x float64) float64 :: Round to nearest.
      F Log(x float64) float64 :: Natural logarithm.
      F Sin(x float64) float64 :: Sine.
      F Cos(x float64) float64 :: Cosine.
      F Inf(sign int) float64 :: Infinity.
      C Pi :: 3.14159...
      C MaxInt :: Largest int.
      C MinInt :: Smallest int.
      C MaxInt64 :: Largest int64.
    `,
    sort: `
      F Ints(x []int) :: Sort ints ascending.
      F Strings(x []string) :: Sort strings.
      F Float64s(x []float64) :: Sort floats.
      F Slice(x any, less func(i, j int) bool) :: Sort with a comparison.
      F SearchInts(a []int, x int) int :: Binary search.
    `,
    os: `
      V Args :: Command-line arguments.
      V Stdin :: Standard input.
      V Stdout :: Standard output.
      V Stderr :: Standard error.
      F Exit(code int) :: End the program.
      F ReadFile(name string) ([]byte, error) :: Read a file.
      F Getenv(key string) string :: Environment variable.
    `,
    bufio: `
      F NewReader(rd io.Reader) *Reader :: Buffered reader: bufio.NewReader(os.Stdin).
      F NewScanner(r io.Reader) *Scanner :: Line scanner: bufio.NewScanner(os.Stdin).
      F NewWriter(w io.Writer) *Writer :: Buffered writer (call Flush).
    `,
    errors: `
      F New(text string) error :: A new error with a message.
      F Is(err, target error) bool :: Does err match target?
    `,
    time: `
      F Now() Time :: Current time.
      F Since(t Time) Duration :: Time elapsed since t.
      F Sleep(d Duration) :: Pause.
      C Second :: One second.
      C Millisecond :: One millisecond.
    `,
  },
  members: `
    M Scan() bool :: Advance to the next line (bufio.Scanner).
    M Text() string :: The current line (bufio.Scanner).
    M ReadString(delim byte) (string, error) :: Read up to delim (bufio.Reader).
    M Flush() error :: Write out buffered data.
    M Error() string :: The error message.
    M WriteString(s string) :: Append text (strings.Builder).
    M String() string :: Text form.
    M Lock() :: Lock a mutex.
    M Unlock() :: Unlock a mutex.
  `,
  snippets: `
@main | package main
package main

import "fmt"

func main() {
\t$0
}
@func | function
func \${1:name}(\${2:x int}) \${3:int} {
\t$0
\treturn \${4:x}
}
@for | counting for loop
for \${1:i} := 0; \${1:i} < \${2:n}; \${1:i}++ {
\t$0
}
@forr | for range
for \${1:i}, \${2:v} := range \${3:items} {
\t$0
}
@while | loop while a condition holds
for \${1:condition} {
\t$0
}
@if | if statement
if \${1:condition} {
\t$0
}
@iferr | if err != nil
if err != nil {
\t\${1:return err}
}$0
@struct | struct type
type \${1:Point} struct {
\t\${2:X int}
\t$0
}
@pl | fmt.Println
fmt.Println(\${1:value})$0
@scan | read a number
var \${1:n} int
fmt.Scan(&\${1:n})$0
@slice | make a slice
\${1:s} := make([]\${2:int}, \${3:n})$0
@map | make a map
\${1:m} := make(map[\${2:string}]\${3:int})$0
  `,
});

export const RUST = spec({
  id: "rust",
  separators: [".", "::"],
  keywords: `as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod
    move mut pub ref return self Self static struct super trait true type unsafe use where while`,
  types: `i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box Rc
    Arc RefCell Cell HashMap HashSet BTreeMap BTreeSet VecDeque BinaryHeap Some None Ok Err`,
  known: `main std io self Self println print eprintln format vec panic assert assert_eq unwrap expect`,
  imports: `std::io std::collections::HashMap std::collections::HashSet std::io::Read std::io::BufRead std::fmt
    std::cmp std::cmp::Ordering std::collections::VecDeque std::collections::BTreeMap`,
  builtins: `
    D println!(format, args...) :: Print formatted text and a newline: println!("{} {}", a, b).
    D print!(format, args...) :: Print without a newline.
    D eprintln!(format, args...) :: Print to standard error.
    D format!(format, args...) :: Format into a String.
    D vec![items...] :: Create a Vec: vec![1, 2, 3].
    D panic!(message) :: Stop with a message.
    D assert!(condition) :: Panic if condition is false.
    D assert_eq!(a, b) :: Panic if a != b.
    D todo!() :: Marks unfinished code.
    D unreachable!() :: Marks code that should never run.
    D dbg!(expr) :: Print an expression and its value (debugging).
    D write!(dest, format, args...) :: Write formatted text.
    D matches!(value, pattern) :: Does value match the pattern?
    T String :: An owned, growable text string.
    T Vec<T> :: A growable array.
    T Option<T> :: Some(value) or None.
    T Result<T, E> :: Ok(value) or Err(error).
    T HashMap<K, V> :: A hash map (use std::collections::HashMap).
    T Box<T> :: A value on the heap.
    F drop(x) :: Free a value now.
  `,
  modules: {
    io: `
      F stdin() :: Standard input handle: io::stdin().read_line(&mut s).
      F stdout() :: Standard output handle.
      T Read :: Trait for reading bytes: read_to_string.
      T BufRead :: Trait for buffered reading: lines().
    `,
    "std::io": `
      F stdin() :: Standard input handle.
      F stdout() :: Standard output handle.
    `,
    String: `
      F new() :: An empty String.
      F from(s) :: A String from text.
      F with_capacity(n) :: An empty String with room for n bytes.
    `,
    Vec: `
      F new() :: An empty Vec.
      F with_capacity(n) :: An empty Vec with room for n items.
    `,
    HashMap: `F new() :: An empty HashMap.`,
    std: `
      N io :: Input and output.
      N collections :: HashMap, HashSet, VecDeque...
      N cmp :: Ordering, max, min.
      N fmt :: Formatting traits.
      N process :: exit and child processes.
    `,
  },
  members: `
    M read_line(&mut String) :: Read a line into the String (keeps the newline).
    M lines() :: Iterator over lines.
    M trim() :: Text without surrounding white space.
    M parse::<T>() :: Parse text: "42".parse::<i32>().
    M unwrap() :: The value, or panic on None/Err.
    M expect(msg) :: Like unwrap, with a message.
    M unwrap_or(default) :: The value, or default.
    M is_some() :: Is it Some?
    M is_none() :: Is it None?
    M is_ok() :: Is it Ok?
    M is_err() :: Is it Err?
    M push(value) :: Add to the end (Vec) / add a char (String).
    M push_str(s) :: Append text to a String.
    M pop() :: Remove the last element.
    M len() :: Number of elements / bytes.
    M is_empty() :: True when empty.
    M iter() :: Iterator over references.
    M iter_mut() :: Iterator over mutable references.
    M into_iter() :: Consuming iterator.
    M map(f) :: Transform each item.
    M filter(f) :: Keep matching items.
    M collect::<T>() :: Gather an iterator into a collection.
    M sum::<T>() :: Sum of the items.
    M count() :: Number of items.
    M enumerate() :: Pairs (index, item).
    M rev() :: Reverse an iterator.
    M sort() :: Sort a Vec.
    M sort_by(f) :: Sort with a comparison.
    M contains(x) :: Is x present?
    M insert(k, v) :: Insert into a map.
    M get(k) :: Look up (returns Option).
    M entry(k) :: Map entry: entry(k).or_insert(0).
    M or_insert(v) :: Insert v if the entry is empty.
    M split_whitespace() :: Words of a string.
    M split(pat) :: Split a string.
    M chars() :: Characters of a string.
    M to_string() :: A String copy.
    M to_uppercase() :: Upper-case String.
    M to_lowercase() :: Lower-case String.
    M clone() :: A deep copy.
    M as_str() :: &str view of a String.
    M max() :: Largest item (Option).
    M min() :: Smallest item (Option).
  `,
  snippets: `
@main | main function
fn main() {
\t$0
}
@fn | function
fn \${1:name}(\${2:x: i32}) -> \${3:i32} {
\t$0
\t\${4:x}
}
@for | for over a range
for \${1:i} in 0..\${2:n} {
\t$0
}
@fore | for over items
for \${1:x} in \${2:items}.iter() {
\t$0
}
@while | while loop
while \${1:condition} {
\t$0
}
@if | if expression
if \${1:condition} {
\t$0
}
@match | match
match \${1:value} {
\t\${2:pattern} => $0,
\t_ => {}
}
@let | let binding
let \${1:mut }\${2:x} = \${3:value};$0
@pl | println!
println!("{}", \${1:value});$0
@read | read a line
let mut \${1:line} = String::new();
std::io::stdin().read_line(&mut \${1:line}).expect("read failed");
let \${2:n}: \${3:i32} = \${1:line}.trim().parse().expect("not a number");$0
@struct | struct
struct \${1:Point} {
\t\${2:x}: \${3:i32},
\t$0
}
@impl | impl block
impl \${1:Point} {
\tfn \${2:new}() -> Self {
\t\t$0
\t}
}
  `,
});

export const SWIFT = spec({
  id: "swift",
  keywords: `associatedtype class deinit enum extension fileprivate func import init inout internal let open operator
    private protocol public rethrows static struct subscript typealias var break case continue default defer do else
    fallthrough for guard if in repeat return switch where while as catch false is nil super self Self throw throws
    true try await async`,
  types: `Int Double Float Bool String Character Array Dictionary Set Optional Any AnyObject Void Int64 UInt Error`,
  known: `main print readLine`,
  builtins: `
    F print(_ items: Any..., separator: String = " ", terminator: String = "\\n") :: Print values.
    F readLine() -> String? :: Read a line of input (nil at the end).
    F max(_ x, _ y) :: The larger value.
    F min(_ x, _ y) :: The smaller value.
    F abs(_ x) :: Absolute value.
    F stride(from:to:by:) :: A counting sequence with a step.
    F zip(_ a, _ b) :: Pairs from two sequences.
  `,
  members: `
    M append(_ x) :: Add to the end.
    M count :: Number of elements.
    M isEmpty :: True when empty.
    M sorted() :: A sorted copy.
    M reversed() :: A reversed sequence.
    M map(_ f) :: Transform each element.
    M filter(_ f) :: Keep matching elements.
    M reduce(_ initial, _ f) :: Combine elements.
    M contains(_ x) :: Is x present?
    M split(separator:) :: Split a string.
    M uppercased() :: Upper-case copy.
    M lowercased() :: Lower-case copy.
    M first :: First element.
    M last :: Last element.
  `,
  snippets: `
@func | function
func \${1:name}(\${2:x}: \${3:Int}) -> \${4:Int} {
\t$0
\treturn \${2:x}
}
@for | for-in over a range
for \${1:i} in 0..<\${2:n} {
\t$0
}
@if | if statement
if \${1:condition} {
\t$0
}
@read | read a number
let \${1:n} = Int(readLine()!)!$0
  `,
});
