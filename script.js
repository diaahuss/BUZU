// script.js
const app = document.getElementById("app");
let users = JSON.parse(localStorage.getItem("users") || "[]");
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
let groups = JSON.parse(localStorage.getItem("groups") || "[]");

if (currentUser) renderDashboard();
else renderLogin();

function save() {
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  localStorage.setItem("groups", JSON.stringify(groups));
}

function renderLogin() {
  app.innerHTML = `
    <div class="banner">BUZU</div>
    <input type="text" id="phone" placeholder="Phone Number" />
    <input type="password" id="password" placeholder="Password" />
    <label><input type="checkbox" id="showPass"></label>
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
    <label><input type="checkbox" id="showSignupPass"></label>
    <button onclick="signup()">Sign Up</button>
    <div class="link-row"><a href="#" onclick="renderLogin()">← Back to Login</a></div>
  `;
  document.getElementById("showSignupPass").addEventListener("change", (e) => {
    const type = e.target.checked ? "text" : "password";
    document.getElementById("password").type = type;
    document.getElementById("confirmPassword").type = type;
  });
}

function login() {
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  const user = users.find(u => u.phone === phone && u.password === password);
  if (!user) return alert("Invalid login");
  currentUser = user;
  save();
  renderDashboard();
}

function signup() {
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  if (!name || !phone || !password || password !== confirmPassword) return alert("Please complete form correctly.");
  users.push({ name, phone, password });
  save();
  alert("Account created!");
  renderLogin();
}

function renderDashboard() {
  app.innerHTML = `
    <div class="banner">Welcome, ${currentUser.name}</div>
    <button onclick="createGroup()">Create Group</button>
    <button onclick="logout()">Logout</button>
    ${groups.map((group, i) => `
      <div class="group-box" onclick="openGroup(${i})">
        ${group.name} <span class="arrow-right">→</span>
      </div>
    `).join("")}
  `;
}

function createGroup() {
  const name = prompt("Group name:");
  if (!name) return;
  groups.push({ name, members: [] });
  save();
  renderDashboard();
}

function openGroup(index) {
  renderGroup(index);
}

function renderGroup(index) {
  const group = groups[index];
  app.innerHTML = `
    <div class="banner">
      <span class="arrow-back" onclick="renderDashboard()">←</span> ${group.name}
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

function addMember(index) {
  const name = prompt("Member name:");
  const phone = prompt("Phone number:");
  if (!name || !phone) return;
  groups[index].members.push({ name, phone });
  save();
  renderGroup(index);
}

function removeMember(groupIndex, memberIndex) {
  groups[groupIndex].members.splice(memberIndex, 1);
  save();
  renderGroup(groupIndex);
}

function buzzAll(index) {
  alert("Buzz sent to all members in " + groups[index].name);
}

function logout() {
  currentUser = null;
  save();
  renderLogin();
}
