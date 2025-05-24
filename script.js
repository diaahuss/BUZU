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

// ====================== CORE FUNCTIONS ====================== //
function initAudio() {
  const unlockAudio = () => {
    buzzAudio.play().then(() => buzzAudio.pause()).catch(console.warn);
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
}

function saveGroups() {
  try {
    currentUser.groups = groups;
    localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  } catch (error) {
    console.error("Error saving groups:", error);
    showNotification("Failed to save groups", true);
  }
}

// ====================== AUTH FUNCTIONS ====================== //
function login() {
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const user = JSON.parse(localStorage.getItem(phone));

  if (user?.password === password) {
    currentUser = user;
    groups = user.groups || [];
    localStorage.setItem('currentUser', JSON.stringify(user));
    initAudio();
    initSocketConnection();
    renderDashboard();
  } else {
    showNotification("Invalid credentials", true);
  }
}

function signup() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (!name || !phone || !password) return showNotification("Please fill all fields", true);
  if (password !== confirm) return showNotification("Passwords don't match", true);
  if (localStorage.getItem(phone)) return showNotification("Account already exists", true);

  currentUser = { name, phone, password, groups: [] };
  localStorage.setItem(phone, JSON.stringify(currentUser));
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  showNotification("Account created!");
  renderDashboard();
}

function logout() {
  socket.disconnect();
  currentUser = null;
  groups = [];
  currentGroupId = null;
  localStorage.removeItem('currentUser');
  renderLogin();
}

// ====================== RENDER FUNCTIONS ====================== //
function renderLogin() {
  app.innerHTML = `
    <div class="auth-container">
      <div class="banner">BUZU</div>
      <div class="input-group">
        <input type="text" id="phone" placeholder="Phone Number" />
        <input type="password" id="password" placeholder="Password" />
        <div class="checkbox-container">
          <input type="checkbox" id="showPass">
          <label for="showPass">Show Password</label>
        </div>
      </div>
      <button class="btn-primary" onclick="login()">Login</button>
      <div class="link-row">
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
    <div class="auth-container">
      <div class="banner">BUZU - Sign Up</div>
      <div class="input-group">
        <input type="text" id="name" placeholder="Name" />
        <input type="text" id="phone" placeholder="Phone Number" />
        <input type="password" id="password" placeholder="Password" />
        <input type="password" id="confirmPassword" placeholder="Confirm Password" />
        <div class="checkbox-container">
          <input type="checkbox" id="showSignupPass">
          <label for="showSignupPass">Show Password</label>
        </div>
      </div>
      <button class="btn-primary" onclick="signup()">Sign Up</button>
      <div class="link-row"><a href="#" onclick="renderLogin()">Back to Login</a></div>
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
    <div class="dashboard-container">
      <div class="header">
        <h1>Welcome, ${currentUser.name}</h1>
        <button class="btn-icon" onclick="logout()">🚪</button>
      </div>
      <div class="btn-group">
        <button class="btn-primary" onclick="createGroup()">Create Group</button>
      </div>
      <h2>My Groups</h2>
      <div class="groups-list">
        ${groups.length ? groups.map((group, index) => `
          <div class="group-card" data-group-name="${group.name}">
            <div class="group-content" onclick="openGroup(${index})">
              <h3>${group.name}</h3>
              <span class="members-count">${group.members.length} member${group.members.length !== 1 ? 's' : ''}</span>
              <span class="arrow">→</span>
            </div>
            <div class="group-actions">
              <button class="btn-icon" onclick="event.stopPropagation(); editGroup(${index})">✏️</button>
              <button class="btn-icon" onclick="event.stopPropagation(); removeGroup(${index})">🗑️</button>
            </div>
          </div>
        `).join("") : '<p class="empty-state">No groups yet. Create one to get started!</p>'}
      </div>
    </div>
  `;
}

function renderGroup(index) {
  const group = groups[index];
  currentGroupId = group.name;
  sessionStorage.setItem('lastActiveGroup', currentGroupId);
  
  app.innerHTML = `
    <div class="group-container">
      <div class="header">
        <button class="btn-icon back-btn" onclick="renderDashboard()">←</button>
        <h1>${group.name}</h1>
      </div>
      <div class="btn-group">
        <button class="btn-primary" onclick="addMember(${index})">Add Member</button>
        <button class="btn-action" onclick="buzzAll(${index})">🔔 Buzz All</button>
      </div>
      <h2>Members</h2>
      <div class="members-list">
        ${group.members.map((m, i) => `
          <div class="member-item">
            <div class="member-info">
              <span class="member-name">${m.name}</span>
              <span class="member-phone">${m.phone}</span>
              ${m.phone === currentUser.phone ? '<span class="badge-you">You</span>' : ''}
              ${m.isAdmin ? '<span class="badge-admin">Admin</span>' : ''}
            </div>
            ${m.phone !== currentUser.phone ? 
              `<button class="btn-icon remove-btn" onclick="event.stopPropagation(); removeMember(${index}, ${i})">×</button>` : ''}
          </div>
        `).join("")}
      </div>
    </div>
  `;
  
  if (socket.connected) {
    joinGroupRoom(currentGroupId);
  }
}

// ====================== GROUP FUNCTIONS ====================== //
function createGroup() {
  const name = prompt("Group name:")?.trim();
  if (!name) return showNotification("Group name cannot be empty", true);
  if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
    return showNotification("Group name already exists", true);
  }

  groups.push({ 
    name, 
    members: [{ 
      name: currentUser.name, 
      phone: currentUser.phone,
      isAdmin: true 
    }] 
  });
  saveGroups();
  renderDashboard();
  showNotification(`"${name}" group created`);
}

