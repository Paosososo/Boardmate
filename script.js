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
let currentGameDetail = null;
window.preselectedGameFromDetail = null;

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
    .replace(/\s+/g, "-")
    .replace(/!/g, "")
    .replace(/[^\w-]/g, "");

  // Default เป็นไฟล์ .jpg
  return `games/${filename}.jpg`;
}

function escapeHTML(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
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

  // render ส่วนต่างๆ
  renderRecommended();
  renderPopular();
  renderRooms(); // ดึงจาก get_rooms.php
  renderGames(); // ดึงจาก get_games.php

  // init ฟอร์ม
  initAuth();
  initAdminForms(); // ฟอร์ม admin (admin register + boardgame form)
  initStarRating();

  // เตรียม time select dropdown + UI ต่าง ๆ
  initTimeSelect();
  initTopBarTransparency();
  toggleSummaryPaymentMethod("qr");
  toggleModalPaymentMethod("qr");
  restoreSessionUser(); // ลองดึง session เดิมจาก server (ตั้ง currentUserId, etc.)
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
  document.querySelectorAll(".page").forEach((p) =>
    p.classList.remove("page--active")
  );
  const target = document.getElementById(id);
  if (target) target.classList.add("page--active");

  const topBar = document.getElementById("topBar");
  // ซ่อน TopBar ตอนอยู่หน้า auth หรือ admin-register
  if (id === "auth" || id === "admin-register") {
    if (topBar) topBar.style.display = "none";
  } else {
    if (topBar) topBar.style.display = "flex";
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
  window.preselectedGameFromDetail = null;
  resetBookingState(); // ล้าง state รอบก่อน
  showPage("room-booking"); // ไปหน้าเลือกห้อง
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
  return `status-pill--${status
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
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
    home: "Home",
    "room-booking": "Room Booking",
    "time-select": "Choose Time",
    "game-select": "Select Game",
    "game-detail": "Game Detail",
    payment: "Payment",
    "payment-success": "Success",
    review: "Review",
    "my-booking": "Your Booking",
    favorites: "Favorite Game",
    profile: "Profile",
    settings: "Settings",
    "admin-register": "Admin Register",
    "admin-dashboard": "Admin Dashboard",
  };
  return map[id] || "BoardMate";
}

// =================== SIDE MENU ===================
function toggleMenu(open) {
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("overlay");
  if (!sideMenu || !overlay) return;

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

  if (choice) choice.classList.add("hidden");
  if (login) login.classList.add("hidden");
  if (signup) signup.classList.add("hidden");

  if (mode === "login" && login) {
    login.classList.remove("hidden");
  } else if (mode === "signup" && signup) {
    signup.classList.remove("hidden");
  } else if (choice) {
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
          expectSuccess: true,
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
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(signupForm);
      try {
        // ใช้ fetch ตรง ๆ เพื่อรองรับทั้งแบบ status/OK และ success:true
        const res = await fetch("register.php", {
          method: "POST",
          body: formData,
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
      body: formData,
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
    const roomStatusClass = makeStatusClass(
      booking.room_status || booking.status
    );
    card.innerHTML = `
      <div class="admin-card__head">
        <div>
          <h4>#${escapeHtml(booking.booking_id)} • ${escapeHtml(
      booking.user_name
    )}</h4>
          <p class="muted small-text">${escapeHtml(booking.email)}</p>
        </div>
        <span class="status-pill ${bookingStatusClass}">${formatStatusLabel(
      booking.status
    )}</span>
      </div>
      <div class="admin-card__body">
        <div class="admin-card__row">
          <div>
            <span class="admin-label">Room</span>
            <p class="admin-value">${escapeHtml(booking.room_name)}</p>
          </div>
          <div>
            <span class="admin-label">Room status</span>
            <p class="admin-value"><span class="status-pill ${roomStatusClass}">${formatStatusLabel(
      booking.room_status
    )}</span></p>
          </div>
        </div>
        <div class="admin-card__row">
          <div>
            <span class="admin-label">Date</span>
            <p class="admin-value">${escapeHtml(booking.booking_date)}</p>
          </div>
          <div>
            <span class="admin-label">Time</span>
            <p class="admin-value">${escapeHtml(
              booking.start_time
            )} - ${escapeHtml(booking.end_time)}</p>
          </div>
        </div>
        <div class="admin-card__row">
          <div>
            <span class="admin-label">Price / hr</span>
            <p class="admin-value">${escapeHtml(
              booking.price_per_hour
            )} THB</p>
          </div>
          <div>
            <span class="admin-label">Game</span>
            <p class="admin-value">${escapeHtml(
              booking.game_name || "-"
            )}</p>
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
          <p class="muted small-text">Capacity: ${escapeHtml(
            room.capacity
          )} • Slot: ${escapeHtml(room.time_slot || "-")}</p>
        </div>
        <span class="status-pill ${statusClass}">${formatStatusLabel(
      room.status
    )}</span>
      </div>
      <label class="field-label small-text">Price per hour (THB)</label>
      <input type="number" class="input admin-room-price" min="0" value="${escapeHtml(
        room.price_per_hour
      )}">
      <label class="field-label small-text">Status</label>
      <select class="input admin-room-status">
        <option value="available" ${
          room.status === "available" ? "selected" : ""
        }>Available</option>
        <option value="unavailable" ${
          room.status === "unavailable" ? "selected" : ""
        }>Unavailable</option>
        <option value="maintenance" ${
          room.status === "maintenance" ? "selected" : ""
        }>Maintenance</option>
      </select>
      <button type="button" class="btn btn-primary btn-full mt-8" onclick="adminSaveRoom(${
        room.room_id
      })">Save changes</button>
    `;
    grid.appendChild(card);
  });
}

async function adminSaveRoom(roomId) {
  if (window.currentUserRole !== "admin") return;
  const card = document.querySelector(
    `.admin-room-card[data-room-id="${roomId}"]`
  );
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
      body: fd,
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
    const statusClass = makeStatusClass(
      game.is_active == 1 ? "active" : "inactive"
    );
    card.innerHTML = `
      <div class="admin-card__head">
        <div>
          <h4>${escapeHtml(game.game_name)}</h4>
          <p class="muted small-text">${escapeHtml(
            game.genre || "No genre"
          )}</p>
        </div>
        <span class="status-pill ${statusClass}">${
      game.is_active == 1 ? "Active" : "Inactive"
    }</span>
      </div>
      <div class="admin-card__body">
        <label class="field-label small-text">Game name</label>
        <input type="text" class="input admin-game-name" value="${escapeHtml(
          game.game_name
        )}">
        <label class="field-label small-text">Genre</label>
        <input type="text" class="input admin-game-genre" value="${escapeHtml(
          game.genre || ""
        )}">
        <div class="admin-card__row">
          <div>
            <label class="field-label small-text">Min players</label>
            <input type="number" class="input admin-game-min" value="${escapeHtml(
              game.players_min
            )}" min="1">
          </div>
          <div>
            <label class="field-label small-text">Max players</label>
            <input type="number" class="input admin-game-max" value="${escapeHtml(
              game.players_max
            )}" min="1">
          </div>
        </div>
        <label class="field-label small-text">Status</label>
        <select class="input admin-game-active">
          <option value="1" ${
            parseInt(game.is_active, 10) === 1 ? "selected" : ""
          }>Active</option>
          <option value="0" ${
            parseInt(game.is_active, 10) !== 1 ? "selected" : ""
          }>Inactive</option>
        </select>
      </div>
      <div class="admin-card__actions">
        <button type="button" class="btn btn-secondary" onclick="adminUpdateBoardgame(${
          game.game_id
        })">Save</button>
        <button type="button" class="btn btn-danger" onclick="adminDeleteBoardgame(${
          game.game_id
        })">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

async function adminSubmitBoardgame(e) {
  e.prevent.Default;
}