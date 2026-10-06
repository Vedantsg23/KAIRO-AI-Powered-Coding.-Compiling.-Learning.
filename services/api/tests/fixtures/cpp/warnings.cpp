#include <iostream>
#include <vector>

int sign(int x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
}

int main() {
    std::vector<int> v = {3, 1, 2};
    int unused = 7;
    for (int i = 0; i < v.size(); i++) {
        std::cout << v[i] << " ";
    }
    std::cout << sign(-4) << std::endl;
    return 0;
}
