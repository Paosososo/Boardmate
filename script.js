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
let currentGameDetail = null;
window.preselectedGameFromDetail = null;
window.currentUserRole = null;

// ============ THEME ============ 
const THEME_KEY = "boardmate_theme";

function applyTheme(theme) {
  const mode = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", mode);
  const toggle = document.getElementById("darkModeToggle");
  if (toggle) toggle.checked = mode === "dark";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved);
  const toggle = document.getElementById("darkModeToggle");
  if (toggle) {
    toggle.addEventListener("change", (e) => {
      const mode = e.target.checked ? "dark" : "light";
      localStorage.setItem(THEME_KEY, mode);
      applyTheme(mode);
    });
  }
}

// แมพชื่อเกมที่ต้องใช้ไฟล์เฉพาะ (เช่น .png)
const customGameImages = {
  "uno party": "games/uno.png",
};

// รูปห้อง
const roomImages = {
  "small room": "./room/smallroom.png",
  "medium room": "./room/mediumroom.png",
  "large room": "./room/largeroom.png",
};

function getRoomImagePath(roomName = "") {
  const normalized = roomName.trim().toLowerCase();
  return roomImages[normalized] || "Hero.jpg";
}

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

function restorePreselectedGameIfAvailable() {
  if (window.preselectedGameFromDetail) {
    selectedGame = { ...window.preselectedGameFromDetail };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // เริ่มที่หน้า auth
  showPage("auth");
  showAuth("choice");
  toggleAdminUI(false);
  initTheme();

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
  toggleSummaryPaymentMethod('qr');
  toggleModalPaymentMethod('qr');
  restoreSessionUser();
  initAdminDashboard();
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
  if (id === "admin-dashboard" && window.currentUserRole !== "admin") {
    showToast("Admin access only", "error");
    id = "home";
  }

  document.querySelectorAll(".page").forEach(p => p.classList.remove("page--active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("page--active");

  const topBar = document.getElementById("topBar");
  const hideTopBarPages = ["auth", "admin-register"];
  if (hideTopBarPages.includes(id)) {
    topBar.style.display = "none";
  } else {
    topBar.style.display = "flex";
  }

  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.textContent = mapTitle(id);
  }

  if (id === "profile") {
    loadProfile();
  }

  if (id === "time-select" && typeof loadTimeSlots === "function") {
    updateSelectedRoomSummary();
    loadTimeSlots();
  }

  if (id === "admin-dashboard" && typeof adminRefreshAll === "function") {
    adminRefreshAll();
  }

  toggleMenu(false);
  updateTopBarTransparency();
}

// เริ่มจองใหม่จากหน้า Home (เรียกจากปุ่ม)
function startBooking() {
  window.preselectedGameFromDetail = null;
  resetBookingState();          // ล้าง state รอบก่อน
  showPage("room-booking");     // ไปหน้าเลือกห้อง
}

function startBookingFromGameDetail() {
  if (!window.preselectedGameFromDetail) {
    showToast("No game selected", "error");
    return;
  }

  resetBookingState();
  restorePreselectedGameIfAvailable();
  showPage("room-booking");
}

function mapTitle(id) {
  const map = {
    "home": "Home",
    "room-booking": "Room Booking",
    "time-select": "Choose Time",
    "game-select": "Select Game",
    "game-detail": "Game Detail",
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
        window.currentUserId = data.user.id;
        window.currentUserRole = data.user.role || "user";
        const isAdmin = window.currentUserRole === "admin";
        toggleAdminUI(isAdmin);
        const welcomeName = data.user.name || data.user.full_name || "there";
        showToast(`Welcome back, ${isAdmin ? "Admin " : ""}${welcomeName}!`, "success");
        showPage("home");
        loadMyBookings();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  // signup
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      try {
        const data = await requestJSON("register.php", {
          method: "POST",
          body: formData,
          expectSuccess: true
        });
        window.currentUserId = data.user.id;
        window.currentUserRole = data.user.role || "user";
        toggleAdminUI(window.currentUserRole === "admin");
        showToast(`Register successful! Welcome, ${data.user.full_name}! 🎉`, "success");
        showPage("home");
      } catch (err) {
        showToast(err.message || "Register failed", "error");
      }
    });
  }

  const adminRegisterForm = document.getElementById("adminRegisterForm");
  if (adminRegisterForm) {
    adminRegisterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(adminRegisterForm);
      try {
        const data = await requestJSON("admin_register.php", {
          method: "POST",
          body: formData,
          expectSuccess: true
        });
        window.currentUserId = data.user.id;
        window.currentUserRole = data.user.role || "admin";
        toggleAdminUI(true);
        adminRegisterForm.reset();
        showToast("Admin registered successfully! 🎉", "success");
        openAdminDashboard();
      } catch (err) {
        showToast(err.message || "Admin registration failed", "error");
      }
    });
  }
}

