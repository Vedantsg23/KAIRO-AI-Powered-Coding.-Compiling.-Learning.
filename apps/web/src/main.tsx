import "@fontsource-variable/geist";
import "@fontsource-variable/jetbrains-mono";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import "./styles/kairo.css";
import "./styles/fx.css";
import { ToastProvider } from "./ui/Toast";

// Monaco cancels its own pending work (suggestions, ghost text) while the student types,
// and some of those cancellations surface as unhandled "Canceled" rejections. They are
// expected, not errors.
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason as { name?: string; message?: string } | undefined;
  if (reason && (reason.name === "Canceled" || reason.message === "Canceled")) event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
