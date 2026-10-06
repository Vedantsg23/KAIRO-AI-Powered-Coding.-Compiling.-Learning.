public class Main {
    static String findName(int id) {
        if (id == 1) {
            return "Asha";
        }
        return null;                                // no student with this id
    }

    public static void main(String[] args) {
        String name = findName(2);
        System.out.println(name.toUpperCase());
    }
}
