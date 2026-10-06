/* PURPOSE: baseline - read a name from stdin and greet it.
 * EXPECT:  compile ok; run EXITED 0; stdout "Hello, <name>!". */
#include <stdio.h>

int main(void) {
    char name[64];
    if (scanf("%63s", name) != 1) {
        printf("No name given.\n");
        return 0;
    }
    printf("Hello, %s!\n", name);
    return 0;
}
