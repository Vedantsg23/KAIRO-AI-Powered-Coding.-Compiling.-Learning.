import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        System.out.println("What is your name?");
        if (!in.hasNext()) {
            System.out.println("No name given (type one in the Input tab).");
            return;
        }
        String name = in.next();
        System.out.println("Hello, " + name + "!");
    }
}
