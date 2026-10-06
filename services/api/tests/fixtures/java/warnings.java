import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List names = new ArrayList();
        names.add("Asha");
        Integer boxed = new Integer(5);
        System.out.println(names + " " + boxed);
    }
}
