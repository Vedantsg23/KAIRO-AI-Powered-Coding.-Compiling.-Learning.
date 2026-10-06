print("What is your name?")
local name = io.read("l")
if name == nil or name == "" then
  print("No name given (type one in the Input tab).")
else
  print("Hello, " .. name .. "!")
end
