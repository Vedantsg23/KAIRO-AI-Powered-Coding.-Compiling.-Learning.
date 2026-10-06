/* ATTACK:  hold a sandbox slot without using CPU (CPU limits alone miss this).
 * EXPECT:  run TIMEOUT at the wall-clock limit. */
#include <unistd.h>

int main(void) {
    sleep(600);
    return 0;
}
