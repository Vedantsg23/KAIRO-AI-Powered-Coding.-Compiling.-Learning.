puts "What is your name?"
name = gets.to_s.strip
if name.empty?
  puts "No name given (type one in the Input tab)."
else
  puts "Hello, #{name}!"
end
