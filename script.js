const app = document.getElementById("app");
let currentUser = null;
let groups = [];
const socket = io('https://buzu-production-d070.up.railway.app/#'); // Railway backend URL

// ====================== CORE APP FUNCTIONS ====================== //

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
  socket.emit('joinGroup', { groupId: group.name, phone: currentUser.phone });

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

// ====================== AUTH FUNCTIONS ====================== //

function login() {
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  const user = JSON.parse(localStorage.getItem(phone));

  if (user && user.password === password) {
    currentUser = user;
    groups = user.groups || [];
    initSocketConnection();
    renderDashboard();
  } else {
    alert("Invalid credentials");
  }
}

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

function logout() {
  socket.disconnect();
  currentUser = null;
  groups = [];
  renderLogin();
}

// ====================== GROUP MANAGEMENT ====================== //

function createGroup() {
  const name = prompt("Enter group name:");
  if (name && name.trim() !== "") {
    const newGroup = { 
      id: Date.now().toString(),
      name: name.trim(), 
      members: [{ 
        name: currentUser.name, 
        phone: currentUser.phone 
      }] 
    };
    groups.push(newGroup);
    saveGroups();
    renderDashboard();
  }
}

function addMember(groupIndex) {
  const name = prompt("Enter member's name:");
  const phone = prompt("Enter member's phone number:");

  if (name && phone) {
    groups[groupIndex].members.push({ name, phone });
    saveGroups();
    renderGroup(groupIndex);
  }
}

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

function editGroup(groupIndex) {
  const newName = prompt("Enter new group name:", groups[groupIndex].name);
  if (newName && newName.trim() !== "") {
    groups[groupIndex].name = newName.trim();
    saveGroups();
    renderDashboard();
  }
}

function removeGroup(groupIndex) {
  if (confirm(`Delete group "${groups[groupIndex].name}"?`)) {
    groups.splice(groupIndex, 1);
    saveGroups();
    renderDashboard();
  }
}

function saveGroups() {
  if (currentUser) {
    currentUser.groups = groups;
    localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
  }
}

// ====================== BUZZ SYSTEM ====================== //

const buzzAudio = document.getElementById('buzz-audio');

function initAudio() {
  if (buzzAudio) {
    buzzAudio.volume = 1.0;
    buzzAudio.load();
    
    const unlockAudio = () => {
      buzzAudio.muted = false;
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
  }
}

function playBuzz() {
  if (!buzzAudio) return;
  
  buzzAudio.currentTime = 0;
  buzzAudio.play().catch(err => {
    console.warn("Buzz blocked, retrying...", err);
    buzzAudio.muted = false;
    buzzAudio.play().catch(e => console.error("Final buzz failed:", e));
  });
}

function buzzAll(groupIndex) {
  const group = groups[groupIndex];
  if (!group || group.members.length === 0) {
    alert("Cannot buzz an empty group.");
    return;
  }

  playBuzz(); // Local feedback
  socket.emit("buzz-group", { 
    groupId: group.id,
    sender: currentUser.phone 
  });
}

function showBuzzNotification(sender) {
  const notification = document.createElement('div');
  notification.className = 'buzz-notification';
  notification.textContent = `${sender} buzzed the group!`;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

// ====================== SOCKET HANDLERS ====================== //

function initSocketConnection() {
  socket.on("connect", () => {
    console.log("Socket connected");
  });

  socket.on("buzz-group", (data) => {
    if (data.sender !== currentUser.phone) {
      playBuzz();
      showBuzzNotification(data.sender);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });
}

// ====================== INITIALIZATION ====================== //

initAudio();
renderLogin();
