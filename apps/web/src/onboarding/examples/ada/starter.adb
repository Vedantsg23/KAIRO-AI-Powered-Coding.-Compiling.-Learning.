--  Welcome to Ada! Press Run (Ctrl+Enter) to compile and run this program.
--  The main procedure must be called Main (the file is main.adb).
with Ada.Text_IO;       use Ada.Text_IO;
with Ada.Float_Text_IO;

procedure Main is
   type Mark_List is array (1 .. 5) of Integer;
   Marks : constant Mark_List := (72, 88, 95, 64, 81);
   Total : Integer := 0;
begin
   for M of Marks loop
      Total := Total + M;
   end loop;
   Put_Line ("Total:" & Integer'Image (Total));
   Put ("Average: ");
   Ada.Float_Text_IO.Put (Float (Total) / 5.0, Fore => 1, Aft => 1, Exp => 0);
   New_Line;
end Main;
