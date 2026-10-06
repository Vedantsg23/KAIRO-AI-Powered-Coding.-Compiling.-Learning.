import { spec } from "../spec";

const JAVA_STRING = `
  M length() :: Number of characters.
  M charAt(int index) :: The character at index.
  M substring(int begin, int end) :: Characters from begin up to (not including) end.
  M indexOf(String s) :: First position of s, or -1.
  M lastIndexOf(String s) :: Last position of s, or -1.
  M contains(CharSequence s) :: True if s appears in the string.
  M equals(Object o) :: True if both strings have the same characters. Use this, not ==.
  M equalsIgnoreCase(String s) :: equals, ignoring upper/lower case.
  M compareTo(String s) :: 0 if equal, negative if this comes first.
  M toUpperCase() :: Upper-case copy.
  M toLowerCase() :: Lower-case copy.
  M trim() :: Copy without leading/trailing spaces.
  M strip() :: Copy without leading/trailing white space (Unicode aware).
  M split(String regex) :: Split into an array of strings.
  M replace(CharSequence a, CharSequence b) :: Replace every a with b.
  M startsWith(String prefix) :: Does the string start with prefix?
  M endsWith(String suffix) :: Does the string end with suffix?
  M isEmpty() :: True if length() == 0.
  M isBlank() :: True if empty or only white space.
  M toCharArray() :: The characters as a char[].
  M chars() :: The characters as an IntStream.
  M repeat(int n) :: The string repeated n times.
  M format(Object... args) :: Formatted copy (String.format).
  M hashCode() :: Hash code.
  M toString() :: Text form of the object.
`;

const JAVA_COLLECTION = `
  M add(E e) :: Add an element.
  M get(int index) :: Element at index (List) or value for a key (Map).
  M set(int index, E e) :: Replace the element at index.
  M remove(Object o) :: Remove an element (or the one at an index).
  M size() :: Number of elements.
  M isEmpty() :: True when there are no elements.
  M clear() :: Remove all elements.
  M contains(Object o) :: Is o in the collection?
  M indexOf(Object o) :: Position of o, or -1.
  M sort(Comparator c) :: Sort the list.
  M forEach(Consumer action) :: Run action for every element.
  M stream() :: A Stream over the elements.
  M iterator() :: An iterator over the elements.
  M put(K key, V value) :: Store value for key (Map).
  M getOrDefault(Object key, V fallback) :: Value for key, or fallback.
  M containsKey(Object key) :: Is key in the map?
  M containsValue(Object value) :: Is value in the map?
  M keySet() :: The keys of a map.
  M values() :: The values of a map.
  M entrySet() :: The key/value pairs of a map.
  M putIfAbsent(K key, V value) :: Store only if key is missing.
  M merge(K key, V value, BiFunction f) :: Combine with the existing value.
  M push(E e) :: Push onto a stack/deque.
  M pop() :: Pop from a stack/deque.
  M peek() :: Look at the head without removing it.
  M poll() :: Remove and return the head (null if empty).
  M offer(E e) :: Add to a queue.
  M addAll(Collection c) :: Add every element of c.
  M toArray() :: The elements as an array.
  M nextInt() :: Read the next int (Scanner).
  M nextLong() :: Read the next long (Scanner).
  M nextDouble() :: Read the next double (Scanner).
  M next() :: Read the next word (Scanner).
  M nextLine() :: Read the rest of the line (Scanner).
  M hasNext() :: Is there another token? (Scanner)
  M hasNextInt() :: Is the next token an int? (Scanner)
  M hasNextLine() :: Is there another line? (Scanner)
  M close() :: Close the resource.
  M readLine() :: Read a line (BufferedReader); null at the end.
  M append(Object o) :: Append (StringBuilder).
  M reverse() :: Reverse (StringBuilder).
  M insert(int offset, Object o) :: Insert (StringBuilder).
  M deleteCharAt(int index) :: Delete one character (StringBuilder).
  M getKey() :: Key of a map entry.
  M getValue() :: Value of a map entry.
  M map(Function f) :: Transform each element (Stream).
  M filter(Predicate p) :: Keep matching elements (Stream).
  M collect(Collector c) :: Gather a stream's elements.
  M sum() :: Sum of a numeric stream.
  M intValue() :: The value as an int.
  M doubleValue() :: The value as a double.
  M getClass() :: The object's runtime class.
  M getMessage() :: The message of an exception.
  M printStackTrace() :: Print an exception's stack trace.
`;

