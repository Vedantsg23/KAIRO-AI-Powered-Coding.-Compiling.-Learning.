/* ATTACK:  close stdout and stderr, then keep running, so that "no more
 *          output" is mistaken for "the program has finished".
 * EXPECT:  run TIMEOUT at the wall-clock limit (plus a short grace period). */
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("closing my output streams\n");
    fflush(stdout);
    fclose(stdout);
    fclose(stderr);
    sleep(600);
    return 0;
}
