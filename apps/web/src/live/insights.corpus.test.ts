// False-positive guard for the Typo Guard: ordinary, correct student
// programs (sorting, linked lists, classes, collections, recursion, file I/O)
// must produce no typo warnings at all.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { Language, Parser } from "web-tree-sitter";
import { analyzeInsights, type InsightCursor, type TipNode } from "./insights";

const require = createRequire(import.meta.url);
const WASM: Record<string, string> = {
  c: "tree-sitter-c/tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp/tree-sitter-cpp.wasm",
  java: "tree-sitter-java/tree-sitter-java.wasm",
  python: "tree-sitter-python/tree-sitter-python.wasm",
  go: "tree-sitter-go/tree-sitter-go.wasm",
  rust: "tree-sitter-rust/tree-sitter-rust.wasm",
  csharp: "tree-sitter-c-sharp/tree-sitter-c_sharp.wasm",
  kotlin: "@tree-sitter-grammars/tree-sitter-kotlin/tree-sitter-kotlin.wasm",
  php: "tree-sitter-php/tree-sitter-php.wasm",
  ruby: "tree-sitter-ruby/tree-sitter-ruby.wasm",
  lua: "@tree-sitter-grammars/tree-sitter-lua/tree-sitter-lua.wasm",
  bash: "tree-sitter-bash/tree-sitter-bash.wasm",
};
const parsers = new Map<string, Parser>();
beforeAll(async () => {
  await Parser.init();
  for (const [id, path] of Object.entries(WASM)) {
    const parser = new Parser();
    parser.setLanguage(await Language.load(readFileSync(require.resolve(path))));
    parsers.set(id, parser);
  }
});

function typoMessages(lang: string, source: string): string[] {
  const tree = parsers.get(lang)!.parse(source)!;
  try {
    return analyzeInsights(tree.walk() as unknown as InsightCursor, source, lang, { tips: tree.rootNode as unknown as TipNode }).typos.map(
      (t) => `line ${t.startLine}: ${t.message}`,
    );
  } finally {
    tree.delete();
  }
}

