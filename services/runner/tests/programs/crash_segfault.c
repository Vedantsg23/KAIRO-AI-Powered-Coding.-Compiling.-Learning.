/* PURPOSE: runtime crash - write through a NULL pointer after printing a line.
 * EXPECT:  run SIGNALED 11 (exit 139); "before crash" still captured
 *          (stdout is line-buffered by stdbuf, as in a terminal). */
#include <stdio.h>

int main(void) {
    int *p = NULL;
    printf("before crash\n");
    *p = 42;
    return 0;
}
