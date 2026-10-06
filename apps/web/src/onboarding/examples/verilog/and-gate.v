module and_gate(input a, input b, output y);
  assign y = a & b;
endmodule

module main;
  reg a, b;
  wire y;
  integer i;
  and_gate g(.a(a), .b(b), .y(y));
  initial begin
    for (i = 0; i < 4; i = i + 1) begin
      {a, b} = i;
      #1 $display("%b AND %b = %b", a, b, y);
    end
    $finish;
  end
endmodule
