#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3};
    std::cout << "Reading index 5..." << std::endl;
    std::cout << v.at(5) << std::endl;
    return 0;
}
