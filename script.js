const app = document.getElementById("app");

let currentUser = null;
let groups = [];

const socket = io('https://your-railway-app-url.com'); // replace with your actual Railway backend URL

// Render Login Screen
function renderLogin() {
  app.innerHTML = `
    <div class="banner">BUZU</div>
    <input type="text" id="phone" placeholder="Phone Number" />
    <input type="password" id="password" placeholder="Password" />
    <label><input type="checkbox" id="showPass"> Show Password</label>
    <button onclick="login()">Login</button>
    <div class="link-row">
      <a href="#" onclick="renderSignup()">Create an account</a>
      <a href="#" onclick="alert('Reset password feature coming soon')">Forgot your password?</a>
    </div>
  `;

  document.getElementById("showPass").addEventListener("change", (e) => {
    document.getElementById("password").type = e.target.checked ? "text" : "password";
  });
}

// Render Signup Screen
function renderSignup() {
  app.innerHTML = `
    <div class="banner">BUZU - Create Account</div>
    <input type="text" id="name" placeholder="Name" />
    <input type="text" id="phone" placeholder="Phone Number" />
    <input type="password" id="password" placeholder="Password" />
    <input type="password" id="confirmPassword" placeholder="Confirm Password" />
    <label><input type="checkbox" id="showSignupPass"> Show Password</label>
    <button onclick="signup()">Sign Up</button>
    <div class="link-row"><a href="#" onclick="renderLogin()">Back to Login</a></div>
  `;

  document.getElementById("showSignupPass").addEventListener("change", (e) => {
    const type = e.target.checked ? "text" : "password";
    document.getElementById("password").type = type;
    document.getElementById("confirmPassword").type = type;
  });
}

// Render Main Dashboard
function renderDashboard() {
  app.innerHTML = `
    <div class="banner">Welcome, ${currentUser.name}</div>
    <button onclick="createGroup()">Create Group</button>
    <button onclick="logout()">Logout</button>
    ${groups.map((group, i) => `
      <div class="group-box" onclick="openGroup(${i})">
        ${group.name} <span class="arrow">→</span>
      </div>
    `).join("")}
  `;
}

// Render Individual Group View
function renderGroup(index) {
  const group = groups[index];
  socket.emit('joinGroup', group.name); // Join Socket.IO room

  app.innerHTML = `
    <div class="banner">
      <span onclick="renderDashboard()" style="cursor:pointer;">←</span> ${group.name}
    </div>
    <button onclick="addMember(${index})">Add Member</button>
    <button onclick="buzzAll(${index})">Buzz All</button>
    ${group.members.map((m, i) => `
      <div class="member-item">
        ${m.name} (${m.phone})
        <span class="remove-x" onclick="removeMember(${index}, ${i})">×</span>
      </div>
    `).join("")}
  `;
}

// Handle Login
function login() {
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  const user = JSON.parse(localStorage.getItem(phone));

  if (user && user.password === password) {
    currentUser = user;
    groups = user.groups || [];
    renderDashboard();
  } else {
    alert("Invalid credentials");
  }
}

// Handle Signup
function signup() {
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirmPassword").value;

  if (!name || !phone || !password || !confirm) {
    alert("Please fill in all fields");
    return;
  }

  if (password !== confirm) {
    alert("Passwords do not match");
    return;
  }

  if (localStorage.getItem(phone)) {
    alert("Account with this phone already exists");
    return;
  }

  const user = { name, phone, password, groups: [] };
  localStorage.setItem(phone, JSON.stringify(user));
  alert("Account created");
  renderLogin();
}

// Handle Logout
function logout() {
  currentUser = null;
  groups = [];
  renderLogin();
}

// Create a New Group
function createGroup() {
  const name = prompt("Enter group name:");
  if (name) {
    groups.push({ name, members: [] });
    saveGroups();
    renderDashboard();
  }
}

// Open a Group
function openGroup(index) {
  renderGroup(index);
}

// Add a Member to a Group
function addMember(groupIndex) {
  const name = prompt("Member name:");
  const phone = prompt("Member phone:");

  if (name && phone) {
    groups[groupIndex].members.push({ name, phone });
    saveGroups();
    renderGroup(groupIndex);
  }
}

// Remove Member from Group
function removeMember(groupIndex, memberIndex) {
  groups[groupIndex].members.splice(memberIndex, 1);
  saveGroups();
  renderGroup(groupIndex);
}

// Buzz All Members
function buzzAll(groupIndex) {
  const group = groups[groupIndex];
  socket.emit("buzz", { group: group.name });
  alert(`Buzz sent to all members of "${group.name}"`);
}

// Save Group Changes to localStorage
function saveGroups() {
  currentUser.groups = groups;
  localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
}

// Handle Incoming Buzz from Server
socket.on("buzz", () => {
  alert("🔔 Buzz received!");
  const audio = new Audio("buzz.mp3");
  audio.play().catch(() => console.log("Audio playback failed or skipped."));
});

// Initial Load
renderLogin();
