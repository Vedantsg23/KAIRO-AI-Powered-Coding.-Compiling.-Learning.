const students = [
  { id: 1, name: "Asha" },
  { id: 2, name: "Ravi" },
];

const student = students.find((s) => s.id === 3);   // no student 3: undefined
console.log(student.name.toUpperCase());
