"""Test programs for test_languages.py, one block per language.

Every language provides the same cases:

  hello          reads a name from standard input and prints "Hello, <name>!"
  compile_error  (source, code, line): rejected by the compile or check step,
                 so the program never starts. None for languages that have
                 no such step (SQL runs statement by statement).
  runtime_error  (source, code, line): stops while running. line is None
                 when the error carries no source position.
  memory_codes   codes that may report the memory hog besides LIMIT_MEMORY,
                 i.e. the language runtime's own out-of-memory error.
  loop, memory, bomb, network, write, flood
                 hostile programs the sandbox must contain. `network` prints
                 BLOCKED when its connection attempt fails; `write` prints
                 BLOCKED when the read-only workspace refuses the write.

SQL has no standard input, sockets or processes of its own: its hello
program uses a table instead of input, and the process, network and file
checks go through the sqlite3 shell's `.shell` command, which runs inside
the same sandbox as every other program.

A key set to None means the language cannot express that program at all
(Verilog has no process or socket API); the test is skipped with a reason.

Adding a language: add a block here with every key; the tests pick it up.
"""

from __future__ import annotations

import json
from textwrap import dedent


def src(text: str) -> str:
    return dedent(text).lstrip("\n")


PROGRAMS: dict[str, dict] = {}

# ------------------------------------------------------------------------ C
PROGRAMS["c"] = {
    "hello": src(r'''
        #include <stdio.h>
        int main(void){char n[32]; if(scanf("%31s", n)==1) printf("Hello, %s!\n", n); return 0;}
    '''),
    "compile_error": (src(r'''
        #include <stdio.h>
        int main(void){
            int x = 1
            printf("%d", x);
        }
    '''), "C_MISSING_SEMICOLON", 4),
    "runtime_error": (src(r'''
        #include <assert.h>
        int main(void){
            int x = -1;
            assert(x >= 0);
        }
    '''), "C_ASSERTION_FAILED", 4),
    "memory_codes": set(),
    "loop": "int main(void){ for(;;){} }\n",
    "memory": src(r'''
        #include <stdlib.h>
        #include <string.h>
        int main(void){ for(;;){ char *p = malloc(1<<20); if(!p) return 1; memset(p, 1, 1<<20);} }
    '''),
    "bomb": "#include <unistd.h>\nint main(void){ for(;;) fork(); }\n",
    "network": src(r'''
        #include <stdio.h>
        #include <sys/socket.h>
        #include <netinet/in.h>
        #include <arpa/inet.h>
        int main(void){ int s = socket(AF_INET, SOCK_STREAM, 0); struct sockaddr_in a = {0};
          a.sin_family = AF_INET; a.sin_port = htons(80); inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
          puts(connect(s, (struct sockaddr*)&a, sizeof a) == 0 ? "CONNECTED" : "BLOCKED"); }
    '''),
    "write": '#include <stdio.h>\nint main(void){ puts(fopen("/workspace/x", "w") ? "WROTE" : "BLOCKED"); }\n',
    "flood": '#include <stdio.h>\nint main(void){ for(;;) puts("spam spam spam spam"); }\n',
}

# ---------------------------------------------------------------------- C++
PROGRAMS["cpp"] = {
    "hello": src(r'''
        #include <iostream>
        #include <string>
        int main(){ std::string n; std::cin >> n; std::cout << "Hello, " << n << "!" << std::endl; }
    '''),
    "compile_error": ("#include <iostream>\nint main(){\n    std::cout << totl;\n}\n", "CPP_UNDECLARED_IDENTIFIER", 3),
    # An uncaught exception carries no source position in the program's output.
    "runtime_error": ("#include <vector>\nint main(){\n    std::vector<int> v(2);\n    return v.at(5);\n}\n",
                      "CPP_UNCAUGHT_EXCEPTION", None),
    "memory_codes": {"CPP_UNCAUGHT_EXCEPTION"},  # std::bad_alloc
    "loop": "int main(){ for(;;){} }\n",
    "memory": src(r'''
        #include <vector>
        #include <cstring>
        int main(){ std::vector<char*> keep; for(;;){ char *p = new char[1<<20];
          std::memset(p, 1, 1<<20); keep.push_back(p);} }
    '''),
    "bomb": "#include <unistd.h>\nint main(){ for(;;) fork(); }\n",
    "network": src(r'''
        #include <cstdio>
        #include <sys/socket.h>
        #include <netinet/in.h>
        #include <arpa/inet.h>
        int main(){ int s = socket(AF_INET, SOCK_STREAM, 0); sockaddr_in a{}; a.sin_family = AF_INET;
          a.sin_port = htons(80); inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
          std::puts(connect(s, (sockaddr*)&a, sizeof a) == 0 ? "CONNECTED" : "BLOCKED"); }
    '''),
    "write": '#include <cstdio>\nint main(){ std::puts(std::fopen("/workspace/x", "w") ? "WROTE" : "BLOCKED"); }\n',
    "flood": '#include <iostream>\nint main(){ for(;;) std::cout << "spam spam spam spam\\n"; }\n',
}

# --------------------------------------------------------------------- Java
PROGRAMS["java"] = {
    "hello": src(r'''
        import java.util.Scanner;
        public class Main {
            public static void main(String[] args) {
                String n = new Scanner(System.in).next();
                System.out.println("Hello, " + n + "!");
            }
        }
    '''),
    "compile_error": (src(r'''
        public class Main {
            public static void main(String[] a) {
                int x = "five";
            }
        }
    '''), "JAVA_INCOMPATIBLE_TYPES", 3),
    "runtime_error": (src(r'''
        public class Main {
            public static void main(String[] a) {
                int[] v = new int[2];
                System.out.println(v[5]);
            }
        }
    '''), "JAVA_INDEX_OUT_OF_BOUNDS", 4),
    "memory_codes": {"JAVA_OUT_OF_MEMORY"},
    "loop": "public class Main { public static void main(String[] a) { while (true) {} } }\n",
    "memory": src(r'''
        import java.util.*;
        public class Main { public static void main(String[] a) {
          List<long[]> k = new ArrayList<>(); while (true) k.add(new long[1_000_000]); } }
    '''),
    "bomb": src(r'''
        public class Main { public static void main(String[] a) { while (true) { new Thread(() -> {
          try { Thread.sleep(60_000); } catch (InterruptedException e) {} }).start(); } } }
    '''),
    "network": src(r'''
        public class Main { public static void main(String[] a) { try (var s = new java.net.Socket()) {
          s.connect(new java.net.InetSocketAddress("1.1.1.1", 80), 2000); System.out.println("CONNECTED");
          } catch (Exception e) { System.out.println("BLOCKED"); } } }
    '''),
    "write": src(r'''
        public class Main { public static void main(String[] a) { try { new java.io.FileWriter("/workspace/x")
          .close(); System.out.println("WROTE"); } catch (Exception e) { System.out.println("BLOCKED"); } } }
    '''),
    "flood": 'public class Main { public static void main(String[] a) { while (true) System.out.println("spam spam spam"); } }\n',
}

# ------------------------------------------------------------------- Python
PROGRAMS["python"] = {
    "hello": 'n = input()\nprint(f"Hello, {n}!")\n',
    "compile_error": ("def f(x)\n    return x\n", "PY_MISSING_COLON", 1),
    "runtime_error": ("values = [1, 2]\ntotal = 0\nprint(values[total + 5])\n", "PY_INDEX_ERROR", 3),
    "memory_codes": {"PY_MEMORY_ERROR"},
    "loop": "while True:\n    pass\n",
    "memory": "keep = []\nwhile True:\n    keep.append(bytearray(10_000_000))\n",
    "bomb": "import os\nwhile True:\n    os.fork()\n",
    "network": src('''
        import socket
        try:
            socket.create_connection(('1.1.1.1', 80), timeout=2)
            print('CONNECTED')
        except OSError:
            print('BLOCKED')
    '''),
    "write": src('''
        try:
            open('/workspace/x', 'w').close()
            print('WROTE')
        except OSError:
            print('BLOCKED')
    '''),
    "flood": "while True:\n    print('spam spam spam spam')\n",
}

