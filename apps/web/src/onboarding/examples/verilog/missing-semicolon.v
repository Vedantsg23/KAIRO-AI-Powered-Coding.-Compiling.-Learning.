module main;
  reg [3:0] count;
  initial begin
    count = 4'd5
    $display("count = %d", count);
  end
endmodule
