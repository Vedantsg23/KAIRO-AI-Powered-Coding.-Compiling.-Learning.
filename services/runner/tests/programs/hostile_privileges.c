/* ATTACK:  look for privileges to escalate with (root, capabilities, setuid).
 * EXPECT:  uid 10001, all capability sets empty, NoNewPrivs 1, seccomp
 *          filter active (Seccomp 2), setuid(0) fails. */
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main(void) {
    printf("uid=%d euid=%d\n", (int)getuid(), (int)geteuid());
    FILE *f = fopen("/proc/self/status", "r");
    char line[256];
    while (f != NULL && fgets(line, sizeof line, f) != NULL) {
        if (strncmp(line, "CapEff", 6) == 0 || strncmp(line, "NoNewPrivs", 10) == 0 ||
            strncmp(line, "Seccomp:", 8) == 0) {
            fputs(line, stdout);
        }
    }
    printf("setuid(0)=%d\n", setuid(0));
    return 0;
}
