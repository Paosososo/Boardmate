// ============ GLOBAL STATE ============
let selectedRoom = null;
let selectedGame = null;
let currentRating = 0;

// time state
let selectedDate = null;
let selectedStartTime = null;
let selectedEndTime = null;
let selectedDurationHours = 0;

// global for backend
window.currentBookingId = null;
window.currentUserId = null;
window.currentTotalAmount = 0;

function resetBookingState() {
  window.currentBookingId = null;
  window.currentTotalAmount = 0;

  selectedRoom = null;
  selectedGame = null;
  selectedDate = null;
  selectedStartTime = null;
  selectedEndTime = null;
  selectedDurationHours = 0;
}

document.addEventListener("DOMContentLoaded", () => {
  // เริ่มที่หน้า auth
  showPage("auth");
  showAuth("choice");

  // render ส่วนต่างๆ
  renderRecommended();
  renderPopular();
  renderRooms();     // ดึงจาก get_rooms.php
  renderGames();     // ดึงจาก get_games.php

  // init ฟอร์ม
  initAuth();
  initStarRating();

  // เตรียม time select dropdown
  initTimeSelect();
});

// Toast Notification System
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.classList.add("toast");
  toast.classList.add(type === "error" ? "toast-error" : "toast-success");
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}


// =================== PAGE NAV ===================
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("page--active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("page--active");

  const topBar = document.getElementById("topBar");
  if (id === "auth") {
    topBar.style.display = "none";
  } else {
    topBar.style.display = "flex";
  }

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.textContent = mapTitle(id);
  }

  if (id === "room-booking") {
    resetBookingState();        // ✅ เริ่มจองใหม่เมื่อมาที่หน้าห้อง
  }

  toggleMenu(false);
}

// เริ่มจองใหม่จากหน้า Home (เรียกจากปุ่ม)
function startBooking() {
  resetBookingState();          // ล้าง state รอบก่อน
  showPage("room-booking");     // ไปหน้าเลือกห้อง
}

function mapTitle(id) {
  const map = {
    "home": "Home",
    "room-booking": "Room Booking",
    "time-select": "Choose Time",
    "game-select": "Select Game",
    "payment": "Payment",
    "payment-success": "Success",
    "review": "Review",
    "my-booking": "Your Booking",
    "favorites": "Favorite Game",
    "profile": "Profile",
    "settings": "Settings"
  };
  return map[id] || "BoardMate";
}

// =================== SIDE MENU ===================
function toggleMenu(open) {
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");
  if (open) {
    sideMenu.classList.add("open");
    overlay.style.display = "block";
  } else {
    sideMenu.classList.remove("open");
    overlay.style.display = "none";
  }
}

// =================== AUTH UI ===================
function showAuth(mode) {
  const choice = document.getElementById("authChoice");
  const login = document.getElementById("loginBox");
  const signup = document.getElementById("signupBox");

  choice.classList.add("hidden");
  login.classList.add("hidden");
  signup.classList.add("hidden");

  if (mode === "login") {
    login.classList.remove("hidden");
  } else if (mode === "signup") {
    signup.classList.remove("hidden");
  } else {
    choice.classList.remove("hidden");
  }
}

// =================== AUTH LOGIC ===================
function initAuth() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  // login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const res = await fetch("login.php", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        window.currentUserId = data.user.id;
        showPage("home");
      } else {
        alert(await res.text());
      }
    });
  }

  // signup
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      const res = await fetch("register.php", {
        method: "POST",
        body: formData
      });

      const data = await res.json();   // 👈 เปลี่ยนเป็น json

      if (res.ok && data.status === "OK") {
        // 👇 ตอนนี้เรามี user_id แล้ว
        window.currentUserId = data.user_id;
        alert("Register success");
        showPage("home");
      } else {
        alert(data.message || "Register failed");
      }
    });
  }
}

// =================== HOME MOCK DATA ===================
const recommendedGamesData = [
  { id: "g1", title: "Coup", players: "2–6 players", tag: "Most picked" },
  { id: "g2", title: "Keyes", players: "2–10 players", tag: "Available" },
  { id: "g3", title: "Rumen", players: "3–5 players", tag: "Available" },
  { id: "g4", title: "Samarn", players: "2–4 players", tag: "New" },
];

const popularGamesData = [
  { id: "p1", title: "Uno Party", players: "2–10" },
  { id: "p2", title: "Monopoly", players: "2–6" },
  { id: "p3", title: "Sushi Go!", players: "2–4" },
  { id: "p4", title: "Decrypto", players: "3–8" },
];

