const app = document.getElementById("app");

let currentUser = null;
let groups = [];

const socket = io('https://buzu-production-d070.up.railway.app/#'); // replace with your actual Railway backend URL

// Render Login Screen
function renderLogin() {
  app.innerHTML = `
    <div class="banner">BUZU</div>
    <input type="text" id="phone" placeholder="Phone Number" />
    <input type="password" id="password" placeholder="Password" />
    <input type="checkbox" id="showPass" title="Show Password">
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

// Render Main Dashboard
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
    <h3>Members:</h3>
    ${group.members.map((m, i) => `
      <div class="member-item">
        ${m.name} (${m.phone})
        <span class="remove-x" onclick="event.stopPropagation(); removeMember(${index}, ${i})">×</span>
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
  if (name && name.trim() !== "") {
    groups.push({ name: name.trim(), members: [] });
    saveGroups();
    renderDashboard();
  } else {
    alert("Group name cannot be empty.");
  }
}

// Open a Group
function openGroup(index) {
  renderGroup(index);
}

// Add a Member to a Group
function addMember(groupIndex) {
  const name = prompt("Enter member's name:");
  const phone = prompt("Enter member's phone number:");

  if (name && phone) {
    groups[groupIndex].members.push({ name, phone });
    saveGroups();
    renderGroup(groupIndex);
  } else {
    alert("Both name and phone are required to add a member.");
  }
}

// Remove a Member from a Group
function removeMember(groupIndex, memberIndex) {
  const group = groups[groupIndex];
  if (group.members.length > 1) {
    group.members.splice(memberIndex, 1);
    saveGroups();
    renderGroup(groupIndex);
  } else {
    alert("Cannot remove the last member from a group.");
  }
}

// Edit Group Name
function editGroup(groupIndex) {
  const newName = prompt("Enter new group name:", groups[groupIndex].name);
  if (newName && newName.trim() !== "") {
    groups[groupIndex].name = newName.trim();
    saveGroups();
    renderDashboard();
  } else {
    alert("Group name cannot be empty.");
  }
}

// Remove a Group
function removeGroup(groupIndex) {
  if (confirm(`Are you sure you want to delete the group "${groups[groupIndex].name}"?`)) {
    groups.splice(groupIndex, 1);
    saveGroups();
    renderDashboard();
  }
}

// ====================== BUZZ SYSTEM ====================== //
const buzzAudio = document.getElementById('buzz-audio');

// 1. Audio Initialization (Preload + Unlock)
function initAudio() {
  if (buzzAudio) {
    buzzAudio.volume = 1.0;
    buzzAudio.load(); // Force preload
    
    // One-time unlock
    const unlockAudio = () => {
      buzzAudio.muted = false;
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio, { once: true });
  }
}

// 2. Play Buzz Locally (with error handling)
function playBuzz() {
  if (!buzzAudio) return;
  
  buzzAudio.currentTime = 0;
  buzzAudio.play().catch(err => {
    console.warn("Buzz blocked, retrying...", err);
    buzzAudio.muted = false;
    buzzAudio.play().catch(e => console.error("Final buzz failed:", e));
  });
}

// 3. Group Buzzing System
function buzzAll(groupIndex) {
  const group = groups[groupIndex];
  
  if (!group || group.members.length === 0) {
    alert("Cannot buzz an empty group.");
    return;
  }

  // Play local feedback immediately
  playBuzz();
  
  // Send to server (broadcast to group)
  socket.emit("buzz-group", { 
    groupId: group.id,
    sender: currentUser.phone 
  });
}

// 4. Handle Incoming Buzzes
socket.on("buzz-group", (data) => {
  if (data.sender !== currentUser.phone) { // Don't play our own buzz twice
    playBuzz();
    showBuzzNotification(data.sender); // Optional UI feedback
  }
});

// 5. Initialize on load
initAudio();
renderLogin();
