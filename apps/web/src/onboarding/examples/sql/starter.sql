-- Welcome to SQL (SQLite)! Press Run (Ctrl+Enter).
-- Every run starts with an empty in-memory database: create tables, add rows, then query.

CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, score INTEGER);

INSERT INTO students (name, score) VALUES
  ('Asha', 88), ('Ravi', 72), ('Meera', 95), ('Kabir', 64);

SELECT name, score FROM students ORDER BY score DESC;

SELECT COUNT(*) AS students, ROUND(AVG(score), 1) AS average FROM students;
