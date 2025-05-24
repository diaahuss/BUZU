// ===== GLOBAL DECLARATIONS ===== //
const app = document.getElementById("app");
let currentUser = null;
let groups = [];
let currentGroupId = null;
const socket = io('https://buzu-production-d070.up.railway.app');

// Audio System
const buzzAudio = new Audio('buzz.mp3');
buzzAudio.preload = 'auto';
buzzAudio.volume = 0.6;

// Mobile audio unlock
function initAudio() {
  const unlockAudio = () => {
    buzzAudio.play().catch(e => console.log("Audio init:", e));
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
}

// ====================== RENDER FUNCTIONS ====================== //
function renderLogin() {
  app.innerHTML = `
    <div class="login-container">
      <div class="banner">BUZU</div>
      <div class="input-group">
        <input type="text" id="phone" placeholder="Phone Number" class="form-input" />
        <input type="password" id="password" placeholder="Password" class="form-input" />
        <div class="checkbox-group">
          <input type="checkbox" id="showPass">
          <label for="showPass">Show Password</label>
        </div>
      </div>
      <button onclick="login()" class="btn-login">Login</button>
      <div class="links">
        <a href="#" onclick="renderSignup()">Create account</a>
        <a href="#" onclick="showNotification('Reset password feature coming soon')">Forgot password?</a>
      </div>
    </div>
  `;
  document.getElementById("showPass").addEventListener("change", (e) => {
    document.getElementById("password").type = e.target.checked ? "text" : "password";
  });
}

function renderSignup() {
  app.innerHTML = `
    <div class="login-container">
      <div class="banner">BUZU - Sign Up</div>
      <div class="input-group">
        <input type="text" id="name" placeholder="Name" class="form-input" />
        <input type="text" id="phone" placeholder="Phone Number" class="form-input" />
        <input type="password" id="password" placeholder="Password" class="form-input" />
        <input type="password" id="confirmPassword" placeholder="Confirm Password" class="form-input" />
        <div class="checkbox-group">
          <input type="checkbox" id="showSignupPass">
          <label for="showSignupPass">Show Password</label>
        </div>
      </div>
      <button onclick="signup()" class="btn-login">Sign Up</button>
      <div class="links">
        <a href="#" onclick="renderLogin()">Back to Login</a>
      </div>
    </div>
  `;
  document.getElementById("showSignupPass").addEventListener("change", (e) => {
    const type = e.target.checked ? "text" : "password";
    document.getElementById("password").type = type;
    document.getElementById("confirmPassword").type = type;
  });
}

function renderDashboard() {
  app.innerHTML = `
    <div class="dashboard">
      <header class="header">
        <h1>Welcome, ${currentUser.name}</h1>
        <button onclick="logout()" class="btn-icon">Logout</button>
      </header>
      <button onclick="createGroup()" class="btn-primary">Create Group</button>
      <h2>My Groups</h2>
      <div class="groups-list">
        ${groups.length ? groups.map((group, index) => `
          <div class="group-card" onclick="openGroup(${index})">
            <div class="group-info">
              <h3>${group.name}</h3>
              <span class="member-count">${group.members.length} member${group.members.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="group-actions">
              <button onclick="event.stopPropagation(); editGroup(${index})" class="btn-icon">Edit</button>
              <button onclick="event.stopPropagation(); removeGroup(${index})" class="btn-icon">Delete</button>
            </div>
          </div>
        `).join("") : '<p class="empty-message">No groups yet. Create one to get started!</p>'}
      </div>
    </div>
  `;
}

function renderGroup(index) {
  const group = groups[index];
  currentGroupId = group.name;
  
  app.innerHTML = `
    <div class="group-view">
      <header class="header">
        <button onclick="renderDashboard()" class="btn-back">←</button>
        <h1>${group.name}</h1>
      </header>
      <div class="group-actions">
        <button onclick="addMember(${index})" class="btn-primary">Add Member</button>
        <button onclick="buzzAll(${index})" class="btn-action">Buzz All</button>
      </div>
      <h2>Members</h2>
      <div class="members-list">
        ${group.members.map((m, i) => `
          <div class="member-item">
            <div class="member-info">
              <span class="member-name">${m.name}</span>
              <span class="member-phone">${m.phone}</span>
            </div>
            ${m.phone !== currentUser.phone ? 
              `<button onclick="event.stopPropagation(); removeMember(${index}, ${i})" class="btn-remove">×</button>` : ''}
          </div>
        `).join("")}
      </div>
    </div>
  `;
  
  if (socket.connected) {
    socket.emit('join_group', {
      userId: currentUser.phone,
      groupId: currentGroupId
    });
  }
}

// [Rest of your original JavaScript functions remain exactly the same]
// ====================== AUTH FUNCTIONS ====================== //
function login() {
  // ... (keep your original login function)
}

function signup() {
  // ... (keep your original signup function)
}

function logout() {
  // ... (keep your original logout function)
}

// ====================== GROUP FUNCTIONS ====================== //
function createGroup() {
  // ... (keep your original createGroup function)
}

function addMember(groupIndex) {
  // ... (keep your original addMember function)
}

function removeMember(groupIndex, memberIndex) {
  // ... (keep your original removeMember function)
}

function editGroup(groupIndex) {
  // ... (keep your original editGroup function)
}

function removeGroup(groupIndex) {
  // ... (keep your original removeGroup function)
}

function saveGroups() {
  // ... (keep your original saveGroups function)
}

// ====================== NOTIFICATION SYSTEM ====================== //
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : ''}`;
  notification.innerHTML = `
    <span class="notification-icon">${isError ? '⚠️' : '✓'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, isError ? 4000 : 3000);
}

// ====================== BUZZ SYSTEM ====================== //
function playBuzzSound() {
  // ... (keep your original playBuzzSound function)
}

function buzzAll(groupIndex) {
  // ... (keep your original buzzAll function)
}

// ====================== SOCKET HANDLERS ====================== //
function initSocketConnection() {
  // ... (keep your original initSocketConnection function)
}

// ====================== INITIALIZATION ====================== //
document.addEventListener('DOMContentLoaded', () => {
  // ... (keep your original DOMContentLoaded function)
});
