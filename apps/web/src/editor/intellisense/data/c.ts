import { extend, spec } from "../spec";

export const C = spec({
  id: "c",
  separators: [".", "->"],
  keywords: `auto break case char const continue default do double else enum extern float for goto if inline int long
    register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while
    _Bool _Complex _Static_assert _Alignas _Alignof _Noreturn _Thread_local bool true false`,
  types: `int char float double long short unsigned signed void size_t ssize_t FILE bool int8_t int16_t int32_t int64_t
    uint8_t uint16_t uint32_t uint64_t ptrdiff_t time_t clock_t wchar_t intptr_t uintptr_t va_list div_t ldiv_t fpos_t off_t`,
  known: `main argc argv envp NULL EOF stdin stdout stderr errno RAND_MAX INT_MAX INT_MIN UINT_MAX LONG_MAX LONG_MIN
    LLONG_MAX LLONG_MIN CHAR_MAX CHAR_MIN SHRT_MAX SHRT_MIN FLT_MAX DBL_MAX FLT_MIN DBL_MIN EXIT_SUCCESS EXIT_FAILURE
    BUFSIZ SEEK_SET SEEK_CUR SEEK_END CLOCKS_PER_SEC M_PI M_E true false __func__ __LINE__ __FILE__ __DATE__ __TIME__
    define include ifdef ifndef endif elif undef pragma once getch getche clrscr usleep nanosleep getpid fork
    execvp waitpid wait pipe read write open close lseek dup dup2 kill signal alarm pause pthread_create pthread_join
    pthread_mutex_lock pthread_mutex_unlock pthread_t pthread_mutex_t sem_wait sem_post opendir readdir closedir
    stat mkdir rmdir chdir getcwd gettimeofday clock_gettime strerror strcasecmp strncasecmp random srandom
    drand48 isatty fileno popen pclose setvbuf fmaxf fminf sqrtf powf sinf cosf expf logf llabs labs lround
    llround trunc cbrt erf tgamma ldexp frexp modf isnan isinf nan INFINITY NAN`,
  imports: `stdio.h stdlib.h string.h math.h ctype.h stdbool.h stdint.h limits.h float.h time.h assert.h errno.h
    stddef.h stdarg.h signal.h setjmp.h locale.h wchar.h unistd.h pthread.h complex.h inttypes.h`,
  builtins: `
    F printf(const char *format, ...) :: Print formatted text to standard output. %d int, %ld long, %f double, %c char, %s string, %p pointer, %% a percent sign.
    F scanf(const char *format, ...) :: Read formatted input from standard input. Pass addresses: scanf("%d", &x). Returns how many items were read, or EOF.
    F puts(const char *s) :: Print a string and a newline.
    F putchar(int c) :: Print one character.
    F getchar(void) :: Read one character from standard input (EOF at the end).
    F fgets(char *s, int size, FILE *stream) :: Read a line (at most size-1 characters) into s; keeps the newline. Safer than gets.
    F fputs(const char *s, FILE *stream) :: Write a string to a stream (no newline added).
    F fprintf(FILE *stream, const char *format, ...) :: Print formatted text to a stream (stderr, a file...).
    F fscanf(FILE *stream, const char *format, ...) :: Read formatted input from a stream.
    F sprintf(char *str, const char *format, ...) :: Format text into a character array. Prefer snprintf.
    F snprintf(char *str, size_t size, const char *format, ...) :: Format text into a buffer of at most size bytes.
    F sscanf(const char *str, const char *format, ...) :: Read formatted values from a string.
    F fopen(const char *path, const char *mode) :: Open a file ("r", "w", "a"...). Returns NULL on failure.
    F fclose(FILE *stream) :: Close a file opened with fopen.
    F fgetc(FILE *stream) :: Read one character from a stream.
    F fputc(int c, FILE *stream) :: Write one character to a stream.
    F fread(void *ptr, size_t size, size_t count, FILE *stream) :: Read count items of size bytes.
    F fwrite(const void *ptr, size_t size, size_t count, FILE *stream) :: Write count items of size bytes.
    F feof(FILE *stream) :: Non-zero once the end of the file has been reached.
    F fflush(FILE *stream) :: Write out buffered output now.
    F fseek(FILE *stream, long offset, int whence) :: Move the file position.
    F ftell(FILE *stream) :: Current file position.
    F rewind(FILE *stream) :: Go back to the start of the file.
    F perror(const char *s) :: Print s and the message for the current errno to stderr.
    F remove(const char *path) :: Delete a file.
    F rename(const char *old, const char *new) :: Rename a file.
    F getline(char **line, size_t *n, FILE *stream) :: Read a whole line, growing the buffer as needed (POSIX).
    F malloc(size_t size) :: Allocate size bytes on the heap. Returns NULL on failure; free it later.
    F calloc(size_t count, size_t size) :: Allocate zero-filled memory for count items.
    F realloc(void *ptr, size_t size) :: Resize a heap block; may move it.
    F free(void *ptr) :: Release memory from malloc/calloc/realloc.
    F exit(int status) :: End the program with a status (EXIT_SUCCESS / EXIT_FAILURE).
    F abort(void) :: End the program abnormally.
    F atexit(void (*fn)(void)) :: Run fn when the program exits.
    F atoi(const char *s) :: Convert a string to int (0 if it is not a number).
    F atol(const char *s) :: Convert a string to long.
    F atof(const char *s) :: Convert a string to double.
    F strtol(const char *s, char **end, int base) :: Convert a string to long, reporting where parsing stopped.
    F strtod(const char *s, char **end) :: Convert a string to double.
    F rand(void) :: A pseudo-random number from 0 to RAND_MAX.
    F srand(unsigned seed) :: Seed rand(); srand(time(NULL)) gives different numbers each run.
    F abs(int x) :: Absolute value of an int.
    F labs(long x) :: Absolute value of a long.
    F qsort(void *base, size_t n, size_t size, int (*cmp)(const void *, const void *)) :: Sort an array with a comparison function.
    F bsearch(const void *key, const void *base, size_t n, size_t size, int (*cmp)(const void *, const void *)) :: Binary search in a sorted array.
    F system(const char *command) :: Run a shell command.
    F getenv(const char *name) :: Value of an environment variable, or NULL.
    F strlen(const char *s) :: Length of a string (not counting the final '\\0').
    F strcpy(char *dest, const char *src) :: Copy a string into dest (dest must be big enough).
    F strncpy(char *dest, const char *src, size_t n) :: Copy at most n characters.
    F strcat(char *dest, const char *src) :: Append src to dest.
    F strncat(char *dest, const char *src, size_t n) :: Append at most n characters.
    F strcmp(const char *a, const char *b) :: Compare strings: 0 if equal, <0 if a comes first, >0 otherwise.
    F strncmp(const char *a, const char *b, size_t n) :: Compare at most n characters.
    F strchr(const char *s, int c) :: First occurrence of c in s, or NULL.
    F strrchr(const char *s, int c) :: Last occurrence of c in s, or NULL.
    F strstr(const char *haystack, const char *needle) :: First occurrence of needle, or NULL.
    F strtok(char *s, const char *delim) :: Split a string into tokens (modifies s).
    F strdup(const char *s) :: A heap copy of s (free it later).
    F memset(void *s, int c, size_t n) :: Fill n bytes with c.
    F memcpy(void *dest, const void *src, size_t n) :: Copy n bytes (areas must not overlap).
    F memmove(void *dest, const void *src, size_t n) :: Copy n bytes (areas may overlap).
    F memcmp(const void *a, const void *b, size_t n) :: Compare n bytes.
    F sqrt(double x) :: Square root. Link with -lm.
    F pow(double base, double exp) :: base raised to exp.
    F fabs(double x) :: Absolute value of a double.
    F ceil(double x) :: Round up.
    F floor(double x) :: Round down.
    F round(double x) :: Round to the nearest integer.
    F fmod(double x, double y) :: Remainder of x / y for doubles.
    F exp(double x) :: e raised to x.
    F log(double x) :: Natural logarithm.
    F log10(double x) :: Base-10 logarithm.
    F log2(double x) :: Base-2 logarithm.
    F sin(double x) :: Sine (radians).
    F cos(double x) :: Cosine (radians).
    F tan(double x) :: Tangent (radians).
    F asin(double x) :: Arc sine.
    F acos(double x) :: Arc cosine.
    F atan(double x) :: Arc tangent.
    F atan2(double y, double x) :: Angle of the point (x, y).
    F hypot(double x, double y) :: sqrt(x*x + y*y).
    F fmax(double a, double b) :: The larger of two doubles.
    F fmin(double a, double b) :: The smaller of two doubles.
    F isalpha(int c) :: Is c a letter?
    F isdigit(int c) :: Is c a digit 0-9?
    F isalnum(int c) :: Is c a letter or digit?
    F isspace(int c) :: Is c a space, tab or newline?
    F isupper(int c) :: Is c an uppercase letter?
    F islower(int c) :: Is c a lowercase letter?
    F ispunct(int c) :: Is c punctuation?
    F toupper(int c) :: Uppercase version of c.
    F tolower(int c) :: Lowercase version of c.
    F time(time_t *t) :: Current calendar time (seconds since 1970).
    F clock(void) :: Processor time used; divide by CLOCKS_PER_SEC for seconds.
    F difftime(time_t end, time_t start) :: Seconds between two times.
    F localtime(const time_t *t) :: Break a time into fields (struct tm).
    F strftime(char *s, size_t max, const char *format, const struct tm *tm) :: Format a date/time.
    F assert(int expression) :: Stop with a message if expression is false (from assert.h).
    F sleep(unsigned seconds) :: Pause the program (POSIX, unistd.h).
    F gets(char *s) :: Removed from C11 because it can overflow the buffer: use fgets instead.
  `,
  members: `
    P next :: Usual name of the link to the next node.
    P data :: Usual name of the stored value.
    P left :: Left child.
    P right :: Right child.
  `,
  snippets: `
@main | main function | The program's entry point
#include <stdio.h>

int main(void) {
\t$0
\treturn 0;
}
@for | for loop | Count from 0 up to n
for (int \${1:i} = 0; \${1:i} < \${2:n}; \${1:i}++) {
\t$0
}
@forr | reverse for loop | Count down to 0
for (int \${1:i} = \${2:n} - 1; \${1:i} >= 0; \${1:i}--) {
\t$0
}
@while | while loop | Repeat while a condition holds
while (\${1:condition}) {
\t$0
}
@do | do-while loop | Run once, then repeat while a condition holds
do {
\t$0
} while (\${1:condition});
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
@switch | switch statement
switch (\${1:value}) {
case \${2:1}:
\t$0
\tbreak;
default:
\tbreak;
}
@func | function | A function with a return value
\${1:int} \${2:name}(\${3:int x}) {
\t$0
\treturn \${4:0};
}
@struct | struct type
struct \${1:Point} {
\t\${2:int x};
\t$0
};
@typedef | typedef struct
typedef struct {
\t\${1:int x};
\t$0
} \${2:Point};
@printf | printf | Print a value
printf("\${1:%d}\\n", \${2:value});$0
@scanf | scanf | Read a number
scanf("\${1:%d}", &\${2:value});$0
@readarr | read an array | Read n numbers into an array
int \${1:n};
scanf("%d", &\${1:n});
int \${2:a}[\${1:n}];
for (int i = 0; i < \${1:n}; i++) {
\tscanf("%d", &\${2:a}[i]);
}
$0
@malloc | malloc an array
\${1:int} *\${2:p} = malloc(\${3:n} * sizeof *\${2:p});
if (\${2:p} == NULL) {
\treturn 1;
}
$0
free(\${2:p});
@inc | #include
#include <\${1:stdio.h}>$0
  `,
});