// =================== RENDER HOME ===================
function renderRecommended() {
  const wrap = document.getElementById("recommendedList");
  if (!wrap) return;
  wrap.innerHTML = "";
  recommendedGamesData.forEach(item => {
    const card = document.createElement("div");
    card.className = "recom-card";
    card.innerHTML = `
      <div class="recom-img"></div>
      <h4>${item.title}</h4>
      <p class="muted">${item.players}</p>
      <span class="tag">${item.tag}</span>
    `;
    wrap.appendChild(card);
  });
}

function renderPopular() {
  const wrap = document.getElementById("popularList");
  if (!wrap) return;
  wrap.innerHTML = "";
  popularGamesData.forEach(item => {
    const card = document.createElement("div");
    card.className = "pop-card";
    card.innerHTML = `
      <div class="pop-img"></div>
      <h4>${item.title}</h4>
      <p class="muted">${item.players} players</p>
    `;
    wrap.appendChild(card);
  });
}

// =================== ROOMS (ดึงจาก PHP) ===================
async function renderRooms() {
  const wrap = document.getElementById("roomList");
  if (!wrap) return;

  try {
    const res = await fetch("get_rooms.php");
    const rooms = await res.json();

    wrap.innerHTML = "";
    rooms.forEach(r => {
      const card = document.createElement("div");
      card.className = "room-card";
      card.innerHTML = `
        <div class="room-head">
          <h3>${r.room_name}</h3>
          <span class="status-pill ${r.status === "available" ? "status-pill--success" : "status-pill--danger"}">
            ${r.status}
          </span>
        </div>
        <p class="muted">Capacity: ${r.capacity}</p>
        <p class="muted">Available: ${r.time_slot || "-"}</p>
        <p><strong>${r.price_per_hour} THB / hr</strong></p>
        <button class="btn btn-primary" ${r.status !== "available" ? "disabled" : ""} onclick="selectRoomFromDB(${r.room_id}, ${r.price_per_hour}, '${r.room_name}')">Select</button>
      `;
      wrap.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    wrap.innerHTML = "<p class='muted'>Cannot load rooms</p>";
  }
}

function selectRoomFromDB(roomId, price, name) {
  resetBookingState(); // ✅ ล้างก่อนเริ่มจองรอบใหม่
  selectedRoom = { id: roomId, price: price, name: name };
  showPage("time-select");
  updateDurationPreview();
  loadTimeSlots();
}

// =================== GAME SELECT (ดึงจาก PHP) ===================
async function renderGames() {
  const wrap = document.getElementById("gameList");
  if (!wrap) return;

  const res = await fetch("get_games.php"); // เดี๋ยวให้โค้ดด้านล่าง
  const games = await res.json();

  wrap.innerHTML = "";
  games.forEach(g => {
    const div = document.createElement("div");
    div.className = "room-card";
    div.innerHTML = `
      <h3>${g.game_name}</h3>
      <p class="muted">${g.genre ? g.genre : ""}</p>
      <button class="btn btn-primary" onclick="selectGameFromDB(${g.game_id}, '${g.game_name.replace(/'/g, "\\'")}')">Select</button>
    `;
    wrap.appendChild(div);
  });
}

async function selectGameFromDB(gameId, gameName) {
  selectedGame = { id: gameId, title: gameName };

  // ✅ บังคับให้รอบนี้เป็นบิลใหม่เสมอ
  window.currentBookingId = null;

  const ok = await createBookingOnServer();   // ส่ง game_id ไปด้วย
  if (!ok) {
    showToast("Cannot create booking", "error");
    return;
  }

  // อัปเดตสรุป
  document.getElementById("summaryRoom").textContent = selectedRoom ? selectedRoom.name : "-";
  document.getElementById("summaryGame").textContent = selectedGame ? selectedGame.title : "-";
  document.getElementById("summaryDate").textContent = selectedDate || "-";
  document.getElementById("summaryTime").textContent =
    selectedStartTime && selectedEndTime ? `${selectedStartTime} - ${selectedEndTime}` : "-";
  document.getElementById("summaryDuration").textContent =
    selectedDurationHours ? `${selectedDurationHours} hour(s)` : "-";

  const pricePerHour = selectedRoom ? selectedRoom.price : 0;
  const total = pricePerHour * selectedDurationHours;
  document.getElementById("summaryTotal").textContent = total + " THB";
  window.currentTotalAmount = total;

  // ไปหน้า Payment
  showPage("payment");
}

// =================== TIME SELECT ===================
function initTimeSelect() {
  const startSel = document.getElementById("startTime");
  const endSel = document.getElementById("endTime");
  const dateInput = document.getElementById("bookingDate");

  // ถ้า element ยังไม่มี ก็ไม่ต้องทำต่อ
  if (!startSel || !endSel) return;

  // เคลียร์ของเก่า
  startSel.innerHTML = "";
  endSel.innerHTML = "";

  // สร้างเวลา 10:00 - 22:00
  for (let h = 10; h <= 22; h++) {
    const label = (h < 10 ? "0" + h : h) + ":00";

    const opt1 = document.createElement("option");
    opt1.value = label;
    opt1.textContent = label;
    startSel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = label;
    opt2.textContent = label;
    endSel.appendChild(opt2);
  }

  // ตั้งค่าวันเริ่มต้นเป็นวันนี้
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    // เก็บไว้ในตัวแปรกลางด้วย
    selectedDate = dateInput.value;
  }

  // เวลาผู้ใช้เปลี่ยนเวลา ให้คำนวณชั่วโมงใหม่
  startSel.addEventListener("change", updateDurationPreview);
  endSel.addEventListener("change", updateDurationPreview);

  // เวลาผู้ใช้เปลี่ยน "วัน" ให้คำนวณใหม่ + โหลด slot จาก server
  if (dateInput) {
    dateInput.addEventListener("change", () => {
      selectedDate = dateInput.value;
      updateDurationPreview();
      // โหลดช่องเวลาของห้องนี้ในวันที่เลือก
      loadTimeSlots();   // ← ตัวนี้คือฟังก์ชันที่เราเขียนเพิ่มเมื่อกี้
    });
  }

  // คำนวณครั้งแรก
  updateDurationPreview();

  // ถ้าเราเลือกห้องมาแล้ว ให้โหลด slot ครั้งแรกเลย
  if (typeof loadTimeSlots === "function") {
    loadTimeSlots();
  }
}


function updateDurationPreview() {
  const startSel = document.getElementById("startTime");
  const endSel = document.getElementById("endTime");
  const dateInput = document.getElementById("bookingDate");
  const summary = document.getElementById("timeSummary");

  if (!startSel || !endSel) return;

  const start = startSel.value;
  const end = endSel.value;

  const startH = parseInt(start.split(":")[0]);
  const endH = parseInt(end.split(":")[0]);

  let duration = endH - startH;
  if (duration < 1) {
    duration = 0;
  }

  selectedDurationHours = duration;
  selectedStartTime = start;
  selectedEndTime = end;
  selectedDate = dateInput ? dateInput.value : null;

  if (summary) {
    if (duration > 0) {
      summary.textContent = `Duration: ${duration} hour(s)`;
    } else {
      summary.textContent = "Duration: invalid, please adjust time";
    }
  }
}

// ========== สร้าง booking ใน DB (หลังเลือกเกม) ==========
async function createBookingOnServer() {
  // ตรวจสอบว่าเลือกครบแล้ว
  if (!window.currentUserId) {
    showToast("กรุณาเข้าสู่ระบบก่อน", "error");
    return false;
  }
  if (!selectedRoom || !selectedRoom.id) {
    showToast("กรุณาเลือกห้อง", "error");
    return false;
  }
  if (!selectedDate || !selectedStartTime || !selectedEndTime) {
    showToast("กรุณาเลือกวันและเวลา", "error");
    return false;
  }
  if (!selectedGame || !selectedGame.id) {
    showToast("กรุณาเลือกบอร์ดเกม", "error");
    return false;
  }

  // แปลงเวลาให้เป็น HH:MM:SS
  const toHMS = (t) => (t && t.length === 5 ? `${t}:00` : t);
  const start_hms = toHMS(selectedStartTime);
  const end_hms   = toHMS(selectedEndTime);

  // กัน user เลือกเวลาผิด
  if (!start_hms || !end_hms || start_hms >= end_hms) {
    showToast("เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด", "error");
    return false;
  }

  const fd = new FormData();
  fd.append("user_id", String(window.currentUserId));
  fd.append("room_id", String(selectedRoom.id));
  fd.append("booking_date", selectedDate);   // YYYY-MM-DD
  fd.append("start_time", start_hms);        // HH:MM:SS
  fd.append("end_time", end_hms);            // HH:MM:SS
  fd.append("game_id", String(selectedGame.id)); // ✅ เพิ่มเกมเข้าไปด้วย

  try {
    const res = await fetch("create_booking.php", {
      method: "POST",
      body: fd
    });

    // พยายาม parse เป็น JSON
    let data;
    try {
      data = await res.json();
    } catch {
      showToast("Server response invalid", "error");
      return false;
    }

    // รองรับได้ทั้งรูปแบบใหม่และเก่า
    const ok =
      (data && data.success === true) ||
      (data && data.status === "OK");

    if (res.ok && ok) {
      const bookingId =
        data.booking_id ||
        data.bookingId ||
        data.id;

      if (bookingId) {
        window.currentBookingId = bookingId;
      }

      showToast("Booking successful!", "success");
      return true;
    } else {
      // แสดงข้อความจาก backend ถ้ามี
      const msg =
        data?.error ||
        data?.message ||
        "Cannot create booking";
      showToast(msg, "error");
      return false;
    }
  } catch (err) {
    console.error(err);
    showToast("Error connecting to server", "error");
    return false;
  }
}

// เรียกตอนเข้า Choose Time
async function loadTimeSlots() {
  // ต้องรู้ก่อนว่าเลือกห้องอะไร
  if (!selectedRoom || !selectedRoom.id) {
    console.warn("No room selected yet");
    return;
  }

  const dateInput = document.getElementById("bookingDate");
  const chosenDate = dateInput ? dateInput.value : null;
  if (!chosenDate) return;

  const res = await fetch(`get_room_slots.php?room_id=${selectedRoom.id}&booking_date=${chosenDate}`);
  const slots = await res.json();

  const grid = document.getElementById("timeSlotGrid");
  grid.innerHTML = "";

  slots.forEach(slot => {
    const btn = document.createElement("button");
    btn.className = "time-slot-btn " + (slot.available ? "time-slot--free" : "time-slot--busy");
    btn.textContent = `${slot.start} - ${slot.end}`;

    if (slot.available) {
      btn.addEventListener("click", () => {
        // ถ้ากด slot ว่าง → กำหนด start / end อัตโนมัติ
        selectedStartTime = slot.start;
        selectedEndTime = slot.end;
        selectedDurationHours = 1;

        // ถ้ามี select เวลาอยู่ก็อัปเดตด้วย
        const startSel = document.getElementById("startTime");
        const endSel = document.getElementById("endTime");
        if (startSel) startSel.value = slot.start;
        if (endSel) endSel.value = slot.end;

        // ไฮไลต์ปุ่มที่เลือก
        document.querySelectorAll(".time-slot-btn").forEach(b => b.classList.remove("time-slot--selected"));
        btn.classList.add("time-slot--selected");
      });
    } else {
      btn.disabled = true;
    }

    grid.appendChild(btn);
  });
}


async function confirmTime() {
  // ถ้ายังเลือกเวลาไม่ถูก
  if (!selectedDurationHours || selectedDurationHours <= 0) {
    showToast("Please select valid start and end time", "error");
    return;
  }

  // ถ้าสำเร็จ → ไปหน้าเลือกเกม
  showPage("game-select");
}

// =================== ยืนยันจ่าย ===================
async function confirmPayment() {
  if (window.currentBookingId) {
    const fd = new FormData();
    fd.append("booking_id", window.currentBookingId);
    fd.append("method", "qr");
    fd.append("amount", window.currentTotalAmount || 0);

    const res = await fetch("finalize_payment.php", {
      method: "POST",
      body: fd
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }
  }

  document.getElementById("myBookingRoom").textContent = selectedRoom ? selectedRoom.name : "-";
  document.getElementById("myBookingGame").textContent = selectedGame ? selectedGame.title : "-";

  showPage("payment-success");
}

// =================== REVIEW ===================
function initStarRating() {
  const row = document.getElementById("starRow");
  if (!row) return;
  row.querySelectorAll("span").forEach(star => {
    star.addEventListener("click", () => {
      currentRating = parseInt(star.dataset.rate);
      updateStarDisplay();
    });
  });
}
function updateStarDisplay() {
  const row = document.getElementById("starRow");
  if (!row) return;
  row.querySelectorAll("span").forEach(star => {
    const rate = parseInt(star.dataset.rate);
    star.style.color = rate <= currentRating ? "#ffb347" : "#dae2ff";
  });
}
async function submitReview() {
  const comment = document.getElementById("commentBox").value;
  const rating = currentRating || 0;
  const bookingId = window.currentBookingId;

  if (!bookingId) {
    alert("No booking to review");
    return;
  }

  const fd = new FormData();
  fd.append("booking_id", bookingId);
  fd.append("rating", rating);
  fd.append("comment", comment);

  const res = await fetch("add_feedback.php", {
    method: "POST",
    body: fd
  });

  if (res.ok) {
    alert("Thanks for your feedback!");
    document.getElementById("commentBox").value = "";
    showPage("home");
  } else {
    alert(await res.text());
  }
}


// =================== QR MODAL ===================
function toggleQR(open) {
  const modal = document.getElementById("qrModal");
  if (!modal) return;
  modal.style.display = open ? "flex" : "none";
}