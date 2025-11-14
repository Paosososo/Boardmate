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
window.currentUserRole = null;

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

function escapeHTML(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char] || char;
  });
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
  initAdminForms();      // ฟอร์ม admin (admin register + boardgame form)
  initStarRating();

  // เตรียม time select dropdown + UI ต่าง ๆ
  initTimeSelect();
  initTopBarTransparency();
  toggleSummaryPaymentMethod('qr');
  toggleModalPaymentMethod('qr');
  restoreSessionUser();  // ลองดึง session เดิมจาก server (ตั้ง currentUserId, etc.)
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

async function requestJSON(url, options = {}) {
  const { expectSuccess = false, ...fetchOptions } = options;
  const response = await fetch(url, fetchOptions);
  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (err) {
      throw new Error("Invalid server response");
    }
  }

  if (!response.ok) {
    const message = data && (data.error || data.message);
    throw new Error(message || `HTTP ${response.status}`);
  }

  if (expectSuccess && data && data.success === false) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}


// =================== PAGE NAV ===================
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("page--active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("page--active");

  const topBar = document.getElementById("topBar");
  // ซ่อน TopBar ตอนอยู่หน้า auth หรือ admin-register
  if (id === "auth" || id === "admin-register") {
    topBar.style.display = "none";
  } else {
    topBar.style.display = "flex";
  }

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.textContent = mapTitle(id);
  }

  // logic เฉพาะแต่ละหน้า
  if (id === "room-booking") {
    // เริ่มจองใหม่เมื่อเข้าหน้าเลือกห้อง
    resetBookingState();
  }

  if (id === "admin-dashboard" && window.currentUserRole === "admin") {
    adminLoadDashboard();
  }

  if (id === "profile") {
    // โปรไฟล์ (ฟังก์ชันนี้จะเช็กเองว่ามี element ที่ต้องใช้ไหม)
    loadProfile();
  }

  if (id === "time-select" && typeof loadTimeSlots === "function") {
    loadTimeSlots();
  }

  toggleMenu(false);
  updateTopBarTransparency();
}

// เริ่มจองใหม่จากหน้า Home (เรียกจากปุ่ม)
function startBooking() {
  resetBookingState();          // ล้าง state รอบก่อน
  showPage("room-booking");     // ไปหน้าเลือกห้อง
}

function showAdminRegister() {
  showPage("admin-register");
}

function returnToAuth() {
  showPage("auth");
  showAuth("login");
}

function handleLogout() {
  logoutUser();
}

function openAdminDashboard() {
  if (window.currentUserRole !== "admin") {
    showToast("Admin access only", "error");
    return;
  }
  showPage("admin-dashboard");
}

function toggleAdminUI(isAdmin) {
  const link = document.getElementById("adminMenuLink");
  const badge = document.getElementById("adminBadge");
  if (link) {
    link.classList.toggle("hidden", !isAdmin);
  }
  if (badge) {
    badge.classList.toggle("hidden", !isAdmin);
  }
}

async function extractResponseMessage(res) {
  try {
    const text = await res.text();
    if (!text) return "Request failed";
    try {
      const parsed = JSON.parse(text);
      return parsed.message || parsed.error || parsed.status || text;
    } catch (err) {
      return text;
    }
  } catch (err) {
    return "Request failed";
  }
}