# --------------------------------------------------------------- JavaScript
PROGRAMS["javascript"] = {
    "hello": src(r'''
        const name = require("fs").readFileSync(0, "utf8").trim();
        console.log(`Hello, ${name}!`);
    '''),
    "compile_error": ("const a = 1;\nconst b = (a + ;\nconsole.log(b);\n", "JS_SYNTAX_ERROR", 2),
    "runtime_error": ("const values = [1, 2];\nconsole.log(totl);\n", "JS_NOT_DEFINED", 2),
    "memory_codes": {"JS_OUT_OF_MEMORY"},
    "loop": "for (;;) {}\n",
    "memory": "const keep = [];\nfor (;;) keep.push(new Array(1e6).fill(1));\n",
    "bomb": src(r'''
        const { spawn } = require("child_process");
        for (;;) spawn("sleep", ["60"], { stdio: "ignore" }).on("error", () => {});
    '''),
    "network": src(r'''
        const socket = require("net").connect(80, "1.1.1.1");
        socket.setTimeout(2000);
        socket.on("connect", () => { console.log("CONNECTED"); socket.destroy(); });
        socket.on("error", () => console.log("BLOCKED"));
        socket.on("timeout", () => { console.log("BLOCKED"); socket.destroy(); });
    '''),
    "write": src(r'''
        try {
          require("fs").writeFileSync("/workspace/x", "x");
          console.log("WROTE");
        } catch (e) {
          console.log("BLOCKED");
        }
    '''),
    "flood": 'for (;;) console.log("spam spam spam spam");\n',
}

# --------------------------------------------------------------- TypeScript
PROGRAMS["typescript"] = {
    "hello": src(r'''
        import * as fs from "fs";
        const name: string = fs.readFileSync(0, "utf8").trim();
        console.log(`Hello, ${name}!`);
    '''),
    "compile_error": ('let count: number = 0;\ncount = "five";\nconsole.log(count);\n', "TS_TYPE_MISMATCH", 2),
    "runtime_error": ("const n: any = 5;\nfor (const x of n) console.log(x);\n", "JS_NOT_ITERABLE", 2),
    "memory_codes": {"JS_OUT_OF_MEMORY"},
    "loop": "for (;;) {}\n",
    "memory": "const keep: number[][] = [];\nfor (;;) keep.push(new Array<number>(1e6).fill(1));\n",
    "bomb": src(r'''
        import { spawn } from "child_process";
        for (;;) spawn("sleep", ["60"], { stdio: "ignore" }).on("error", () => {});
    '''),
    "network": src(r'''
        import * as net from "net";
        const socket = net.connect(80, "1.1.1.1");
        socket.setTimeout(2000);
        socket.on("connect", () => { console.log("CONNECTED"); socket.destroy(); });
        socket.on("error", () => console.log("BLOCKED"));
        socket.on("timeout", () => { console.log("BLOCKED"); socket.destroy(); });
    '''),
    "write": src(r'''
        import * as fs from "fs";
        try {
          fs.writeFileSync("/workspace/x", "x");
          console.log("WROTE");
        } catch {
          console.log("BLOCKED");
        }
    '''),
    "flood": 'for (;;) console.log("spam spam spam spam");\n',
}

# ----------------------------------------------------------------------- Go
PROGRAMS["go"] = {
    "hello": src(r'''
        package main

        import "fmt"

        func main() {
        	var name string
        	fmt.Scan(&name)
        	fmt.Printf("Hello, %s!\n", name)
        }
    '''),
    "compile_error": (src(r'''
        package main

        import "fmt"

        func main() {
        	fmt.Println(totl)
        }
    '''), "GO_UNDEFINED", 6),
    "runtime_error": (src(r'''
        package main

        import "fmt"

        func main() {
        	v := []int{1, 2}
        	i := 5
        	fmt.Println(v[i])
        }
    '''), "GO_INDEX_OUT_OF_RANGE", 8),
    "memory_codes": {"GO_OUT_OF_MEMORY"},
    "loop": "package main\n\nfunc main() {\n\tfor {\n\t}\n}\n",
    "memory": src(r'''
        package main

        func main() {
        	var keep [][]byte
        	for {
        		b := make([]byte, 1<<20)
        		for i := range b {
        			b[i] = 1
        		}
        		keep = append(keep, b)
        	}
        }
    '''),
    "bomb": src(r'''
        package main

        import "os/exec"

        func main() {
        	for {
        		exec.Command("sleep", "60").Start()
        	}
        }
    '''),
    "network": src(r'''
        package main

        import (
        	"fmt"
        	"net"
        	"time"
        )

        func main() {
        	conn, err := net.DialTimeout("tcp", "1.1.1.1:80", 2*time.Second)
        	if err != nil {
        		fmt.Println("BLOCKED")
        		return
        	}
        	conn.Close()
        	fmt.Println("CONNECTED")
        }
    '''),
    "write": src(r'''
        package main

        import (
        	"fmt"
        	"os"
        )

        func main() {
        	if err := os.WriteFile("/workspace/x", []byte("x"), 0o644); err != nil {
        		fmt.Println("BLOCKED")
        		return
        	}
        	fmt.Println("WROTE")
        }
    '''),
    "flood": src(r'''
        package main

        import "fmt"

        func main() {
        	for {
        		fmt.Println("spam spam spam spam")
        	}
        }
    '''),
}

# --------------------------------------------------------------------- Rust
PROGRAMS["rust"] = {
    "hello": src(r'''
        use std::io;

        fn main() {
            let mut name = String::new();
            io::stdin().read_line(&mut name).unwrap();
            println!("Hello, {}!", name.trim());
        }
    '''),
    "compile_error": ('fn main() {\n    let count: i32 = "five";\n    println!("{}", count);\n}\n',
                      "RS_TYPE_MISMATCH", 2),
    "runtime_error": ('fn main() {\n    let v = vec![1, 2];\n    let i = 5;\n    println!("{}", v[i]);\n}\n',
                      "RS_INDEX_OUT_OF_BOUNDS", 4),
    "memory_codes": {"RS_OUT_OF_MEMORY"},
    "loop": "fn main() {\n    loop {}\n}\n",
    "memory": src(r'''
        fn main() {
            let mut keep: Vec<Vec<u8>> = Vec::new();
            loop {
                keep.push(vec![1u8; 1 << 20]);
            }
        }
    '''),
    "bomb": src(r'''
        use std::process::Command;

        fn main() {
            loop {
                let _ = Command::new("sleep").arg("60").spawn();
            }
        }
    '''),
    "network": src(r'''
        use std::net::TcpStream;
        use std::time::Duration;

        fn main() {
            let addr = "1.1.1.1:80".parse().unwrap();
            match TcpStream::connect_timeout(&addr, Duration::from_secs(2)) {
                Ok(_) => println!("CONNECTED"),
                Err(_) => println!("BLOCKED"),
            }
        }
    '''),
    "write": src(r'''
        fn main() {
            match std::fs::write("/workspace/x", "x") {
                Ok(_) => println!("WROTE"),
                Err(_) => println!("BLOCKED"),
            }
        }
    '''),
    "flood": 'fn main() {\n    loop {\n        println!("spam spam spam spam");\n    }\n}\n',
}

