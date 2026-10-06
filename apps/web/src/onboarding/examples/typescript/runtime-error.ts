interface Student {
  id: number;
  name: string;
}

const students: Student[] = [{ id: 1, name: "Asha" }];
const student = students.find((s) => s.id === 2)!;   // "!" tells TypeScript to trust us
console.log(student.name);