function toggleAdminUI(isAdmin) {
  const adminLink = document.getElementById("adminDashboardLink");
  const adminBadge = document.getElementById("adminBadge");
  if (adminLink) {
    adminLink.classList.toggle("hidden", !isAdmin);
  }
  if (adminBadge) {
    adminBadge.classList.toggle("hidden", !isAdmin);
  }
}

function showAdminRegister() {
  showPage("admin-register");
  const form = document.getElementById("adminRegisterForm");
  if (form) {
    form.reset();
  }
}

function returnToAuthFromAdmin(mode = "signup") {
  showPage("auth");
  showAuth(mode === "login" ? "login" : "signup");
}

function openAdminDashboard() {
  if (window.currentUserRole !== "admin") {
    showToast("Admin access only", "error");
    return;
  }
  showPage("admin-dashboard");
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
      window.currentUserId = data.user.user_id;
      window.currentUserRole = data.user.role || "user";
      toggleAdminUI(window.currentUserRole === "admin");
      showToast(`Welcome back, ${data.user.full_name}!`, "success");
      showPage("home");
      loadMyBookings();
    }
  } catch (err) {
    // Ignore missing session silently
  }
}

async function logoutUser() {
  resetBookingState();
  window.currentUserId = null;
  window.currentUserRole = null;
  toggleAdminUI(false);
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

// =================== ADMIN DASHBOARD ===================
function ensureAdminAccess() {
  if (window.currentUserRole !== "admin") {
    showToast("Admin access only", "error");
    return false;
  }
  return true;
}

function initAdminDashboard() {
  const addForm = document.getElementById("adminAddBoardgameForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!ensureAdminAccess()) return;
      const min = parseInt(addForm.elements["players_min"].value, 10);
      const max = parseInt(addForm.elements["players_max"].value, 10);
      if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max <= 0 || min > max) {
        showToast("Invalid player range", "error");
        return;
      }
      try {
        const formData = new FormData(addForm);
        await requestJSON("admin_add_boardgame.php", {
          method: "POST",
          body: formData,
          expectSuccess: true
        });
        showToast("Boardgame added", "success");
        addForm.reset();
        adminLoadBoardgames();
      } catch (err) {
        showToast(err.message || "Failed to add boardgame", "error");
      }
    });
  }
}

function adminRefreshAll() {
  if (!ensureAdminAccess()) return;
  adminLoadBookings();
  adminLoadRooms();
  adminLoadBoardgames();
}

async function adminLoadBookings() {
  if (!ensureAdminAccess()) return;
  const container = document.getElementById("adminBookingsList");
  if (!container) return;
  container.innerHTML = "<p class='muted small-text'>Loading bookings...</p>";
  try {
    const data = await requestJSON("admin_get_bookings.php", {
      method: "GET",
      expectSuccess: true
    });
    renderAdminBookings(data.bookings || []);
  } catch (err) {
    container.innerHTML = `<p class="muted small-text">Error: ${escapeHTML(err.message || "Unable to load bookings")}</p>`;
  }
}