function formatStatusLabel(status) {
  if (!status) return "-";
  return status
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function makeStatusClass(status) {
  if (!status) return "";
  return `status-pill--${status.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    "settings": "Settings",
    "admin-register": "Admin Register",
    "admin-dashboard": "Admin Dashboard"
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
      try {
        const data = await requestJSON("login.php", {
          method: "POST",
          body: formData,
          expectSuccess: true
        });

        // login.php ที่เราแก้จะส่ง { success: true, user: {id, name, full_name, email, role} }
        const user = data.user || {};
        window.currentUserId = user.id;
        window.currentUserRole = user.role || "user";

        toggleAdminUI(window.currentUserRole === "admin");

        const displayName = user.name || user.full_name || "player";
        showToast(`Welcome back, ${displayName}!`, "success");

        if (window.currentUserRole === "admin") {
          showPage("admin-dashboard");
          adminLoadDashboard();
        } else {
          showPage("home");
          loadMyBookings();
        }
      } catch (err) {
        showToast(err.message || "Cannot login", "error");
      }
    });
  }

  // signup
   // signup
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      try {
        // ใช้ fetch ตรง ๆ เพื่อรองรับทั้งแบบ status/OK และ success:true
        const res = await fetch("register.php", {
          method: "POST",
          body: formData
        });

        const raw = await res.text();
        let data = null;
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch (err) {
            throw new Error("Invalid server response");
          }
        }

        if (!res.ok) {
          const msg = data && (data.error || data.message);
          throw new Error(msg || "Register failed");
        }

        let userId = null;
        let fullName = formData.get("full_name") || "player";

        // รองรับทั้งแบบเก่า {status:"OK", user_id: ...} และแบบใหม่ {success:true, user:{...}}
        if (data) {
          if (data.user && data.user.id) {
            userId = data.user.id;
            fullName = data.user.full_name || data.user.name || fullName;
          } else if (typeof data.user_id !== "undefined") {
            userId = data.user_id;
          }
        }

        window.currentUserId = userId;
        window.currentUserRole = "user";
        toggleAdminUI(false);

        showToast(`Register successful! Welcome, ${fullName}! 🎉`, "success");
        showPage("home");
        loadMyBookings();
      } catch (err) {
        showToast(err.message || "Register failed", "error");
      }
    });
  }
}

// =================== ADMIN UI ===================
function initAdminForms() {
  const adminForm = document.getElementById("adminRegisterForm");
  if (adminForm) {
    adminForm.addEventListener("submit", handleAdminRegisterSubmit);
  }

  const boardgameForm = document.getElementById("adminBoardgameForm");
  if (boardgameForm) {
    boardgameForm.addEventListener("submit", adminSubmitBoardgame);
  }
}

async function handleAdminRegisterSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const formData = new FormData(form);
  try {
    const res = await fetch("admin_register.php", {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const message = await extractResponseMessage(res);
      showToast(message || "Admin registration failed", "error");
      return;
    }
    const data = await res.json();
    if (data.status === "OK") {
      window.currentUserId = data.user.id;
      window.currentUserRole = data.user.role || "admin";
      toggleAdminUI(true);
      showToast("Admin registered successfully", "success");
      form.reset();
      showPage("admin-dashboard");
    } else {
      showToast(data.message || "Admin registration failed", "error");
    }
  } catch (err) {
    showToast(err.message || "Admin registration failed", "error");
  }
}

function adminLoadDashboard() {
  if (window.currentUserRole !== "admin") return;
  adminLoadBookings();
  adminLoadRooms();
  adminLoadBoardgames();
}

async function adminLoadBookings() {
  if (window.currentUserRole !== "admin") return;
  const list = document.getElementById("adminBookingsList");
  const empty = document.getElementById("adminBookingsEmpty");
  if (!list || !empty) return;

  empty.style.display = "none";

  try {
    const res = await fetch("admin_get_bookings.php");
    if (!res.ok) {
      const message = await extractResponseMessage(res);
      list.innerHTML = "";
      empty.textContent = message || "Unable to load bookings";
      empty.style.display = "block";
      showToast(message || "Unable to load bookings", "error");
      return;
    }
    const data = await res.json();
    if (data.status === "OK") {
      renderAdminBookings(data.bookings || []);
    } else {
      throw new Error(data.message || "Unable to load bookings");
    }
  } catch (err) {
    list.innerHTML = "";
    empty.textContent = err.message || "Unable to load bookings";
    empty.style.display = "block";
    showToast(err.message || "Unable to load bookings", "error");
  }
}

function renderAdminBookings(bookings) {
  const list = document.getElementById("adminBookingsList");
  const empty = document.getElementById("adminBookingsEmpty");
  if (!list || !empty) return;

  list.innerHTML = "";
  if (!bookings || bookings.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  bookings.forEach((booking) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    const bookingStatusClass = makeStatusClass(booking.status);
    const roomStatusClass = makeStatusClass(booking.room_status || booking.status);
    card.innerHTML = `
      <div class="admin-card__head">
        <div>
          <h4>#${escapeHtml(booking.booking_id)} • ${escapeHtml(booking.user_name)}</h4>
          <p class="muted small-text">${escapeHtml(booking.email)}</p>
        </div>
        <span class="status-pill ${bookingStatusClass}">${formatStatusLabel(booking.status)}</span>
      </div>
      <div class="admin-card__body">
        <div class="admin-card__row">
          <div>
            <span class="admin-label">Room</span>
            <p class="admin-value">${escapeHtml(booking.room_name)}</p>
          </div>
          <div>
            <span class="admin-label">Room status</span>
            <p class="admin-value"><span class="status-pill ${roomStatusClass}">${formatStatusLabel(booking.room_status)}</span></p>
          </div>
        </div>
        <div class="admin-card__row">
          <div>
            <span class="admin-label">Date</span>
            <p class="admin-value">${escapeHtml(booking.booking_date)}</p>
          </div>
          <div>
            <span class="admin-label">Time</span>
            <p class="admin-value">${escapeHtml(booking.start_time)} - ${escapeHtml(booking.end_time)}</p>
          </div>
        </div>
        <div class="admin-card__row">
          <div>
            <span class="admin-label">Price / hr</span>
            <p class="admin-value">${escapeHtml(booking.price_per_hour)} THB</p>
          </div>
          <div>
            <span class="admin-label">Game</span>
            <p class="admin-value">${escapeHtml(booking.game_name || "-")}</p>
          </div>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

async function adminLoadRooms() {
  if (window.currentUserRole !== "admin") return;
  const grid = document.getElementById("adminRoomsList");
  const empty = document.getElementById("adminRoomsEmpty");
  if (!grid || !empty) return;

  empty.style.display = "none";

  try {
    const res = await fetch("admin_get_rooms.php");
    if (!res.ok) {
      const message = await extractResponseMessage(res);
      grid.innerHTML = "";
      empty.textContent = message || "Unable to load rooms";
      empty.style.display = "block";
      showToast(message || "Unable to load rooms", "error");
      return;
    }
    const data = await res.json();
    if (data.status === "OK") {
      renderAdminRooms(data.rooms || []);
    } else {
      throw new Error(data.message || "Unable to load rooms");
    }
  } catch (err) {
    grid.innerHTML = "";
    empty.textContent = err.message || "Unable to load rooms";
    empty.style.display = "block";
    showToast(err.message || "Unable to load rooms", "error");
  }
}

function renderAdminRooms(rooms) {
  const grid = document.getElementById("adminRoomsList");
  const empty = document.getElementById("adminRoomsEmpty");
  if (!grid || !empty) return;

  grid.innerHTML = "";
  if (!rooms || rooms.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  rooms.forEach((room) => {
    const card = document.createElement("div");
    card.className = "admin-card admin-room-card";
    card.dataset.roomId = room.room_id;
    const statusClass = makeStatusClass(room.status);
    card.innerHTML = `
      <div class="admin-card__head">
        <div>
          <h4>${escapeHtml(room.room_name)}</h4>
          <p class="muted small-text">Capacity: ${escapeHtml(room.capacity)} • Slot: ${escapeHtml(room.time_slot || "-")}</p>
        </div>
        <span class="status-pill ${statusClass}">${formatStatusLabel(room.status)}</span>
      </div>
      <label class="field-label small-text">Price per hour (THB)</label>
      <input type="number" class="input admin-room-price" min="0" value="${escapeHtml(room.price_per_hour)}">
      <label class="field-label small-text">Status</label>
      <select class="input admin-room-status">
        <option value="available" ${room.status === "available" ? "selected" : ""}>Available</option>
        <option value="unavailable" ${room.status === "unavailable" ? "selected" : ""}>Unavailable</option>
        <option value="maintenance" ${room.status === "maintenance" ? "selected" : ""}>Maintenance</option>
      </select>
      <button type="button" class="btn btn-primary btn-full mt-8" onclick="adminSaveRoom(${room.room_id})">Save changes</button>
    `;
    grid.appendChild(card);
  });
}

async function adminSaveRoom(roomId) {
  if (window.currentUserRole !== "admin") return;
  const card = document.querySelector(`.admin-room-card[data-room-id="${roomId}"]`);
  if (!card) return;
  const priceRaw = card.querySelector(".admin-room-price")?.value ?? "";
  const status = card.querySelector(".admin-room-status")?.value;
  const priceValue = parseFloat(priceRaw);

  if (Number.isNaN(priceValue) || priceValue < 0) {
    showToast("Enter a valid room price", "error");
    return;
  }

  const fd = new FormData();
  fd.append("room_id", roomId);
  fd.append("price_per_hour", priceValue);
  if (status) {
    fd.append("status", status);
  }

  try {
    const res = await fetch("admin_update_room.php", {
      method: "POST",
      body: fd
    });
    if (!res.ok) {
      const message = await extractResponseMessage(res);
      showToast(message || "Unable to update room", "error");
      return;
    }
    const data = await res.json();
    if (data.status === "OK") {
      showToast("Room updated", "success");
      adminLoadRooms();
    } else {
      showToast(data.message || "Unable to update room", "error");
    }
  } catch (err) {
    showToast(err.message || "Unable to update room", "error");
  }
}

async function adminLoadBoardgames() {
  if (window.currentUserRole !== "admin") return;
  const list = document.getElementById("adminBoardgamesList");
  const empty = document.getElementById("adminBoardgamesEmpty");
  if (!list || !empty) return;

  empty.style.display = "none";

  try {
    const res = await fetch("admin_get_boardgames.php");
    if (!res.ok) {
      const message = await extractResponseMessage(res);
      list.innerHTML = "";
      empty.textContent = message || "Unable to load boardgames";
      empty.style.display = "block";
      showToast(message || "Unable to load boardgames", "error");
      return;
    }
    const data = await res.json();
    if (data.status === "OK") {
      renderAdminBoardgames(data.boardgames || []);
    } else {
      throw new Error(data.message || "Unable to load boardgames");
    }
  } catch (err) {
    list.innerHTML = "";
    empty.textContent = err.message || "Unable to load boardgames";
    empty.style.display = "block";
    showToast(err.message || "Unable to load boardgames", "error");
  }
}

function renderAdminBoardgames(games) {
  const list = document.getElementById("adminBoardgamesList");
  const empty = document.getElementById("adminBoardgamesEmpty");
  if (!list || !empty) return;

  list.innerHTML = "";
  if (!games || games.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  games.forEach((game) => {
    const card = document.createElement("div");
    card.className = "admin-card admin-boardgame-card";
    card.dataset.gameId = game.game_id;
    const statusClass = makeStatusClass(game.is_active == 1 ? "active" : "inactive");
    card.innerHTML = `
      <div class="admin-card__head">
        <div>
          <h4>${escapeHtml(game.game_name)}</h4>
          <p class="muted small-text">${escapeHtml(game.genre || "No genre")}</p>
        </div>
        <span class="status-pill ${statusClass}">${game.is_active == 1 ? "Active" : "Inactive"}</span>
      </div>
      <div class="admin-card__body">
        <label class="field-label small-text">Game name</label>
        <input type="text" class="input admin-game-name" value="${escapeHtml(game.game_name)}">
        <label class="field-label small-text">Genre</label>
        <input type="text" class="input admin-game-genre" value="${escapeHtml(game.genre || "")}">
        <div class="admin-card__row">
          <div>
            <label class="field-label small-text">Min players</label>
            <input type="number" class="input admin-game-min" value="${escapeHtml(game.players_min)}" min="1">
          </div>
          <div>
            <label class="field-label small-text">Max players</label>
            <input type="number" class="input admin-game-max" value="${escapeHtml(game.players_max)}" min="1">
          </div>
        </div>
        <label class="field-label small-text">Status</label>
        <select class="input admin-game-active">
          <option value="1" ${parseInt(game.is_active, 10) === 1 ? "selected" : ""}>Active</option>
          <option value="0" ${parseInt(game.is_active, 10) !== 1 ? "selected" : ""}>Inactive</option>
        </select>
      </div>
      <div class="admin-card__actions">
        <button type="button" class="btn btn-secondary" onclick="adminUpdateBoardgame(${game.game_id})">Save</button>
        <button type="button" class="btn btn-danger" onclick="adminDeleteBoardgame(${game.game_id})">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

async function adminSubmitBoardgame(e) {
  e.preventDefault();
  if (window.currentUserRole !== "admin") {
    showToast("Admin access only", "error");
    return;
  }
  const form = e.currentTarget;
  const fd = new FormData(form);
  try {
    const res = await fetch("admin_add_boardgame.php", {
      method: "POST",
      body: fd
    });
    if (!res.ok) {
      const message = await extractResponseMessage(res);
      showToast(message || "Unable to add boardgame", "error");
      return;
    }
    const data = await res.json();
    if (data.status === "OK") {
      showToast("Boardgame added", "success");
      form.reset();
      adminLoadBoardgames();
    } else {
      showToast(data.message || "Unable to add boardgame", "error");
    }
  } catch (err) {
    showToast(err.message || "Unable to add boardgame", "error");
  }
}

async function adminUpdateBoardgame(gameId) {
  if (window.currentUserRole !== "admin") return;
  const card = document.querySelector(`.admin-boardgame-card[data-game-id="${gameId}"]`);
  if (!card) return;

  const fd = new FormData();
  fd.append("game_id", gameId);
  fd.append("game_name", card.querySelector(".admin-game-name")?.value || "");
  fd.append("genre", card.querySelector(".admin-game-genre")?.value || "");
  fd.append("players_min", card.querySelector(".admin-game-min")?.value || 2);
  fd.append("players_max", card.querySelector(".admin-game-max")?.value || 4);
  fd.append("is_active", card.querySelector(".admin-game-active")?.value || 1);

  try {
    const res = await fetch("admin_update_boardgame.php", {
      method: "POST",
      body: fd
    });
    if (!res.ok) {
      const message = await extractResponseMessage(res);
      showToast(message || "Unable to update boardgame", "error");
      return;
    }
    const data = await res.json();
    if (data.status === "OK") {
      showToast("Boardgame updated", "success");
      adminLoadBoardgames();
    } else {
      showToast(data.message || "Unable to update boardgame", "error");
    }
  } catch (err) {
    showToast(err.message || "Unable to update boardgame", "error");
  }
}

async function adminDeleteBoardgame(gameId) {
  if (window.currentUserRole !== "admin") return;
  if (!confirm("Delete this boardgame?")) return;

  const fd = new FormData();
  fd.append("game_id", gameId);

  try {
    const res = await fetch("admin_delete_boardgame.php", {
      method: "POST",
      body: fd
    });
    if (!res.ok) {
      const message = await extractResponseMessage(res);
      showToast(message || "Unable to delete boardgame", "error");
      return;
    }
    const data = await res.json();
    if (data.status === "OK") {
      showToast("Boardgame deleted", "success");
      adminLoadBoardgames();
    } else {
      showToast(data.message || "Unable to delete boardgame", "error");
    }
  } catch (err) {
    showToast(err.message || "Unable to delete boardgame", "error");
  }
}

// =================== SESSION HELPERS ===================
async function restoreSessionUser() {
  if (window.currentUserId) return;
  try {
    const data = await requestJSON("get_profile.php", {
      method: "POST",
      expectSuccess: true
    });
    if (data && data.user) {
      const user = data.user;
      window.currentUserId = user.user_id || user.id;
      window.currentUserRole = user.role || "user";
      toggleAdminUI(window.currentUserRole === "admin");

      showToast(`Welcome back, ${user.full_name || user.name || "player"}!`, "success");
      if (window.currentUserRole === "admin") {
        showPage("admin-dashboard");
        adminLoadDashboard();
      } else {
        showPage("home");
        loadMyBookings();
      }
    }
  } catch (err) {
    // ถ้าไม่มี session ก็เงียบ ๆ ไป
  }
}

async function logoutUser() {
  resetBookingState();
  window.currentUserId = null;
  window.currentUserRole = null;   // <- เพิ่ม
  toggleAdminUI(false);            // <- เพิ่ม

  try {
    await requestJSON("logout.php", { method: "POST", expectSuccess: true });
    showToast("Logged out successfully");
  } catch (err) {
    showToast("Logout error: " + err.message, "error");
  } finally {
    showPage("auth");
    showAuth("choice");
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
    const rooms = await requestJSON("get_rooms.php");

    wrap.innerHTML = "";
    rooms.forEach(r => {
      const card = document.createElement("div");
      card.className = "room-card";
      
      // เพิ่ม emoji ตามขนาดห้อง
      let roomEmoji = "🎲";
      if (r.capacity <= 4) roomEmoji = "🎯";
      else if (r.capacity <= 6) roomEmoji = "🎪";
      else roomEmoji = "🏛️";
      const roomName = escapeHTML(r.room_name || "Room");
      const status = escapeHTML(r.status || "unknown");
      
      card.innerHTML = `
        <div class="room-head">
          <h3>${roomEmoji} ${roomName}</h3>
          <span class="status-pill ${r.status === "available" ? "status-pill--success" : "status-pill--danger"}">
            ${status}
          </span>
        </div>
        <p class="muted">👥 Capacity: ${r.capacity} players</p>
        <p class="muted">⏰ Available: ${r.time_slot || "-"}</p>
        <p><strong>💰 ${r.price_per_hour} THB / hr</strong></p>
      `;
      const btn = document.createElement("button");
      btn.className = "btn btn-primary btn-full";
      btn.textContent = "Select Room";
      btn.disabled = r.status !== "available";
      btn.addEventListener("click", () => selectRoomFromDB(r.room_id, r.price_per_hour, r.room_name));
      card.appendChild(btn);
      wrap.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    wrap.innerHTML = "<p class='muted'>Cannot load rooms</p>";
    showToast("Cannot load rooms: " + err.message, "error");
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
    const games = await requestJSON("get_games.php");

    wrap.innerHTML = "";
    games.forEach(g => {
      const card = document.createElement("div");
      card.className = "game-card";
      
      const imgPath = getGameImagePath(g.game_name);
      const safeName = escapeHTML(g.game_name || "Game");
      const safeGenre = escapeHTML(g.genre || "Board Game");
      const playerRange = `${g.players_min || "-"}–${g.players_max || "-"}`;
      
      card.innerHTML = `
        <div class="game-img" style="background-image: url('${imgPath}'); background-size: cover; background-position: center;">
        </div>
        <div class="game-info">
          <h3>${safeName}</h3>
          <p class="muted">🎮 ${safeGenre}</p>
          <p class="muted">👥 ${playerRange} players</p>
        </div>
      `;
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = "Choose";
      btn.addEventListener("click", () => selectGame(g.game_id, g.game_name));
      card.querySelector(".game-info").appendChild(btn);
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
    const data = await requestJSON("create_booking.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });

    if (data && data.booking_id) {
      window.currentBookingId = data.booking_id;
    }

    showToast("Booking created! 🎉", "success");
    return true;
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error connecting to server", "error");
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

  const grid = document.getElementById("timeSlotGrid");
  if (!grid) return;

  let slots = [];
  try {
    const params = new URLSearchParams({
      room_id: selectedRoom.id,
      booking_date: chosenDate
    });
    slots = await requestJSON(`get_room_slots.php?${params.toString()}`);
  } catch (err) {
    showToast("Cannot load room slots: " + err.message, "error");
  }

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
async function finalizePaymentRequest(formData) {
  return requestJSON("finalize_payment.php", {
    method: "POST",
    body: formData,
    expectSuccess: true
  });
}

async function confirmPayment() {
  if (!window.currentBookingId) {
    showToast('No current booking to pay', 'error');
    return;
  }

  // read selected method from payment summary radios
  const method = document.querySelector('input[name="payment_method"]:checked')?.value || 'qr';
  const amount = window.currentTotalAmount || 0;

  const fd = new FormData();
  fd.append('booking_id', window.currentBookingId);
  fd.append('method', method);
  fd.append('amount', amount);

  if (method === 'card') {
    const card = document.getElementById('summaryCardNumber')?.value?.trim();
    const cvv = document.getElementById('summaryCardCvv')?.value?.trim();
    if (!card || !cvv) {
      showToast('Please enter card number and CVV', 'error');
      return;
    }
    fd.append('card_number', card);
    fd.append('card_cvv', cvv);
  }

  try {
    await finalizePaymentRequest(fd);
    showToast('Payment successful!', 'success');
    if (window.currentUserId) {
      loadMyBookings();
    }
    const paidBookingId = window.currentBookingId;
    resetBookingState();
    window.currentBookingId = paidBookingId;
    showPage('payment-success');
  } catch (err) {
    console.error('Payment error:', err);
    showToast('Payment error: ' + err.message, 'error');
  }
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

// =================== MY BOOKING (Your Booking Page) ===================
async function loadMyBookings() {
  if (!window.currentUserId) {
    const list = document.getElementById("myBookingList");
    const empty = document.getElementById("myBookingEmpty");
    if (list) list.innerHTML = "";
    if (empty) empty.style.display = "block";
    showToast("Please log in to view your bookings", "error");
    showPage("auth");
    showAuth("login");
    return;
  }

  try {
    const fd = new FormData();
    fd.append("user_id", window.currentUserId);
    const data = await requestJSON("get_user_bookings.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });

    const bookings = data.bookings || [];
    const list = document.getElementById("myBookingList");
    const empty = document.getElementById("myBookingEmpty");

    if (!list || !empty) return;

    if (bookings.length === 0) {
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    list.innerHTML = "";

    bookings.forEach(booking => {
      const card = createBookingCard(booking);
      list.appendChild(card);
    });
  } catch (err) {
    showToast("Error loading bookings: " + err.message, "error");
  }
}

function createBookingCard(booking) {
  const card = document.createElement("div");
  card.classList.add("booking-card");
  card.setAttribute("data-booking-id", booking.booking_id);

  // Determine status pill class
  let statusClass = "status-pill--success";
  if (booking.status === "unpaid") {
    statusClass = "status-pill--unpaid";
  } else if (booking.status === "cancelled") {
    statusClass = "status-pill--cancelled";
  } else if (booking.status === "draft") {
    statusClass = "status-pill--unpaid";
  }

  // Format date and time
  const bookingDate = booking.booking_date
    ? new Date(booking.booking_date).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : "-";
  const formatTime = (val) => (val ? String(val).slice(0, 5) : "-");
  const timeRange = `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`;
  // compute total amount if not provided: price_per_hour * duration_hours
  let amount = booking.total_amount;
  if (typeof amount === 'undefined' || amount === null) {
    const price = parseFloat(booking.price_per_hour || 0);
    const st = booking.start_time.split(':');
    const et = booking.end_time.split(':');
    const startH = parseInt(st[0]||0,10) + (parseInt(st[1]||0,10)/60);
    const endH = parseInt(et[0]||0,10) + (parseInt(et[1]||0,10)/60);
    const duration = Math.max(0, endH - startH);
    amount = Math.round((price * duration) * 100) / 100;
  }

  // Build action buttons
  let actionsHTML = "";
  if (booking.status === "unpaid" || booking.status === "draft") {
    actionsHTML += `<button class="btn btn-primary" onclick="handlePayNow(${booking.booking_id}, ${amount})">Pay Now</button>`;
  }
  
  if (booking.status === "draft" || booking.status === "unpaid") {
    actionsHTML += `<button class="btn btn-danger" onclick="handleCancelBooking(${booking.booking_id})">Cancel</button>`;
  }

  const roomName = escapeHTML(booking.room_name || "Room");
  const gameName = escapeHTML(booking.game_name || "Game");
  const statusText = escapeHTML(booking.status || "pending");
  const formattedAmount = amount
    ? `฿${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "";

  card.innerHTML = `
    <div class="booking-card__img"></div>
    <div class="booking-card__body">
      <h3>${roomName}</h3>
      <p class="muted">${gameName}</p>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
        <span class="status-pill ${statusClass}">${statusText}</span>
        <span class="muted small-text" style="font-size: 0.75rem;">${bookingDate}</span>
        <span class="muted small-text" style="font-size: 0.75rem;">${timeRange}</span>
        ${formattedAmount ? `<span class="muted small-text" style="font-size: 0.75rem;">${formattedAmount}</span>` : ""}
      </div>
    </div>
    <div class="booking-card__actions">
      ${actionsHTML}
    </div>
  `;

  return card;
}

async function handlePayNow(bookingId, amount) {
  if (!window.currentUserId) {
    showToast("Please log in first", "error");
    showPage("auth");
    showAuth("login");
    return;
  }

  // open modal and set booking context
  window._modalBookingId = bookingId;
  window._modalBookingAmount = amount || 0;
  // reset modal inputs
  const modal = document.getElementById('paymentModal');
  if (!modal) return;
  document.querySelector('input[name="modal_payment_method"][value="qr"]').checked = true;
  toggleModalPaymentMethod('qr');
  document.getElementById('modalCardNumber').value = '';
  document.getElementById('modalCardCvv').value = '';
  modal.style.display = 'flex';
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (!modal) return;
  modal.style.display = 'none';
}

function toggleModalPaymentMethod(mode) {
  const qr = document.getElementById('modalQR');
  const card = document.getElementById('modalCard');
  const cardNumber = document.getElementById('modalCardNumber');
  const cardCvv = document.getElementById('modalCardCvv');
  if (mode === 'card') {
    qr.style.display = 'none';
    card.style.display = 'block';
    cardNumber?.setAttribute('required', 'required');
    cardCvv?.setAttribute('required', 'required');
  } else {
    qr.style.display = 'block';
    card.style.display = 'none';
    cardNumber?.removeAttribute('required');
    cardCvv?.removeAttribute('required');
  }
}

function toggleSummaryPaymentMethod(mode) {
  const qr = document.getElementById('paymentSummaryQR');
  const card = document.getElementById('paymentSummaryCard');
  const cardNumber = document.getElementById('summaryCardNumber');
  const cardCvv = document.getElementById('summaryCardCvv');
  if (!qr || !card) return;
  if (mode === 'card') {
    qr.style.display = 'none';
    card.style.display = 'block';
    cardNumber?.setAttribute('required', 'required');
    cardCvv?.setAttribute('required', 'required');
  } else {
    qr.style.display = 'block';
    card.style.display = 'none';
    cardNumber?.removeAttribute('required');
    cardCvv?.removeAttribute('required');
  }
}

async function confirmModalPayment() {
  const bookingId = window._modalBookingId;
  const amount = window._modalBookingAmount || 0;
  if (!bookingId) {
    showToast('No booking selected', 'error');
    return;
  }

  const method = document.querySelector('input[name="modal_payment_method"]:checked')?.value || 'qr';
  const fd = new FormData();
  fd.append('booking_id', bookingId);
  fd.append('method', method);
  fd.append('amount', amount);

  if (method === 'card') {
    const card = document.getElementById('modalCardNumber')?.value?.trim();
    const cvv = document.getElementById('modalCardCvv')?.value?.trim();
    if (!card || !cvv) {
      showToast('Enter card number and CVV', 'error');
      return;
    }
    fd.append('card_number', card);
    fd.append('card_cvv', cvv);
  }

  try {
    await finalizePaymentRequest(fd);
    showToast('Payment successful!', 'success');
    closePaymentModal();
    loadMyBookings();
  } catch (err) {
    console.error('Payment error:', err);
    showToast('Payment error: ' + err.message, 'error');
  }
}

async function handleCancelBooking(bookingId) {
  if (!window.currentUserId) {
    showToast("Please log in first", "error");
    showPage("auth");
    showAuth("login");
    return;
  }

  if (!confirm("Are you sure you want to cancel this booking?")) return;

  try {
    const fd = new FormData();
    fd.append("booking_id", bookingId);
    fd.append("user_id", window.currentUserId);

    await requestJSON("cancel_booking.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });
    showToast("Booking cancelled successfully", "success");
    loadMyBookings();
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
}

// =================== PROFILE ===================
function ensureProfileAccess() {
  if (!window.currentUserId) {
    showToast("Please log in first", "error");
    showPage("auth");
    showAuth("login");
    return false;
  }
  return true;
}

async function loadProfile() {
  if (!ensureProfileAccess()) return;

  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  if (!nameEl || !emailEl) return;

  try {
    const fd = new FormData();
    fd.append("user_id", window.currentUserId);

    const data = await requestJSON("get_profile.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });

    const user = data.user || {};
    nameEl.textContent = user.full_name || "-";
    emailEl.textContent = user.email || "-";
  } catch (err) {
    console.error("loadProfile error:", err);
    showToast(err.message || "Failed to load profile", "error");
  }
}

async function openEditName() {
  if (!ensureProfileAccess()) return;
  const nameEl = document.getElementById("profileName");
  if (!nameEl) return;

  const currentName = (nameEl.textContent || "").trim();
  const input = prompt("Enter new name",
                       
                       currentName);
  if (input === null) return;

  const newName = input.trim();
  if (!newName) return;
  if (newName === currentName) {
    showToast("New name must be different from current name", "error");
    return;
  }

  try {
    const fd = new FormData();
    fd.append("user_id", window.currentUserId);
    fd.append("full_name", newName);

    const data = await requestJSON("update_name.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });

    nameEl.textContent = data.full_name || newName;
    showToast("Name updated successfully");
  } catch (err) {
    showToast(err.message || "Failed to update name", "error");
  }
}

async function openEditEmail() {
  if (!ensureProfileAccess()) return;
  const emailEl = document.getElementById("profileEmail");
  if (!emailEl) return;

  const currentEmail = (emailEl.textContent || "").trim();
  const input = prompt("Enter new email", currentEmail);
  if (input === null) return;

  const newEmail = input.trim();
  if (!newEmail) return;
  if (newEmail === currentEmail) {
    showToast("New email must be different from current email", "error");
    return;
  }

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(newEmail)) {
    showToast("Please enter a valid email address", "error");
    return;
  }

  try {
    const fd = new FormData();
    fd.append("user_id", window.currentUserId);
    fd.append("email", newEmail);

    const data = await requestJSON("update_email.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });

    emailEl.textContent = data.email || newEmail;
    showToast("Email updated successfully");
  } catch (err) {
    showToast(err.message || "Failed to update email", "error");
  }
}

async function openChangePassword() {
  if (!ensureProfileAccess()) return;

  const oldPassword = prompt("Enter your current password");
  if (oldPassword === null) return;
  if (!oldPassword) {
    showToast("Current password is required", "error");
    return;
  }

  const newPassword = prompt("Enter new password");
  if (newPassword === null) return;
  if (!newPassword || newPassword.length < 6) {
    showToast("New password must be at least 6 characters", "error");
    return;
  }

  if (newPassword === oldPassword) {
    showToast("New password must be different from current password", "error");
    return;
  }

  try {
    const fd = new FormData();
    fd.append("user_id", window.currentUserId);
    fd.append("old_password", oldPassword);
    fd.append("new_password", newPassword);

    await requestJSON("change_password.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });

    showToast("Password changed successfully");
  } catch (err) {
    showToast(err.message || "Failed to change password", "error");
  
