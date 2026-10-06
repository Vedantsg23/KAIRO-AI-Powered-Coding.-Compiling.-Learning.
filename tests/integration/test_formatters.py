"""The Sandbox Formatters extension, end to end through the real sandbox.

Each formatter profile (fmt-*) prints the student's file in its language's
usual layout and never runs it; code that cannot be parsed is left alone and
the formatter's reason comes back as a diagnostic with its line.
"""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.docker

FORMATS = {
    "fmt-c": (
        '#include <stdio.h>\nint main(){int x=1;if(x){printf("%d\\n",x);}\nreturn 0;}\n',
        '#include <stdio.h>\nint main() {\n    int x = 1;\n    if (x) {\n        printf("%d\\n", x);\n    }\n    return 0;\n}\n',
    ),
    "fmt-cpp": (
        '#include <iostream>\nint main(){std::cout<<"hi"<<std::endl;return 0;}\n',
        '#include <iostream>\nint main() {\n    std::cout << "hi" << std::endl;\n    return 0;\n}\n',
    ),
    "fmt-java": (
        'public class Main{public static void main(String[] args){int n=3;if(n>0){System.out.println("pos");}}}\n',
        (
            'public class Main {\n    public static void main(String[] args) {\n        int n = 3;\n'
            '        if (n > 0) {\n            System.out.println("pos");\n        }\n    }\n}\n'
        ),
    ),
    "fmt-csharp": (
        'using System;\nclass Program{static void Main(){Console.WriteLine("big");}}\n',
        'using System;\nclass Program\n{\n    static void Main()\n    {\n        Console.WriteLine("big");\n    }\n}\n',
    ),
    "fmt-python": (
        'import os\ndef f( a,b ):\n  return a+b\nprint( f(1,2) )\nos.system("echo RAN")\n',
        'import os\n\n\ndef f(a, b):\n    return a + b\n\n\nprint(f(1, 2))\nos.system("echo RAN")\n',
    ),
    "fmt-go": (
        'package main\nimport "fmt"\nfunc main(){\nx:=1\nif x>0 {fmt.Println("hi",x)}\n}\n',
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tx := 1\n\tif x > 0 {\n\t\tfmt.Println("hi", x)\n\t}\n}\n',
    ),
    "fmt-bash": (
        'for i in 1 2 3; do\necho $i\ndone\n',
        'for i in 1 2 3; do\n    echo $i\ndone\n',
    ),
}

BROKEN = {
    # clang-format formats whatever it is given; these three refuse broken code.
    "fmt-python": ("def f(:\n    pass\n", "Cannot parse: 1:6", None),
    "fmt-go": ("package main\nfunc main( {\n}\n", "expected ')'", 2),
    "fmt-bash": ("if [ 1 ; then\necho x\n", 'must end with "fi"', 1),
}


@pytest.mark.parametrize("formatter", sorted(FORMATS))
def test_formatter_prints_the_code_formatted_without_running_it(execute, formatter):
    messy, expected = FORMATS[formatter]
    out = execute(formatter, messy)
    assert out.state == "SUCCEEDED", (out.state, out.codes)
    assert out.stdout("format") == expected
    assert out.codes == []


@pytest.mark.parametrize("formatter", sorted(BROKEN))
def test_formatter_leaves_broken_code_alone_and_says_where(execute, formatter):
    source, message, line = BROKEN[formatter]
    out = execute(formatter, source)
    assert out.state == "RUNTIME_ERROR", (out.state, out.codes)
    assert out.stdout("format") == ""
    problem = next(d for d in out.diagnostics if message in d.message)
    if line is not None:
        assert problem.range is not None and problem.range.start_line == line
