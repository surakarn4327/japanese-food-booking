import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Link } from "react-router-dom";
import "./Admin.css";

function Admin() {
  const [orders, setOrders] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState("ทั้งหมด");

  useEffect(() => {
    // Fetch initial data
    fetchOrders();

    // Subscribe to real-time order updates
    const subscription = supabase
      .from("orders")
      .on("*", (payload) => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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

  async function deleteOrder(id) {
    const confirmDelete = window.confirm("ลบออเดอร์นี้ ?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      console.log(error);
      alert("เกิดข้อผิดพลาด");
    }
  }

  const allMenus = [
    "ทั้งหมด",
    ...new Set(orders.flatMap((order) => order.menu_names)),
  ];

  return (
    <div className="adminContainer">
      <div className="adminNav">
        <h1>📋 รายการจองอาหาร (อัปเดท Realtime)</h1>
        <Link to="/admin/menus" className="navLink">
          🍱 จัดการเมนู
        </Link>
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

      <div className="ordersContainer">
        {orders.length === 0 ? (
          <p className="emptyMessage">ไม่มีออเดอร์</p>
        ) : (
          orders
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
                  {new Date(order.created_at).toLocaleString("th-TH")}
                </p>

                <button
                  className="deleteBtn"
                  onClick={() => deleteOrder(order.id)}
                >
                  ลบออเดอร์
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default Admin;
