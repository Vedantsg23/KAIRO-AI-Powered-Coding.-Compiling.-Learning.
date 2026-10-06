#include <string.h>

int main(void) {
    char buf[8];
    strcpy(buf, "this string is far too long for the buffer");
    return 0;
}
