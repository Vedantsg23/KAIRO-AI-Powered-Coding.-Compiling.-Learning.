/* PURPOSE: runtime crash - integer division by zero.
 * EXPECT:  run SIGNALED 8 (SIGFPE, exit 136). */
#include <stdio.h>

int main(void) {
    volatile int a = 10, b = 0;
    printf("%d\n", a / b);
    return 0;
}
