const app = document.getElementById('app');
const banner = document.getElementById('banner');

let currentUser = null;
let users = JSON.parse(localStorage.getItem('users') || '{}');

function saveUsers() {
  localStorage.setItem('users', JSON.stringify(users));
}

function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function showLogin() {
  banner.textContent = 'BUZU';
  app.innerHTML = `
    <h2>Login</h2>
    <div class="input-wrapper">
      <input id="loginPhone" placeholder="Phone Number">
    </div>
    <div class="input-wrapper">
      <input type="password" id="loginPass" placeholder="Password">
      <span class="eye-icon" onclick="togglePassword('loginPass')">👁️</span>
    </div>
    <button onclick="handleLogin()">Login</button>
    <p><a href="#" onclick="showSignup()">Sign Up</a></p>
  `;
}

function showSignup() {
  banner.textContent = 'BUZU';
  app.innerHTML = `
    <h2>Sign Up</h2>
    <input id="signupName" placeholder="Name">
    <input id="signupPhone" placeholder="Phone Number">
    <div class="input-wrapper">
      <input type="password" id="signupPass" placeholder="Password">
      <span class="eye-icon" onclick="togglePassword('signupPass')">👁️</span>
    </div>
    <div class="input-wrapper">
      <input type="password" id="signupConfirm" placeholder="Confirm Password">
      <span class="eye-icon" onclick="togglePassword('signupConfirm')">👁️</span>
    </div>
    <button onclick="handleSignup()">Sign Up</button>
    <p><a href="#" onclick="showLogin()">Back to Login</a></p>
  `;
}

function handleSignup() {
  const name = document.getElementById('signupName').value;
  const phone = document.getElementById('signupPhone').value;
  const pass = document.getElementById('signupPass').value;
  const confirm = document.getElementById('signupConfirm').value;

  if (users[phone]) return alert('User already exists');
  if (pass !== confirm) return alert('Passwords do not match');

  users[phone] = { name, phone, pass, groups: [] };
  saveUsers();
  alert('Signed up!');
  showLogin();
}

function handleLogin() {
  const phone = document.getElementById('loginPhone').value;
  const pass = document.getElementById('loginPass').value;

  const user = users[phone];
  if (!user || user.pass !== pass) return alert('Invalid login');

  currentUser = user;
  showDashboard();
}

function showDashboard() {
  banner.textContent = `Welcome, ${currentUser.name}`;
  app.innerHTML = `
    <button onclick="createGroup()">Create Group</button>
    <div id="groupList">${renderGroups()}</div>
    <button onclick="logout()">Logout</button>
  `;
}

function renderGroups() {
  return currentUser.groups.map((g, i) => `
    <div>
      <strong>${g.name}</strong>
      <button onclick="openGroup(${i})">Open</button>
    </div>
  `).join('');
}

function createGroup() {
  const name = prompt('Group name?');
  if (!name) return;
  currentUser.groups.push({ name, members: [] });
  saveUsers();
  showDashboard();
}

function openGroup(index) {
  const group = currentUser.groups[index];
  banner.textContent = `Group: ${group.name}`;
  app.innerHTML = `
    <button onclick="editGroupName(${index})">Edit Group Name</button>
    <button onclick="addMember(${index})">Add Member</button>
    <button onclick="buzzAll(${index})">Buzz All</button>
    <div>${group.members.map((m, i) => `
      <div>
        ${m.name} (${m.phone})
        <button onclick="removeMember(${index}, ${i})">Remove</button>
      </div>
    `).join('')}</div>
    <button onclick="showDashboard()">Back to Groups</button>
  `;
}

function editGroupName(index) {
  const newName = prompt('New group name?');
  if (newName) {
    currentUser.groups[index].name = newName;
    saveUsers();
    openGroup(index);
  }
}

function addMember(index) {
  const name = prompt('Member name?');
  const phone = prompt('Member phone?');
  if (name && phone) {
    currentUser.groups[index].members.push({ name, phone });
    saveUsers();
    openGroup(index);
  }
}

function removeMember(groupIdx, memberIdx) {
  currentUser.groups[groupIdx].members.splice(memberIdx, 1);
  saveUsers();
  openGroup(groupIdx);
}

function buzzAll(index) {
  const sound = document.getElementById('buzz-sound');
  sound.play();
  alert(`Buzz sent to ${currentUser.groups[index].members.length} members!`);
}

function logout() {
  currentUser = null;
  showLogin();
}

showLogin();
