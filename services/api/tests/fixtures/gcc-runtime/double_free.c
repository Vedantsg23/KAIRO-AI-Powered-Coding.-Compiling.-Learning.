#include <stdlib.h>

int main(void) {
    char *p = malloc(16);
    free(p);
    free(p);
    return 0;
}
