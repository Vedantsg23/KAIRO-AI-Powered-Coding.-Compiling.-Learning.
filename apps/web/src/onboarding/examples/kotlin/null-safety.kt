fun findName(id: Int): String? {
    return if (id == 1) "Asha" else null
}

fun main() {
    val name: String = findName(2)
    println(name.uppercase())
}
