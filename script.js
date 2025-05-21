// ===== GLOBAL DECLARATIONS ===== //
const app = document.getElementById("app");
let currentUser = null;
let groups = [];
const socket = io('https://buzu-production-d070.up.railway.app'); // Railway URL

// Audio System
const buzzAudio = new Audio('buzz.mp3');
buzzAudio.preload = 'auto';
buzzAudio.volume = 0.6;

// Mobile audio unlock
document.addEventListener('click', () => {
  buzzAudio.play().then(() => buzzAudio.pause());
}, { once: true });

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
  // Unlock audio on first interaction
  const unlockAudio = () => {
    buzzAudio.play().then(() => buzzAudio.pause());
    document.removeEventListener('click', unlockAudio);
  };
  document.addEventListener('click', unlockAudio, { once: true });
}

function playBuzzSound() {
  try {
    buzzAudio.currentTime = 0;
    buzzAudio.play().catch(() => {
      // Vibrate if audio fails (mobile support)
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    });
  } catch (e) {
    console.error("Buzz sound error:", e);
  }
}

function buzzAll(groupIndex) {
  try {
    const group = groups[groupIndex];
    
    // Validation
    if (!group) {
      alert("Invalid group selection");
      return;
    }
    if (group.members.length === 0) {
      alert("Cannot buzz - group has no members!");
      return;
    }

    // 1. Immediate local feedback
    playBuzzSound();

    // 2. Network buzz with error handling
    socket.emit("buzz", { 
      groupId: group.name,
      sender: currentUser.phone,
      senderName: currentUser.name,
      timestamp: Date.now()
    }, (response) => {
      if (response?.error) {
        console.error("Buzz delivery failed:", response.error);
        showBuzzAlert("Buzz failed to send!", true);
      }
    });

    // 3. Visual feedback
    showBuzzAlert(`✓ Buzz sent to ${group.name}`);

  } catch (error) {
    console.error("Buzz error:", error);
    showBuzzAlert("Buzz failed!", true);
  }
}

// Helper function for alerts
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
    console.log("Connected to server with ID:", socket.id);
    
    if (currentUser && currentGroupId) {
      // Single authentication call
      socket.emit('authenticate', { 
        userId: currentUser.phone 
      });
      
      // Group joining with proper validation
      socket.emit('join_group', { 
        userId: currentUser.phone, 
        groupId: currentGroupId 
      }, (response) => {
        if (response?.error) {
          console.error("Join group failed:", response.error);
          showBuzzAlert("Failed to join group", true);
        } else {
          console.log("Successfully joined group:", currentGroupId);
        }
      });
    }
  });

  // Consolidated buzz handler (matches your buzzAll emission)
  socket.on("buzz", (data) => {
    try {
      // Validate incoming buzz data
      if (!data || !data.sender || !data.groupId) {
        throw new Error("Invalid buzz data structure");
      }
      
      // Only react to other users' buzzes
      if (data.sender !== currentUser?.phone) {
        playBuzzSound();
        showBuzzAlert(`${data.senderName || 'Someone'} buzzed!`);
      }
    } catch (error) {
      console.error("Buzz handling error:", error);
    }
  });

  // Connection management
  socket.on("disconnect", (reason) => {
    console.log("Disconnected:", reason);
    showBuzzAlert("Connection lost - reconnecting...", true);
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error.message);
    showBuzzAlert("Connection failed. Try refreshing.", true);
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
