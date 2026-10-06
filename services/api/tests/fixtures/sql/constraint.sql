CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT INTO students (name) VALUES ('Asha');
INSERT INTO students (name) VALUES ('Asha');
SELECT count(*) FROM students;
