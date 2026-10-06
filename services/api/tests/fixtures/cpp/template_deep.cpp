#include <map>
#include <string>

struct Key { int id; };

int main() {
    std::map<Key, std::string> m;
    m[Key{1}] = "one";
    return 0;
}
