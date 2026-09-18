import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PensionPlanner from "./PensionPlanner.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PensionPlanner />
  </StrictMode>
);
