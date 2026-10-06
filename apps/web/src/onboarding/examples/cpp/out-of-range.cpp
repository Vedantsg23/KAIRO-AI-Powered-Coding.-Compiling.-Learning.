#include <iostream>
#include <vector>

int main() {
    std::vector<int> marks = {70, 85, 90};
    for (int i = 0; i <= 3; i++) {        // one step too far: valid indexes are 0, 1, 2
        std::cout << marks.at(i) << "\n";
    }
    return 0;
}
