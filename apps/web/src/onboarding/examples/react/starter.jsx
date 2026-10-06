// Welcome to React! This component renders in the preview below,
// which updates as you type.
import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  const skills = ["HTML", "CSS", "JavaScript", "React"];

  return (
    <main style={{ fontFamily: "system-ui", padding: 16 }}>
      <h1>Hello, React!</h1>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      <ul>
        {skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    </main>
  );
}
