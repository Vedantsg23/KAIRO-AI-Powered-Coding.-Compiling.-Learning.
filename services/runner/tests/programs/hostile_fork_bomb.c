/* ATTACK:  classic fork bomb.
 * EXPECT:  the PID limit stops process creation; run ends by TIMEOUT;
 *          every process dies with the container; no orphans. */
#include <unistd.h>

int main(void) {
    for (;;) {
        fork();
    }
}
