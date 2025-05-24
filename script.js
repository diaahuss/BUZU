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
  if (!name) {
    alert("Group name cannot be empty");
    return;
  }

  // Check if group name already exists
  if (groups.some(group => group.name.toLowerCase() === name.toLowerCase())) {
    alert("A group with this name already exists");
    return;
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
  showNotification(`Group "${name}" created successfully!`);
}

function addMember(groupIndex) {
  const name = prompt("Member name:")?.trim();
  if (!name) {
    alert("Member name cannot be empty");
    return;
  }

  let phone = prompt("Phone number:")?.trim();
  if (!phone) {
    alert("Phone number cannot be empty");
    return;
  }

  // Basic phone number validation
  if (!/^\d{10,15}$/.test(phone)) {
    alert("Please enter a valid phone number (10-15 digits)");
    return;
  }

  // Check if member already exists in group
  const group = groups[groupIndex];
  if (group.members.some(member => member.phone === phone)) {
    alert("This member is already in the group");
    return;
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
    alert("Cannot remove the last member from a group");
    return;
  }

  // Prevent removing yourself if you're the admin
  if (member.phone === currentUser.phone && member.isAdmin) {
    if (!confirm("You're the admin. Removing yourself will delete the group. Continue?")) {
      return;
    }
    removeGroup(groupIndex);
    return;
  }

  if (!confirm(`Remove ${member.name} from ${group.name}?`)) return;
  
  group.members.splice(memberIndex, 1);
  saveGroups();
  renderGroup(groupIndex);
  showNotification(`Removed ${member.name} from ${group.name}`);
}

function editGroup(groupIndex) {
  const group = groups[groupIndex];
  const newName = prompt("New name:", group.name)?.trim();
  
  if (!newName) {
    alert("Group name cannot be empty");
    return;
  }

  if (newName === group.name) return; // No change

  // Check if new name already exists
  if (groups.some((g, i) => i !== groupIndex && g.name.toLowerCase() === newName.toLowerCase())) {
    alert("A group with this name already exists");
    return;
  }

  group.name = newName;
  saveGroups();
  renderDashboard();
  showNotification(`Group renamed to "${newName}"`);
}

function removeGroup(groupIndex) {
  const groupName = groups[groupIndex].name;
  if (!confirm(`Are you sure you want to delete "${groupName}"? This cannot be undone.`)) return;
  
  groups.splice(groupIndex, 1);
  saveGroups();
  renderDashboard();
  showNotification(`Group "${groupName}" has been deleted`);
}

function saveGroups() {
  try {
    currentUser.groups = groups;
    localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
  } catch (error) {
    console.error("Error saving groups:", error);
    alert("Failed to save groups. Please try again.");
  }
}

// Helper function for notifications
function showNotification(message, duration = 3000) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, duration);
}

// ====================== BUZZ SYSTEM ====================== //
const buzzAudio = new Audio('buzz-sound.mp3'); // Ensure this file exists
let isBuzzCooldown = false;

function playBuzzSound() {
  try {
    // Reset audio to start and play
    buzzAudio.currentTime = 0;
    buzzAudio.play().catch(error => {
      console.warn("Audio playback failed:", error);
      // Fallback to vibration if available
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]); // More distinct pattern
      }
    });
  } catch (error) {
    console.error("Error playing buzz sound:", error);
    // Final fallback - visual alert
    flashScreen();
  }
}

function flashScreen() {
  document.body.style.backgroundColor = '#ff0000';
  setTimeout(() => {
    document.body.style.backgroundColor = '';
  }, 100);
}

