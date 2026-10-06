#include <iostream>
#include <vector>

// Welcome to C++! Press Run (Ctrl+Enter) to compile and run this program.
// Then break something on purpose, or open Examples to see how errors are explained.

int main() {
    std::vector<int> scores = {72, 88, 95, 64, 81};
    int total = 0;

    for (int score : scores) {
        total += score;
    }

    std::cout << "Total: " << total << "\n";
    std::cout << "Average: " << static_cast<double>(total) / scores.size() << "\n";
    return 0;
}
