#include <string>
#include <iostream>

struct Point {
    int x;
    int y;
};

int main() {
    Point p{1, 2};
    std::cout << p.z << std::endl;
    std::string s = "abc";
    s.push(1);
    return 0;
}