export const JAVA = spec({
  id: "java",
  keywords: `abstract assert boolean break byte case catch char class const continue default do double else enum
    extends final finally float for goto if implements import instanceof int interface long native new package
    private protected public return short static strictfp super switch synchronized this throw throws transient try
    void volatile while var record sealed permits yield true false null`,
  types: `int long short byte char boolean float double void String Object Integer Long Double Float Character Boolean
    Byte Short StringBuilder Scanner Math System List ArrayList LinkedList Map HashMap TreeMap LinkedHashMap Set
    HashSet TreeSet LinkedHashSet Queue Deque ArrayDeque Stack PriorityQueue Iterator Arrays Collections Optional
    Random BufferedReader InputStreamReader IOException Exception RuntimeException ArithmeticException
    ArrayIndexOutOfBoundsException NullPointerException NumberFormatException IllegalArgumentException
    IllegalStateException InputMismatchException Thread Runnable Comparator Comparable Iterable Collection
    CharSequence Number BigInteger BigDecimal LocalDate LocalDateTime Duration Objects Stream IntStream
    Collectors Function Predicate Consumer Supplier BiFunction Entry Record Enum Throwable Error Override
    FunctionalInterface Deprecated SuppressWarnings StringBuffer PrintWriter File FileReader FileWriter`,
  known: `main args System out err in println print printf String length java util io lang math this super
    Override Main`,
  imports: `java.util.Scanner java.util.* java.util.ArrayList java.util.List java.util.HashMap java.util.Map
    java.util.Arrays java.util.Collections java.util.HashSet java.util.Set java.util.LinkedList java.util.Queue
    java.util.Stack java.util.PriorityQueue java.util.ArrayDeque java.util.Random java.io.* java.io.BufferedReader
    java.io.InputStreamReader java.io.IOException java.util.stream.* java.util.function.* java.math.BigInteger`,
  builtins: `
    T System :: Access to standard input/output: System.out.println(x).
    T Math :: Maths functions: Math.max, Math.sqrt, Math.pow...
    T String :: Text. Compare with .equals(), not ==.
    T Scanner :: Reads input: new Scanner(System.in), then nextInt(), nextLine()...
    T Integer :: int as an object; Integer.parseInt("42") converts text.
    T Arrays :: Helpers for arrays: sort, toString, fill, asList.
    T Collections :: Helpers for collections: sort, reverse, max, min.
    T ArrayList<E> :: A growable list: add, get, size.
    T HashMap<K, V> :: A hash map: put, get, containsKey.
    T StringBuilder :: Build text efficiently: append, toString.
    T Random :: Random numbers: nextInt(bound).
  `,
  modules: {
    "System.out": `
      M println(Object x) :: Print x and a newline.
      M print(Object x) :: Print x without a newline.
      M printf(String format, Object... args) :: Print formatted text: %d int, %.2f double, %s string, %n newline.
      M flush() :: Write out buffered output.
    `,
    "System.err": `
      M println(Object x) :: Print to standard error.
      M print(Object x) :: Print to standard error without a newline.
    `,
    System: `
      P out :: Standard output (PrintStream).
      P in :: Standard input (InputStream).
      P err :: Standard error.
      M currentTimeMillis() :: Current time in milliseconds.
      M nanoTime() :: High-resolution time in nanoseconds.
      M exit(int status) :: End the program.
      M arraycopy(Object src, int srcPos, Object dest, int destPos, int length) :: Copy part of an array.
      M lineSeparator() :: The platform's newline.
    `,
    Math: `
      M max(a, b) :: The larger of a and b.
      M min(a, b) :: The smaller of a and b.
      M abs(x) :: Absolute value.
      M pow(double a, double b) :: a raised to b (a double).
      M sqrt(double x) :: Square root.
      M cbrt(double x) :: Cube root.
      M floor(double x) :: Round down.
      M ceil(double x) :: Round up.
      M round(double x) :: Round to the nearest whole number (long).
      M random() :: A double from 0.0 (inclusive) to 1.0 (exclusive).
      M log(double x) :: Natural logarithm.
      M log10(double x) :: Base-10 logarithm.
      M exp(double x) :: e raised to x.
      M sin(double x) :: Sine (radians).
      M cos(double x) :: Cosine (radians).
      M tan(double x) :: Tangent (radians).
      M hypot(double x, double y) :: sqrt(x*x + y*y).
      M floorDiv(int a, int b) :: Division rounding down.
      M floorMod(int a, int b) :: Remainder that is never negative for positive b.
      M toRadians(double deg) :: Degrees to radians.
      C PI :: 3.14159...
      C E :: 2.71828...
    `,
    Integer: `
      M parseInt(String s) :: Convert text to int (NumberFormatException if it is not a number).
      M valueOf(String s) :: Convert text to an Integer.
      M toString(int i) :: int to text.
      M toBinaryString(int i) :: Binary digits of i.
      M max(int a, int b) :: The larger value.
      M min(int a, int b) :: The smaller value.
      M sum(int a, int b) :: a + b.
      C MAX_VALUE :: 2147483647
      C MIN_VALUE :: -2147483648
    `,
    Double: `
      M parseDouble(String s) :: Convert text to double.
      M valueOf(String s) :: Convert text to a Double.
      M compare(double a, double b) :: Compare two doubles.
      C MAX_VALUE :: Largest double.
      C MIN_VALUE :: Smallest positive double.
    `,
    Long: `
      M parseLong(String s) :: Convert text to long.
      C MAX_VALUE :: 9223372036854775807
      C MIN_VALUE :: -9223372036854775808
    `,
    String: `
      M valueOf(Object x) :: Text form of x.
      M format(String format, Object... args) :: Formatted text.
      M join(CharSequence sep, Iterable parts) :: Join parts with sep.
    `,
    Arrays: `
      M sort(array) :: Sort an array in place.
      M toString(array) :: Text like [1, 2, 3].
      M fill(array, value) :: Set every element.
      M asList(T... items) :: A fixed-size List view.
      M copyOf(array, int newLength) :: A copy, truncated or padded.
      M copyOfRange(array, int from, int to) :: Copy part of an array.
      M binarySearch(array, key) :: Position of key in a sorted array.
      M equals(a, b) :: Do two arrays hold the same elements?
      M stream(array) :: A Stream over the array.
    `,
    Collections: `
      M sort(List list) :: Sort a list.
      M reverse(List list) :: Reverse a list.
      M max(Collection c) :: Largest element.
      M min(Collection c) :: Smallest element.
      M shuffle(List list) :: Random order.
      M swap(List list, int i, int j) :: Swap two elements.
      M frequency(Collection c, Object o) :: How many times o appears.
      M unmodifiableList(List list) :: A read-only view.
      M emptyList() :: An empty list.
    `,
    Character: `
      M isDigit(char c) :: Is c a digit?
      M isLetter(char c) :: Is c a letter?
      M isLetterOrDigit(char c) :: Is c a letter or digit?
      M isUpperCase(char c) :: Is c upper case?
      M isLowerCase(char c) :: Is c lower case?
      M isWhitespace(char c) :: Is c white space?
      M toUpperCase(char c) :: Upper-case version.
      M toLowerCase(char c) :: Lower-case version.
      M getNumericValue(char c) :: The digit's value ('7' -> 7).
    `,
    Thread: `
      M sleep(long millis) :: Pause the current thread.
      M currentThread() :: The running thread.
    `,
    Objects: `
      M equals(Object a, Object b) :: Null-safe equals.
      M requireNonNull(T obj) :: Throw if obj is null.
      M hash(Object... values) :: Hash code of several values.
    `,
    List: `M of(E... items) :: An unmodifiable list.`,
    Map: `M of(K k1, V v1, ...) :: An unmodifiable map.`,
    Set: `M of(E... items) :: An unmodifiable set.`,
  },
  members: JAVA_STRING + JAVA_COLLECTION,
  snippets: `
@main | main method | Class Main with a main method
public class Main {
\tpublic static void main(String[] args) {
\t\t$0
\t}
}
@psvm | public static void main
public static void main(String[] args) {
\t$0
}
@sout | System.out.println | Print a line
System.out.println(\${1:value});$0
@souf | System.out.printf | Print formatted text
System.out.printf("\${1:%d}%n", \${2:value});$0
@scanner | Scanner | Read input from the keyboard
Scanner \${1:sc} = new Scanner(System.in);
int \${2:n} = \${1:sc}.nextInt();
$0
@for | for loop
for (int \${1:i} = 0; \${1:i} < \${2:n}; \${1:i}++) {
\t$0
}
@fore | for-each loop | Visit every element
for (\${1:int} \${2:x} : \${3:items}) {
\t$0
}
@while | while loop
while (\${1:condition}) {
\t$0
}
@if | if statement
if (\${1:condition}) {
\t$0
}
@ife | if / else
if (\${1:condition}) {
\t$2
} else {
\t$0
}
@switch | switch
switch (\${1:value}) {
\tcase \${2:1} -> $0;
\tdefault -> {}
}
@try | try / catch
try {
\t$1
} catch (\${2:Exception} e) {
\t$0
}
@method | method
\${1:static} \${2:int} \${3:name}(\${4:int x}) {
\t$0
\treturn \${5:0};
}
@class | class
class \${1:Name} {
\tprivate \${2:int} \${3:value};

\t\${1:Name}(\${2:int} \${3:value}) {
\t\tthis.\${3:value} = \${3:value};
\t}
\t$0
}
@list | ArrayList
List<\${1:Integer}> \${2:list} = new ArrayList<>();$0
@map | HashMap
Map<\${1:String}, \${2:Integer}> \${3:map} = new HashMap<>();$0
  `,
});

