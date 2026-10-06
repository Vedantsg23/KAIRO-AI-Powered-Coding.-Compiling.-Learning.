import { spec } from "../spec";

export const PYTHON = spec({
  id: "python",
  keywords: `False None True and as assert async await break class continue def del elif else except finally for from
    global if import in is lambda nonlocal not or pass raise return try while with yield match case`,
  types: `int float str bool list dict set tuple frozenset bytes bytearray complex object type range Exception
    ValueError TypeError IndexError KeyError ZeroDivisionError NameError AttributeError RuntimeError StopIteration
    FileNotFoundError IOError OSError ImportError NotImplementedError RecursionError AssertionError
    UnboundLocalError OverflowError MemoryError KeyboardInterrupt ArithmeticError LookupError`,
  known: `self cls __name__ __main__ __init__ __str__ __repr__ __len__ __eq__ __lt__ __file__ __doc__ args kwargs
    main`,
  imports: `math random sys os collections itertools functools heapq bisect string re json time datetime statistics
    decimal fractions typing dataclasses copy pprint operator array queue csv pathlib unittest`,
  builtins: `
    F print(*values, sep=' ', end='\\n') :: Print values separated by sep, then end.
    F input(prompt='') :: Read a line of text (always a str: use int(input()) for numbers).
    F len(obj) :: Number of items in a sequence or collection.
    F range(start, stop, step) :: Numbers from start up to (not including) stop.
    F int(x) :: Convert to a whole number: int("42") -> 42.
    F float(x) :: Convert to a decimal number.
    F str(x) :: Convert to text.
    F bool(x) :: Truth value of x.
    F list(iterable) :: A new list.
    F dict(**pairs) :: A new dictionary.
    F set(iterable) :: A new set (unique values).
    F tuple(iterable) :: A new tuple.
    F sum(iterable, start=0) :: Add up the items.
    F min(iterable) :: Smallest item (or smallest argument).
    F max(iterable) :: Largest item (or largest argument).
    F abs(x) :: Absolute value.
    F round(x, ndigits=None) :: Round to ndigits decimals.
    F sorted(iterable, key=None, reverse=False) :: A new sorted list.
    F reversed(seq) :: Iterate backwards.
    F enumerate(iterable, start=0) :: Pairs (index, item).
    F zip(*iterables) :: Walk several sequences together.
    F map(function, iterable) :: Apply function to every item.
    F filter(function, iterable) :: Keep items for which function is true.
    F any(iterable) :: True if any item is true.
    F all(iterable) :: True if every item is true.
    F isinstance(obj, cls) :: Is obj an instance of cls?
    F type(obj) :: The type of obj.
    F open(file, mode='r') :: Open a file; use "with open(...) as f".
    F divmod(a, b) :: (a // b, a % b).
    F pow(base, exp, mod=None) :: base ** exp (optionally modulo mod).
    F chr(i) :: Character with code i.
    F ord(c) :: Code of character c.
    F hex(x) :: Hexadecimal text of an int.
    F bin(x) :: Binary text of an int.
    F oct(x) :: Octal text of an int.
    F id(obj) :: Identity of an object.
    F hash(obj) :: Hash value.
    F help(obj) :: Built-in help.
    F dir(obj) :: Names defined on obj.
    F iter(obj) :: An iterator.
    F next(iterator, default) :: Next item of an iterator.
    F format(value, spec) :: Format a value.
    F repr(obj) :: Printable representation.
    F eval(expression) :: Evaluate a Python expression (avoid with untrusted input).
    F exec(code) :: Run Python code.
    F getattr(obj, name, default) :: Attribute by name.
    F setattr(obj, name, value) :: Set an attribute by name.
    F hasattr(obj, name) :: Does obj have the attribute?
    F super() :: The parent class (inside a method).
    F staticmethod(f) :: Method without self.
    F classmethod(f) :: Method receiving the class.
    F property(fget) :: Managed attribute.
    F vars(obj) :: The __dict__ of obj.
    F globals() :: Global names.
    F locals() :: Local names.
    F callable(obj) :: Can obj be called?
    F exit(code=0) :: Stop the program.
  `,
  modules: {
    math: `
      F sqrt(x) :: Square root.
      F pow(x, y) :: x raised to y (a float).
      F floor(x) :: Round down to an int.
      F ceil(x) :: Round up to an int.
      F factorial(n) :: n!
      F gcd(a, b) :: Greatest common divisor.
      F lcm(a, b) :: Least common multiple.
      F isqrt(n) :: Integer square root.
      F log(x, base) :: Logarithm (natural by default).
      F log10(x) :: Base-10 logarithm.
      F log2(x) :: Base-2 logarithm.
      F exp(x) :: e raised to x.
      F sin(x) :: Sine (radians).
      F cos(x) :: Cosine (radians).
      F tan(x) :: Tangent (radians).
      F radians(deg) :: Degrees to radians.
      F degrees(rad) :: Radians to degrees.
      F hypot(x, y) :: sqrt(x*x + y*y).
      F fabs(x) :: Absolute value (float).
      F comb(n, k) :: Ways to choose k from n.
      F perm(n, k) :: Ordered arrangements.
      F isclose(a, b) :: Are two floats close?
      F prod(iterable) :: Product of the items.
      C pi :: 3.14159...
      C e :: 2.71828...
      C inf :: Infinity.
    `,
    random: `
      F randint(a, b) :: Random int from a to b (both included).
      F random() :: Random float in [0, 1).
      F choice(seq) :: A random item.
      F shuffle(seq) :: Shuffle a list in place.
      F sample(population, k) :: k unique random items.
      F uniform(a, b) :: Random float between a and b.
      F seed(a) :: Seed the generator.
      F randrange(start, stop, step) :: Random item from range().
    `,
    sys: `
      V argv :: Command-line arguments.
      V stdin :: Standard input: sys.stdin.readline() is fast input.
      V stdout :: Standard output.
      V stderr :: Standard error.
      F exit(code=0) :: Stop the program.
      F setrecursionlimit(n) :: Allow deeper recursion.
      V maxsize :: Largest list index.
    `,
    "sys.stdin": `
      M readline() :: Read one line (with the newline).
      M read() :: Read everything.
      M readlines() :: Read all lines into a list.
    `,
    os: `
      F listdir(path) :: Names in a directory.
      F getcwd() :: Current directory.
      V path :: Path helpers: os.path.join, exists...
      V environ :: Environment variables.
    `,
    collections: `
      T Counter(iterable) :: Count items: Counter("hello")["l"] == 2.
      T defaultdict(factory) :: A dict with a default value for missing keys.
      T deque(iterable) :: Fast append/pop at both ends.
      T OrderedDict() :: A dict that remembers insertion order.
      F namedtuple(name, fields) :: A tuple with named fields.
    `,
    itertools: `
      F permutations(iterable, r) :: All orderings.
      F combinations(iterable, r) :: All r-item selections.
      F product(*iterables) :: Cartesian product.
      F accumulate(iterable) :: Running totals.
      F chain(*iterables) :: One iterable after another.
      F count(start, step) :: Endless counter.
      F cycle(iterable) :: Repeat forever.
      F groupby(iterable, key) :: Group consecutive items.
    `,
    functools: `
      F reduce(function, iterable, initial) :: Combine items pairwise.
      F lru_cache(maxsize) :: Memoize a function (decorator).
      F cache(func) :: Unbounded memoization (decorator).
      F partial(func, *args) :: Pre-fill arguments.
    `,
    heapq: `
      F heappush(heap, item) :: Push onto a min-heap.
      F heappop(heap) :: Pop the smallest item.
      F heapify(list) :: Turn a list into a heap.
      F nlargest(n, iterable) :: n largest items.
      F nsmallest(n, iterable) :: n smallest items.
    `,
    time: `
      F time() :: Seconds since 1970.
      F sleep(seconds) :: Pause.
      F perf_counter() :: High-resolution timer.
    `,
    json: `
      F dumps(obj) :: Object to JSON text.
      F loads(text) :: JSON text to object.
      F dump(obj, file) :: Write JSON to a file.
      F load(file) :: Read JSON from a file.
    `,
    statistics: `
      F mean(data) :: Average.
      F median(data) :: Middle value.
      F mode(data) :: Most common value.
      F stdev(data) :: Standard deviation.
    `,
    re: `
      F match(pattern, string) :: Match at the start.
      F search(pattern, string) :: First match anywhere.
      F findall(pattern, string) :: All matches.
      F sub(pattern, repl, string) :: Replace matches.
      F split(pattern, string) :: Split on matches.
      F compile(pattern) :: A reusable pattern.
    `,
    string: `
      C ascii_letters :: a-z and A-Z.
      C ascii_lowercase :: a-z.
      C ascii_uppercase :: A-Z.
      C digits :: 0-9.
      C punctuation :: Punctuation characters.
    `,
    bisect: `
      F bisect_left(list, x) :: Insertion point before equal items.
      F bisect_right(list, x) :: Insertion point after equal items.
      F insort(list, x) :: Insert keeping the list sorted.
    `,
    datetime: `
      T datetime :: Date and time.
      T date :: A calendar date.
      T timedelta :: A duration.
    `,
  },
  members: `
    M append(x) :: Add x to the end of a list.
    M extend(iterable) :: Add every item of iterable.
    M insert(i, x) :: Insert x at position i.
    M remove(x) :: Remove the first x (ValueError if missing).
    M pop(i=-1) :: Remove and return an item.
    M clear() :: Remove all items.
    M index(x) :: Position of x.
    M count(x) :: How many times x appears.
    M sort(key=None, reverse=False) :: Sort a list in place.
    M reverse() :: Reverse a list in place.
    M copy() :: Shallow copy.
    M keys() :: The keys of a dict.
    M values() :: The values of a dict.
    M items() :: (key, value) pairs of a dict.
    M get(key, default=None) :: Value for key, or default.
    M update(other) :: Add/replace entries.
    M setdefault(key, default) :: Get, inserting default if missing.
    M add(x) :: Add to a set.
    M discard(x) :: Remove from a set if present.
    M union(other) :: Set union.
    M intersection(other) :: Set intersection.
    M difference(other) :: Set difference.
    M split(sep=None) :: Split text into a list of words.
    M join(iterable) :: Join strings: ", ".join(names).
    M strip() :: Text without surrounding white space.
    M lstrip() :: Remove leading white space.
    M rstrip() :: Remove trailing white space.
    M upper() :: Upper-case copy.
    M lower() :: Lower-case copy.
    M title() :: Title-case copy.
    M capitalize() :: First letter upper case.
    M replace(old, new) :: Replace text.
    M find(sub) :: Position of sub, or -1.
    M startswith(prefix) :: Does the text start with prefix?
    M endswith(suffix) :: Does the text end with suffix?
    M isdigit() :: Only digits?
    M isalpha() :: Only letters?
    M isalnum() :: Only letters and digits?
    M isspace() :: Only white space?
    M isupper() :: All upper case?
    M islower() :: All lower case?
    M format(*args) :: Format text: "{} + {}".format(a, b).
    M zfill(width) :: Pad with zeros.
    M center(width) :: Centered text.
    M read() :: Read a whole file.
    M readline() :: Read one line.
    M readlines() :: Read all lines.
    M write(text) :: Write to a file.
    M close() :: Close a file.
    M most_common(n) :: n most common items (Counter).
    M appendleft(x) :: Add to the left (deque).
    M popleft() :: Remove from the left (deque).
  `,
  snippets: `
@main | main guard | Run main() when the file is executed
def main():
\t$0


if __name__ == "__main__":
\tmain()
@def | function
def \${1:name}(\${2:x}):
\t\${0:return x}
@for | for loop over a range
for \${1:i} in range(\${2:n}):
\t$0
@fore | for loop over items
for \${1:item} in \${2:items}:
\t$0
@enum | for with index
for \${1:i}, \${2:item} in enumerate(\${3:items}):
\t$0
@while | while loop
while \${1:condition}:
\t$0
@if | if statement
if \${1:condition}:
\t$0
@ife | if / else
if \${1:condition}:
\t$1
else:
\t$0
@elif | if / elif / else
if \${1:condition}:
\t$2
elif \${3:condition}:
\t$4
else:
\t$0
@try | try / except
try:
\t$1
except \${2:ValueError} as e:
\t$0
@class | class
class \${1:Name}:
\tdef __init__(self, \${2:value}):
\t\tself.\${2:value} = \${2:value}
\t$0
@readint | read a number
\${1:n} = int(input())$0
@readlist | read numbers on one line
\${1:nums} = list(map(int, input().split()))$0
@with | open a file
with open("\${1:data.txt}") as \${2:f}:
\t$0
@lc | list comprehension
[\${1:x} for \${1:x} in \${2:items}\${3: if \${4:condition}}]$0
@print | print
print(\${1:value})$0
@fstr | f-string print
print(f"\${1:value} = {\${1:value}}")$0
  `,
});
