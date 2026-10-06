#include <stdio.h>

int square(int n) {
    return n * m;
}

int unused_helper(void) { return 1; }

static int never_called(void) { return 2; }

int main(void) {
    printf("%d\n", square(3))
    return 0;
}