const PROGRAMS: Record<string, string[]> = {
  c: [
    `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Node {
    int data;
    struct Node *next;
} Node;

Node *push(Node *head, int value) {
    Node *node = malloc(sizeof *node);
    if (node == NULL) {
        perror("malloc");
        exit(EXIT_FAILURE);
    }
    node->data = value;
    node->next = head;
    return node;
}

void bubble_sort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - i - 1; j++)
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
}

int main(int argc, char *argv[]) {
    int n;
    if (scanf("%d", &n) != 1) return 1;
    int *values = calloc(n, sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &values[i]);
    bubble_sort(values, n);
    Node *list = NULL;
    for (int i = 0; i < n; i++) list = push(list, values[i]);
    char name[32];
    strcpy(name, "sorted");
    printf("%s:", name);
    for (Node *p = list; p != NULL; p = p->next) printf(" %d", p->data);
    putchar('\\n');
    free(values);
    FILE *fp = fopen("out.txt", "w");
    if (fp) { fprintf(fp, "%d\\n", n); fclose(fp); }
    switch (argc) {
        case 1: puts("no arguments"); break;
        default: printf("%s\\n", argv[1]);
    }
    return 0;
}
`,
    `#include <stdio.h>
#include <math.h>
#define MAX 10

int factorial(int n) { return n <= 1 ? 1 : n * factorial(n - 1); }

int main(void) {
    int matrix[MAX][MAX], rows = 3, cols = 3;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
            matrix[r][c] = r * cols + c;
    double root = sqrt(16.0);
    char text[] = "hello";
    int length = strlen(text);
    printf("%d %.2f %d %d\\n", factorial(5), root, length, matrix[2][2]);
    return 0;
}
`,
  ],
  cpp: [
    `#include <bits/stdc++.h>
using namespace std;

class Student {
public:
    string name;
    int marks;
    Student(string n, int m) : name(n), marks(m) {}
    bool passed() const { return marks >= 40; }
};

int main() {
    int n;
    cin >> n;
    vector<Student> students;
    for (int i = 0; i < n; i++) {
        string name; int marks;
        cin >> name >> marks;
        students.push_back(Student(name, marks));
    }
    sort(students.begin(), students.end(), [](const Student& a, const Student& b) { return a.marks > b.marks; });
    map<string, int> counts;
    for (const auto& s : students) counts[s.passed() ? "pass" : "fail"]++;
    for (auto& [key, value] : counts) cout << key << " " << value << endl;
    unordered_set<int> seen;
    stack<int> st;
    st.push(1);
    cout << st.top() << " " << seen.size() << '\\n';
    return 0;
}
`,
  ],
  java: [
    `import java.util.*;

interface Shape { double area(); }

class Circle implements Shape {
    private final double radius;
    Circle(double radius) { this.radius = radius; }
    @Override
    public double area() { return Math.PI * radius * radius; }
}

public class Main {
    static int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        List<Integer> numbers = new ArrayList<>();
        for (int i = 0; i < n; i++) numbers.add(sc.nextInt());
        Collections.sort(numbers);
        Map<String, Integer> freq = new HashMap<>();
        for (String word : "a b a".split(" ")) freq.put(word, freq.getOrDefault(word, 0) + 1);
        StringBuilder sb = new StringBuilder();
        for (int x : numbers) sb.append(x).append(' ');
        System.out.println(sb.toString().trim());
        Shape shape = new Circle(2.0);
        System.out.printf("%.2f%n", shape.area());
        try {
            int value = Integer.parseInt("42");
            System.out.println(value / fib(3));
        } catch (NumberFormatException e) {
            System.out.println("not a number: " + e.getMessage());
        }
        int[] arr = {3, 1, 2};
        Arrays.sort(arr);
        System.out.println(Arrays.toString(arr) + " " + freq.size() + " " + Math.max(1, 2));
        sc.close();
    }
}
`,
  ],
  python: [
    `import math
import random
from collections import Counter, defaultdict


class Student:
    def __init__(self, name, marks):
        self.name = name
        self.marks = marks

    def grade(self):
        if self.marks >= 90:
            return "A"
        elif self.marks >= 75:
            return "B"
        return "C"

    def __str__(self):
        return f"{self.name}: {self.grade()}"


def read_students():
    n = int(input())
    students = []
    for _ in range(n):
        name, marks = input().split()
        students.append(Student(name, int(marks)))
    return students


def main():
    students = read_students()
    students.sort(key=lambda s: s.marks, reverse=True)
    counts = Counter(s.grade() for s in students)
    groups = defaultdict(list)
    for index, student in enumerate(students, start=1):
        groups[student.grade()].append(index)
    squares = [x * x for x in range(10) if x % 2 == 0]
    total = sum(s.marks for s in students)
    average = total / len(students) if students else 0
    try:
        value = int("12")
    except ValueError as error:
        print(error)
        value = 0
    with open("out.txt", "w") as handle:
        handle.write(str(value))
    print(math.sqrt(16), random.randint(1, 6), counts.most_common(1), squares, round(average, 2))
    print(*students, sep="\\n")


if __name__ == "__main__":
    main()
`,
  ],
  go: [
    `package main

import (
\t"bufio"
\t"fmt"
\t"os"
\t"sort"
\t"strconv"
\t"strings"
)

type Student struct {
\tName  string
\tMarks int
}

func (s Student) Passed() bool { return s.Marks >= 40 }

func main() {
\treader := bufio.NewReader(os.Stdin)
\tline, _ := reader.ReadString('\\n')
\tn, err := strconv.Atoi(strings.TrimSpace(line))
\tif err != nil {
\t\tfmt.Println("bad input")
\t\treturn
\t}
\tstudents := make([]Student, 0, n)
\tfor i := 0; i < n; i++ {
\t\tstudents = append(students, Student{Name: fmt.Sprintf("s%d", i), Marks: i * 10})
\t}
\tsort.Slice(students, func(i, j int) bool { return students[i].Marks > students[j].Marks })
\tcounts := map[bool]int{}
\tfor _, s := range students {
\t\tcounts[s.Passed()]++
\t}
\tfmt.Println(len(students), counts[true])
}
`,
  ],
  rust: [
    `use std::collections::HashMap;
use std::io::{self, Read};

struct Student {
    name: String,
    marks: u32,
}

impl Student {
    fn passed(&self) -> bool {
        self.marks >= 40
    }
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut students: Vec<Student> = input
        .lines()
        .filter_map(|line| {
            let mut parts = line.split_whitespace();
            let name = parts.next()?.to_string();
            let marks = parts.next()?.parse().ok()?;
            Some(Student { name, marks })
        })
        .collect();
    students.sort_by(|a, b| b.marks.cmp(&a.marks));
    let mut counts: HashMap<bool, usize> = HashMap::new();
    for s in &students {
        *counts.entry(s.passed()).or_insert(0) += 1;
    }
    for s in students.iter() {
        println!("{} {}", s.name, s.marks);
    }
    println!("{:?}", counts.get(&true));
}
`,
  ],
  csharp: [
    `using System;
using System.Collections.Generic;
using System.Linq;

class Student
{
    public string Name { get; set; }
    public int Marks { get; set; }
    public bool Passed() => Marks >= 40;
}

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine()!);
        var students = new List<Student>();
        for (int i = 0; i < n; i++)
        {
            var parts = Console.ReadLine()!.Split(' ');
            students.Add(new Student { Name = parts[0], Marks = int.Parse(parts[1]) });
        }
        var passed = students.Where(s => s.Passed()).OrderBy(s => s.Name).ToList();
        var counts = new Dictionary<string, int>();
        foreach (var s in students) counts[s.Name] = s.Marks;
        Console.WriteLine($"{passed.Count} of {students.Count} passed; max {Math.Max(1, 2)}");
    }
}
`,
  ],
  kotlin: [
    `data class Student(val name: String, val marks: Int) {
    fun passed(): Boolean = marks >= 40
}

fun main() {
    val n = readln().trim().toInt()
    val students = mutableListOf<Student>()
    repeat(n) { i ->
        val parts = readln().split(" ")
        students.add(Student(parts[0], parts[1].toInt() + i))
    }
    val sorted = students.sortedByDescending { it.marks }
    val passed = sorted.filter { it.passed() }.map { it.name }
    for ((index, s) in sorted.withIndex()) {
        println("\${index + 1}. \${s.name}")
    }
    println(passed.joinToString(", "))
}
`,
  ],
  php: [
    `<?php
function average(array $marks): float {
    return count($marks) ? array_sum($marks) / count($marks) : 0.0;
}

class Student {
    public function __construct(public string $name, public int $marks) {}
    public function passed(): bool { return $this->marks >= 40; }
}

$n = intval(trim(fgets(STDIN)));
$students = [];
for ($i = 0; $i < $n; $i++) {
    [$name, $marks] = explode(" ", trim(fgets(STDIN)));
    $students[] = new Student($name, intval($marks));
}
usort($students, fn($a, $b) => $b->marks <=> $a->marks);
$names = array_map(fn($s) => $s->name, $students);
echo implode(", ", $names) . PHP_EOL;
echo number_format(average(array_map(fn($s) => $s->marks, $students)), 2) . PHP_EOL;
`,
  ],
  ruby: [
    `class Student
  attr_reader :name, :marks

  def initialize(name, marks)
    @name = name
    @marks = marks
  end

  def passed?
    marks >= 40
  end
end

n = gets.to_i
students = Array.new(n) do
  name, marks = gets.split
  Student.new(name, marks.to_i)
end
students.sort_by! { |s| -s.marks }
passed = students.select(&:passed?).map(&:name)
students.each_with_index do |s, i|
  puts "#{i + 1}. #{s.name}"
end
puts passed.join(", ")
`,
  ],
  lua: [
    `local function average(list)
  local total = 0
  for _, value in ipairs(list) do
    total = total + value
  end
  return #list > 0 and total / #list or 0
end

local n = io.read("n")
local marks = {}
for i = 1, n do
  marks[#marks + 1] = io.read("n")
end
table.sort(marks, function(a, b) return a > b end)
print(string.format("%.2f", average(marks)), table.concat(marks, " "), math.max(1, 2))
`,
  ],
  bash: [
    `#!/usr/bin/env bash
set -euo pipefail

read -r n
total=0
for ((i = 1; i <= n; i++)); do
  read -r value
  total=$((total + value))
done
average=$(echo "scale=2; $total / $n" | bc)
if [[ "$total" -gt 100 ]]; then
  echo "big: $total"
else
  printf 'small: %d\\n' "$total"
fi
greet() {
  local name="$1"
  echo "Hello, $name"
}
greet "Asha"
echo "$average" | cut -d. -f1
`,
  ],
};

describe("Typo Guard corpus: correct programs produce no warnings", () => {
  for (const [lang, programs] of Object.entries(PROGRAMS)) {
    programs.forEach((source, i) => {
      it(`${lang} program ${i + 1}`, () => {
        expect(typoMessages(lang, source)).toEqual([]);
      });
    });
  }
});