function renderAdminBookings(bookings) {
  const container = document.getElementById("adminBookingsList");
  if (!container) return;
  if (!bookings.length) {
    container.innerHTML = "<p class='muted small-text'>No bookings found.</p>";
    return;
  }
  container.innerHTML = "";
  const statusMap = {
    paid: "success",
    checked_in: "success",
    unpaid: "warning",
    draft: "muted",
    cancelled: "danger"
  };
  bookings.forEach((booking) => {
    const statusKey = String(booking.status || "").toLowerCase();
    const statusClass = statusMap[statusKey] || "muted";
    const dateText = booking.booking_date || "-";
    const timeText = [booking.start_time, booking.end_time].filter(Boolean).join(" - ");
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="admin-card__title">
        <strong>#${booking.booking_id}</strong>
        <span class="admin-status admin-status--${statusClass}">${escapeHTML(booking.status || "unknown")}</span>
      </div>
      <p class="muted small-text">${escapeHTML(dateText)} • ${escapeHTML(timeText || "-")}</p>
      <p><strong>${escapeHTML(booking.room_name || "Room")}</strong> • ${booking.price_per_hour || "-"} THB/hr</p>
      <p>${escapeHTML(booking.user_name || "Unknown")} • ${escapeHTML(booking.email || "-")}</p>
      <p class="muted small-text">Game: ${escapeHTML(booking.game_name || "Not set")}</p>
    `;
    container.appendChild(card);
  });
}

async function adminLoadRooms() {
  if (!ensureAdminAccess()) return;
  const container = document.getElementById("adminRoomsList");
  if (!container) return;
  container.innerHTML = "<p class='muted small-text'>Loading rooms...</p>";
  try {
    const data = await requestJSON("admin_get_rooms.php", {
      method: "GET",
      expectSuccess: true
    });
    renderAdminRooms(data.rooms || []);
  } catch (err) {
    container.innerHTML = `<p class="muted small-text">Error: ${escapeHTML(err.message || "Unable to load rooms")}</p>`;
  }
}

function renderAdminRooms(rooms) {
  const container = document.getElementById("adminRoomsList");
  if (!container) return;
  if (!rooms.length) {
    container.innerHTML = "<p class='muted small-text'>No rooms found.</p>";
    return;
  }
  container.innerHTML = "";
  rooms.forEach((room) => {
    const status = String(room.status || "").toLowerCase();
    let statusClass = "warning";
    if (status === "available") statusClass = "success";
    if (status === "unavailable") statusClass = "danger";
    const priceValue = parseFloat(room.price_per_hour) || 0;
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="admin-card__title">
        <strong>${escapeHTML(room.room_name || "Room")}</strong>
        <span class="admin-status admin-status--${statusClass}">${escapeHTML(room.status || "unknown")}</span>
      </div>
      <p class="muted small-text">Capacity: ${room.capacity || "-"} players • ${escapeHTML(room.time_slot || "-")}</p>
      <div class="admin-card__form">
        <label class="field-label">Price per hour (THB)</label>
        <input type="number" class="input" value="${priceValue.toFixed(2)}" min="0" step="10" data-field="price">
      </div>
      
      <button type="button" class="btn btn-primary btn-full" data-action="save">Save changes</button>
    `;

    const priceInput = card.querySelector('[data-field="price"]');
    const statusSelect = card.querySelector('[data-field="status"]');
    const saveBtn = card.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        adminUpdateRoom(room.room_id, priceInput.value, statusSelect.value);
      });
    }

    container.appendChild(card);
  });
}

async function adminUpdateRoom(roomId, price, status) {
  if (!ensureAdminAccess()) return;
  const parsedPrice = parseFloat(price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    showToast("Please enter a valid price", "error");
    return;
  }
  const formData = new FormData();
  formData.append("room_id", roomId);
  formData.append("price_per_hour", parsedPrice.toString());
  formData.append("status", status);
  try {
    await requestJSON("admin_update_room.php", {
      method: "POST",
      body: formData,
      expectSuccess: true
    });
    showToast("Room updated", "success");
    adminLoadRooms();
  } catch (err) {
    showToast(err.message || "Failed to update room", "error");
  }
}

