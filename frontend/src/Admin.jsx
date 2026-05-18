import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./Admin.css";

function Admin() {
  const [orders, setOrders] = useState([]);

  const [menus, setMenus] = useState([]);

  const [newMenu, setNewMenu] = useState("");

  const [selectedMenu, setSelectedMenu] = useState("ทั้งหมด");

  useEffect(() => {
    fetchOrders();

    fetchMenus();

    const interval = setInterval(() => {
      fetchOrders();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.log(error);
    }

    if (data) {
      setOrders(data);
    }
  }

  async function fetchMenus() {
    const { data } = await supabase.from("menus").select("*");

    if (data) {
      setMenus(data);
    }
  }

  async function addMenu() {
    if (!newMenu) return;

    await supabase.from("menus").insert([
      {
        name: newMenu,
      },
    ]);

    setNewMenu("");

    fetchMenus();
  }

  async function deleteMenu(id) {
    const confirmDelete = window.confirm("ลบเมนูนี้ ?");

    if (!confirmDelete) return;

    await supabase.from("menus").delete().eq("id", id);

    fetchMenus();
  }

  async function deleteOrder(id) {
    const confirmDelete = window.confirm("ลบออเดอร์นี้ ?");

    if (!confirmDelete) return;

    await supabase.from("orders").delete().eq("id", id);

    fetchOrders();
  }

  const allMenus = [
    "ทั้งหมด",

    ...new Set(orders.flatMap((order) => order.menu_names)),
  ];

  return (
    <div className="adminContainer">
      <h1>📋 รายการจองอาหาร</h1>

      <div className="menuManage">
        <h2>🍱 จัดการเมนูอาหาร</h2>

        <div className="menuAddBox">
          <input
            className="menuInput"
            type="text"
            placeholder="เพิ่มเมนูใหม่"
            value={newMenu}
            onChange={(e) => setNewMenu(e.target.value)}
          />

          <button className="addBtn" onClick={addMenu}>
            เพิ่มเมนู
          </button>
        </div>

        {menus.map((menu) => (
          <div key={menu.id} className="menuManageItem">
            <span>{menu.name}</span>

            <button
              className="deleteMenuBtn"
              onClick={() => deleteMenu(menu.id)}
            >
              ลบ
            </button>
          </div>
        ))}
      </div>

      <select
        className="filterSelect"
        value={selectedMenu}
        onChange={(e) => setSelectedMenu(e.target.value)}
      >
        {allMenus.map((menu, index) => (
          <option key={index} value={menu}>
            {menu}
          </option>
        ))}
      </select>

      {orders

        .filter((order) => {
          if (selectedMenu === "ทั้งหมด") {
            return true;
          }

          return order.menu_names.includes(selectedMenu);
        })

        .map((order, index) => (
          <div key={order.id} className="orderCard">
            <div className="queue">คิว #{index + 1}</div>

            <h2>{order.customer_name}</h2>

            <p>
              <strong>ห้อง:</strong> {order.classroom}
            </p>

            <p>
              <strong>เมนู:</strong>
            </p>

            <ul>
              {order.menu_names.map((menu, i) => (
                <li key={i}>{menu}</li>
              ))}
            </ul>

            <p>
              <strong>เพิ่มเติม:</strong> {order.note || "-"}
            </p>

            <p>
              <strong>เวลา:</strong>{" "}
              {new Date(order.created_at).toLocaleString()}
            </p>

            <button className="deleteBtn" onClick={() => deleteOrder(order.id)}>
              ลบออเดอร์
            </button>
          </div>
        ))}
    </div>
  );
}

export default Admin;
