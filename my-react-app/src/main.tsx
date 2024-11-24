import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement); // The '!' asserts that rootElement is non-null.

root.render(
  
    <BrowserRouter>
      <App />
    </BrowserRouter>

);
