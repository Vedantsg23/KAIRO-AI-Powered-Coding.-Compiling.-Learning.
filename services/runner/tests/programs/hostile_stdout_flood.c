/* ATTACK:  unbounded output to exhaust memory/disk of the service.
 * EXPECT:  run OUTPUT_LIMIT; stdout truncated at the cap; runner kills it. */
#include <stdio.h>

int main(void) {
    for (;;) {
        puts("spam spam spam spam spam spam spam spam");
    }
}
