#include <stdio.h>

int main(void) {
    int *value = NULL;

    printf("About to use the pointer...\n");
    *value = 42;                 // writing through NULL
    printf("This line is never reached.\n");
    return 0;
}
