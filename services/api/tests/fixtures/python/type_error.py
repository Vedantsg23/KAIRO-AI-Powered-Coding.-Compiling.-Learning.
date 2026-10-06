def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - "2")

def main():
    value = fibonacci(10)
    print(value)

main()
