import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Link } from "react-router-dom";
import "./Admin.css";

function MenuManagement() {
  const [menus, setMenus] = useState([]);
  const [newMenu, setNewMenu] = useState("");

  useEffect(() => {
    fetchMenus();

    // Subscribe to real-time menu updates
    const subscription = supabase
      .from("menus")
      .on("*", (payload) => {
        fetchMenus();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchMenus() {
    const { data } = await supabase.from("menus").select("*");

    if (data) {
      setMenus(data);
    }
  }

  async function addMenu() {
    if (!newMenu.trim()) {
      alert("กรุณากรอกชื่อเมนู");
      return;
    }

    const { error } = await supabase.from("menus").insert([
      {
        name: newMenu,
      },
    ]);

    if (error) {
      console.log(error);
      alert("เกิดข้อผิดพลาด");
    } else {
      setNewMenu("");
    }
  }

  async function deleteMenu(id) {
    const confirmDelete = window.confirm("ลบเมนูนี้ ?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("menus").delete().eq("id", id);

    if (error) {
      console.log(error);
      alert("เกิดข้อผิดพลาด");
    }
  }

  return (
    <div className="adminContainer">
      <div className="adminNav">
        <h1>🍱 จัดการเมนูอาหาร</h1>
        <Link to="/admin" className="navLink">
          📋 รายการจองอาหาร
        </Link>
      </div>

      <div className="menuManage">
        <div className="menuAddBox">
          <input
            className="menuInput"
            type="text"
            placeholder="เพิ่มเมนูใหม่"
            value={newMenu}
            onChange={(e) => setNewMenu(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                addMenu();
              }
            }}
          />

          <button className="addBtn" onClick={addMenu}>
            เพิ่มเมนู
          </button>
        </div>

        <div className="menuList">
          {menus.length === 0 ? (
            <p className="emptyMessage">ไม่มีเมนู</p>
          ) : (
            menus.map((menu) => (
              <div key={menu.id} className="menuManageItem">
                <span>{menu.name}</span>

                <button
                  className="deleteMenuBtn"
                  onClick={() => deleteMenu(menu.id)}
                >
                  ลบ
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MenuManagement;
