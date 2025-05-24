// ===== GLOBAL DECLARATIONS ===== //
const app = document.getElementById("app");
let currentUser = null;
let groups = [];
let currentGroupId = null;
const socket = io('https://buzu-production-d070.up.railway.app');

// Audio System (single declaration)
const buzzAudio = (() => {
  const audio = new Audio('buzz.mp3');
  audio.preload = 'auto';
  audio.volume = 0.6;
  return audio;
})();

// Mobile audio unlock
let audioUnlocked = false;
const initAudio = () => {
  if (audioUnlocked) return;

  const unlockAudio = () => {
    buzzAudio.play()
      .then(() => {
        audioUnlocked = true;
        buzzAudio.pause();
        buzzAudio.currentTime = 0;
      })
      .catch(e => console.log("Audio init error:", e));
      
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };

  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
};

// ====================== RENDER FUNCTIONS ====================== //
function renderLogin() {
  app.innerHTML = `
    <div class="banner">BUZU</div>
    <input type="text" id="phone" placeholder="Phone Number" />
    <input type="password" id="password" placeholder="Password" />
    <input type="checkbox" id="showPass" title="Show Password">
    <button onclick="login()">Login</button>
    <div class="link-row">
      <a href="#" onclick="renderSignup()">Create account</a>
      <a href="#" onclick="alert('Reset password feature coming soon')">Forgot password?</a>
    </div>
  `;
  document.getElementById("showPass").addEventListener("change", (e) => {
    document.getElementById("password").type = e.target.checked ? "text" : "password";
  });
}

function renderSignup() {
  app.innerHTML = `
    <div class="banner">BUZU - Sign Up</div>
    <input type="text" id="name" placeholder="Name" />
    <input type="text" id="phone" placeholder="Phone Number" />
    <input type="password" id="password" placeholder="Password" />
    <input type="password" id="confirmPassword" placeholder="Confirm Password" />
    <input type="checkbox" id="showSignupPass" title="Show Password">
    <button onclick="signup()">Sign Up</button>
    <div class="link-row"><a href="#" onclick="renderLogin()">Back to Login</a></div>
  `;
  document.getElementById("showSignupPass").addEventListener("change", (e) => {
    const type = e.target.checked ? "text" : "password";
    document.getElementById("password").type = type;
    document.getElementById("confirmPassword").type = type;
  });
}

function renderDashboard() {
  app.innerHTML = `
    <div class="banner">Welcome, ${currentUser.name}</div>
    <button onclick="createGroup()">Create Group</button>
    <button onclick="logout()">Logout</button>
    <h2>My Groups</h2>
    <div class="groups-container">
      ${groups.map((group, index) => `
        <div class="group" data-group-name="${group.name}">
          <div class="group-box" onclick="openGroup(${index})">
            ${group.name} <span class="arrow">→</span>
          </div>
          <button onclick="event.stopPropagation(); editGroup(${index})">Edit</button>
          <button onclick="event.stopPropagation(); removeGroup(${index})">Remove</button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderGroup(index) {
  const group = groups[index];
  currentGroupId = group.name;
  sessionStorage.setItem('lastActiveGroup', group.name);
  
  app.innerHTML = `
    <div class="banner">
      <span onclick="renderDashboard()" class="back-arrow">←</span> ${group.name}
    </div>
    <div class="group-actions">
      <button onclick="addMember(${index})">Add Member</button>
      <button onclick="buzzAll(${index})" class="buzz-btn">Buzz All</button>
    </div>
    <h3>Members:</h3>
    <div class="members-list">
      ${group.members.map((m, i) => `
        <div class="member-item">
          <span>${m.name} (${m.phone})</span>
          <span class="remove-x" onclick="event.stopPropagation(); removeMember(${index}, ${i})">×</span>
        </div>
      `).join("")}
    </div>
  `;
  
  if (socket.connected) {
    joinGroupRoom(group.name);
  }
}

// ====================== AUTH FUNCTIONS ====================== //
function login() {
  const phone = document.getElementById("phone").value;
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
    alert("Invalid credentials");
  }
}

function signup() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (!name || !phone || !password) return alert("Please fill all fields");
  if (password !== confirm) return alert("Passwords don't match");
  if (localStorage.getItem(phone)) return alert("Account exists");

  const user = { name, phone, password, groups: [] };
  localStorage.setItem(phone, JSON.stringify(user));
  alert("Account created");
  renderLogin();
}

