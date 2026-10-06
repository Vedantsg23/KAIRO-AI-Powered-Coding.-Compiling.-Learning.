public class Main {
    public static void main(String[] args) {
        int[] marks = {70, 85, 90};
        for (int i = 0; i <= marks.length; i++) {   // should be i < marks.length
            System.out.println(marks[i]);
        }
    }
}
