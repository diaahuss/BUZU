const app = document.getElementById('app');
let currentUser = null;

function saveUsers(users) {
  localStorage.setItem('buzu_users', JSON.stringify(users));
}

function getUsers() {
  return JSON.parse(localStorage.getItem('buzu_users')) || [];
}

function showLogin() {
  app.innerHTML = `
    <div class="banner">BUZU</div>
    <input type="tel" id="login-phone" placeholder="Phone number" />
    <input type="password" id="login-password" placeholder="Password" />
    <div class="password-toggle">
      <input type="checkbox" id="toggle-login-password" />
    </div>
    <button onclick="handleLogin()">Login</button>
    <div class="link-row">
      <a href="#" onclick="showSignup()">Create an account</a>
      <a href="#">Forgot your password?</a>
    </div>
  `;

  document.getElementById('toggle-login-password').addEventListener('change', (e) => {
    document.getElementById('login-password').type = e.target.checked ? 'text' : 'password';
  });
}

function showSignup() {
  app.innerHTML = `
    <div class="banner">Create an Account</div>
    <input type="text" id="signup-name" placeholder="Your Name" />
    <input type="tel" id="signup-phone" placeholder="Phone number" />
    <input type="password" id="signup-password" placeholder="Password" />
    <input type="password" id="signup-confirm" placeholder="Confirm Password" />
    <div class="password-toggle">
      <input type="checkbox" id="toggle-signup-password" />
    </div>
    <button onclick="handleSignup()">Sign Up</button>
    <div class="link-row">
      <a href="#" onclick="showLogin()">Back to Login</a>
    </div>
  `;

  document.getElementById('toggle-signup-password').addEventListener('change', (e) => {
    const type = e.target.checked ? 'text' : 'password';
    document.getElementById('signup-password').type = type;
    document.getElementById('signup-confirm').type = type;
  });
}

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;

  if (!name || !phone || !password || !confirm) {
    alert('Please fill out all fields.');
    return;
  }

  if (password !== confirm) {
    alert('Passwords do not match.');
    return;
  }

  const users = getUsers();
  if (users.some(u => u.phone === phone)) {
    alert('Account already exists.');
    return;
  }

  users.push({ name, phone, password, groups: [] });
  saveUsers(users);
  alert('Signup successful!');
  showLogin();
}

function handleLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const password = document.getElementById('login-password').value;

  const users = getUsers();
  const user = users.find(u => u.phone === phone && u.password === password);

  if (!user) {
    alert('Invalid phone or password.');
    return;
  }

  currentUser = user;
  showMyGroups();
}

function showMyGroups() {
  app.innerHTML = `
    <div class="banner">My Groups</div>
    <button onclick="createGroup()">Create Group</button>
    <button onclick="logout()">Logout</button>
    <div id="group-list"></div>
  `;

  renderGroupList();
}

function renderGroupList() {
  const container = document.getElementById('group-list');
  container.innerHTML = '';
  currentUser.groups.forEach((group, index) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-box';
    groupDiv.innerHTML = `
      ${group.name}
      <span class="arrow-right" onclick="openGroup(${index})">&gt;</span>
    `;
    container.appendChild(groupDiv);
  });
}

function createGroup() {
  const name = prompt('Enter group name:');
  if (!name) return;

  currentUser.groups.push({ name, members: [] });
  updateCurrentUser();
  renderGroupList();
}

function openGroup(index) {
  const group = currentUser.groups[index];
  app.innerHTML = `
    <div class="banner">
      <span class="arrow-left" onclick="showMyGroups()">&lt;</span>
      ${group.name}
    </div>
    <button onclick="editGroupName(${index})">Edit Name</button>
    <button onclick="removeGroup(${index})">Remove Group</button>
    <button onclick="addMember(${index})">Add Member</button>
    <button onclick="buzzAll(${index})">Buzz All</button>
    <div class="members-list" id="members"></div>
  `;

  renderMembers(index);
}

function editGroupName(index) {
  const newName = prompt('Enter new group name:');
  if (!newName) return;
  currentUser.groups[index].name = newName;
  updateCurrentUser();
  openGroup(index);
}

function removeGroup(index) {
  if (confirm('Remove this group?')) {
    currentUser.groups.splice(index, 1);
    updateCurrentUser();
    showMyGroups();
  }
}

function renderMembers(groupIndex) {
  const group = currentUser.groups[groupIndex];
  const container = document.getElementById('members');
  container.innerHTML = '';

  group.members.forEach((member, i) => {
    const div = document.createElement('div');
    div.className = 'member-item';
    div.innerHTML = `
      <span>${member.name} (${member.phone})</span>
      <span class="member-remove" onclick="removeMember(${groupIndex}, ${i})">X</span>
    `;
    container.appendChild(div);
  });
}

function addMember(groupIndex) {
  const name = prompt('Member name:');
  const phone = prompt('Phone number:');
  if (!name || !phone) return;

  currentUser.groups[groupIndex].members.push({ name, phone });
  updateCurrentUser();
  renderMembers(groupIndex);
}

function removeMember(groupIndex, memberIndex) {
  currentUser.groups[groupIndex].members.splice(memberIndex, 1);
  updateCurrentUser();
  renderMembers(groupIndex);
}

function buzzAll(groupIndex) {
  alert(`Buzz sent to all members of "${currentUser.groups[groupIndex].name}"`);
}

function logout() {
  currentUser = null;
  showLogin();
}

function updateCurrentUser() {
  const users = getUsers();
  const index = users.findIndex(u => u.phone === currentUser.phone);
  if (index !== -1) {
    users[index] = currentUser;
    saveUsers(users);
  }
}

showLogin();
