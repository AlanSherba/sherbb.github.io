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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inria+Serif:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap" rel="stylesheet" />
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