async function adminLoadBoardgames() {
  if (!ensureAdminAccess()) return;
  const container = document.getElementById("adminBoardgamesList");
  if (!container) return;
  container.innerHTML = "<p class='muted small-text'>Loading boardgames...</p>";
  try {
    const data = await requestJSON("admin_get_boardgames.php", {
      method: "GET",
      expectSuccess: true
    });
    renderAdminBoardgames(data.boardgames || []);
  } catch (err) {
    container.innerHTML = `<p class="muted small-text">Error: ${escapeHTML(err.message || "Unable to load boardgames")}</p>`;
  }
}

function renderAdminBoardgames(boardgames) {
  const container = document.getElementById("adminBoardgamesList");
  if (!container) return;
  if (!boardgames.length) {
    container.innerHTML = "<p class='muted small-text'>No boardgames found.</p>";
    return;
  }
  container.innerHTML = "";
  boardgames.forEach((game) => {
    const isActive = parseInt(game.is_active, 10) === 1;
    const statusClass = isActive ? "success" : "danger";
    const card = document.createElement("div");
    card.className = "admin-card";
    card.innerHTML = `
      <div class="admin-card__title">
        <strong>${escapeHTML(game.game_name || "Boardgame")}</strong>
        <span class="admin-status admin-status--${statusClass}">${isActive ? "Active" : "Inactive"}</span>
      </div>
      <div class="admin-card__form">
        <label class="field-label">Game name</label>
        <input type="text" class="input" value="${escapeHTML(game.game_name || "")}" data-field="name">
      </div>
      <div class="admin-card__form">
        <label class="field-label">Genre</label>
        <input type="text" class="input" value="${escapeHTML(game.genre || "")}" data-field="genre">
      </div>
      <div class="admin-card__row admin-card__row--split">
        <div>
          <label class="field-label">Min players</label>
          <input type="number" class="input" value="${game.players_min || 2}" min="1" data-field="min">
        </div>
        <div>
          <label class="field-label">Max players</label>
          <input type="number" class="input" value="${game.players_max || 4}" min="1" data-field="max">
        </div>
      </div>
      
      <div class="admin-card__form">
        <label class="field-label">How to play</label>
        <textarea class="input" rows="4" data-field="how_to_play">${escapeHTML(game.how_to_play || "")}</textarea>
      </div>
      <div class="admin-card__actions">
        <button type="button" class="btn btn-light" data-action="delete">Delete</button>
        <button type="button" class="btn btn-primary" data-action="save">Save changes</button>
      </div>
    `;

    const nameInput = card.querySelector('[data-field="name"]');
    const genreInput = card.querySelector('[data-field="genre"]');
    const minInput = card.querySelector('[data-field="min"]');
    const maxInput = card.querySelector('[data-field="max"]');
    const statusSelect = card.querySelector('[data-field="status"]');
    const howInput = card.querySelector('[data-field="how_to_play"]');
    const saveBtn = card.querySelector('[data-action="save"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        adminSaveBoardgame(
          game.game_id,
          nameInput.value,
          genreInput.value,
          minInput.value,
          maxInput.value,
          statusSelect.value,
          howInput.value
        );
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (!confirm(`Delete ${game.game_name}?`)) return;
        adminDeleteBoardgame(game.game_id);
      });
    }

    container.appendChild(card);
  });
}