# ----------------------------------------------------------------------- C#
PROGRAMS["csharp"] = {
    "hello": 'using System;\n\nvar name = Console.ReadLine();\nConsole.WriteLine($"Hello, {name}!");\n',
    "compile_error": ("using System;\n\nint x = 1\nConsole.WriteLine(x);\n", "CS_SYNTAX_ERROR", 3),
    "runtime_error": ("using System;\n\nint[] v = new int[2];\nint i = 5;\nConsole.WriteLine(v[i]);\n",
                      "CS_INDEX_OUT_OF_RANGE", 5),
    "memory_codes": {"CS_OUT_OF_MEMORY"},
    "loop": "while (true) { }\n",
    "memory": src(r'''
        using System.Collections.Generic;

        var keep = new List<byte[]>();
        while (true)
        {
            var block = new byte[1 << 20];
            System.Array.Fill(block, (byte)1);
            keep.Add(block);
        }
    '''),
    "bomb": src(r'''
        using System.Diagnostics;

        while (true)
        {
            try { Process.Start("sleep", "60"); } catch { }
        }
    '''),
    "network": src(r'''
        using System;
        using System.Net.Sockets;

        try
        {
            using var client = new TcpClient();
            client.Connect("1.1.1.1", 80);
            Console.WriteLine("CONNECTED");
        }
        catch (Exception)
        {
            Console.WriteLine("BLOCKED");
        }
    '''),
    "write": src(r'''
        using System;

        try
        {
            System.IO.File.WriteAllText("/workspace/x", "x");
            Console.WriteLine("WROTE");
        }
        catch (Exception)
        {
            Console.WriteLine("BLOCKED");
        }
    '''),
    "flood": 'while (true) System.Console.WriteLine("spam spam spam spam");\n',
}

# ------------------------------------------------------------------- Kotlin
PROGRAMS["kotlin"] = {
    "hello": 'fun main() {\n    val name = readln().trim()\n    println("Hello, $name!")\n}\n',
    "compile_error": ("fun main() {\n    val total = 3\n    println(totl)\n}\n", "KT_UNRESOLVED_REFERENCE", 3),
    "runtime_error": ("fun main() {\n    val v = listOf(1, 2)\n    val i = 5\n    println(v[i])\n}\n",
                      "KT_INDEX_OUT_OF_BOUNDS", 4),
    "memory_codes": {"KT_OUT_OF_MEMORY"},
    "loop": "fun main() {\n    while (true) { }\n}\n",
    "memory": "fun main() {\n    val keep = ArrayList<LongArray>()\n    while (true) keep.add(LongArray(1_000_000))\n}\n",
    "bomb": "fun main() {\n    while (true) {\n        Thread { Thread.sleep(60_000) }.start()\n    }\n}\n",
    "network": src(r'''
        fun main() {
            try {
                java.net.Socket().use { it.connect(java.net.InetSocketAddress("1.1.1.1", 80), 2000) }
                println("CONNECTED")
            } catch (e: Exception) {
                println("BLOCKED")
            }
        }
    '''),
    "write": src(r'''
        fun main() {
            try {
                java.io.File("/workspace/x").writeText("x")
                println("WROTE")
            } catch (e: Exception) {
                println("BLOCKED")
            }
        }
    '''),
    "flood": 'fun main() {\n    while (true) println("spam spam spam spam")\n}\n',
}

# -------------------------------------------------------------------- Swift
# Experimental: these tests skip until the Swift image is built (see
# docs/languages.md). They have not been run yet.
PROGRAMS["swift"] = {
    "hello": 'let name = readLine() ?? ""\nprint("Hello, \\(name)!")\n',
    "compile_error": ("let total = 3\nprint(totl)\n", "SWIFT_NOT_IN_SCOPE", 2),
    "runtime_error": ('let text = "abc"\nlet number = Int(text)!\nprint(number)\n', "SWIFT_NIL_UNWRAP", 2),
    "memory_codes": set(),
    "loop": "while true { }\n",
    "memory": "var keep: [[UInt8]] = []\nwhile true { keep.append([UInt8](repeating: 1, count: 1 << 20)) }\n",
    "bomb": src(r'''
        import Foundation

        while true {
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/bin/sleep")
            process.arguments = ["60"]
            try? process.run()
        }
    '''),
    "network": src(r'''
        import Glibc

        let s = socket(AF_INET, Int32(SOCK_STREAM.rawValue), 0)
        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(80).bigEndian
        inet_pton(AF_INET, "1.1.1.1", &addr.sin_addr)
        let result = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                connect(s, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        print(result == 0 ? "CONNECTED" : "BLOCKED")
    '''),
    "write": src(r'''
        import Foundation

        do {
            try "x".write(toFile: "/workspace/x", atomically: false, encoding: .utf8)
            print("WROTE")
        } catch {
            print("BLOCKED")
        }
    '''),
    "flood": 'while true { print("spam spam spam spam") }\n',
}

# ---------------------------------------------------------------------- PHP
PROGRAMS["php"] = {
    "hello": '<?php\n$name = trim(fgets(STDIN));\necho "Hello, $name!\\n";\n',
    "compile_error": ("<?php\n$x = 1\necho $x;\n", "PHP_SYNTAX_ERROR", 3),
    "runtime_error": ("<?php\n$a = 10;\n$b = 0;\necho intdiv($a, $b);\n", "PHP_DIVISION_BY_ZERO", 4),
    "memory_codes": {"PHP_MEMORY_LIMIT"},
    "loop": "<?php\nwhile (true) { }\n",
    "memory": '<?php\n$keep = [];\nwhile (true) { $keep[] = str_repeat("x", 1 << 20) . count($keep); }\n',
    # Keep every handle: dropping one makes PHP wait for that child to exit.
    "bomb": '<?php\n$keep = [];\nwhile (true) { $keep[] = @proc_open(["sleep", "60"], [], $pipes); }\n',
    "network": '<?php\n$s = @fsockopen("1.1.1.1", 80, $errno, $errstr, 2);\necho $s ? "CONNECTED\\n" : "BLOCKED\\n";\n',
    "write": '<?php\necho @file_put_contents("/workspace/x", "x") === false ? "BLOCKED\\n" : "WROTE\\n";\n',
    "flood": '<?php\nwhile (true) echo "spam spam spam spam\\n";\n',
}

# --------------------------------------------------------------------- Ruby
PROGRAMS["ruby"] = {
    "hello": 'name = gets.to_s.strip\nputs "Hello, #{name}!"\n',
    # Ruby reports the line where it noticed the unclosed "(": the next one.
    "compile_error": ('puts "start"\nputs(1, 2\nputs "end"\n', "RB_SYNTAX_ERROR", 3),
    "runtime_error": ("values = [1, 2]\ntotal = 0\nputs totl\n", "RB_NAME_ERROR", 3),
    "memory_codes": {"RB_NO_MEMORY"},
    "loop": "loop { }\n",
    "memory": 'keep = []\nloop { keep << ("x" * (1 << 20)) }\n',
    "bomb": src(r'''
        loop do
          begin
            fork { sleep 60 }
          rescue SystemCallError
          end
        end
    '''),
    "network": src(r'''
        require "socket"
        begin
          Socket.tcp("1.1.1.1", 80, connect_timeout: 2).close
          puts "CONNECTED"
        rescue StandardError
          puts "BLOCKED"
        end
    '''),
    "write": src(r'''
        begin
          File.write("/workspace/x", "x")
          puts "WROTE"
        rescue SystemCallError
          puts "BLOCKED"
        end
    '''),
    "flood": 'loop { puts "spam spam spam spam" }\n',
}

