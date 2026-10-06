%{
/* Welcome to Lex! Press Run (Ctrl+Enter): flex turns these rules into a
   C scanner, GCC compiles it, and it reads the Input tab.
   This scanner counts words, numbers and lines. */
#include <stdio.h>
int words = 0, numbers = 0, lines = 0;
%}

%%
[0-9]+          { numbers++; }
[A-Za-z]+       { words++; }
\n              { lines++; }
.               { /* anything else */ }
%%

int yywrap(void) { return 1; }

int main(void) {
    yylex();
    printf("words: %d, numbers: %d, lines: %d\n", words, numbers, lines);
    return 0;
}
