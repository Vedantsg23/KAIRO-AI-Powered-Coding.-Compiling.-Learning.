#include <assert.h>
#include <stdio.h>

int main(void) {
    int balance = -5;
    printf("checking\n");
    assert(balance >= 0);
    return 0;
}
