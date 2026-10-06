interface Student {
    name: string;
    marks?: number[];
}

function best(student: Student): number {
    return Math.max(...student.marks!);
}

const s: Student = { name: "Asha" };
console.log("Best mark:");
console.log(best(s));
