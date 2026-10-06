%{
#include <stdio.h>
int total = 0;
%}
%%
[0-9]+      { totl++; }
.|\n        { }
%%
int main(void) {
    yylex();
    printf("%d\n", total);
    return 0;
}
