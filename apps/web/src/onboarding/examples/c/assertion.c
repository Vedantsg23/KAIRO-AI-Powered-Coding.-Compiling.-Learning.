#include <assert.h>
#include <stdio.h>

int main(void) {
    int balance = 100;
    int withdrawal = 150;

    balance -= withdrawal;
    assert(balance >= 0);        // balance must never be negative
    printf("Balance: %d\n", balance);
    return 0;
}