# ---------------------------------------------------------------------- Lua
PROGRAMS["lua"] = {
    "hello": 'local name = io.read("l")\nprint("Hello, " .. name .. "!")\n',
    "compile_error": ("local x = 1\nif x > 0\n  print(x)\nend\n", "LUA_SYNTAX_ERROR", 3),
    "runtime_error": ('local function greet(n) print(n) end\ngreett("Asha")\n', "LUA_CALL_NIL", 2),
    "memory_codes": {"LUA_OUT_OF_MEMORY"},
    "loop": "while true do end\n",
    "memory": 'local keep = {}\nwhile true do keep[#keep + 1] = string.rep("x", 1 << 20) .. #keep end\n',
    "bomb": 'while true do os.execute("sleep 60 &") end\n',
    # Lua has no sockets of its own; ask bash (its /dev/tcp) from inside the program.
    "network": src(r'''
        local ok = os.execute("bash -c 'exec 3<>/dev/tcp/1.1.1.1/80' 2>/dev/null")
        print(ok and "CONNECTED" or "BLOCKED")
    '''),
    "write": 'local f = io.open("/workspace/x", "w")\nprint(f and "WROTE" or "BLOCKED")\n',
    "flood": 'while true do print("spam spam spam spam") end\n',
}

# --------------------------------------------------------------------- Bash
PROGRAMS["bash"] = {
    "hello": 'read -r name\necho "Hello, $name!"\n',
    "compile_error": ("echo start\nif [ 1 -eq 1 ]\n  echo yes\nfi\n", "SH_SYNTAX_ERROR", 4),
    # The failing command is the last one, so the script's exit status reports it.
    "runtime_error": ("x=0\necho $((10 / x))\n", "SH_DIVISION_BY_ZERO", 2),
    "memory_codes": set(),
    "loop": "while true; do :; done\n",
    "memory": "printf -v x '%*s' 400000000 ''\necho ${#x}\n",
    "bomb": "while true; do sleep 60 & done\n",
    "network": "if (exec 3<>/dev/tcp/1.1.1.1/80) 2>/dev/null; then echo CONNECTED; else echo BLOCKED; fi\n",
    "write": "if (echo x > /workspace/x) 2>/dev/null; then echo WROTE; else echo BLOCKED; fi\n",
    "flood": 'while true; do echo "spam spam spam spam"; done\n',
}

# ---------------------------------------------------------------------- SQL
_FOREVER = "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c)\n"
PROGRAMS["sql"] = {
    "hello": ("CREATE TABLE people(name TEXT);\nINSERT INTO people VALUES ('Asha');\n"
              "SELECT 'Hello, ' || name || '!' AS greeting FROM people;\n"),
    "compile_error": None,
    "runtime_error": ("CREATE TABLE t(x);\nSELECT * FROM missing;\n", "SQL_NO_SUCH_TABLE", 2),
    "memory_codes": {"SQL_OUT_OF_MEMORY"},
    "loop": _FOREVER + "SELECT count(*) FROM c;\n",
    "memory": _FOREVER + "SELECT length(group_concat(hex(randomblob(1000)))) FROM c;\n",
    # bash keeps retrying a refused fork (dash, sqlite's default shell, gives up).
    "bomb": ".shell bash -c 'while true; do sleep 60 & done'\n",
    "network": ".shell bash -c 'exec 3<>/dev/tcp/1.1.1.1/80' 2>/dev/null && echo CONNECTED || echo BLOCKED\n",
    "write": ".shell (echo x > /workspace/x) 2>/dev/null && echo WROTE || echo BLOCKED\n",
    # List mode streams rows; box mode would collect them all first.
    "flood": ".mode list\n" + _FOREVER + "SELECT 'spam spam spam spam' FROM c;\n",
}


# ======================================================================
# Languages added with the native and extra images (Ubuntu 24.04 toolchains).
# A key set to None means the language has no way to express that attack
# (Verilog cannot start processes or open sockets); its test is skipped.


def cobol(text: str) -> str:
    """Fixed-form COBOL: area A starts in column 8."""
    return "\n".join(("       " + line) if line.strip() else line for line in src(text).split("\n"))


# ------------------------------------------------------------------ Fortran
PROGRAMS["fortran"] = {
    "hello": src("""
        program hello
          implicit none
          character(len=40) :: name
          read(*, '(A)') name
          print '(A, A, A)', 'Hello, ', trim(name), '!'
        end program hello
    """),
    "compile_error": ("program main\n  implicit none\n  integer :: x\n  x = 5 +\n  print *, x\nend program main\n",
                      "FORTRAN_SYNTAX_ERROR", 4),
    "runtime_error": (("program main\n  implicit none\n  integer :: a(3), i\n  i = 4\n  a(i) = 1\n  print *, a\n"
                       "end program main\n"), "FORTRAN_INDEX_OUT_OF_BOUNDS", 5),
    "memory_codes": {"FORTRAN_OUT_OF_MEMORY"},
    "loop": "program main\n  do\n  end do\nend program main\n",
    "memory": src("""
        program main
          implicit none
          type chunk
            integer, allocatable :: v(:)
          end type chunk
          type(chunk), allocatable :: keep(:)
          integer :: n
          allocate(keep(100000))
          n = 0
          do
            n = n + 1
            allocate(keep(n)%v(262144))
            keep(n)%v = n
          end do
        end program main
    """),
    "bomb": src("""
        program main
          implicit none
          integer :: s, c
          do
            call execute_command_line("sleep 60 &", exitstat=s, cmdstat=c)
          end do
        end program main
    """),
    "network": src("""
        program main
          implicit none
          integer :: s, c
          call execute_command_line("bash -c 'exec 3<>/dev/tcp/1.1.1.1/80' 2>/dev/null", exitstat=s, cmdstat=c)
          if (s == 0 .and. c == 0) then
            print '(A)', 'CONNECTED'
          else
            print '(A)', 'BLOCKED'
          end if
        end program main
    """),
    "write": src("""
        program main
          implicit none
          integer :: ios
          open(unit=10, file='/workspace/x', status='replace', iostat=ios)
          if (ios == 0) then
            print '(A)', 'WROTE'
          else
            print '(A)', 'BLOCKED'
          end if
        end program main
    """),
    "flood": "program main\n  do\n    print '(A)', 'spam spam spam spam'\n  end do\nend program main\n",
}