async function adminSaveBoardgame(gameId, name, genre, playersMin, playersMax, isActive, howToPlay) {
  if (!ensureAdminAccess()) return;
  const trimmedName = name.trim();
  const trimmedGenre = genre.trim();
  const trimmedHow = (howToPlay || "").trim();
  const min = parseInt(playersMin, 10);
  const max = parseInt(playersMax, 10);
  if (!trimmedName || !trimmedGenre) {
    showToast("Name and genre are required", "error");
    return;
  }
  if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max <= 0 || min > max) {
    showToast("Invalid player counts", "error");
    return;
  }
  const formData = new FormData();
  formData.append("game_id", gameId);
  formData.append("game_name", trimmedName);
  formData.append("genre", trimmedGenre);
  formData.append("players_min", String(min));
  formData.append("players_max", String(max));
  formData.append("is_active", isActive);
  formData.append("how_to_play", trimmedHow);
  try {
    await requestJSON("admin_update_boardgame.php", {
      method: "POST",
      body: formData,
      expectSuccess: true
    });
    showToast("Boardgame updated", "success");
    adminLoadBoardgames();
  } catch (err) {
    showToast(err.message || "Failed to update boardgame", "error");
  }
}

async function adminDeleteBoardgame(gameId) {
  if (!ensureAdminAccess()) return;
  const formData = new FormData();
  formData.append("game_id", gameId);
  try {
    await requestJSON("admin_delete_boardgame.php", {
      method: "POST",
      body: formData,
      expectSuccess: true
    });
    showToast("Boardgame deleted", "success");
    adminLoadBoardgames();
  } catch (err) {
    showToast(err.message || "Failed to delete boardgame", "error");
  }
}

// =================== HOME MOCK DATA ===================
const recommendedGamesData = [
  { id: "g1", title: "Coup", players: "2–6 players", tag: "Most picked", db_name: "Coup" },
  { id: "g2", title: "Monopoly", players: "2–6 players", tag: "Classic", db_name: "Monopoly" },
  { id: "g3", title: "Sushi Go!", players: "2–4 players", tag: "Family Fun", db_name: "Sushi Go!" },
  { id: "g4", title: "Decrypto", players: "3–8 players", tag: "New", db_name: "Decrypto" },
];

const popularGamesData = [
  { id: "p1", title: "Coup", players: "2–6 players", db_name: "Coup" },
  { id: "p2", title: "Monopoly", players: "2–6 players", db_name: "Monopoly" },
  { id: "p3", title: "Sushi Go!", players: "2–4 players", db_name: "Sushi Go!" },
  { id: "p4", title: "Decrypto", players: "3–8 players", db_name: "Decrypto" },
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
    card.style.cursor = "pointer";
    card.tabIndex = 0;
    const openFn = () => openGameDetailByName(item.db_name || item.title);
    card.addEventListener("click", openFn);
    card.addEventListener("keypress", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        openFn();
      }
    });
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
      <p class="muted">${item.players}</p>
    `;
    card.style.cursor = "pointer";
    card.tabIndex = 0;
    const openFn = () => openGameDetailByName(item.db_name || item.title);
    card.addEventListener("click", openFn);
    card.addEventListener("keypress", (evt) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        openFn();
      }
    });
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
      const roomImg = getRoomImagePath(r.room_name || "");
      
      card.innerHTML = `
        <div class="room-thumb" style="background-image: url('${roomImg}');"></div>
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
  restorePreselectedGameIfAvailable();
  selectedRoom = { id: roomId, price: price, name: name };
  showToast(`Selected ${name}! 🎯`, "success");
  updateSelectedRoomSummary();
  showPage("time-select");
}

