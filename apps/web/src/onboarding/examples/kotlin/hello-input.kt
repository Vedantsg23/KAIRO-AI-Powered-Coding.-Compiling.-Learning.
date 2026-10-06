fun main() {
    println("What is your name?")
    val name = readLine()?.trim()
    if (name.isNullOrEmpty()) {
        println("No name given (type one in the Input tab).")
    } else {
        println("Hello, $name!")
    }
}