export const CPP = extend(C, {
  id: "cpp",
  separators: [".", "->", "::"],
  keywords: `alignas alignof and and_eq asm bitand bitor catch class compl concept consteval constexpr constinit const_cast
    co_await co_return co_yield decltype delete dynamic_cast explicit export friend mutable namespace new noexcept not
    not_eq nullptr operator or or_eq private protected public reinterpret_cast requires static_assert static_cast
    template this thread_local throw try typeid typename using virtual xor xor_eq override final`,
  types: `string vector map set unordered_map unordered_set pair tuple queue stack deque list priority_queue array
    bitset optional variant any wstring string_view ostream istream ifstream ofstream stringstream istringstream
    ostringstream unique_ptr shared_ptr weak_ptr function thread mutex auto size_t`,
  known: `std cout cin cerr clog endl nullptr npos iostream this`,
  imports: `iostream vector string algorithm map set unordered_map unordered_set queue stack deque list utility
    cmath cstdio cstdlib cstring climits numeric iomanip sstream fstream memory functional tuple array bitset
    chrono random thread mutex optional variant bits/stdc++.h cassert cctype limits iterator`,
  modules: {
    std: `
      V cout :: Standard output stream: std::cout << value;
      V cin :: Standard input stream: std::cin >> value;
      V cerr :: Standard error stream.
      V endl :: Newline and flush.
      T string :: A text string that manages its own memory.
      T vector<T> :: A growable array: push_back, size, [i].
      T map<K, V> :: A sorted key -> value map.
      T unordered_map<K, V> :: A hash map (average O(1) lookups).
      T set<T> :: A sorted set of unique values.
      T unordered_set<T> :: A hash set.
      T pair<A, B> :: Two values: .first and .second.
      T queue<T> :: First in, first out: push, front, pop.
      T stack<T> :: Last in, first out: push, top, pop.
      T deque<T> :: Double-ended queue.
      T priority_queue<T> :: A max-heap: push, top, pop.
      T array<T, N> :: A fixed-size array.
      T unique_ptr<T> :: Owning smart pointer.
      T shared_ptr<T> :: Reference-counted smart pointer.
      T stringstream :: Read/write a string like a stream.
      T ifstream :: Input file stream.
      T ofstream :: Output file stream.
      F sort(first, last) :: Sort a range: std::sort(v.begin(), v.end());
      F reverse(first, last) :: Reverse a range.
      F max(a, b) :: The larger of two values.
      F min(a, b) :: The smaller of two values.
      F swap(a, b) :: Swap two values.
      F find(first, last, value) :: Iterator to the first match (or last).
      F count(first, last, value) :: How many elements equal value.
      F accumulate(first, last, init) :: Sum of a range (from <numeric>).
      F max_element(first, last) :: Iterator to the largest element.
      F min_element(first, last) :: Iterator to the smallest element.
      F binary_search(first, last, value) :: Is value in the sorted range?
      F lower_bound(first, last, value) :: First position not less than value.
      F upper_bound(first, last, value) :: First position greater than value.
      F unique(first, last) :: Remove consecutive duplicates (use with erase).
      F fill(first, last, value) :: Set every element to value.
      F getline(std::istream& in, std::string& line) :: Read a whole line into a string.
      F to_string(value) :: Number to string.
      F stoi(const std::string& s) :: String to int.
      F stol(const std::string& s) :: String to long.
      F stod(const std::string& s) :: String to double.
      F make_pair(a, b) :: Build a pair.
      F make_unique<T>(args...) :: Create a unique_ptr.
      F make_shared<T>(args...) :: Create a shared_ptr.
      F move(x) :: Allow x's resources to be moved.
      F abs(x) :: Absolute value.
      F sqrt(x) :: Square root.
      F pow(base, exp) :: Power.
      F setw(int n) :: Field width for the next output (from <iomanip>).
      F setprecision(int n) :: Digits for floating-point output (from <iomanip>).
      V fixed :: Print floating-point numbers in fixed notation.
      F gcd(a, b) :: Greatest common divisor (C++17).
      F lcm(a, b) :: Least common multiple (C++17).
      F next_permutation(first, last) :: Next lexicographic permutation.
      F iota(first, last, value) :: Fill with value, value+1, ...
      F exit(int status) :: End the program.
    `,
  },
  members: `
    M push_back(value) :: Add value at the end (vector, string, deque, list).
    M pop_back() :: Remove the last element.
    M emplace_back(args...) :: Construct an element at the end.
    M size() :: Number of elements.
    M empty() :: True when there are no elements.
    M clear() :: Remove every element.
    M begin() :: Iterator to the first element.
    M end() :: Iterator past the last element.
    M front() :: The first element.
    M back() :: The last element.
    M at(i) :: Element i, with bounds checking.
    M insert(value) :: Insert an element.
    M erase(it) :: Remove an element or range.
    M find(key) :: Iterator to key, or end().
    M count(key) :: 1 if key is present (map/set), else 0.
    M push(value) :: Add to a queue/stack/priority_queue.
    M pop() :: Remove from a queue/stack/priority_queue.
    M top() :: Top of a stack or priority_queue.
    M length() :: Length of a string.
    M substr(pos, len) :: Part of a string.
    M c_str() :: The string as a C string (const char*).
    M append(str) :: Append to a string.
    M resize(n) :: Change the number of elements.
    M reserve(n) :: Reserve capacity.
    M sort() :: Sort a list.
    P first :: First member of a pair / key of a map entry.
    P second :: Second member of a pair / value of a map entry.
  `,
  snippets: `
@main | main function | The program's entry point
#include <iostream>
using namespace std;

int main() {
\t$0
\treturn 0;
}
@cout | cout | Print a value
cout << \${1:value} << endl;$0
@cin | cin | Read a value
cin >> \${1:value};$0
@fori | range for loop | Visit every element
for (auto& \${1:x} : \${2:items}) {
\t$0
}
@vector | vector
vector<\${1:int}> \${2:v};$0
@class | class
class \${1:Name} {
public:
\t\${1:Name}() {}
\t$0
private:
};
@readvec | read a vector | Read n numbers into a vector
int \${1:n};
cin >> \${1:n};
vector<int> \${2:v}(\${1:n});
for (auto& x : \${2:v}) cin >> x;
$0
  `,
});
