CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE students (name TEXT, department_id INTEGER, score INTEGER);

INSERT INTO departments VALUES (1, 'Computer'), (2, 'Civil');
INSERT INTO students VALUES ('Asha', 1, 88), ('Ravi', 2, 72), ('Meera', 1, 95);

SELECT d.name AS department, COUNT(*) AS students, AVG(s.score) AS average
FROM students AS s
JOIN departments AS d ON d.id = s.department_id
GROUP BY d.name;