function buzzAll(groupIndex) {
  if (isBuzzCooldown) {
    showBuzzAlert("Please wait before buzzing again", true);
    return;
  }

  const group = groups[groupIndex];
  if (!group?.members || group.members.length === 0) {
    showBuzzAlert("Invalid group or no members", true);
    return;
  }

  // Play local sound immediately for better UX
  playBuzzSound();
  
  // Set cooldown (3 seconds)
  isBuzzCooldown = true;
  setTimeout(() => { isBuzzCooldown = false; }, 3000);

  // Send to server
  socket.emit("buzz", { 
    groupId: group.name,
    sender: currentUser.phone,
    senderName: currentUser.name,
    timestamp: Date.now(),
    members: group.members.map(m => m.phone) // Send member list for server validation
  }, (response) => {
    if (response?.error) {
      showBuzzAlert(`Failed to buzz: ${response.error}`, true);
    } else {
      showBuzzAlert(`✓ Buzz sent to ${group.name} (${group.members.length} members)`);
      logBuzzActivity(group.name, group.members.length);
    }
  });
}

function showBuzzAlert(message, isError = false) {
  // Remove any existing alerts first
  document.querySelectorAll('.buzz-alert').forEach(el => el.remove());
  
  const alert = document.createElement('div');
  alert.className = `buzz-alert ${isError ? 'error' : 'success'}`;
  alert.innerHTML = `
    <span class="buzz-icon">${isError ? '⚠️' : '🔔'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 500);
  }, isError ? 3000 : 2000);
}

function logBuzzActivity(groupName, memberCount) {
  console.log(`[${new Date().toISOString()}] Buzz sent to ${groupName} (${memberCount} members)`);
  // You could also send this to analytics or save locally
}

// ====================== SOCKET HANDLERS ====================== //
function initSocketConnection() {
  if (!socket) {
    console.error("Socket not initialized");
    return;
  }

  // Connection established
  socket.on("connect", () => {
    console.log("Socket connected");
    if (!currentUser?.phone) {
      console.warn("No current user for socket auth");
      return;
    }
    
    // Authenticate with server
    socket.emit('authenticate', { 
      userId: currentUser.phone,
      token: generateAuthToken() // Implement this if needed
    }, (authResponse) => {
      if (authResponse?.error) {
        console.error("Authentication failed:", authResponse.error);
      }
    });
    
    // Rejoin current group if needed
    if (currentGroupId) {
      joinGroupRoom(currentGroupId);
    }
  });

  // Handle incoming buzz
  socket.on("buzz", (data) => {
    if (!data?.sender || data.sender === currentUser.phone) return;
    
    try {
      playBuzzSound();
      showBuzzAlert(`${data.senderName || "Someone"} buzzed the group!`);
      
      // Visual feedback
      highlightGroup(data.groupId);
    } catch (error) {
      console.error("Error handling buzz:", error);
    }
  });

  // Handle connection errors
  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    showBuzzAlert("Connection problem - reconnecting...", true);
  });

  // Auto-reconnect
  socket.on("disconnect", (reason) => {
    console.log("Disconnected:", reason);
    if (reason === "io server disconnect") {
      // Manual reconnect needed
      socket.connect();
    }
    // Other disconnections will auto-reconnect
  });
}

function joinGroupRoom(groupId) {
  if (!socket.connected) return;
  
  socket.emit('join_group', {
    userId: currentUser.phone,
    groupId: groupId,
    timestamp: Date.now()
  }, (response) => {
    if (response?.error) {
      console.error("Failed to join group:", response.error);
    }
  });
}

function highlightGroup(groupName) {
  const groupElement = document.querySelector(`[data-group-name="${groupName}"]`);
  if (groupElement) {
    groupElement.classList.add('buzz-highlight');
    setTimeout(() => {
      groupElement.classList.remove('buzz-highlight');
    }, 2000);
  }
}

// ====================== INITIALIZATION ====================== //
document.addEventListener('DOMContentLoaded', () => {
  try {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      groups = currentUser.groups || [];
      
      // Initialize systems
      initAudio();
      initSocketConnection();
      
      // Check if we need to reconnect to a specific group
      const lastGroup = sessionStorage.getItem('lastActiveGroup');
      if (lastGroup) {
        currentGroupId = lastGroup;
      }
      
      renderDashboard();
    } else {
      renderLogin();
    }
  } catch (error) {
    console.error("Initialization error:", error);
    showBuzzAlert("System error - please refresh", true);
    renderLogin(); // Fallback to login screen
  }
});
