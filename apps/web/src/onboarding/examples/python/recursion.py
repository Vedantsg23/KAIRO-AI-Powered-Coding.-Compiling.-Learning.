def countdown(n):
    print(n)
    countdown(n - 1)        # no "if n == 0: return" to stop it

countdown(3)
