with Ada.Text_IO; use Ada.Text_IO;

procedure Main is
   Name : constant String := Get_Line;
begin
   Put_Line ("Hello, " & Name & "!");
end Main;