# ----------------------------------------------------------- Assembly (NASM)
PROGRAMS["asm"] = {
    "hello": src("""
        section .data
            greet db "Hello, "
            greet_len equ $ - greet
            bang db "!", 10

        section .bss
            name resb 64

        section .text
            global _start
        _start:
            mov rax, 0                      ; read(0, name, 64)
            mov rdi, 0
            mov rsi, name
            mov rdx, 64
            syscall
            mov r12, rax
            cmp r12, 0
            jle .print
            cmp byte [name + r12 - 1], 10   ; drop the newline
            jne .print
            dec r12
        .print:
            mov rax, 1
            mov rdi, 1
            mov rsi, greet
            mov rdx, greet_len
            syscall
            mov rax, 1
            mov rdi, 1
            mov rsi, name
            mov rdx, r12
            syscall
            mov rax, 1
            mov rdi, 1
            mov rsi, bang
            mov rdx, 2
            syscall
            mov rax, 60
            xor rdi, rdi
            syscall
    """),
    "compile_error": ("section .text\n    global _start\n_start:\n    mvo rax, 60\n    syscall\n", "ASM_SYNTAX_ERROR", 4),
    "runtime_error": ("section .text\n    global _start\n_start:\n    mov rax, [0]\n    mov rax, 60\n    syscall\n",
                      "RUNTIME_SEGMENTATION_FAULT", None),
    "memory_codes": set(),
    "loop": "section .text\n    global _start\n_start:\n    jmp _start\n",
    "memory": src("""
        section .text
            global _start
        _start:
            mov rax, 12             ; brk(0): the current end of the heap
            xor rdi, rdi
            syscall
            mov rbx, rax
        .grow:
            lea rdi, [rbx + 1048576]
            mov rax, 12             ; brk(end + 1 MB)
            syscall
            cmp rax, rdi
            jne .grow
            mov rcx, rbx
        .touch:
            mov byte [rcx], 1       ; write every page so it is really used
            add rcx, 4096
            cmp rcx, rdi
            jb .touch
            mov rbx, rdi
            jmp .grow
    """),
    "bomb": "section .text\n    global _start\n_start:\n    mov rax, 57     ; fork()\n    syscall\n    jmp _start\n",
    "network": src("""
        section .data
            addr:   dw 2                ; AF_INET
                    dw 0x5000           ; port 80, network byte order
                    db 1, 1, 1, 1       ; 1.1.1.1
                    dq 0
            yes db "CONNECTED", 10
            no  db "BLOCKED", 10

        section .text
            global _start
        _start:
            mov rax, 41                 ; socket(AF_INET, SOCK_STREAM, 0)
            mov rdi, 2
            mov rsi, 1
            xor rdx, rdx
            syscall
            test rax, rax
            js .blocked
            mov rdi, rax                ; connect(fd, &addr, 16)
            mov rax, 42
            mov rsi, addr
            mov rdx, 16
            syscall
            test rax, rax
            jnz .blocked
            mov rsi, yes
            mov rdx, 10
            jmp .print
        .blocked:
            mov rsi, no
            mov rdx, 8
        .print:
            mov rax, 1
            mov rdi, 1
            syscall
            mov rax, 60
            xor rdi, rdi
            syscall
    """),
    "write": src("""
        section .data
            path db "/workspace/x", 0
            yes db "WROTE", 10
            no  db "BLOCKED", 10

        section .text
            global _start
        _start:
            mov rax, 2                  ; open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644)
            mov rdi, path
            mov rsi, 0x241
            mov rdx, 0o644
            syscall
            test rax, rax
            js .blocked
            mov rsi, yes
            mov rdx, 6
            jmp .print
        .blocked:
            mov rsi, no
            mov rdx, 8
        .print:
            mov rax, 1
            mov rdi, 1
            syscall
            mov rax, 60
            xor rdi, rdi
            syscall
    """),
    "flood": src("""
        section .data
            msg db "spam spam spam spam", 10
        section .text
            global _start
        _start:
            mov rax, 1
            mov rdi, 1
            mov rsi, msg
            mov rdx, 20
            syscall
            jmp _start
    """),
}

# ------------------------------------------------------------------- Pascal
PROGRAMS["pascal"] = {
    "hello": "program Hello;\nvar\n  name: string;\nbegin\n  readln(name);\n  writeln('Hello, ', name, '!');\nend.\n",
    "compile_error": ("program Main;\nvar\n  x: integer;\nbegin\n  x := 5\n  writeln(x);\nend.\n", "PAS_MISSING_SEMICOLON", 6),
    "runtime_error": (("program Main;\nvar\n  a: array[1..3] of integer;\n  i: integer;\nbegin\n  i := 4;\n  a[i] := 1;\n"
                       "  writeln(a[1]);\nend.\n"), "PAS_INDEX_OUT_OF_BOUNDS", 7),
    "memory_codes": {"PAS_OUT_OF_MEMORY"},
    "loop": "program Main;\nbegin\n  while true do ;\nend.\n",
    "memory": src("""
        program Main;
        type
          PBlock = ^TBlock;
          TBlock = array[0..262143] of longint;
        var
          p: PBlock;
        begin
          while true do
          begin
            New(p);
            FillChar(p^, SizeOf(TBlock), 1);
          end;
        end.
    """),
    "bomb": "program Main;\nuses BaseUnix;\nbegin\n  while true do\n    fpFork;\nend.\n",
    "network": src("""
        program Main;
        uses Unix;
        begin
          if fpSystem('bash -c ''exec 3<>/dev/tcp/1.1.1.1/80'' 2>/dev/null') = 0 then
            writeln('CONNECTED')
          else
            writeln('BLOCKED');
        end.
    """),
    "write": src("""
        program Main;
        var
          f: Text;
        begin
          Assign(f, '/workspace/x');
          {$I-} Rewrite(f); {$I+}
          if IOResult = 0 then
            writeln('WROTE')
          else
            writeln('BLOCKED');
        end.
    """),
    "flood": "program Main;\nbegin\n  while true do\n    writeln('spam spam spam spam');\nend.\n",
}

# -------------------------------------------------------------------- COBOL
PROGRAMS["cobol"] = {
    "hello": cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. HELLO.
        DATA DIVISION.
        WORKING-STORAGE SECTION.
        01 WS-NAME PIC X(40).
        PROCEDURE DIVISION.
            ACCEPT WS-NAME.
            DISPLAY "Hello, " FUNCTION TRIM(WS-NAME) "!".
            STOP RUN.
    """),
    "compile_error": (cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. MAIN.
        DATA DIVISION.
        WORKING-STORAGE SECTION.
        01 WS-X PIC 9(3) VALUE 5.
        PROCEDURE DIVISION.
            DISPLY WS-X.
            STOP RUN.
    """), "COB_SYNTAX_ERROR", 7),
    "runtime_error": (cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. MAIN.
        DATA DIVISION.
        WORKING-STORAGE SECTION.
        01 WS-TABLE.
           05 WS-ITEM PIC 9(2) OCCURS 3 TIMES.
        01 WS-I PIC 9 VALUE 4.
        PROCEDURE DIVISION.
            MOVE 7 TO WS-ITEM(WS-I).
            DISPLAY WS-ITEM(1).
            STOP RUN.
    """), "COB_INDEX_OUT_OF_BOUNDS", 9),
    "memory_codes": {"COB_OUT_OF_MEMORY"},
    "loop": cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. MAIN.
        PROCEDURE DIVISION.
        MAIN-LOOP.
            GO TO MAIN-LOOP.
    """),
    "memory": cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. MAIN.
        DATA DIVISION.
        WORKING-STORAGE SECTION.
        01 WS-PTR USAGE POINTER.
        01 WS-SIZE PIC 9(9) COMP VALUE 1048576.
        PROCEDURE DIVISION.
        MAIN-LOOP.
            ALLOCATE WS-SIZE CHARACTERS INITIALIZED RETURNING WS-PTR.
            GO TO MAIN-LOOP.
    """),
    "bomb": cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. MAIN.
        PROCEDURE DIVISION.
        MAIN-LOOP.
            CALL "SYSTEM" USING "sleep 60 &".
            GO TO MAIN-LOOP.
    """),
    "network": cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. MAIN.
        PROCEDURE DIVISION.
            CALL "SYSTEM" USING
                "bash -c 'exec 3<>/dev/tcp/1.1.1.1/80' 2>/dev/null".
            IF RETURN-CODE = 0
                DISPLAY "CONNECTED"
            ELSE
                DISPLAY "BLOCKED"
            END-IF.
            MOVE 0 TO RETURN-CODE.
            STOP RUN.
    """),
    "write": cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. MAIN.
        ENVIRONMENT DIVISION.
        INPUT-OUTPUT SECTION.
        FILE-CONTROL.
            SELECT OUT-FILE ASSIGN TO "/workspace/x"
                ORGANIZATION IS LINE SEQUENTIAL
                FILE STATUS IS WS-STATUS.
        DATA DIVISION.
        FILE SECTION.
        FD OUT-FILE.
        01 OUT-REC PIC X(10).
        WORKING-STORAGE SECTION.
        01 WS-STATUS PIC XX.
        PROCEDURE DIVISION.
            OPEN OUTPUT OUT-FILE.
            IF WS-STATUS = "00"
                DISPLAY "WROTE"
            ELSE
                DISPLAY "BLOCKED"
            END-IF.
            STOP RUN.
    """),
    "flood": cobol("""
        IDENTIFICATION DIVISION.
        PROGRAM-ID. MAIN.
        PROCEDURE DIVISION.
        MAIN-LOOP.
            DISPLAY "spam spam spam spam".
            GO TO MAIN-LOOP.
    """),
}

