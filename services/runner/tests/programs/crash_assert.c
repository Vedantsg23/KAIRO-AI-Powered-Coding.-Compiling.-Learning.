/* PURPOSE: runtime crash - failed assertion calls abort().
 * EXPECT:  run SIGNALED 6 (exit 134); stderr contains "Assertion". */
#include <assert.h>

int main(void) {
    int balance = -5;
    assert(balance >= 0);
    return 0;
}