function logout() {
  socket.disconnect();
  currentUser = null;
  groups = [];
  currentGroupId = null;
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('lastActiveGroup');
  renderLogin();
}

// ====================== GROUP FUNCTIONS ====================== //
function createGroup() {
  const name = prompt("Group name:")?.trim();
  if (!name) return alert("Group name cannot be empty");
  
  if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
    return alert("Group name already exists");
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
  showNotification(`Created group "${name}"`);
}

function addMember(groupIndex) {
  const name = prompt("Member name:")?.trim();
  const phone = prompt("Phone number:")?.trim();
  
  if (!name || !phone) return alert("All fields required");
  if (!/^\d{10,15}$/.test(phone)) return alert("Invalid phone number");

  const group = groups[groupIndex];
  if (group.members.some(m => m.phone === phone)) {
    return alert("Member already in group");
  }

  group.members.push({ name, phone });
  saveGroups();
  renderGroup(groupIndex);
  showNotification(`Added ${name} to group`);
}

function removeMember(groupIndex, memberIndex) {
  const group = groups[groupIndex];
  const member = group.members[memberIndex];
  
  if (group.members.length <= 1) return alert("Cannot remove last member");
  if (member.phone === currentUser.phone && member.isAdmin) {
    if (!confirm("Deleting yourself will delete the group. Continue?")) return;
    return removeGroup(groupIndex);
  }

  if (!confirm(`Remove ${member.name}?`)) return;
  
  group.members.splice(memberIndex, 1);
  saveGroups();
  renderGroup(groupIndex);
  showNotification(`Removed ${member.name}`);
}

function editGroup(groupIndex) {
  const group = groups[groupIndex];
  const newName = prompt("New name:", group.name)?.trim();
  
  if (!newName) return alert("Name cannot be empty");
  if (newName === group.name) return;
  
  if (groups.some((g, i) => i !== groupIndex && g.name.toLowerCase() === newName.toLowerCase())) {
    return alert("Name already exists");
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

function saveGroups() {
  currentUser.groups = groups;
  localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
}

// ====================== BUZZ SYSTEM ====================== //
let isBuzzCooldown = false;

function playBuzzSound() {
  buzzAudio.currentTime = 0;
  buzzAudio.play().catch(e => {
    console.warn("Audio error:", e);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  });
}

function buzzAll(groupIndex) {
  if (isBuzzCooldown) return showNotification("Wait before buzzing again", true);
  
  const group = groups[groupIndex];
  if (!group?.members?.length) return showNotification("No members to buzz", true);

  playBuzzSound();
  isBuzzCooldown = true;
  setTimeout(() => { isBuzzCooldown = false; }, 3000);

  socket.emit("buzz", { 
    groupId: group.name,
    sender: currentUser.phone,
    senderName: currentUser.name,
    members: group.members.map(m => m.phone)
  }, (response) => {
    if (response?.error) {
      showNotification(`Buzz failed: ${response.error}`, true);
    } else {
      showNotification(`✓ Buzz sent to ${group.members.length} members`);
    }
  });
}

// ====================== SOCKET HANDLERS ====================== //
function initSocketConnection() {
  if (!socket) return console.error("Socket not initialized");

  socket.on("connect", () => {
    socket.emit('authenticate', { userId: currentUser.phone });
    if (currentGroupId) joinGroupRoom(currentGroupId);
  });

  socket.on("buzz", (data) => {
    if (data?.sender === currentUser.phone) return;
    playBuzzSound();
    showNotification(`${data.senderName || "Someone"} buzzed!`);
    highlightGroup(data.groupId);
  });

  socket.on("connect_error", (err) => {
    console.error("Connection error:", err);
    showNotification("Connection issue", true);
  });
}

function joinGroupRoom(groupId) {
  if (!socket.connected) return;
  socket.emit('join_group', { userId: currentUser.phone, groupId });
}

function highlightGroup(groupName) {
  const el = document.querySelector(`[data-group-name="${groupName}"]`);
  if (el) {
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 2000);
  }
}

// ====================== UTILITIES ====================== //
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : ''}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, isError ? 3000 : 2000);
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
      renderDashboard();
    } else {
      renderLogin();
    }
  } catch (error) {
    console.error("Init error:", error);
    renderLogin();
  }
});
