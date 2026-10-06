/* ATTACK:  make the compiler read an endless file.
 * EXPECT:  compile step stopped by the memory or time limit. */
#include "/dev/zero"

int main(void) {
    return 0;
}
