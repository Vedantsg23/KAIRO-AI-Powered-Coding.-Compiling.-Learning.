function depth(n) {
    return depth(n + 1) + 1;
}
depth(0);
