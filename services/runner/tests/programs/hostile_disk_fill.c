/* ATTACK:  fill the disk through the writable scratch area.
 * EXPECT:  writing stops well before 64 MB (tmpfs size / RLIMIT_FSIZE). */
#include <signal.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    signal(SIGXFSZ, SIG_IGN); /* see the error instead of being killed */
    static char block[1 << 20];
    memset(block, 'x', sizeof block);
    FILE *f = fopen("/tmp/fill.bin", "wb");
    if (f == NULL) {
        printf("open failed\n");
        return 0;
    }
    int written = 0;
    for (int i = 0; i < 64; i++) {
        if (fwrite(block, 1, sizeof block, f) != sizeof block || fflush(f) != 0) {
            break;
        }
        written++;
    }
    printf("wrote %d MB\n", written);
    return 0;
}
