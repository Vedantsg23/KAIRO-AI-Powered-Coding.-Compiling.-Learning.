-- Welcome to Lua! Press Run (Ctrl+Enter) to check and run this program.

local scores = {72, 88, 95, 64, 81}
local total = 0
for _, score in ipairs(scores) do
  total = total + score
end

print("Total: " .. total)
print(string.format("Average: %.1f", total / #scores))