export const KOTLIN = spec({
  id: "kotlin",
  keywords: `as break class continue do else false for fun if in interface is null object package return
    super this throw true try typealias typeof val var when while by catch constructor delegate dynamic field file
    finally get import init param property receiver set setparam where actual abstract annotation companion const
    crossinline data enum expect external final infix inline inner internal lateinit noinline open operator out
    override private protected public reified sealed suspend tailrec vararg`,
  types: `Int Long Short Byte Double Float Boolean Char String Unit Any Nothing Array IntArray LongArray DoubleArray
    CharArray BooleanArray List MutableList ArrayList Map MutableMap HashMap Set MutableSet HashSet Pair Triple
    Sequence Iterable Collection Comparable Exception RuntimeException IllegalArgumentException
    IllegalStateException NumberFormatException StringBuilder Regex Math`,
  known: `main args it this println print readLine readln`,
  builtins: `
    F println(message: Any?) :: Print a value and a newline.
    F print(message: Any?) :: Print without a newline.
    F readLine(): String? :: Read a line from standard input (null at the end).
    F readln(): String :: Read a line (throws at the end of input).
    F listOf(vararg items) :: A read-only list.
    F mutableListOf(vararg items) :: A list you can change.
    F arrayOf(vararg items) :: An array.
    F intArrayOf(vararg items) :: An IntArray.
    F mapOf(vararg pairs) :: A read-only map: mapOf("a" to 1).
    F mutableMapOf(vararg pairs) :: A map you can change.
    F setOf(vararg items) :: A read-only set.
    F mutableSetOf(vararg items) :: A set you can change.
    F emptyList() :: An empty list.
    F maxOf(a, b) :: The larger value.
    F minOf(a, b) :: The smaller value.
    F repeat(times: Int, action: (Int) -> Unit) :: Run action times times.
    F require(condition: Boolean) :: Throw IllegalArgumentException if false.
    F check(condition: Boolean) :: Throw IllegalStateException if false.
    F error(message: Any) :: Throw IllegalStateException with message.
    F buildString(action) :: Build a String with a StringBuilder.
    F TODO() :: Marks unfinished code (throws NotImplementedError).
  `,
  members: `
    M toInt() :: Convert to Int (text must be a number).
    M toIntOrNull() :: Convert to Int, or null if it is not a number.
    M toDouble() :: Convert to Double.
    M toLong() :: Convert to Long.
    M toString() :: Text form.
    M split(vararg delimiters) :: Split text into a list.
    M trim() :: Text without surrounding spaces.
    M uppercase() :: Upper-case copy.
    M lowercase() :: Lower-case copy.
    M length :: Number of characters.
    M size :: Number of elements.
    M add(element) :: Add an element.
    M remove(element) :: Remove an element.
    M contains(element) :: Is element present?
    M forEach(action) :: Run action for each element.
    M map(transform) :: Transform each element.
    M filter(predicate) :: Keep matching elements.
    M sum() :: Sum of the elements.
    M sorted() :: A sorted copy.
    M sortedDescending() :: A copy sorted largest first.
    M reversed() :: A reversed copy.
    M joinToString(separator) :: Join elements into text.
    M first() :: First element.
    M last() :: Last element.
    M isEmpty() :: True when empty.
    M isNotEmpty() :: True when not empty.
    M indices :: The valid indices.
    M count() :: Number of elements.
    M maxOrNull() :: Largest element or null.
    M minOrNull() :: Smallest element or null.
    M getOrDefault(key, default) :: Value for key or default.
    M substring(start, end) :: Part of a string.
    M startsWith(prefix) :: Does the text start with prefix?
    M let(block) :: Run block with this value as it.
    M apply(block) :: Configure this object and return it.
  `,
  snippets: `
@main | main function
fun main() {
\t$0
}
@fun | function
fun \${1:name}(\${2:x: Int}): \${3:Int} {
\t$0
\treturn \${4:x}
}
@for | for over a range
for (\${1:i} in 0 until \${2:n}) {
\t$0
}
@fore | for over items
for (\${1:x} in \${2:items}) {
\t$0
}
@while | while loop
while (\${1:condition}) {
\t$0
}
@when | when expression
when (\${1:value}) {
\t\${2:1} -> $0
\telse -> {}
}
@read | read a number
val \${1:n} = readln().trim().toInt()$0
@class | data class
data class \${1:Point}(val \${2:x}: Int, val \${3:y}: Int)$0
@println | println
println(\${1:value})$0
  `,
});

