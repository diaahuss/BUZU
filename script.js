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

/**
 * Creates a new group with the current user as the first member
 * @returns {void}
 */
function createGroup() {
  const name = prompt("Enter group name:");
  if (!name || name.trim() === "") {
    alert("Group name cannot be empty!");
    return;
  }

  const trimmedName = name.trim();
  
  // Check if group name already exists
  if (groups.some(group => group.name === trimmedName)) {
    alert(`A group named "${trimmedName}" already exists!`);
    return;
  }

  const newGroup = { 
    id: generateGroupId(),
    name: trimmedName, 
    members: [{ 
      name: currentUser.name, 
      phone: currentUser.phone,
      isAdmin: true 
    }],
    createdAt: new Date().toISOString()
  };
  
  groups.push(newGroup);
  saveGroups();
  renderDashboard();
  alert(`Group "${trimmedName}" created successfully!`);
}

/**
 * Adds a new member to the specified group
 * @param {number} groupIndex - Index of the group in the groups array
 * @returns {void}
 */
function addMember(groupIndex) {
  const group = groups[groupIndex];
  if (!group) {
    alert("Group not found!");
    return;
  }

  const name = prompt("Enter member's name:");
  if (!name || name.trim() === "") {
    alert("Member name cannot be empty!");
    return;
  }

  const phone = prompt("Enter member's phone number:");
  if (!validatePhoneNumber(phone)) {
    alert("Invalid phone number format!");
    return;
  }

  // Check if member already exists in group
  if (group.members.some(member => member.phone === phone)) {
    alert("This member already exists in the group!");
    return;
  }

  group.members.push({ 
    name: name.trim(), 
    phone: phone,
    isAdmin: false 
  });
  
  saveGroups();
  renderGroup(groupIndex);
  alert(`Member ${name.trim()} added successfully!`);
}

/**
 * Removes a member from the specified group
 * @param {number} groupIndex - Index of the group
 * @param {number} memberIndex - Index of the member in the group's members array
 * @returns {void}
 */
function removeMember(groupIndex, memberIndex) {
  const group = groups[groupIndex];
  if (!group) {
    alert("Group not found!");
    return;
  }

  if (memberIndex < 0 || memberIndex >= group.members.length) {
    alert("Invalid member index!");
    return;
  }

  const member = group.members[memberIndex];
  
  // Prevent removing last member
  if (group.members.length <= 1) {
    alert("Cannot remove the last member from a group!");
    return;
  }

  // Prevent removing admin unless it's the current user
  if (member.isAdmin && member.phone !== currentUser.phone) {
    alert("Cannot remove another admin member!");
    return;
  }

  if (confirm(`Remove member "${member.name}" from group "${group.name}"?`)) {
    group.members.splice(memberIndex, 1);
    saveGroups();
    renderGroup(groupIndex);
  }
}

/**
 * Edits the name of the specified group
 * @param {number} groupIndex - Index of the group
 * @returns {void}
 */
function editGroup(groupIndex) {
  const group = groups[groupIndex];
  if (!group) {
    alert("Group not found!");
    return;
  }

  const newName = prompt("Enter new group name:", group.name);
  if (!newName || newName.trim() === "") {
    alert("Group name cannot be empty!");
    return;
  }

  const trimmedName = newName.trim();
  if (trimmedName === group.name) return; // No change

  // Check if new name already exists
  if (groups.some(g => g.name === trimmedName && g.id !== group.id)) {
    alert(`A group named "${trimmedName}" already exists!`);
    return;
  }

  group.name = trimmedName;
  saveGroups();
  renderDashboard();
}

/**
 * Deletes the specified group
 * @param {number} groupIndex - Index of the group
 * @returns {void}
 */
function removeGroup(groupIndex) {
  const group = groups[groupIndex];
  if (!group) {
    alert("Group not found!");
    return;
  }

  // Check if current user is admin of the group
  const isAdmin = group.members.some(
    member => member.phone === currentUser.phone && member.isAdmin
  );

  if (!isAdmin) {
    alert("Only group admins can delete the group!");
    return;
  }

  if (confirm(`Permanently delete group "${group.name}" and all its members?`)) {
    groups.splice(groupIndex, 1);
    saveGroups();
    renderDashboard();
  }
}

/**
 * Saves groups to localStorage
 * @returns {void}
 */
function saveGroups() {
  if (!currentUser) {
    console.error("No current user found!");
    return;
  }
  
  try {
    currentUser.groups = groups;
    localStorage.setItem(currentUser.phone, JSON.stringify(currentUser));
  } catch (error) {
    console.error("Failed to save groups:", error);
    alert("Failed to save groups. See console for details.");
  }
}

// Helper functions
function generateGroupId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function validatePhoneNumber(phone) {
  return phone && /^[0-9]{10,15}$/.test(phone);
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
