#include <stdio.h>

int main(void) {
    char name[32];

    printf("What is your name?\n");
    if (scanf("%31s", name) != 1) {
        printf("No name given (type one in the Input tab).\n");
        return 0;
    }
    printf("Hello, %s! Welcome to C.\n", name);
    return 0;
}
