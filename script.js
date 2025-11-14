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
  initAdminForms();
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
  if (id === "auth" || id === "admin-register") {
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
  } else if (id === "admin-dashboard" && window.currentUserRole === "admin") {
    adminLoadDashboard();
  }

  toggleMenu(false);
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
  window.currentUserId = null;
  window.currentUserRole = null;
  toggleAdminUI(false);
  showPage("auth");
  showAuth("choice");
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
        const res = await fetch("login.php", {
          method: "POST",
          body: formData
        });
        if (!res.ok) {
          const message = await extractResponseMessage(res);
          showToast(message || "Login failed", "error");
          return;
        }
        const data = await res.json();
        window.currentUserId = data.user.id;
        window.currentUserRole = data.user.role || "user";
        toggleAdminUI(window.currentUserRole === "admin");
        showToast(`Welcome back, ${data.user.name || "player"}`, "success");
        showPage(window.currentUserRole === "admin" ? "admin-dashboard" : "home");
      } catch (err) {
        showToast(err.message || "Cannot login", "error");
      }
    });
  }

  // signup
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      try {
        const res = await fetch("register.php", {
          method: "POST",
          body: formData
        });
        if (!res.ok) {
          const message = await extractResponseMessage(res);
          showToast(message || "Register failed", "error");
          return;
        }
        const data = await res.json();
        if (data.status === "OK") {
          window.currentUserId = data.user_id;
          window.currentUserRole = "user";
          toggleAdminUI(false);
          showToast("Account created successfully", "success");
          showPage("home");
        } else {
          showToast(data.message || "Register failed", "error");
        }
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
    const res = await fetch('finalize_payment.php', { method: 'POST', body: fd });
    
    // Ensure response is valid JSON before parsing
    if (!res.ok && res.status !== 200) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}: Payment failed`);
      } else {
        throw new Error(`HTTP ${res.status}: Payment failed`);
      }
    }
    
    const data = await res.json();
    if (data && data.success) {
      showToast('Payment successful!', 'success');
      // optionally refresh bookings
      if (window.currentUserId) loadMyBookings();
      showPage('payment-success');
    } else {
      throw new Error((data && data.error) || 'Payment failed');
    }
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

// =================== MY BOOKING (Your Booking Page) ===================
async function loadMyBookings() {
  if (!window.currentUserId) {
    const list = document.getElementById("myBookingList");
    const empty = document.getElementById("myBookingEmpty");
    if (list) list.innerHTML = "";
    if (empty) empty.style.display = "block";
    alert("Please log in to view your bookings");
    return;
  }

  try {
    const fd = new FormData();
    fd.append("user_id", window.currentUserId);
    
    const res = await fetch("get_user_bookings.php", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    
    if (!data.success) {
      showToast(data.error || "Failed to load bookings", "error");
      return;
    }

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
  const bookingDate = new Date(booking.booking_date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  
  const timeRange = `${booking.start_time} - ${booking.end_time}`;
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

  card.innerHTML = `
    <div class="booking-card__img"></div>
    <div class="booking-card__body">
      <h3>${booking.room_name || "Room"}</h3>
      <p class="muted">${booking.game_name || "Game"}</p>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
        <span class="status-pill ${statusClass}">${booking.status}</span>
        <span class="muted small-text" style="font-size: 0.75rem;">${bookingDate}</span>
        <span class="muted small-text" style="font-size: 0.75rem;">${timeRange}</span>
        ${amount ? `<span class="muted small-text" style="font-size: 0.75rem;">฿${amount}</span>` : ""}
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
    alert("Please log in first");
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
  if (mode === 'card') {
    qr.style.display = 'none';
    card.style.display = 'block';
  } else {
    qr.style.display = 'block';
    card.style.display = 'none';
  }
}

function toggleSummaryPaymentMethod(mode) {
  const qr = document.getElementById('paymentSummaryQR');
  const card = document.getElementById('paymentSummaryCard');
  if (!qr || !card) return;
  if (mode === 'card') {
    qr.style.display = 'none';
    card.style.display = 'block';
  } else {
    qr.style.display = 'block';
    card.style.display = 'none';
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
    const res = await fetch('finalize_payment.php', { method: 'POST', body: fd });
    
    // Ensure response is valid JSON before parsing
    if (!res.ok && res.status !== 200) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}: Payment failed`);
      } else {
        throw new Error(`HTTP ${res.status}: Payment failed`);
      }
    }
    
    const data = await res.json();
    if (data && data.success) {
      showToast('Payment successful!', 'success');
      closePaymentModal();
      loadMyBookings();
    } else {
      throw new Error((data && data.error) || 'Payment failed');
    }
  } catch (err) {
    console.error('Payment error:', err);
    showToast('Payment error: ' + err.message, 'error');
  }
}

async function handleCancelBooking(bookingId) {
  if (!window.currentUserId) {
    alert("Please log in first");
    return;
  }

  if (!confirm("Are you sure you want to cancel this booking?")) return;

  try {
    const fd = new FormData();
    fd.append("booking_id", bookingId);
    fd.append("user_id", window.currentUserId);

    const res = await fetch("cancel_booking.php", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    
    if (data.success) {
      showToast("Booking cancelled successfully", "success");
      loadMyBookings(); // Reload bookings
    } else {
      showToast(data.error || "Cannot cancel booking", "error");
    }
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
}
