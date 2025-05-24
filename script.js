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
    ${groups.map((group, index) => `
      <div class="group">
        <div class="group-box" onclick="openGroup(${index})">
          ${group.name} <span class="arrow">→</span>
        </div>
        <button onclick="event.stopPropagation(); editGroup(${index})">Edit</button>
        <button onclick="event.stopPropagation(); removeGroup(${index})">Remove</button>
      </div>
    `).join("")}
  `;
}

function renderGroup(index) {
  const group = groups[index];
  currentGroupId = group.name;
  
  app.innerHTML = `
    <div class="banner">
      <span onclick="renderDashboard()" style="cursor:pointer;">←</span> ${group.name}
    </div>
    <button onclick="addMember(${index})">Add Member</button>
    <button onclick="buzzAll(${index})">Buzz All</button>
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
    socket.emit('join_group', {
      userId: currentUser.phone,
      groupId: currentGroupId
    });
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
  renderLogin();
}

// ====================== GROUP FUNCTIONS ====================== //
function createGroup() {
  const name = prompt("Group name:")?.trim();
  if (!name) return;

  groups.push({ 
    name, 
    members: [{ 
      name: currentUser.name, 
      phone: currentUser.phone 
    }] 
  });
  saveGroups();
  renderDashboard();
}

function addMember(groupIndex) {
  const name = prompt("Member name:")?.trim();
  const phone = prompt("Phone number:")?.trim();
  if (!name || !phone) return;

  groups[groupIndex].members.push({ name, phone });
  saveGroups();
  renderGroup(groupIndex);
}

function removeMember(groupIndex, memberIndex) {
  if (groups[groupIndex].members.length <= 1) {
    return alert("Can't remove last member");
  }
  groups[groupIndex].members.splice(memberIndex, 1);
  saveGroups();
  renderGroup(groupIndex);
}

function editGroup(groupIndex) {
  const newName = prompt("New name:", groups[groupIndex].name)?.trim();
  if (!newName) return;
  
  groups[groupIndex].name = newName;
  saveGroups();
  renderDashboard();
}

function removeGroup(groupIndex) {
  if (!confirm(`Delete "${groups[groupIndex].name}"?`)) return;
  
  groups.splice(groupIndex, 1);
  saveGroups();
  renderDashboard();
}

function saveGroups() {
  currentUser.groups = groups;
  localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
}

// ====================== BUZZ SYSTEM ====================== //
function playBuzzSound() {
  buzzAudio.currentTime = 0;
  buzzAudio.play().catch(() => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  });
}

function buzzAll(groupIndex) {
  const group = groups[groupIndex];
  if (!group?.members.length) return alert("Invalid group");

  playBuzzSound();
  
  socket.emit("buzz", { 
    groupId: group.name,
    sender: currentUser.phone,
    senderName: currentUser.name,
    timestamp: Date.now()
  }, (response) => {
    if (!response?.error) {
      showBuzzAlert(`✓ Buzz sent to ${group.name}`);
    }
  });
}

function showBuzzAlert(message, isError = false) {
  const alert = document.createElement('div');
  alert.className = `buzz-alert ${isError ? 'error' : ''}`;
  alert.textContent = message;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 2000);
}

// ====================== SOCKET HANDLERS ====================== //
function initSocketConnection() {
  socket.on("connect", () => {
    if (!currentUser?.phone) return;
    
    socket.emit('authenticate', { userId: currentUser.phone });
    
    if (currentGroupId) {
      socket.emit('join_group', {
        userId: currentUser.phone,
        groupId: currentGroupId
      });
    }
  });

  socket.on("buzz", (data) => {
    if (data?.sender !== currentUser?.phone) {
      playBuzzSound();
      showBuzzAlert(`${data.senderName || "Someone"} buzzed!`);
    }
  });

  socket.on("disconnect", () => {
    setTimeout(() => socket.connect(), 1000);
  });
}

// ====================== INITIALIZATION ====================== //
document.addEventListener('DOMContentLoaded', () => {
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
});
