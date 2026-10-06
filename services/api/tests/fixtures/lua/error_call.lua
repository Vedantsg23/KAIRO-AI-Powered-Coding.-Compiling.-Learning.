local function withdraw(balance, amount)
  if amount > balance then
    error("insufficient funds")
  end
  return balance - amount
end
print(withdraw(100, 500))
