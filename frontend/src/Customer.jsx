import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

function Customer() {
  const [menus, setMenus] = useState([]);
  const [orderCounts, setOrderCounts] = useState({});
  const [customerName, setCustomerName] = useState("");
  const [classroom, setClassroom] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchMenus = useCallback(async () => {
    const { data } = await supabase.from("menus").select("*");

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
    return counts;
  }, []);

  const fetchBookingStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "booking_open")
      .single();

    if (!error && data) {
      const isOpen = data.value === "true" || data.value === true;
      setBookingOpen(isOpen);
      return isOpen;
    }

    return false;
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchMenus();
    fetchOrderCounts();
    fetchBookingStatus();

    function refreshAvailability() {
      fetchMenus();
      fetchOrderCounts();
    }

    const bookingChannel = supabase
      .channel("booking-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "settings",
          filter: "key=eq.booking_open",
        },
        (payload) => {
          const newValue = payload.new?.value;
          setBookingOpen(newValue === "true" || newValue === true);
        },
      )
      .subscribe();

    const ordersChannel = supabase
      .channel("customer-order-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          refreshAvailability();
        },
      )
      .subscribe();

    const menusChannel = supabase
      .channel("customer-menus")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menus",
        },
        () => {
          refreshAvailability();
        },
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchBookingStatus();
      refreshAvailability();
    }, 1000);

    window.addEventListener("focus", refreshAvailability);
    document.addEventListener("visibilitychange", refreshAvailability);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshAvailability);
      document.removeEventListener("visibilitychange", refreshAvailability);
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(menusChannel);
    };
  }, [fetchBookingStatus, fetchMenus, fetchOrderCounts]);

  function showToast(type, text) {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }

  const [modalData, setModalData] = useState(null);

  function openModal(data) {
    setModalData(data);
  }

  function closeModal() {
    setModalData(null);
  }

  function getMenuLimit(menu) {
    const limit = Number(menu.queue_limit);
    return Number.isFinite(limit) && limit > 0 ? limit : null;
  }

  function isMenuSoldOut(menu, counts = orderCounts) {
    const limit = getMenuLimit(menu);
    return limit !== null && (counts[menu.name] || 0) >= limit;
  }

  function handleCheckbox(menu) {
    const menuName = menu.name;

    if (!selectedMenus.includes(menuName) && isMenuSoldOut(menu)) {
      showToast("error", "เมนูนี้หมดแล้วค่ะ");
      return;
    }

    if (selectedMenus.includes(menuName)) {
      setSelectedMenus(selectedMenus.filter((item) => item !== menuName));
    } else {
      setSelectedMenus([...selectedMenus, menuName]);
    }
  }

  function handleTeacherChange(event) {
    const checked = event.target.checked;
    setIsTeacher(checked);

    if (checked) {
      setClassroom("");
    }
  }

  function getGradeFromClassroom(classroom) {
    const trimmed = classroom.trim();
    const match = trimmed.match(/^(?:ม\s*\.?\s*)?([1-6])\s*\/\s*\d+$/i);
    return match ? Number(match[1]) : null;
  }

  function isValidClassroomFormat(classroom) {
    const trimmed = classroom.trim();
    return /^(?:ม\s*\.?\s*)?[1-6]\s*\/\s*\d+$/i.test(trimmed);
  }

  function getSoldOutSelections(counts = orderCounts) {
    return selectedMenus.filter((menuName) => {
      const menu = menus.find((item) => item.name === menuName);
      return menu ? isMenuSoldOut(menu, counts) : false;
    });
  }

  async function submitOrder() {
    setIsLoading(true);
    const orderClassroom = isTeacher ? "ครู" : classroom;

    try {
      const latestCounts = await fetchOrderCounts();
      const soldOutSelections = getSoldOutSelections(latestCounts);

      if (soldOutSelections.length > 0) {
        setSelectedMenus((currentMenus) =>
          currentMenus.filter((menuName) => !soldOutSelections.includes(menuName)),
        );
        showToast("error", `เมนู ${soldOutSelections.join(", ")} หมดแล้วค่ะ`);
        return false;
      }

      const { error } = await supabase.from("orders").insert([
        {
          customer_name: customerName,
          classroom: orderClassroom,
          menu_names: selectedMenus,
          note: note,
        },
      ]);

      if (error) {
        console.log(error);
        showToast("error", "เกิดข้อผิดพลาด: " + error.message);
        return false;
      }

      showToast("success", "จองสำเร็จแล้ว ขอบคุณมากค่ะ");
      setCustomerName("");
      setClassroom("");
      setIsTeacher(false);
      setSelectedMenus([]);
      setNote("");
      return true;
    } catch (err) {
      console.log(err);
      showToast("error", "เกิดข้อผิดพลาดขณะจอง");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function submitOrderAndShowPickup(grade) {
    const success = await submitOrder();
    if (!success) {
      return;
    }

    let pickupMessage = "";
    if (isTeacher) {
      pickupMessage = "กรุณามารับภายใน 12:30\u00A0น.";
    } else if (grade >= 1 && grade <= 3) {
      pickupMessage = "กรุณามารับก่อน 11:30\u00A0น.\nมิฉะนั้นจะถือว่าสละสิทธิ์";
    } else if (grade >= 4 && grade <= 6) {
      pickupMessage = "กรุณามารับก่อน 12:20\u00A0น.\nมิฉะนั้นจะถือว่าสละสิทธิ์";
    }

    if (pickupMessage) {
      openModal({
        title: "",
        message: "กรุณาแคปหน้าจอเพื่อเป็นหลักฐานการจอง",
        details: [
          { label: "ชื่อเล่น", value: customerName },
          { label: "ชั้น", value: isTeacher ? "ครู" : classroom },
          { label: "เมนูที่เลือก", value: selectedMenus.join(", ") },
          { label: "เพิ่มเติม", value: note || "-" },
        ],
        footerText: pickupMessage,
        fullScreen: true,
        primaryLabel: "ปิด",
        onPrimary: closeModal,
      });
    }
  }

  async function handleSubmit() {
    if (isLoading) return;

    const currentBookingOpen = await fetchBookingStatus();
    if (!currentBookingOpen) {
      showToast("error", "ขออภัย ปิดการจองแล้วค่ะ");
      return;
    }

    if (!customerName || (!isTeacher && !classroom) || selectedMenus.length === 0) {
      showToast("error", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (!isTeacher && !isValidClassroomFormat(classroom)) {
      showToast(
        "error",
        "รูปแบบชั้นเรียนไม่ถูกต้อง กรุณากรอกเป็น เลข/เลข หรือ ม.เลข/เลข หรือ มเลข/เลข",
      );
      return;
    }

    const latestCounts = await fetchOrderCounts();
    const soldOutSelections = getSoldOutSelections(latestCounts);

    if (soldOutSelections.length > 0) {
      setSelectedMenus((currentMenus) =>
        currentMenus.filter((menuName) => !soldOutSelections.includes(menuName)),
      );
      showToast("error", `เมนู ${soldOutSelections.join(", ")} หมดแล้วค่ะ`);
      return;
    }

    const grade = isTeacher ? null : getGradeFromClassroom(classroom);
    const selectedMenusText = selectedMenus.join(", ");
    const classroomText = isTeacher ? "ครู" : classroom;

    openModal({
      title: "ตรวจสอบข้อมูลก่อนยืนยัน",
      message: "กรุณาตรวจสอบข้อมูลก่อนกดตกลงจอง",
      details: [
        { label: "ชื่อเล่น", value: customerName },
        { label: "ชั้น", value: classroomText },
        { label: "เมนูที่เลือก", value: selectedMenusText },
        { label: "เพิ่มเติม", value: note || "-" },
      ],
      primaryLabel: "ตกลงจอง",
      secondaryLabel: "ยกเลิก",
      onPrimary: async () => {
        closeModal();
        await submitOrderAndShowPickup(grade);
      },
      onSecondary: closeModal,
    });
  }

  return (
    <div className="container">
      <div className="card">
        {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}

        <h1>🍜 จองอาหารญี่ปุ่น</h1>

        {!bookingOpen ? (
          <div className="closedNotice">
            <h2>ขออภัย ปิดการจองแล้วค่ะ</h2>
          </div>
        ) : (
          <>
            <input
              className="input"
              type="text"
              placeholder="ชื่อเล่น"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isLoading}
            />

            <input
              className="input"
              type="text"
              placeholder="ชั้น เช่น 5/6"
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              disabled={isLoading || isTeacher}
            />

            <label className={`teacherOption ${isTeacher ? "active" : ""}`}>
              <input
                type="checkbox"
                checked={isTeacher}
                onChange={handleTeacherChange}
                disabled={isLoading}
              />
              <span>ครู</span>
            </label>

            <div className="menuBox">
              <h3>เลือกเมนู * เลือกหลายเมนูได้ *</h3>

              {menus.map((menu) => {
                const selected = selectedMenus.includes(menu.name);
                const soldOut = isMenuSoldOut(menu);

                return (
                  <label
                    key={menu.id}
                    className={`menuItem ${selected ? "active" : ""} ${
                      soldOut ? "soldOut" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleCheckbox(menu)}
                      disabled={isLoading || (soldOut && !selected)}
                    />

                    <span>{menu.name}</span>
                    {soldOut && <strong className="soldOutBadge">หมด</strong>}
                  </label>
                );
              })}
            </div>

            <textarea
              className="textarea"
              placeholder="เพิ่มเติม"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isLoading}
            />

            <button
              className={`button ${isLoading ? "loading" : ""}`}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span> กำลังจองอาหาร...
                </>
              ) : (
                "จองอาหาร"
              )}
            </button>
          </>
        )}
      </div>

      {modalData && (
        <div className="modalOverlay">
          <div
            className={`confirmModal ${modalData.fullScreen ? "fullScreen" : ""}`}
          >
            {modalData.details && (
              <div
                className={`modalDetails ${modalData.fullScreen ? "fullscreen" : ""}`}
              >
                {modalData.details.map((row, index) => (
                  <div key={index} className="modalDetailRow">
                    <strong>{row.label}</strong>
                    <span>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div
              className={`modalBody ${modalData.fullScreen ? "fullscreen" : ""}`}
            >
              {modalData.title ? <h2>{modalData.title}</h2> : null}
              <p
                className={`modalCenterText ${modalData.fullScreen ? "fullscreen" : ""}`}
              >
                {modalData.message}
              </p>
              {modalData.footerText && (
                <div className="modalFooter largeText">
                  {modalData.footerText.split("\n").map((line, index) => (
                    <span
                      key={index}
                      className={index === 0 ? "modalFooterTime" : "modalFooterNote"}
                    >
                      {line}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="confirmActions">
              {modalData.secondaryLabel && (
                <button className="cancelBtn" onClick={modalData.onSecondary}>
                  {modalData.secondaryLabel}
                </button>
              )}
              <button className="confirmBtn" onClick={modalData.onPrimary}>
                {modalData.primaryLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customer;
