fn shout(text: String) -> String {
    text.to_uppercase()
}

fn main() {
    let greeting = String::from("hello");
    let loud = shout(greeting);      // greeting is moved into shout here
    println!("{} -> {}", greeting, loud);
}
