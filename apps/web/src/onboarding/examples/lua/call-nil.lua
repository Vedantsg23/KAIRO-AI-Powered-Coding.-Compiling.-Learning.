local function average(values)
  local sum = 0
  for _, v in ipairs(values) do sum = sum + v end
  return sum / #values
end

print(avrage({72, 88, 95}))
