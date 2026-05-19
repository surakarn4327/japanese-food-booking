import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Customer from "./Customer";
import Admin from "./Admin";
import MenuManagement from "./MenuManagement";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Customer />} />

        <Route path="/admin" element={<Admin />} />

        <Route path="/admin/menus" element={<MenuManagement />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
