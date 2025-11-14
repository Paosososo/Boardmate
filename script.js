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

// แมพชื่อเกมที่ต้องใช้ไฟล์เฉพาะ (เช่น .png)
const customGameImages = {
  "uno party": "games/uno.png",
};

// ฟังก์ชันแปลงชื่อเกมเป็นชื่อไฟล์รูป
function getGameImagePath(gameName) {
  const normalized = gameName.trim().toLowerCase();
  if (customGameImages[normalized]) {
    return customGameImages[normalized];
  }

  // แปลงชื่อเกมเป็น lowercase และแทนที่ช่องว่างด้วย dash
  const filename = normalized
    .replace(/\s+/g, '-')
    .replace(/!/g, '')
    .replace(/[^\w-]/g, '');
  
  // Default เป็นไฟล์ .jpg
  return `games/${filename}.jpg`;
}

function updateTopBarTransparency() {
  const topBar = document.getElementById("topBar");
  if (!topBar) return;
  if (topBar.style.display === "none") {
    topBar.classList.remove("top-bar--scrolled");
    return;
  }

  if (window.scrollY > 0) {
    topBar.classList.add("top-bar--scrolled");
  } else {
    topBar.classList.remove("top-bar--scrolled");
  }
}

function initTopBarTransparency() {
  window.addEventListener("scroll", updateTopBarTransparency);
  updateTopBarTransparency();
}

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
  initTopBarTransparency();
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
  updateTopBarTransparency();

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.textContent = mapTitle(id);
  }

  if (id === "room-booking") {
    resetBookingState();        // ✅ เริ่มจองใหม่เมื่อมาที่หน้าห้อง
  }

  if (id === "time-select" && typeof loadTimeSlots === "function") {
    loadTimeSlots();            // โหลด slot ทุกครั้งที่เข้าหน้านี้
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
        showToast("Login successful! 🎉", "success");
        showPage("home");
      } else {
        showToast(await res.text(), "error");
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

      const data = await res.json();

      if (res.ok && data.status === "OK") {
        window.currentUserId = data.user_id;
        showToast("Register successful! Welcome! 🎉", "success");
        showPage("home");
      } else {
        showToast(data.message || "Register failed", "error");
      }
    });
  }
}

