/* ATTACK:  make the compiler write a huge object file (300 MB of .data).
 * EXPECT:  compile step fails (RLIMIT_FSIZE stops the assembler); no hang. */
char big[300000000] = {1};

int main(void) {
    return big[5];
}
