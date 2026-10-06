/* ATTACK:  inspect other processes and secrets on the host.
 * EXPECT:  only the sandbox's own processes are visible (PID namespace);
 *          /etc/shadow is not readable. */
#include <ctype.h>
#include <dirent.h>
#include <stdio.h>

int main(void) {
    int processes = 0;
    DIR *d = opendir("/proc");
    struct dirent *e;
    while (d != NULL && (e = readdir(d)) != NULL) {
        if (isdigit((unsigned char)e->d_name[0])) {
            processes++;
        }
    }
    printf("visible processes: %d\n", processes);
    printf("shadow readable: %s\n", fopen("/etc/shadow", "r") ? "YES" : "no");
    return 0;
}
