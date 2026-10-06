#include <stdio.h>

long factorial(int n) {
    if (n <= 1) {
        return 1;               // base case stops the recursion
    }
    return n * factorial(n - 1);
}

int main(void) {
    int n;
    scanf("%d", &n);
    printf("%d! = %ld\n", n, factorial(n));
    return 0;
}
