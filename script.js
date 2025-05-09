const app = document.getElementById("app");
let currentUser = null;
let groups = [];
const socket = io('https://buzu-production-d070.up.railway.app/#'); // Railway backend URL
let buzzAudio; // Declare audio variable (only once)

// ====================== RENDER FUNCTIONS ====================== //

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
  socket.emit('joinGroup', { groupId: group.name, phone: currentUser.phone });

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
    initAudio();
    renderDashboard();
    localStorage.setItem('currentUser', JSON.stringify(user));
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
  localStorage.removeItem('currentUser');
  renderLogin();
}

// ====================== GROUP FUNCTIONS ====================== //

function createGroup() {
  const name = prompt("Enter group name:");
  if (name && name.trim() !== "") {
    groups.push({ 
      name: name.trim(), 
      members: [{ 
        name: currentUser.name, 
        phone: currentUser.phone 
      }] 
    });
    saveGroups();
    renderDashboard();
  }
}

function openGroup(index) {
  renderGroup(index);
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
  if (confirm(`Are you sure you want to delete the group "${groups[groupIndex].name}"?`)) {
    groups.splice(groupIndex, 1);
    saveGroups();
    renderDashboard();
  }
}

function saveGroups() {
  currentUser.groups = groups;
  localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
}

// ====================== BUZZ SYSTEM ====================== //

function initAudio() {
  // Initialize audio only once
  if (!buzzAudio) {
    buzzAudio = new Audio('buzz.mp3'); // Using your actual file name
    buzzAudio.preload = 'auto';
    buzzAudio.volume = 0.5;
    
    // Unlock audio on first click
    document.addEventListener('click', function handleFirstClick() {
      buzzAudio.play().then(() => buzzAudio.pause())
        .catch(e => console.log("Audio init error:", e));
      document.removeEventListener('click', handleFirstClick);
    }, { once: true });
  }
}

function playBuzzSound() {
  if (!buzzAudio) return;
  
  try {
    buzzAudio.currentTime = 0;
    buzzAudio.play().catch(e => {
      console.log("Sound blocked, trying vibration");
      if (navigator.vibrate) navigator.vibrate(200);
    });
  } catch (e) {
    console.error("Sound error:", e);
  }
}

function buzzAll(groupIndex) {
  const group = groups[groupIndex];
  if (!group || group.members.length === 0) {
    alert("Cannot buzz - group has no members!");
    return;
  }

  // Play sound first
  playBuzzSound();

  // Then send to server
  socket.emit("buzz", { 
    groupId: group.name,
    sender: currentUser.phone,
    senderName: currentUser.name
  });

  alert(`Buzz sent to ${group.name}!`);
}

// ====================== SOCKET HANDLERS ====================== //

function initSocketConnection() {
  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("buzz", (data) => {
    if (data.sender !== currentUser.phone) {
      alert(`${data.senderName} buzzed the group!`);
      playBuzzSound();
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });
}

// ====================== INITIALIZATION ====================== //

document.addEventListener('DOMContentLoaded', function() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    groups = currentUser.groups || [];
    initSocketConnection();
    initAudio();
    renderDashboard();
  } else {
    renderLogin();
  }
});
