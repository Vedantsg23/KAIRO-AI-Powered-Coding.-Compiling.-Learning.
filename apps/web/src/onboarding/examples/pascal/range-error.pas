program Main;
var
  a: array[1..3] of integer;
  i: integer;
begin
  for i := 1 to 4 do
    a[i] := i * 2;
  writeln(a[1]);
end.
