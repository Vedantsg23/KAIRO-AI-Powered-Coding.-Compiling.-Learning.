#include <iostream>

int main() {
    int *p = nullptr;
    std::cout << "About to crash" << std::endl;
    *p = 42;
    return 0;
}
