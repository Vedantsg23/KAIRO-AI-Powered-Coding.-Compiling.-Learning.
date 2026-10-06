#include <iostream>

int main() {
    long laps = 0;
    // Count down to zero... but an unsigned number is never below 0:
    // after 0 it wraps around to 4294967295, so the loop never ends.
    for (unsigned int i = 5; i >= 0; i--) {
        laps++;
    }
    std::cout << "Done after " << laps << " laps\n";
    return 0;
}
