fn main() {
    let marks = vec![70, 85, 90];
    for i in 0..=marks.len() {       // ..= includes len(): one step too far
        println!("{}", marks[i]);
    }
}
