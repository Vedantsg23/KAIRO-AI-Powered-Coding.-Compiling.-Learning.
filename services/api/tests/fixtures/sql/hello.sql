CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, marks INTEGER);
INSERT INTO students (name, marks) VALUES ('Asha', 91), ('Ravi', 78), ('Meera', 85);
SELECT name, marks FROM students WHERE marks > 80 ORDER BY marks DESC;
