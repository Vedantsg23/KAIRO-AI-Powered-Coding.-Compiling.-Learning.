#include <stdio.h>

int main(void) {
    int count = 1;
    while (count != 10) {
        count += 2;              // 1, 3, 5, 7, 9, 11 ... never exactly 10
    }
    printf("Done\n");
    return 0;
}
