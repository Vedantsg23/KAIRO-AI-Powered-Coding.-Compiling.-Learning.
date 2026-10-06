#include <iostream>
#include <string>

int main() {
    std::string name;
    std::cout << "What is your name?\n";
    if (!std::getline(std::cin, name) || name.empty()) {
        std::cout << "No name given (type one in the Input tab).\n";
        return 0;
    }
    std::cout << "Hello, " << name << "!\n";
    return 0;
}
