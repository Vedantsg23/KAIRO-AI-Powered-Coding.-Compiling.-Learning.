/* ATTACK:  burn CPU forever.
 * EXPECT:  run TIMEOUT at the wall-clock limit; container removed. */
int main(void) {
    volatile unsigned long n = 0;
    for (;;) {
        n++;
    }
}
