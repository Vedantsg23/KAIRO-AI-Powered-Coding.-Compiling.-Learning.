fn main() {
    let names = vec![String::from("Asha"), String::from("Ravi")];
    let moved = names;
    println!("{}", names.len());
    println!("{}", moved.len());
}