function updateSelectedRoomSummary() {
  const wrap = document.getElementById("selectedRoomSummary");
  if (!wrap) return;

  if (!selectedRoom) {
    wrap.classList.add("hidden");
    return;
  }

  const imgEl = document.getElementById("selectedRoomSummaryImage");
  const nameEl = document.getElementById("selectedRoomSummaryName");
  const detailEl = document.getElementById("selectedRoomSummaryDetail");

  if (imgEl) {
    const imgPath = getRoomImagePath(selectedRoom.name || "");
    imgEl.style.backgroundImage = `url('${imgPath}')`;
  }
  if (nameEl) nameEl.textContent = selectedRoom.name || "Room";
  if (detailEl) detailEl.textContent = selectedRoom.price ? `💰 ${selectedRoom.price} THB / hr` : "-";

  wrap.classList.remove("hidden");
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
      const escapedNameForJs = (g.game_name || "").replace(/'/g, "\\'");
      
      card.innerHTML = `
        <div class="game-img" style="background-image: url('${imgPath}'); background-size: cover; background-position: center;">
        </div>
        <div class="game-info">
          <h3>${safeName}</h3>
          <p class="muted">🎮 ${safeGenre}</p>
          <p class="muted">👥 ${playerRange} players</p>
          <div style="display:flex; gap:.5rem; margin-top:.5rem; flex-wrap:wrap;">
            <button class="btn btn-light" type="button" onclick="openGameDetail(${g.game_id})">View detail</button>
            <button class="btn btn-primary" type="button" onclick="selectGame(${g.game_id}, '${escapedNameForJs}')">Choose</button>
          </div>
        </div>
      `;
      wrap.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    wrap.innerHTML = "<p class='muted'>Cannot load games</p>";
  }
}

function setGameDetailContent(game) {
  if (!game) return;
  const imgPath = getGameImagePath(game.game_name || "");
  const nameEl = document.getElementById("detailGameName");
  const imgEl = document.getElementById("detailGameImage");
  const genreEl = document.getElementById("detailGameGenre");
  const playersEl = document.getElementById("detailGamePlayers");
  const howEl = document.getElementById("detailGameHowToPlay");

  if (nameEl) nameEl.textContent = game.game_name || "Game name";
  if (imgEl) imgEl.style.backgroundImage = `url('${imgPath}')`;
  if (genreEl) genreEl.textContent = game.genre || "Board Game";
  if (playersEl) {
    const min = game.players_min ?? "?";
    const max = game.players_max ?? "?";
    playersEl.textContent = `${min}–${max} players`;
  }
  if (howEl) {
    const lines = (game.how_to_play || "Coming soon.").split(/\r?\n/).map(line => escapeHTML(line));
    howEl.innerHTML = lines.join("<br>");
  }
}

