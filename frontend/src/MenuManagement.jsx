import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Link } from "react-router-dom";
import "./Admin.css";

function MenuManagement() {
  const [menus, setMenus] = useState([]);
  const [orderCounts, setOrderCounts] = useState({});
  const [newMenu, setNewMenu] = useState("");
  const [newMenuLimit, setNewMenuLimit] = useState("");
  const [savingMenuId, setSavingMenuId] = useState(null);

  const fetchMenus = useCallback(async () => {
    const { data } = await supabase.from("menus").select("*").order("id");

    if (data) {
      setMenus(data);
    }
  }, []);

  const fetchOrderCounts = useCallback(async () => {
    const { data } = await supabase.from("orders").select("menu_names");
    const counts = {};

    if (data) {
      data.forEach((order) => {
        (order.menu_names || []).forEach((menuName) => {
          counts[menuName] = (counts[menuName] || 0) + 1;
        });
      });
    }

    setOrderCounts(counts);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchMenus();
    fetchOrderCounts();

    const menusChannel = supabase
      .channel("admin-menu-management")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menus",
        },
        () => {
          fetchMenus();
        },
      )
      .subscribe();

    const ordersChannel = supabase
      .channel("admin-menu-order-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrderCounts();
        },
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchOrderCounts();
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(menusChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [fetchMenus, fetchOrderCounts]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function normalizeLimit(value) {
    const limit = Number(value);
    return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
  }

  function getMenuLimit(menu) {
    return normalizeLimit(menu.queue_limit);
  }

  function getMenuUsage(menu) {
    const used = orderCounts[menu.name] || 0;
    const limit = getMenuLimit(menu);
    const remaining = limit === null ? null : Math.max(limit - used, 0);

    return { used, limit, remaining };
  }

  async function addMenu() {
    const trimmedName = newMenu.trim();

    if (!trimmedName) {
      alert("กรุณากรอกชื่อเมนู");
      return;
    }

    const { error } = await supabase.from("menus").insert([
      {
        name: trimmedName,
        queue_limit: normalizeLimit(newMenuLimit),
      },
    ]);

    if (error) {
      console.log(error);
      alert("เกิดข้อผิดพลาด");
    } else {
      setNewMenu("");
      setNewMenuLimit("");
      fetchMenus();
    }
  }

  function changeMenuLimit(menuId, value) {
    setMenus((currentMenus) =>
      currentMenus.map((menu) =>
        menu.id === menuId ? { ...menu, queue_limit: value } : menu,
      ),
    );
  }

  async function saveMenuLimit(menu) {
    const queueLimit = normalizeLimit(menu.queue_limit);
    setSavingMenuId(menu.id);

    const { error } = await supabase
      .from("menus")
      .update({ queue_limit: queueLimit })
      .eq("id", menu.id);

    setSavingMenuId(null);

    if (error) {
      console.log(error);
      alert("ไม่สามารถบันทึกจำนวนคิวได้ กรุณาเช็กว่ามีคอลัมน์ queue_limit ในตาราง menus แล้ว");
      fetchMenus();
      return;
    }

    setMenus((currentMenus) =>
      currentMenus.map((item) =>
        item.id === menu.id ? { ...item, queue_limit: queueLimit } : item,
      ),
    );
  }

  async function deleteMenu(id) {
    const confirmDelete = window.confirm("ลบเมนูนี้ ?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("menus").delete().eq("id", id);

    if (error) {
      console.log(error);
      alert("เกิดข้อผิดพลาด");
    } else {
      fetchMenus();
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
        <div className="menuAddBox limit">
          <input
            className="menuInput"
            type="text"
            placeholder="เพิ่มเมนูใหม่"
            value={newMenu}
            onChange={(e) => setNewMenu(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addMenu();
              }
            }}
          />

          <input
            className="menuLimitInput"
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="รับกี่คิว"
            value={newMenuLimit}
            onChange={(e) => setNewMenuLimit(e.target.value)}
            onKeyDown={(e) => {
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
            menus.map((menu) => {
              const { used, limit, remaining } = getMenuUsage(menu);
              const isSoldOut = limit !== null && used >= limit;

              return (
                <div
                  key={menu.id}
                  className={`menuManageItem limit ${
                    isSoldOut ? "soldOut" : ""
                  }`}
                >
                  <div className="menuManageInfo">
                    <span>{menu.name}</span>
                    <small>
                      {limit === null
                        ? `จองแล้ว ${used} คิว / ไม่จำกัด`
                        : `จองแล้ว ${used}/${limit} คิว เหลือ ${remaining} คิว`}
                    </small>
                  </div>

                  <label className="menuLimitField">
                    <span>รับกี่คิว</span>
                    <input
                      className="menuLimitInput"
                      type="number"
                      min="1"
                      inputMode="numeric"
                      placeholder="ไม่จำกัด"
                      value={menu.queue_limit ?? ""}
                      onChange={(e) => changeMenuLimit(menu.id, e.target.value)}
                      onBlur={() => saveMenuLimit(menu)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  </label>

                  <button
                    className="deleteMenuBtn"
                    onClick={() => deleteMenu(menu.id)}
                    disabled={savingMenuId === menu.id}
                  >
                    {savingMenuId === menu.id ? "บันทึก..." : "ลบ"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default MenuManagement;
