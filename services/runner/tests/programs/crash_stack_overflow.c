/* PURPOSE: runtime crash - unbounded recursion exhausts the stack.
 * EXPECT:  run SIGNALED 11 (segmentation fault). */
int depth(int n) {
    return depth(n + 1) + 1;
}

int main(void) {
    return depth(0);
}