async function openGameDetail(gameId) {
  if (!gameId) {
    showToast("Game not found", "error");
    return;
  }

  try {
    const fd = new FormData();
    fd.append("game_id", String(gameId));
    const data = await requestJSON("get_game_detail.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });

    currentGameDetail = data.game;
    window.preselectedGameFromDetail = {
      id: data.game.game_id,
      title: data.game.game_name
    };
    setGameDetailContent(currentGameDetail);
    showPage("game-detail");
  } catch (err) {
    console.error("openGameDetail error:", err);
    showToast(err.message || "Failed to load game detail", "error");
  }
}

async function openGameDetailByName(gameName) {
  if (!gameName) {
    showToast("Game name missing", "error");
    return;
  }

  try {
    const params = new URLSearchParams({ name: gameName });
    const data = await requestJSON(`get_game_detail_by_name.php?${params.toString()}`, {
      expectSuccess: true
    });

    if (data && data.game) {
      currentGameDetail = data.game;
      window.preselectedGameFromDetail = {
        id: data.game.game_id,
        title: data.game.game_name
      };
      setGameDetailContent(currentGameDetail);
      showPage("game-detail");
    } else {
      showToast("Cannot find game detail", "error");
    }
  } catch (err) {
    console.error("openGameDetailByName error:", err);
    showToast(err.message || "Cannot find game detail", "error");
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
  if (selectedGame && selectedGame.id) {
    await selectGame(selectedGame.id, selectedGame.title || "");
  } else {
    showPage("game-select");
  }
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
  const amount = Number(window.currentTotalAmount || 0);
  if (!amount || amount <= 0) {
    showToast('Invalid payment amount', 'error');
    return;
  }

  const fd = new FormData();
  fd.append('booking_id', window.currentBookingId);
  fd.append('method', method);
  fd.append('amount', String(amount));

  if (method === 'card') {
    const rawCard = document.getElementById('summaryCardNumber')?.value || '';
    const rawCvv = document.getElementById('summaryCardCvv')?.value || '';
    const card = rawCard.replace(/\s+/g, '');
    const cvv = rawCvv.replace(/\s+/g, '');
    const cardOk = /^\d{16}$/.test(card);
    const cvvOk = /^\d{3}$/.test(cvv);
    if (!cardOk || !cvvOk) {
      showToast('Please enter a valid 16-digit card number and 3-digit CVV', 'error');
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
    const summaryCardNumber = document.getElementById('summaryCardNumber');
    const summaryCardCvv = document.getElementById('summaryCardCvv');
    if (summaryCardNumber) summaryCardNumber.value = '';
    if (summaryCardCvv) summaryCardCvv.value = '';
    const paidBookingId = window.currentBookingId;
    resetBookingState();
    window.preselectedGameFromDetail = null;
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
  
  if (
    booking.status === "draft" ||
    booking.status === "unpaid" ||
    booking.status === "paid"
  ) {
    actionsHTML += `<button class="btn btn-danger" onclick="handleCancelBooking(${booking.booking_id})">Cancel</button>`;
  }

  const roomName = escapeHTML(booking.room_name || "Room");
  const gameName = escapeHTML(booking.game_name || "Game");
  const statusText = escapeHTML(booking.status || "pending");
  const formattedAmount = amount
    ? `฿${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "";
  const imgPath = getRoomImagePath(booking.room_name || "");

  card.innerHTML = `
    <div class="booking-card__img" style="background-image: url('${imgPath}');"></div>
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
  const amount = Number(window._modalBookingAmount || 0);
  if (!bookingId) {
    showToast('No booking selected', 'error');
    return;
  }
  if (!amount || amount <= 0) {
    showToast('Invalid payment amount', 'error');
    return;
  }

  const method = document.querySelector('input[name="modal_payment_method"]:checked')?.value || 'qr';
  const fd = new FormData();
  fd.append('booking_id', bookingId);
  fd.append('method', method);
  fd.append('amount', String(amount));

  if (method === 'card') {
    const rawCard = document.getElementById('modalCardNumber')?.value || '';
    const rawCvv = document.getElementById('modalCardCvv')?.value || '';
    const card = rawCard.replace(/\s+/g, '');
    const cvv = rawCvv.replace(/\s+/g, '');
    const cardOk = /^\d{16}$/.test(card);
    const cvvOk = /^\d{3}$/.test(cvv);
    if (!cardOk || !cvvOk) {
      showToast('Please enter a valid 16-digit card number and 3-digit CVV', 'error');
      return;
    }
    fd.append('card_number', card);
    fd.append('card_cvv', cvv);
  }

  try {
    await finalizePaymentRequest(fd);
    showToast('Payment successful!', 'success');
    const modalCardNumber = document.getElementById('modalCardNumber');
    const modalCardCvv = document.getElementById('modalCardCvv');
    if (modalCardNumber) modalCardNumber.value = '';
    if (modalCardCvv) modalCardCvv.value = '';
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
  const input = prompt("Enter new name", currentName);
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
  }
}

async function deleteAccount() {
  if (!ensureProfileAccess()) return;

  const confirmed = confirm("Are you sure you want to delete your account? This action cannot be undone.");
  if (!confirmed) return;

  const fd = new FormData();
  fd.append("user_id", window.currentUserId);

  try {
    await requestJSON("delete_account.php", {
      method: "POST",
      body: fd,
      expectSuccess: true
    });

    resetBookingState();
    window.currentBookingId = null;
    window.currentTotalAmount = 0;
    window.currentUserId = null;
    window.currentUserRole = null;
    toggleAdminUI(false);
    window.preselectedGameFromDetail = null;

    showToast("Account deleted successfully");
    showPage("auth");
    showAuth("choice");
  } catch (err) {
    console.error("deleteAccount error:", err);
    showToast(err.message || "Failed to delete account", "error");
  }
}
