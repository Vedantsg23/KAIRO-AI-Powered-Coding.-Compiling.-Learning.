// Welcome to Kotlin! Press Run (Ctrl+Enter) to compile and run this program.
// (The Kotlin compiler is slower than most: a run takes a few seconds.)

fun main() {
    val scores = listOf(72, 88, 95, 64, 81)
    val total = scores.sum()

    println("Total: $total")
    println("Average: ${"%.1f".format(scores.average())}")
}
