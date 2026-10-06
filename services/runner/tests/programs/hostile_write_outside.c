/* ATTACK:  modify the image or the compiled workspace; persist files.
 * EXPECT:  /etc and /workspace are read-only during the run; only /tmp is writable. */
#include <errno.h>
#include <stdio.h>
#include <string.h>

static void try_write(const char *path) {
    FILE *f = fopen(path, "w");
    if (f == NULL) {
        printf("%s: %s\n", path, strerror(errno));
    } else {
        printf("%s: WRITABLE\n", path);
        fclose(f);
    }
}

int main(void) {
    try_write("/etc/hacked");
    try_write("/workspace/evil.txt");
    try_write("/tmp/scratch.txt");
    return 0;
}
