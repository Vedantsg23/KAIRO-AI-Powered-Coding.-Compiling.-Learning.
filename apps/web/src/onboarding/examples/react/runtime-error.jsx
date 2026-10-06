export default function App() {
  const data = { title: "Marks" }; // there is no data.items
  return (
    <ul>
      {data.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