# ---------------------------------------------------------------- Lex (flex)
_LEX_EMPTY_RULES = "%%\n.|\\n    { }\n%%\n"
PROGRAMS["lex"] = {
    "hello": '%{\n#include <stdio.h>\n%}\n%%\n[A-Za-z]+   { printf("Hello, %s!\\n", yytext); }\n.|\\n        { }\n%%\n',
    "compile_error": ('%%\n[0-9+    { printf("number\\n"); }\n%%\n', "LEX_SYNTAX_ERROR", 2),
    "runtime_error": (_LEX_EMPTY_RULES + "int main(void) {\n    int *p = 0;\n    *p = 1;\n    return yylex();\n}\n",
                      "RUNTIME_SEGMENTATION_FAULT", None),
    "memory_codes": set(),
    "loop": _LEX_EMPTY_RULES + "int main(void) {\n    for (;;) { }\n}\n",
    "memory": "%{\n#include <stdlib.h>\n#include <string.h>\n%}\n" + _LEX_EMPTY_RULES
              + "int main(void) {\n    for (;;) {\n        char *p = malloc(1 << 20);\n        if (p) memset(p, 1, 1 << 20);\n    }\n}\n",
    "bomb": "%{\n#include <unistd.h>\n%}\n" + _LEX_EMPTY_RULES + "int main(void) {\n    for (;;) fork();\n}\n",
    "network": "%{\n#include <stdio.h>\n#include <arpa/inet.h>\n#include <sys/socket.h>\n%}\n" + _LEX_EMPTY_RULES + src("""
        int main(void) {
            struct sockaddr_in a = {0};
            a.sin_family = AF_INET;
            a.sin_port = htons(80);
            a.sin_addr.s_addr = inet_addr("1.1.1.1");
            int s = socket(AF_INET, SOCK_STREAM, 0);
            puts(s >= 0 && connect(s, (struct sockaddr *)&a, sizeof a) == 0 ? "CONNECTED" : "BLOCKED");
            return 0;
        }
    """),
    "write": "%{\n#include <stdio.h>\n%}\n" + _LEX_EMPTY_RULES
             + 'int main(void) {\n    FILE *f = fopen("/workspace/x", "w");\n    puts(f ? "WROTE" : "BLOCKED");\n    return 0;\n}\n',
    "flood": "%{\n#include <stdio.h>\n%}\n" + _LEX_EMPTY_RULES
             + 'int main(void) {\n    for (;;) puts("spam spam spam spam");\n}\n',
}

# ------------------------------------------------------------------ Verilog
PROGRAMS["verilog"] = {
    "hello": src("""
        module main;
          reg [8*40-1:0] name;
          integer n;
          initial begin
            n = $fscanf(32'h8000_0000, "%s", name);
            $display("Hello, %0s!", name);
          end
        endmodule
    """),
    "compile_error": (("module main;\n  reg [3:0] count;\n  initial begin\n    count = 4'd5\n"
                       "    $display(\"%d\", count);\n  end\nendmodule\n"), "VERILOG_SYNTAX_ERROR", 5),
    "runtime_error": (('module main;\n  initial begin\n    $display("start");\n    $fatal(1, "value out of range");\n'
                       "  end\nendmodule\n"), "VERILOG_RUNTIME_ERROR", 4),
    "memory_codes": set(),
    "loop": "module main;\n  initial forever #1;\nendmodule\n",
    "memory": 'module main;\n  string s;\n  initial begin\n    s = "xxxxxxxxxxxxxxxx";\n    forever s = {s, s};\n  end\nendmodule\n',
    "bomb": None,     # Icarus Verilog has no way to start a process
    "network": None,  # ... or to open a socket
    "write": src("""
        module main;
          integer f;
          initial begin
            f = $fopen("/workspace/x", "w");
            if (f == 0) $display("BLOCKED");
            else $display("WROTE");
          end
        endmodule
    """),
    "flood": 'module main;\n  initial forever $display("spam spam spam spam");\nendmodule\n',
}

# ---------------------------------------------------------------------- Nim
PROGRAMS["nim"] = {
    "hello": 'let name = readLine(stdin)\necho "Hello, ", name, "!"\n',
    "compile_error": ("let total = 10\necho totl\n", "NIM_UNDECLARED_IDENTIFIER", 2),
    "runtime_error": ("var a = @[1, 2, 3]\nvar i = 3\necho a[i]\n", "NIM_INDEX_OUT_OF_BOUNDS", 3),
    "memory_codes": {"NIM_OUT_OF_MEMORY"},
    "loop": "while true:\n  discard\n",
    "memory": "import strutils\nvar keep: seq[string]\nwhile true:\n  keep.add(repeat('x', 1 shl 20))\n",
    "bomb": src("""
        import osproc
        while true:
          try:
            discard startProcess("sleep", args = ["60"], options = {poUsePath})
          except CatchableError:
            discard
    """),
    "network": src("""
        import net
        try:
          let s = newSocket()
          s.connect("1.1.1.1", Port(80), timeout = 2000)
          echo "CONNECTED"
        except CatchableError:
          echo "BLOCKED"
    """),
    "write": src("""
        try:
          writeFile("/workspace/x", "x")
          echo "WROTE"
        except IOError:
          echo "BLOCKED"
    """),
    "flood": 'while true:\n  echo "spam spam spam spam"\n',
}

# ------------------------------------------------------------------------ D
PROGRAMS["d"] = {
    "hello": src("""
        import std.stdio;
        import std.string : strip;

        void main()
        {
            string name = readln().strip();
            writeln("Hello, ", name, "!");
        }
    """),
    "compile_error": ("import std.stdio;\n\nvoid main()\n{\n    int x = 5\n    writeln(x);\n}\n", "D_MISSING_SEMICOLON", 6),
    "runtime_error": ("import std.stdio;\n\nvoid main()\n{\n    int[] a = [1, 2, 3];\n    size_t i = 3;\n    writeln(a[i]);\n}\n",
                      "D_INDEX_OUT_OF_BOUNDS", 7),
    "memory_codes": {"D_OUT_OF_MEMORY"},
    "loop": "void main()\n{\n    while (true) {}\n}\n",
    "memory": src("""
        void main()
        {
            ubyte[][] keep;
            while (true)
            {
                auto block = new ubyte[](1 << 20);
                block[] = 1;
                keep ~= block;
            }
        }
    """),
    "bomb": "import core.sys.posix.unistd : fork;\n\nvoid main()\n{\n    while (true)\n        fork();\n}\n",
    "network": src("""
        import std.socket;
        import std.stdio;

        void main()
        {
            try
            {
                auto s = new TcpSocket();
                s.connect(new InternetAddress("1.1.1.1", 80));
                writeln("CONNECTED");
            }
            catch (Exception e)
            {
                writeln("BLOCKED");
            }
        }
    """),
    "write": src("""
        import std.file : write;
        import std.stdio : writeln;

        void main()
        {
            try
            {
                write("/workspace/x", "x");
                writeln("WROTE");
            }
            catch (Exception e)
            {
                writeln("BLOCKED");
            }
        }
    """),
    "flood": 'import std.stdio;\n\nvoid main()\n{\n    while (true)\n        writeln("spam spam spam spam");\n}\n',
}

