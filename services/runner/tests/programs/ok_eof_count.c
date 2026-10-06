/* PURPOSE: baseline - read until end-of-file; stdin must be closed by the runner.
 * EXPECT:  run EXITED 0 promptly (no hang) and prints the byte count. */
#include <stdio.h>

int main(void) {
    long count = 0;
    while (getchar() != EOF) {
        count++;
    }
    printf("%ld\n", count);
    return 0;
}
