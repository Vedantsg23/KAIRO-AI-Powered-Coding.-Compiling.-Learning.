#include <stdio.h>

struct point { int x, y; };

int add(int a, int b) { return a + b; }

int main(void) {
    struct point p = {1, 2};
    int n = p;
    char *s = 42;
    printf("%d %s\n", "oops", s);
    return add(1);
}
