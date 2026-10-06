// Welcome to Java! Press Run (Ctrl+Enter) to compile and run this program.
// The class must be called Main; the program starts in main().

public class Main {
    public static void main(String[] args) {
        int[] scores = {72, 88, 95, 64, 81};
        int total = 0;

        for (int score : scores) {
            total += score;
        }

        System.out.println("Total: " + total);
        System.out.printf("Average: %.1f%n", (double) total / scores.length);
    }
}