function addMember(groupIndex) {
  const name = prompt("Member name:")?.trim();
  if (!name) return showNotification("Name cannot be empty", true);

  const phone = prompt("Phone number:")?.trim();
  if (!phone) return showNotification("Phone cannot be empty", true);
  if (!/^\d{10,15}$/.test(phone)) return showNotification("Invalid phone number", true);

  const group = groups[groupIndex];
  if (group.members.some(m => m.phone === phone)) {
    return showNotification("Member already in group", true);
  }

  group.members.push({ name, phone });
  saveGroups();
  renderGroup(groupIndex);
  showNotification(`Added ${name} to ${group.name}`);
}

function removeMember(groupIndex, memberIndex) {
  const group = groups[groupIndex];
  const member = group.members[memberIndex];
  
  if (group.members.length <= 1) {
    return showNotification("Cannot remove last member", true);
  }

  if (member.phone === currentUser.phone && member.isAdmin) {
    if (!confirm("As admin, leaving will delete the group. Continue?")) return;
    return removeGroup(groupIndex);
  }

  if (!confirm(`Remove ${member.name} from group?`)) return;
  
  group.members.splice(memberIndex, 1);
  saveGroups();
  renderGroup(groupIndex);
  showNotification(`Removed ${member.name}`);
}

function editGroup(groupIndex) {
  const group = groups[groupIndex];
  const newName = prompt("New name:", group.name)?.trim();
  if (!newName) return showNotification("Name cannot be empty", true);
  if (newName === group.name) return;

  if (groups.some((g, i) => i !== groupIndex && g.name.toLowerCase() === newName.toLowerCase())) {
    return showNotification("Group name already exists", true);
  }

  group.name = newName;
  saveGroups();
  renderDashboard();
  showNotification(`Renamed to "${newName}"`);
}

function removeGroup(groupIndex) {
  const groupName = groups[groupIndex].name;
  if (!confirm(`Delete "${groupName}" permanently?`)) return;
  
  groups.splice(groupIndex, 1);
  saveGroups();
  renderDashboard();
  showNotification(`Deleted "${groupName}"`);
}

// ====================== BUZZ SYSTEM ====================== //
let isBuzzCooldown = false;

function playBuzzSound() {
  try {
    buzzAudio.currentTime = 0;
    buzzAudio.play().catch(() => {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    });
  } catch (error) {
    flashScreen();
  }
}

function flashScreen() {
  document.body.style.transition = 'background-color 0.3s';
  document.body.style.backgroundColor = 'rgba(255,0,0,0.3)';
  setTimeout(() => {
    document.body.style.backgroundColor = '';
  }, 300);
}

function buzzAll(groupIndex) {
  if (isBuzzCooldown) return showNotification("Wait before buzzing again", true);
  
  const group = groups[groupIndex];
  if (!group?.members?.length) return showNotification("No members to buzz", true);

  playBuzzSound();
  isBuzzCooldown = true;
  setTimeout(() => isBuzzCooldown = false, 3000);

  socket.emit("buzz", { 
    groupId: group.name,
    sender: currentUser.phone,
    senderName: currentUser.name,
    timestamp: Date.now(),
    members: group.members.map(m => m.phone)
  }, (response) => {
    if (response?.error) {
      showNotification(`Buzz failed: ${response.error}`, true);
    } else {
      showNotification(`✓ Buzz sent to ${group.name}`);
    }
  });
}

// ====================== NOTIFICATION SYSTEM ====================== //
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : ''}`;
  notification.innerHTML = `
    <span class="notification-icon">${isError ? '⚠️' : '🔔'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, isError ? 4000 : 3000);
}

// ====================== SOCKET HANDLERS ====================== //
function initSocketConnection() {
  if (!socket) return;

  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'socket-status';
  document.body.appendChild(statusIndicator);

  socket.on("connect", () => {
    statusIndicator.className = 'socket-status connected';
    if (currentUser?.phone) {
      socket.emit('authenticate', { userId: currentUser.phone });
    }
    if (currentGroupId) joinGroupRoom(currentGroupId);
  });

  socket.on("disconnect", () => {
    statusIndicator.className = 'socket-status disconnected';
  });

  socket.on("connect_error", () => {
    statusIndicator.className = 'socket-status error';
  });

  socket.on("buzz", (data) => {
    if (data?.sender !== currentUser?.phone) {
      playBuzzSound();
      showNotification(`${data.senderName || "Someone"} buzzed the group!`);
      highlightGroup(data.groupId);
    }
  });
}

function joinGroupRoom(groupId) {
  if (!socket.connected) return;
  socket.emit('join_group', {
    userId: currentUser.phone,
    groupId: groupId
  });
}

function highlightGroup(groupName) {
  const groupElement = document.querySelector(`[data-group-name="${groupName}"]`);
  if (groupElement) {
    groupElement.classList.add('buzz-highlight');
    setTimeout(() => groupElement.classList.remove('buzz-highlight'), 2000);
  }
}

// ====================== INITIALIZATION ====================== //
document.addEventListener('DOMContentLoaded', () => {
  try {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      groups = currentUser.groups || [];
      initAudio();
      initSocketConnection();
      
      const lastGroup = sessionStorage.getItem('lastActiveGroup');
      if (lastGroup) currentGroupId = lastGroup;
      
      renderDashboard();
    } else {
      renderLogin();
    }
  } catch (error) {
    console.error("Init error:", error);
    renderLogin();
  }
});
