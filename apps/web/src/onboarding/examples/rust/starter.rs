// Welcome to Rust! Press Run (Ctrl+Enter) to compile and run this program.

fn main() {
    let scores = vec![72, 88, 95, 64, 81];
    let total: i32 = scores.iter().sum();

    println!("Total: {}", total);
    println!("Average: {:.1}", total as f64 / scores.len() as f64);
}
