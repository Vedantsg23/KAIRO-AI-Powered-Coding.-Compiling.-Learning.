// Welcome to Verilog! Press Run (Ctrl+Enter): Icarus Verilog elaborates the
// design and simulates the testbench below; $display prints to the terminal.

// A 1-bit full adder
module full_adder(input a, input b, input cin, output sum, output cout);
  assign sum  = a ^ b ^ cin;
  assign cout = (a & b) | (cin & (a ^ b));
endmodule

// Testbench: try every combination of inputs
module main;
  reg a, b, cin;
  wire sum, cout;
  integer i;

  full_adder fa(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));

  initial begin
    $display(" a b cin | sum cout");
    for (i = 0; i < 8; i = i + 1) begin
      {a, b, cin} = i;
      #1 $display(" %b %b  %b  |  %b    %b", a, b, cin, sum, cout);
    end
    $finish;
  end
endmodule
