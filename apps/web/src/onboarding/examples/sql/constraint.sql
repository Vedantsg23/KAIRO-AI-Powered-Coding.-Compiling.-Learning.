CREATE TABLE students (roll_no INTEGER UNIQUE, name TEXT NOT NULL);
INSERT INTO students VALUES (1, 'Asha');
INSERT INTO students VALUES (1, 'Ravi');   -- roll number 1 is already taken
