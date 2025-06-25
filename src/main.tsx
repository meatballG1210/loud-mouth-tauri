import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./app.css";

// Set up the document for macOS styling
document.documentElement.style.height = "100%";
document.body.style.height = "100%";
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.overflow = "hidden";

createRoot(document.getElementById("root")!).render(<App />);
