import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    String name = sc.nextLine();
    int age = sc.nextInt();
    float height = sc.nextFloat();
    System.out.printf("Hello %s, you are %d years old and %.2f meters tall.\n", name, age, height);
  }
}