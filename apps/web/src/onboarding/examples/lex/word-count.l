%{
#include <stdio.h>
int words = 0, numbers = 0;
%}
%%
[0-9]+      { numbers++; }
[A-Za-z]+   { words++; }
.|\n        { }
%%
int main(void) {
    yylex();
    printf("words=%d numbers=%d\n", words, numbers);
    return 0;
}
