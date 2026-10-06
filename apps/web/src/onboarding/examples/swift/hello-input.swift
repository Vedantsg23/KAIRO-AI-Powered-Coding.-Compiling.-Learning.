print("What is your name?")
if let name = readLine(), !name.isEmpty {
    print("Hello, \(name)!")
} else {
    print("No name given (type one in the Input tab).")
}
