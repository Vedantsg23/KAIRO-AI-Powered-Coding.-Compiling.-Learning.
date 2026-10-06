with Ada.Text_IO; use Ada.Text_IO;

procedure Main is
   A : array (1 .. 3) of Integer := (1, 2, 3);
   N : Integer;
begin
   N := Integer'Value (Get_Line);
   Put_Line (Integer'Image (A (N)));
end Main;