# ---------------------------------------------------------------------- Ada
PROGRAMS["ada"] = {
    "hello": src("""
        with Ada.Text_IO; use Ada.Text_IO;

        procedure Main is
           Name : constant String := Get_Line;
        begin
           Put_Line ("Hello, " & Name & "!");
        end Main;
    """),
    "compile_error": (("with Ada.Text_IO; use Ada.Text_IO;\n\nprocedure Main is\n   X : Integer := 5\nbegin\n"
                       "   Put_Line (Integer'Image (X));\nend Main;\n"), "ADA_MISSING_SEMICOLON", 4),
    "runtime_error": (src("""
        with Ada.Text_IO; use Ada.Text_IO;

        procedure Main is
           A : array (1 .. 3) of Integer := (1, 2, 3);
           N : Integer;
        begin
           N := Integer'Value ("4");
           Put_Line (Integer'Image (A (N)));
        end Main;
    """), "ADA_INDEX_OUT_OF_BOUNDS", 8),
    "memory_codes": {"ADA_OUT_OF_MEMORY", "ADA_STACK_OVERFLOW"},
    "loop": "procedure Main is\nbegin\n   loop\n      null;\n   end loop;\nend Main;\n",
    "memory": src("""
        procedure Main is
           type Block is array (1 .. 1_048_576) of Character;
           type Block_Access is access Block;
           P : Block_Access;
        begin
           loop
              P := new Block'(others => 'x');
           end loop;
        end Main;
    """),
    "bomb": src("""
        with GNAT.OS_Lib; use GNAT.OS_Lib;

        procedure Main is
           Args : constant Argument_List_Access := Argument_String_To_List ("60");
           Pid  : Process_Id;
        begin
           loop
              Pid := Non_Blocking_Spawn ("/usr/bin/sleep", Args.all);
           end loop;
        end Main;
    """),
    "network": src("""
        with Ada.Text_IO; use Ada.Text_IO;
        with GNAT.OS_Lib; use GNAT.OS_Lib;

        procedure Main is
           Args : constant Argument_List :=
             (new String'("-c"), new String'("exec 3<>/dev/tcp/1.1.1.1/80"));
        begin
           if Spawn ("/bin/bash", Args) = 0 then
              Put_Line ("CONNECTED");
           else
              Put_Line ("BLOCKED");
           end if;
        end Main;
    """),
    "write": src("""
        with Ada.Text_IO; use Ada.Text_IO;

        procedure Main is
           F : File_Type;
        begin
           Create (F, Out_File, "/workspace/x");
           Put_Line ("WROTE");
        exception
           when others =>
              Put_Line ("BLOCKED");
        end Main;
    """),
    "flood": 'with Ada.Text_IO; use Ada.Text_IO;\n\nprocedure Main is\nbegin\n   loop\n      Put_Line ("spam spam spam spam");\n'
             "   end loop;\nend Main;\n",
}

# ------------------------------------------------------------------------ R
PROGRAMS["r"] = {
    "hello": 'con <- file("stdin")\nname <- readLines(con, n = 1)\nclose(con)\ncat("Hello, ", name, "!\\n", sep = "")\n',
    "compile_error": ("x <- 5\ny <- x +* 2\nprint(y)\n", "R_SYNTAX_ERROR", 2),
    "runtime_error": ("total <- 10\nprint(totl)\n", "R_OBJECT_NOT_FOUND", 2),
    "memory_codes": {"R_OUT_OF_MEMORY"},
    "loop": "repeat {}\n",
    "memory": "keep <- list()\nrepeat keep[[length(keep) + 1]] <- runif(131072)\n",
    "bomb": 'repeat try(system("sleep 60 &", wait = FALSE), silent = TRUE)\n',
    "network": src("""
        ok <- tryCatch({
          con <- socketConnection("1.1.1.1", 80, timeout = 2)
          close(con)
          TRUE
        }, error = function(e) FALSE, warning = function(w) FALSE)
        cat(if (ok) "CONNECTED\\n" else "BLOCKED\\n")
    """),
    "write": src("""
        ok <- tryCatch({
          writeLines("x", "/workspace/x")
          TRUE
        }, error = function(e) FALSE, warning = function(w) FALSE)
        cat(if (ok) "WROTE\\n" else "BLOCKED\\n")
    """),
    "flood": 'repeat cat("spam spam spam spam\\n")\n',
}

# --------------------------------------------------------------------- Perl
PROGRAMS["perl"] = {
    "hello": 'use strict;\nuse warnings;\n\nmy $name = <STDIN>;\nchomp $name;\nprint "Hello, $name!\\n";\n',
    "compile_error": ('use strict;\nuse warnings;\n\nmy $total = 10;\nprint "$totl\\n";\n', "PERL_UNDECLARED_IDENTIFIER", 5),
    "runtime_error": ('use strict;\nuse warnings;\n\nmy ($x, $y) = (10, 0);\nprint $x / $y, "\\n";\n', "PERL_DIVISION_BY_ZERO", 5),
    "memory_codes": {"PERL_OUT_OF_MEMORY"},
    "loop": "while (1) { }\n",
    "memory": 'my @keep;\nwhile (1) { push @keep, "x" x (1 << 20); }\n',
    "bomb": "while (1) { fork(); }\n",
    "network": 'use IO::Socket::INET;\nmy $s = IO::Socket::INET->new(PeerAddr => "1.1.1.1", PeerPort => 80, Timeout => 2);\n'
               'print $s ? "CONNECTED\\n" : "BLOCKED\\n";\n',
    "write": 'print open(my $f, ">", "/workspace/x") ? "WROTE\\n" : "BLOCKED\\n";\n',
    "flood": 'while (1) { print "spam spam spam spam\\n"; }\n',
}

# ------------------------------------------------------------------- Prolog
PROGRAMS["prolog"] = {
    "hello": ":- initialization(main).\n\nmain :-\n    read_line_to_string(user_input, Name),\n"
             '    format("Hello, ~w!~n", [Name]),\n    halt.\n',
    "compile_error": None,  # loaded and run in one step
    "runtime_error": (":- initialization(main).\n\nmain :-\n    greet(world),\n    halt.\n", "PROLOG_UNDEFINED", 4),
    "memory_codes": {"PROLOG_STACK_OVERFLOW"},
    "loop": ":- initialization(main).\n\nmain :- repeat, fail.\n",
    "memory": ":- initialization(main).\n\ngrow(L) :- length(Chunk, 100000), grow([Chunk|L]).\nmain :- grow([]).\n",
    "bomb": ":- initialization(main).\n\nmain :- repeat, catch(shell('sleep 60 &'), _, true), fail.\n",
    "network": src("""
        :- use_module(library(socket)).
        :- initialization(main).

        main :-
            (   catch(tcp_connect('1.1.1.1':80, Stream, []), _, fail)
            ->  close(Stream), writeln('CONNECTED')
            ;   writeln('BLOCKED')
            ),
            halt.
    """),
    "write": src("""
        :- initialization(main).

        main :-
            (   catch(open('/workspace/x', write, S), _, fail)
            ->  close(S), writeln('WROTE')
            ;   writeln('BLOCKED')
            ),
            halt.
    """),
    "flood": ":- initialization(main).\n\nmain :- repeat, writeln('spam spam spam spam'), fail.\n",
}

# ---------------------------------------------------------------------- Tcl
PROGRAMS["tcl"] = {
    "hello": 'gets stdin name\nputs "Hello, $name!"\n',
    "compile_error": None,  # no separate check step
    "runtime_error": ('set total 10\nputs "Total: $totl"\n', "TCL_UNDEFINED_VARIABLE", 2),
    "memory_codes": set(),
    "loop": "while 1 {}\n",
    "memory": "set keep {}\nwhile 1 { lappend keep [string repeat x 1048576] }\n",
    "bomb": "while 1 { catch {exec sleep 60 &} }\n",
    "network": "if {[catch {socket 1.1.1.1 80}]} { puts BLOCKED } else { puts CONNECTED }\n",
    "write": "if {[catch {open /workspace/x w}]} { puts BLOCKED } else { puts WROTE }\n",
    "flood": 'while 1 { puts "spam spam spam spam" }\n',
}