export const CSHARP = spec({
  id: "csharp",
  keywords: `abstract as base bool break byte case catch char checked class const continue decimal default delegate do
    double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface
    internal is lock long namespace new null object operator out override params private protected public readonly
    ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint
    ulong unchecked unsafe ushort using virtual void volatile while var async await record init required get set
    value yield dynamic nameof`,
  types: `int long short byte bool char double float decimal string object void var String Console Math List
    Dictionary HashSet Queue Stack StringBuilder Exception Array Enumerable Random DateTime TimeSpan Task Func
    Action Tuple KeyValuePair IEnumerable ICollection IList IDictionary Convert Int32 Int64 Double Environment`,
  known: `Main args System Console WriteLine Write ReadLine this base Program`,
  imports: `System System.Collections.Generic System.Linq System.Text System.IO System.Threading.Tasks`,
  builtins: `
    T Console :: Standard input/output: Console.WriteLine(x).
    T Math :: Maths functions: Math.Max, Math.Sqrt...
    T Convert :: Conversions: Convert.ToInt32("42").
    T List<T> :: A growable list: Add, Count, [i].
    T Dictionary<TKey, TValue> :: A hash map: Add, TryGetValue, ContainsKey.
  `,
  modules: {
    Console: `
      M WriteLine(value) :: Print a value and a newline.
      M Write(value) :: Print without a newline.
      M ReadLine() :: Read a line of input (null at the end).
      M Read() :: Read one character code.
      M Clear() :: Clear the console.
    `,
    Math: `
      M Max(a, b) :: The larger value.
      M Min(a, b) :: The smaller value.
      M Abs(x) :: Absolute value.
      M Pow(double x, double y) :: x raised to y.
      M Sqrt(double x) :: Square root.
      M Round(x) :: Round to the nearest integer.
      M Floor(x) :: Round down.
      M Ceiling(x) :: Round up.
      M Log(x) :: Natural logarithm.
      C PI :: 3.14159...
    `,
    Convert: `
      M ToInt32(value) :: Convert to int.
      M ToDouble(value) :: Convert to double.
      M ToString(value) :: Convert to text.
      M ToBoolean(value) :: Convert to bool.
    `,
    int: `
      M Parse(string s) :: Convert text to int.
      M TryParse(string s, out int result) :: Convert text to int without throwing.
      C MaxValue :: 2147483647
      C MinValue :: -2147483648
    `,
    string: `
      M Join(string separator, values) :: Join values with separator.
      M IsNullOrEmpty(string s) :: True for null or "".
      M Format(string format, params object[] args) :: Formatted text.
    `,
  },
  members: `
    M Add(item) :: Add an element.
    M Remove(item) :: Remove an element.
    M Contains(item) :: Is item present?
    M Clear() :: Remove all elements.
    M ContainsKey(key) :: Is key in the dictionary?
    M TryGetValue(key, out value) :: Get a value without throwing.
    M ToString() :: Text form.
    M Split(separator) :: Split text into parts.
    M Trim() :: Text without surrounding spaces.
    M ToUpper() :: Upper-case copy.
    M ToLower() :: Lower-case copy.
    M Substring(start, length) :: Part of a string.
    M IndexOf(value) :: Position of value, or -1.
    M Replace(old, new) :: Replace text.
    M StartsWith(prefix) :: Does it start with prefix?
    M EndsWith(suffix) :: Does it end with suffix?
    M Sort() :: Sort a list in place.
    M Reverse() :: Reverse a list in place.
    M Push(item) :: Push onto a stack.
    M Pop() :: Pop from a stack.
    M Peek() :: Look at the top.
    M Enqueue(item) :: Add to a queue.
    M Dequeue() :: Remove from a queue.
    M Append(value) :: Append (StringBuilder).
    M Select(selector) :: Transform each element (LINQ).
    M Where(predicate) :: Keep matching elements (LINQ).
    M Sum() :: Sum of the elements (LINQ).
    M Max() :: Largest element (LINQ).
    M Min() :: Smallest element (LINQ).
    M OrderBy(key) :: Sort by a key (LINQ).
    M ToList() :: Copy into a List (LINQ).
    M ToArray() :: Copy into an array (LINQ).
    M First() :: First element (LINQ).
    M Any() :: True if there is any element (LINQ).
    M Count() :: Number of elements (LINQ).
    P Count :: Number of elements.
    P Length :: Number of characters / array length.
    P Keys :: The keys of a dictionary.
    P Values :: The values of a dictionary.
  `,
  snippets: `
@main | top-level program
using System;

$0
@cw | Console.WriteLine
Console.WriteLine(\${1:value});$0
@read | read a number
int \${1:n} = int.Parse(Console.ReadLine()!);$0
@for | for loop
for (int \${1:i} = 0; \${1:i} < \${2:n}; \${1:i}++)
{
\t$0
}
@foreach | foreach loop
foreach (var \${1:x} in \${2:items})
{
\t$0
}
@if | if statement
if (\${1:condition})
{
\t$0
}
@class | class
class \${1:Name}
{
\tpublic \${1:Name}() { }
\t$0
}
@try | try / catch
try
{
\t$1
}
catch (\${2:Exception} e)
{
\t$0
}
  `,
});
