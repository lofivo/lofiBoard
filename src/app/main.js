import { createWhiteboardApp } from "./whiteboard-app.js";
import "katex/dist/katex.min.css";
import "../styles.css";

createWhiteboardApp(document.querySelector("#app"));
