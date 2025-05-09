const app = document.getElementById("app");
let currentUser = null;
let groups = [];
const socket = io('https://buzu-production-d070.up.railway.app/#'); // Railway backend URL

// ====================== CORE FUNCTIONS ====================== //

function renderLogin() {
  app.innerHTML = `
    <div class="banner">BUZU</div>
    <input type="text" id="phone" placeholder="Phone Number" />
    <input type="password" id="password" placeholder="Password" />
    <input type="checkbox" id="showPass"> Show Password
    <button onclick="login()">Login</button>
    <div class="link-row">
      <a href="#" onclick="renderSignup()">Create account</a>
      <a href="#" onclick="alert('Reset password coming soon')">Forgot password?</a>
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
    <input type="checkbox" id="showSignupPass"> Show Password
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
    <button class="btn" onclick="createGroup()">Create Group</button>
    <button class="btn" onclick="logout()">Logout</button>
    <h2>My Groups</h2>
    <div class="groups-container">
      ${groups.map((group, index) => `
        <div class="group-card">
          <div class="group-header" onclick="renderGroup(${index})">
            <h3>${group.name}</h3>
            <span class="member-count">${group.members.length} member${group.members.length !== 1 ? 's' : ''}</span>
            <span class="arrow">→</span>
          </div>
          <div class="group-actions">
            <button onclick="event.stopPropagation(); editGroup(${index})">Edit</button>
            <button onclick="event.stopPropagation(); removeGroup(${index})">Delete</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderGroup(index) {
  const group = groups[index];
  socket.emit('joinGroup', { groupId: group.name, phone: currentUser.phone });

  app.innerHTML = `
    <div class="banner">
      <span class="back-btn" onclick="renderDashboard()">← Back</span>
      ${group.name}
    </div>
    <div class="group-actions">
      <button class="btn" onclick="addMember(${index})">Add Member</button>
      <button class="btn" onclick="buzzAll(${index})">Buzz All</button>
    </div>
    <h3>Members</h3>
    <div class="members-list">
      ${group.members.map((member, i) => `
        <div class="member-item">
          <span>${member.name} (${member.phone})</span>
          ${member.phone !== currentUser.phone ? 
            `<button onclick="event.stopPropagation(); removeMember(${index}, ${i})">Remove</button>` : 
            '<span class="you">You</span>'}
        </div>
      `).join("")}
    </div>
  `;
}

// ====================== AUTH FUNCTIONS ====================== //

function login() {
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  
  if (!phone || !password) {
    alert("Please enter both phone and password");
    return;
  }

  const user = JSON.parse(localStorage.getItem(phone));
  
  if (user && user.password === password) {
    currentUser = user;
    groups = user.groups || [];
    initSocket();
    renderDashboard();
  } else {
    alert("Invalid login credentials");
  }
}

function signup() {
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (!name || !phone || !password || !confirm) {
    alert("Please fill all fields");
    return;
  }

  if (password !== confirm) {
    alert("Passwords don't match");
    return;
  }

  if (localStorage.getItem(phone)) {
    alert("Phone number already registered");
    return;
  }

  const user = { name, phone, password, groups: [] };
  localStorage.setItem(phone, JSON.stringify(user));
  alert("Account created! Please login");
  renderLogin();
}

function logout() {
  socket.disconnect();
  currentUser = null;
  groups = [];
  renderLogin();
}

// ====================== GROUP FUNCTIONS ====================== //

function createGroup() {
  const name = prompt("Enter group name:");
  if (!name || name.trim() === "") {
    alert("Group name required");
    return;
  }

  if (groups.some(g => g.name === name.trim())) {
    alert("Group name already exists");
    return;
  }

  groups.push({
    name: name.trim(),
    members: [{
      name: currentUser.name,
      phone: currentUser.phone,
      isAdmin: true
    }]
  });

  saveGroups();
  renderDashboard();
}

function addMember(groupIndex) {
  const name = prompt("Member name:");
  if (!name) return;

  const phone = prompt("Member phone number:");
  if (!phone || !/^\d{10,15}$/.test(phone)) {
    alert("Invalid phone number");
    return;
  }

  const group = groups[groupIndex];
  if (group.members.some(m => m.phone === phone)) {
    alert("Member already in group");
    return;
  }

  group.members.push({ name, phone, isAdmin: false });
  saveGroups();
  renderGroup(groupIndex);
}

function removeMember(groupIndex, memberIndex) {
  const group = groups[groupIndex];
  if (group.members.length <= 1) {
    alert("Can't remove last member");
    return;
  }

  if (confirm("Remove this member?")) {
    group.members.splice(memberIndex, 1);
    saveGroups();
    renderGroup(groupIndex);
  }
}

function editGroup(groupIndex) {
  const newName = prompt("New group name:", groups[groupIndex].name);
  if (!newName || newName.trim() === "") return;

  const trimmedName = newName.trim();
  if (groups.some((g, i) => g.name === trimmedName && i !== groupIndex)) {
    alert("Name already taken");
    return;
  }

  groups[groupIndex].name = trimmedName;
  saveGroups();
  renderDashboard();
}

function removeGroup(groupIndex) {
  if (!confirm("Delete this group permanently?")) return;
  
  groups.splice(groupIndex, 1);
  saveGroups();
  renderDashboard();
}

function saveGroups() {
  currentUser.groups = groups;
  localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
}

// ====================== BUZZ SYSTEM ====================== //

function buzzAll(groupIndex) {
  const group = groups[groupIndex];
  if (!group || group.members.length === 0) {
    alert("No members to buzz");
    return;
  }

  playBuzzSound();
  socket.emit("buzz", { 
    groupId: group.name,
    sender: currentUser.phone 
  });
}

function playBuzzSound() {
  const audio = new Audio('buzz-sound.mp3'); // Add your buzz sound file
  audio.volume = 0.5;
  audio.play().catch(e => {
    console.log("Audio play failed, trying again...");
    audio.play().catch(e => console.error("Couldn't play buzz sound", e));
  });
}

// ====================== SOCKET HANDLERS ====================== //

function initSocket() {
  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("buzz", (data) => {
    if (data.sender !== currentUser.phone) {
      playBuzzSound();
      showNotification(`${data.sender} buzzed the group!`);
    }
  });
}

function showNotification(message) {
  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ====================== INITIALIZATION ====================== //

// Handle first user interaction for audio
document.addEventListener('click', () => {
  const audio = new Audio();
  audio.muted = true;
  audio.play().then(() => {
    audio.muted = false;
  }).catch(e => console.log("Audio init:", e));
}, { once: true });

// Start the app
renderLogin();
