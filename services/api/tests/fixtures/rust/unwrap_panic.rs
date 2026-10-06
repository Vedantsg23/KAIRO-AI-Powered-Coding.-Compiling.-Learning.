fn main() {
    let text = "twenty";
    let age: i32 = text.parse().unwrap();
    println!("{}", age);
}
