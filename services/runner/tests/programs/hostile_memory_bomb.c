/* ATTACK:  allocate and touch memory until the host runs out.
 * EXPECT:  run MEMORY_LIMIT (cgroup OOM kill); oomKilled=true. */
#include <stdlib.h>
#include <string.h>

int main(void) {
    for (;;) {
        char *p = malloc(1 << 20);
        if (p == NULL) {
            return 3;
        }
        memset(p, 1, 1 << 20);
    }
}