# ------------------------------------------------------------ Scheme (Guile)
PROGRAMS["scheme"] = {
    "hello": '(use-modules (ice-9 rdelim))\n(define name (read-line))\n(display (string-append "Hello, " name "!"))\n(newline)\n',
    "compile_error": None,  # interpreted in one step
    "runtime_error": ("(define total 10)\n(display totl)\n(newline)\n", "SCM_UNBOUND_VARIABLE", 2),
    "memory_codes": {"SCM_OUT_OF_MEMORY"},
    "loop": "(let loop () (loop))\n",
    "memory": "(define keep '())\n(let loop ()\n  (set! keep (cons (make-string 1048576 #\\x) keep))\n  (loop))\n",
    "bomb": '(let loop ()\n  (catch #t (lambda () (system "sleep 60 &")) (lambda args #f))\n  (loop))\n',
    "network": src("""
        (define ok
          (catch #t
            (lambda ()
              (let ((s (socket PF_INET SOCK_STREAM 0)))
                (connect s AF_INET (inet-pton AF_INET "1.1.1.1") 80)
                #t))
            (lambda args #f)))
        (display (if ok "CONNECTED" "BLOCKED"))
        (newline)
    """),
    "write": src("""
        (define ok
          (catch #t
            (lambda () (call-with-output-file "/workspace/x" (lambda (p) (display "x" p))) #t)
            (lambda args #f)))
        (display (if ok "WROTE" "BLOCKED"))
        (newline)
    """),
    "flood": '(let loop ()\n  (display "spam spam spam spam")\n  (newline)\n  (loop))\n',
}

# ------------------------------------------------------- Common Lisp (SBCL)
PROGRAMS["lisp"] = {
    "hello": '(let ((name (read-line)))\n  (format t "Hello, ~a!~%" name))\n',
    "compile_error": None,  # loaded form by form in one step
    "runtime_error": ('(defvar *total* 10)\n(format t "~a~%" *totl*)\n', "LISP_UNBOUND_VARIABLE", 2),
    "memory_codes": {"LISP_OUT_OF_MEMORY"},
    "loop": "(loop)\n",
    "memory": "(defvar *keep* nil)\n(loop (push (make-array 1048576 :element-type '(unsigned-byte 8) :initial-element 1) *keep*))\n",
    "bomb": '(loop (ignore-errors (sb-ext:run-program "/usr/bin/sleep" \'("60") :wait nil)))\n',
    "network": src("""
        (require :sb-bsd-sockets)
        (format t "~a~%"
                (handler-case
                    (let ((s (make-instance 'sb-bsd-sockets:inet-socket :type :stream :protocol :tcp)))
                      (sb-bsd-sockets:socket-connect s #(1 1 1 1) 80)
                      "CONNECTED")
                  (error () "BLOCKED")))
    """),
    "write": src("""
        (format t "~a~%"
                (handler-case
                    (with-open-file (s "/workspace/x" :direction :output :if-exists :supersede)
                      (write-string "x" s)
                      "WROTE")
                  (error () "BLOCKED")))
    """),
    "flood": '(loop (write-line "spam spam spam spam"))\n',
}

# ------------------------------------------------------------------- Erlang
_ERL = "-module(main).\n-export([main/0]).\n\n"
PROGRAMS["erlang"] = {
    "hello": _ERL + 'main() ->\n    Name = string:trim(io:get_line("")),\n    io:format("Hello, ~s!~n", [Name]).\n',
    "compile_error": (_ERL + 'main() ->\n    X = 5\n    io:format("~p~n", [X]).\n', "ERL_SYNTAX_ERROR", 6),
    "runtime_error": (_ERL + 'share(Total, People) -> Total div People.\n\nmain() ->\n    io:format("~p~n", [share(10, 0)]).\n',
                      "ERL_ARITHMETIC_EXCEPTION", 4),
    "memory_codes": {"ERL_OUT_OF_MEMORY"},
    "loop": _ERL + "main() -> main().\n",
    "memory": _ERL + "main() -> grow([]).\n\ngrow(Keep) -> grow([binary:copy(<<1>>, 1048576) | Keep]).\n",
    "bomb": _ERL + 'main() ->\n    catch os:cmd("sleep 60 &"),\n    main().\n',
    "network": _ERL + 'main() ->\n    case gen_tcp:connect({1,1,1,1}, 80, [], 2000) of\n        {ok, _} -> io:format("CONNECTED~n");\n'
                      '        _ -> io:format("BLOCKED~n")\n    end.\n',
    "write": _ERL + 'main() ->\n    case file:write_file("/workspace/x", <<"x">>) of\n        ok -> io:format("WROTE~n");\n'
                    '        _ -> io:format("BLOCKED~n")\n    end.\n',
    "flood": _ERL + 'main() ->\n    io:format("spam spam spam spam~n"),\n    main().\n',
}

# ------------------------------------------------------------------- Elixir
PROGRAMS["elixir"] = {
    "hello": 'name = IO.gets("") |> String.trim()\nIO.puts("Hello, #{name}!")\n',
    "compile_error": None,  # compiled and run in one step
    "runtime_error": ('b = String.to_integer("0")\nIO.puts(div(10, b))\n', "EX_ARITHMETIC_EXCEPTION", 2),
    "memory_codes": {"EX_OUT_OF_MEMORY"},
    "loop": "defmodule L do\n  def loop, do: loop()\nend\n\nL.loop()\n",
    "memory": "Enum.reduce(Stream.iterate(0, &(&1 + 1)), [], fn _, acc -> [:binary.copy(<<1>>, 1_048_576) | acc] end)\n",
    "bomb": 'Stream.repeatedly(fn -> try do Port.open({:spawn, "sleep 60"}, []) rescue _ -> nil end end) |> Stream.run()\n',
    "network": 'case :gen_tcp.connect({1, 1, 1, 1}, 80, [], 2000) do\n  {:ok, _} -> IO.puts("CONNECTED")\n'
               '  _ -> IO.puts("BLOCKED")\nend\n',
    "write": 'case File.write("/workspace/x", "x") do\n  :ok -> IO.puts("WROTE")\n  _ -> IO.puts("BLOCKED")\nend\n',
    "flood": 'Stream.repeatedly(fn -> IO.puts("spam spam spam spam") end) |> Stream.run()\n',
}


# ------------------------------------------------------- Python notebooks
# The Notebook view's runner (infra/containers/python/notebook.py): the
# "source" is notebook.json with the code cells, run in one namespace.
def notebook(*cells: str) -> str:
    return json.dumps({"cells": list(cells)})


PROGRAMS["notebook"] = {
    "hello": notebook("name = input()", 'greeting = f"Hello, {name}!"\nprint(greeting)', "len(greeting)"),
    "compile_error": None,  # every cell is parsed when it runs
    "runtime_error": (notebook("values = [1, 2]", "values[5]"), "NB_INDEX_ERROR", None),
    "memory_codes": {"NB_MEMORY_ERROR"},
    "loop": notebook("x = 0", "while True:\n    x += 1"),
    "memory": notebook("keep = []", "while True:\n    keep.append(bytearray(10_000_000))"),
    "bomb": notebook("import os", "while True:\n    os.fork()"),
    "network": notebook(PROGRAMS["python"]["network"]),
    "write": notebook(PROGRAMS["python"]["write"]),
    "flood": notebook("while True:\n    print('spam spam spam spam')"),
}

LANGUAGES = list(PROGRAMS)
