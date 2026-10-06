/* ATTACK:  unbounded output on stderr instead of stdout.
 * EXPECT:  run OUTPUT_LIMIT; stderr truncated at the cap. */
#include <stdio.h>

int main(void) {
    for (;;) {
        fputs("error error error error error error\n", stderr);
    }
}
