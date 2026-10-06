#include <stdio.h>

// Welcome! Press Run (Ctrl+Enter) to compile and run this program.
// Then try breaking it on purpose, or open Examples to see how errors are explained.

int main(void) {
    int scores[] = {72, 88, 95, 64, 81};
    int count = sizeof scores / sizeof scores[0];
    int total = 0;

    for (int i = 0; i < count; i++) {
        total += scores[i];
    }

    printf("Total: %d\n", total);
    printf("Average: %.1f\n", (double) total / count);
    return 0;
}
