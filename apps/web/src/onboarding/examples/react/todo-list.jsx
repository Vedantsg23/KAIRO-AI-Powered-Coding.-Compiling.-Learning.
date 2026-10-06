import { useState } from "react";

export default function TodoList() {
  const [items, setItems] = useState(["Revise pointers", "Finish the Lex lab"]);
  const [text, setText] = useState("");

  function add(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setItems([...items, text.trim()]);
    setText("");
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h2>To do</h2>
      <form onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="New task" />
        <button>Add</button>
      </form>
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            {item} <button onClick={() => setItems(items.filter((_, j) => j !== i))}>done</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
