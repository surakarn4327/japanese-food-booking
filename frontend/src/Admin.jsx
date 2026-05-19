import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Link } from "react-router-dom";
import "./Admin.css";

function Admin() {
  const [orders, setOrders] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState("ทั้งหมด");
  const [sortOrder, setSortOrder] = useState("newest");
  const [bookingOpen, setBookingOpen] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: sortOrder === "oldest",
      });

    if (error) {
      console.log(error);
      showToast("error", "เกิดปัญหาขณะโหลดออเดอร์");
    }

    if (data) {
      setOrders(data);
    }
  }, [sortOrder]);

  const fetchBookingStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "booking_open")
      .single();

    if (!error && data) {
      setBookingOpen(data.value === "true" || data.value === true);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchOrders();
    fetchBookingStatus();

    const interval = setInterval(() => {
      fetchOrders();
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchOrders, fetchBookingStatus]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function updateBookingStatus(newStatus) {
    setSavingStatus(true);

    const { error } = await supabase.from("settings").upsert(
      [
        {
          key: "booking_open",
          value: String(newStatus),
        },
      ],
      { onConflict: "key" },
    );

    setSavingStatus(false);

    if (error) {
      console.log(error);
      showToast("error", "ไม่สามารถบันทึกสถานะการจองได้");
      return;
    }

    setBookingOpen(newStatus);
    showToast(
      "success",
      newStatus ? "เปิดการจองเรียบร้อยแล้ว" : "ปิดการจองเรียบร้อยแล้ว",
    );
  }

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }

  function openConfirm(title, message, onConfirm) {
    setConfirmDialog({ title, message, onConfirm });
  }

  function closeConfirm() {
    setConfirmDialog(null);
  }

  function handleDeleteOrder(id) {
    openConfirm("ยืนยันการลบ", "คุณแน่ใจหรือไม่ว่าต้องการลบออเดอร์นี้?", () => {
      executeDeleteOrder(id);
    });
  }

  async function executeDeleteOrder(id) {
    closeConfirm();

    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      console.log(error);
      showToast("error", "เกิดข้อผิดพลาดขณะลบออเดอร์");
    } else {
      showToast("success", "ลบออเดอร์เรียบร้อยแล้ว");
      fetchOrders();
    }
  }

  function handleClearAllOrders() {
    openConfirm(
      "ล้างออเดอร์ทั้งหมด",
      "ยืนยันการล้างออเดอร์ทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้",
      executeClearAllOrders,
    );
  }

  async function executeClearAllOrders() {
    closeConfirm();

    const { error } = await supabase.from("orders").delete().gte("id", 0);

    if (error) {
      console.log(error);
      showToast("error", "เกิดข้อผิดพลาดขณะล้างออเดอร์");
    } else {
      showToast("success", "ล้างออเดอร์ทั้งหมดเรียบร้อยแล้ว");
      fetchOrders();
    }
  }

  const allMenus = [
    "ทั้งหมด",
    ...new Set(orders.flatMap((order) => order.menu_names || [])),
  ];

  const filteredOrders = orders.filter((order) => {
    if (selectedMenu === "ทั้งหมด") {
      return true;
    }
    return order.menu_names?.includes(selectedMenu);
  });

  return (
    <div className="adminContainer">
      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}

      <div className="adminNav">
        <div>
          <h1>📋 รายการจองอาหาร (Realtime)</h1>
          <div className={`bookingStatus ${bookingOpen ? "open" : "closed"}`}>
            สถานะการจอง: {bookingOpen ? "เปิด" : "ปิด"}
          </div>
        </div>

        <div className="navButtons">
          <button
            className={`navLink statusBtn ${bookingOpen ? "closed" : "open"}`}
            onClick={() => updateBookingStatus(!bookingOpen)}
            disabled={savingStatus}
          >
            {savingStatus
              ? "กำลังบันทึก..."
              : bookingOpen
                ? "ปิดการจอง"
                : "เปิดการจอง"}
          </button>

          <Link to="/admin/menus" className="navLink">
            🍱 จัดการเมนู
          </Link>

          <button
            className="navLink deleteAllBtn"
            onClick={handleClearAllOrders}
          >
            🗑️ ล้างออเดอร์ทั้งหมด
          </button>
        </div>
      </div>

      <div className="filterSection">
        <div className="filterControls">
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

          <select
            className="sortSelect"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">🆕 ล่าสุดก่อน (Newest)</option>
            <option value="oldest">🕐 เก่าที่สุดก่อน (Oldest)</option>
          </select>
        </div>
      </div>

      <div className="ordersContainer">
        {filteredOrders.length === 0 ? (
          <p className="emptyMessage">
            {orders.length === 0 ? "ไม่มีออเดอร์" : "ไม่มีออเดอร์ของเมนูนี้"}
          </p>
        ) : (
          filteredOrders.map((order, index) => {
            const queueNumber =
              sortOrder === "newest"
                ? filteredOrders.length - index
                : index + 1;

            return (
              <div key={order.id} className="orderCard">
                <div className="queue">คิว #{queueNumber}</div>

                <h2>{order.customer_name}</h2>

                <p>
                  <strong>ห้อง:</strong> {order.classroom}
                </p>

                <p>
                  <strong>เมนู:</strong>
                </p>

                <ul>
                  {order.menu_names?.map((menu, i) => (
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
                  onClick={() => handleDeleteOrder(order.id)}
                >
                  ลบออเดอร์
                </button>
              </div>
            );
          })
        )}
      </div>

      {confirmDialog && (
        <div className="modalOverlay">
          <div className="confirmModal">
            <h2>{confirmDialog.title}</h2>
            <p>{confirmDialog.message}</p>
            <div className="confirmActions">
              <button className="cancelBtn" onClick={closeConfirm}>
                ยกเลิก
              </button>
              <button className="confirmBtn" onClick={confirmDialog.onConfirm}>
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
