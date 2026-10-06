function Card({ title, marks }) {
  const passed = marks >= 40;
  return (
    <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, margin: 8 }}>
      <h3>{title}</h3>
      <p style={{ color: passed ? "green" : "crimson" }}>
        {marks} marks: {passed ? "passed" : "try again"}
      </p>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui" }}>
      <Card title="Compiler Design" marks={78} />
      <Card title="Operating Systems" marks={36} />
    </div>
  );
}
