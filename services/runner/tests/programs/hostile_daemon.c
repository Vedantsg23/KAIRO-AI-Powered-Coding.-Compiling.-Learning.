/* ATTACK:  leave a background process running after the program "exits".
 * EXPECT:  run EXITED 0 promptly; the child dies with the container. */
#include <stdio.h>
#include <unistd.h>

int main(void) {
    if (fork() == 0) {
        setsid();
        sleep(600);
        return 0;
    }
    printf("parent exits\n");
    return 0;
}
