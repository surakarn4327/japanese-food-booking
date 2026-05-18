import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

function App() {
  const [menus, setMenus] = useState([]);

  const [customerName, setCustomerName] = useState("");

  const [classroom, setClassroom] = useState("");

  const [selectedMenus, setSelectedMenus] = useState([]);

  const [note, setNote] = useState("");

  useEffect(() => {
    fetchMenus();
  }, []);

  async function fetchMenus() {
    const { data } = await supabase.from("menus").select("*");

    if (data) {
      setMenus(data);
    }
  }

  function handleCheckbox(menuName) {
    if (selectedMenus.includes(menuName)) {
      setSelectedMenus(selectedMenus.filter((item) => item !== menuName));
    } else {
      setSelectedMenus([...selectedMenus, menuName]);
    }
  }

  async function handleSubmit() {
    if (!customerName || !classroom || selectedMenus.length === 0) {
      alert("กรอกข้อมูลให้ครบ");
      return;
    }

    const { error } = await supabase.from("orders").insert([
      {
        customer_name: customerName,
        classroom: classroom,
        menu_names: selectedMenus,
        note: note,
      },
    ]);

    if (error) {
      console.log(error);
      alert("เกิดข้อผิดพลาด");
    } else {
      alert("จองสำเร็จ");

      setCustomerName("");
      setClassroom("");
      setSelectedMenus([]);
      setNote("");
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>🍜 จองอาหารญี่ปุ่น</h1>

        <input
          className="input"
          type="text"
          placeholder="ชื่อเล่น"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        <input
          className="input"
          type="text"
          placeholder="ชั้น เช่น 5/6"
          value={classroom}
          onChange={(e) => setClassroom(e.target.value)}
        />

        <div className="menuBox">
          <h3>เลือกเมนู</h3>

          {menus.map((menu) => (
            <label
              key={menu.id}
              className={`menuItem ${
                selectedMenus.includes(menu.name) ? "active" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selectedMenus.includes(menu.name)}
                onChange={() => handleCheckbox(menu.name)}
              />

              <span>{menu.name}</span>
            </label>
          ))}
        </div>

        <textarea
          className="textarea"
          placeholder="เพิ่มเติม เช่น เพิ่มแซลม่อน 2 ชิ้น"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button className="button" onClick={handleSubmit}>
          จองอาหาร
        </button>
      </div>
    </div>
  );
}

export default App;