// =================== HOME MOCK DATA ===================
const recommendedGamesData = [
  { id: "g1", title: "Coup", players: "2–6 players", tag: "Most picked" },
  { id: "g2", title: "Monopoly", players: "2–6 players", tag: "Classic" },
  { id: "g3", title: "Sushi Go!", players: "2–4 players", tag: "Family Fun" },
  { id: "g4", title: "Decrypto", players: "3–8 players", tag: "New" },
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
    
    const imgPath = getGameImagePath(item.title);
    
    card.innerHTML = `
      <div class="recom-img" style="background-image: url('${imgPath}');">
      </div>
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
    
    const imgPath = getGameImagePath(item.title);
    
    card.innerHTML = `
      <div class="pop-img" style="background-image: url('${imgPath}');">
      </div>
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
      
      // เพิ่ม emoji ตามขนาดห้อง
      let roomEmoji = "🎲";
      if (r.capacity <= 4) roomEmoji = "🎯";
      else if (r.capacity <= 6) roomEmoji = "🎪";
      else roomEmoji = "🏛️";
      
      card.innerHTML = `
        <div class="room-head">
          <h3>${roomEmoji} ${r.room_name}</h3>
          <span class="status-pill ${r.status === "available" ? "status-pill--success" : "status-pill--danger"}">
            ${r.status}
          </span>
        </div>
        <p class="muted">👥 Capacity: ${r.capacity} players</p>
        <p class="muted">⏰ Available: ${r.time_slot || "-"}</p>
        <p><strong>💰 ${r.price_per_hour} THB / hr</strong></p>
        <button class="btn btn-primary btn-full" ${r.status !== "available" ? "disabled" : ""} onclick="selectRoomFromDB(${r.room_id}, ${r.price_per_hour}, '${r.room_name}')">Select Room</button>
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
  showToast(`Selected ${name}! 🎯`, "success");
  showPage("time-select");
}

// =================== GAMES (ดึงจาก PHP) ===================
async function renderGames() {
  const wrap = document.getElementById("gameList");
  if (!wrap) return;

  try {
    const res = await fetch("get_games.php");
    const games = await res.json();

    wrap.innerHTML = "";
    games.forEach(g => {
      const card = document.createElement("div");
      card.className = "game-card";
      
      const imgPath = getGameImagePath(g.game_name);
      
      card.innerHTML = `
        <div class="game-img" style="background-image: url('${imgPath}'); background-size: cover; background-position: center;">
        </div>
        <div class="game-info">
          <h3>${g.game_name}</h3>
          <p class="muted">🎮 ${g.genre || "Board Game"}</p>
          <p class="muted">👥 ${g.players_min}–${g.players_max} players</p>
          <button class="btn btn-primary" onclick="selectGame(${g.game_id}, '${g.game_name}')">Choose</button>
        </div>
      `;
      wrap.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    wrap.innerHTML = "<p class='muted'>Cannot load games</p>";
  }
}

async function selectGame(gameId, gameName) {
  selectedGame = { id: gameId, title: gameName };
  showToast(`Selected ${gameName}! 🎲`, "success");

  // สร้าง booking ใน DB
  const success = await createBookingOnServer();

  if (success) {
    // คำนวณราคา
    const price = selectedRoom ? selectedRoom.price : 0;
    const hours = selectedDurationHours || 0;
    const total = price * hours;
    window.currentTotalAmount = total;

    // ใส่ข้อมูลสรุปในหน้าชำระเงิน
    document.getElementById("summaryRoom").textContent = selectedRoom ? selectedRoom.name : "-";
    document.getElementById("summaryGame").textContent = gameName;
    document.getElementById("summaryDate").textContent = selectedDate || "-";
    document.getElementById("summaryTime").textContent = selectedStartTime && selectedEndTime
      ? `${selectedStartTime} - ${selectedEndTime}`
      : "-";
    document.getElementById("summaryDuration").textContent = `${hours} hour(s)`;
    document.getElementById("summaryTotal").textContent = `${total} THB`;

    showPage("payment");
  }
}

// =================== TIME SELECT ===================
function initTimeSelect() {
  const startSel = document.getElementById("startTime");
  const endSel = document.getElementById("endTime");
  const dateInput = document.getElementById("bookingDate");

  if (!startSel || !endSel) return;

  // สร้าง options เวลา 10:00 - 22:00
  for (let h = 10; h <= 22; h++) {
    const val = `${String(h).padStart(2, "0")}:00`;
    const opt1 = document.createElement("option");
    opt1.value = val;
    opt1.textContent = val;
    startSel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = val;
    opt2.textContent = val;
    endSel.appendChild(opt2);
  }

  startSel.value = "10:00";
  endSel.value = "11:00";

  startSel.addEventListener("change", updateDurationPreview);
  endSel.addEventListener("change", updateDurationPreview);

  if (dateInput) {
    // ตั้งวันที่เริ่มต้นเป็นวันนี้
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;
    dateInput.min = today;

    dateInput.addEventListener("change", () => {
      selectedDate = dateInput.value;
      updateDurationPreview();
      loadTimeSlots();
    });
  }

  updateDurationPreview();

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
      summary.textContent = `⏱️ Duration: ${duration} hour(s)`;
    } else {
      summary.textContent = "⚠️ Duration: invalid, please adjust time";
    }
  }
}

// ========== สร้าง booking ใน DB (หลังเลือกเกม) ==========
async function createBookingOnServer() {
  if (!window.currentUserId) {
    showToast("Please login first 🔐", "error");
    return false;
  }
  if (!selectedRoom || !selectedRoom.id) {
    showToast("Please select a room 🏠", "error");
    return false;
  }
  if (!selectedDate || !selectedStartTime || !selectedEndTime) {
    showToast("Please select date and time ⏰", "error");
    return false;
  }
  if (!selectedGame || !selectedGame.id) {
    showToast("Please select a game 🎲", "error");
    return false;
  }

  const toHMS = (t) => (t && t.length === 5 ? `${t}:00` : t);
  const start_hms = toHMS(selectedStartTime);
  const end_hms   = toHMS(selectedEndTime);

  if (!start_hms || !end_hms || start_hms >= end_hms) {
    showToast("Start time must be before end time ⏰", "error");
    return false;
  }

  const fd = new FormData();
  fd.append("user_id", String(window.currentUserId));
  fd.append("room_id", String(selectedRoom.id));
  fd.append("booking_date", selectedDate);
  fd.append("start_time", start_hms);
  fd.append("end_time", end_hms);
  fd.append("game_id", String(selectedGame.id));

  try {
    const res = await fetch("create_booking.php", {
      method: "POST",
      body: fd
    });

    let data;
    try {
      data = await res.json();
    } catch {
      showToast("Server response invalid", "error");
      return false;
    }

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

      showToast("Booking created! 🎉", "success");
      return true;
    } else {
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
        selectedStartTime = slot.start;
        selectedEndTime = slot.end;
        selectedDurationHours = 1;

        const startSel = document.getElementById("startTime");
        const endSel = document.getElementById("endTime");
        if (startSel) startSel.value = slot.start;
        if (endSel) endSel.value = slot.end;

        document.querySelectorAll(".time-slot-btn").forEach(b => b.classList.remove("time-slot--selected"));
        btn.classList.add("time-slot--selected");
        
        updateDurationPreview();
      });
    } else {
      btn.disabled = true;
    }

    grid.appendChild(btn);
  });
}

async function confirmTime() {
  if (!selectedDurationHours || selectedDurationHours <= 0) {
    showToast("Please select valid start and end time ⏰", "error");
    return;
  }

  showToast("Time confirmed! 👍", "success");
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
      showToast(await res.text(), "error");
      return;
    }
  }

  document.getElementById("myBookingRoom").textContent = selectedRoom ? selectedRoom.name : "-";
  document.getElementById("myBookingGame").textContent = selectedGame ? selectedGame.title : "-";

  showToast("Payment successful! 💳", "success");
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
    star.style.color = rate <= currentRating ? "#f39c12" : "#e0e0e0";
  });
}

async function submitReview() {
  const comment = document.getElementById("commentBox").value;
  const rating = currentRating || 0;
  const bookingId = window.currentBookingId;

  if (!bookingId) {
    showToast("No booking to review", "error");
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
    showToast("Thanks for your feedback! ⭐", "success");
    document.getElementById("commentBox").value = "";
    currentRating = 0;
    updateStarDisplay();
    showPage("home");
  } else {
    showToast(await res.text(), "error");
  }
}

// =================== QR MODAL ===================
function toggleQR(open) {
  const modal = document.getElementById("qrModal");
  if (!modal) return;
  modal.style.display = open ? "flex" : "none";
}
