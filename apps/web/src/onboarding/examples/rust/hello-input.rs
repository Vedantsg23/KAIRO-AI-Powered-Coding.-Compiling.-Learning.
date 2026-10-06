use std::io;

fn main() {
    let mut name = String::new();
    println!("What is your name?");
    io::stdin().read_line(&mut name).expect("could not read input");
    let name = name.trim();
    if name.is_empty() {
        println!("No name given (type one in the Input tab).");
    } else {
        println!("Hello, {}!", name);
    }
}
