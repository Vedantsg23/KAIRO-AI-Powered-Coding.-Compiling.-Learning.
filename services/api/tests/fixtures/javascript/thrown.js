function withdraw(balance, amount) {
    if (amount > balance) {
        throw new Error("insufficient funds");
    }
    return balance - amount;
}
console.log(withdraw(100, 500));
