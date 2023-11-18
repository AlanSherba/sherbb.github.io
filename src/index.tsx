import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { BrowserView, MobileView } from "react-device-detect";
import AppMobile from "./AppMobile";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <BrowserView>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </BrowserView>
    <MobileView>
      <AppMobile />
    </MobileView>
  </React.StrictMode>,
);
