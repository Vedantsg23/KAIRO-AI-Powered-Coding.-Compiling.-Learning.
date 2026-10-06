public class Main {
    static void load() {
        try {
            Integer.parseInt("x");
        } catch (NumberFormatException e) {
            throw new IllegalStateException("could not load settings", e);
        }
    }

    public static void main(String[] args) {
        load();
    }
}
