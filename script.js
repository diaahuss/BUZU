body {
  margin: 0;
  padding: 0;
  font-family: sans-serif;
  background: #f0f8ff;
  display: flex;
  justify-content: center;
  align-items: start;
  min-height: 100vh;
}

#app {
  width: 600px;
  margin-top: 40px;
  text-align: center;
}

.banner {
  background: #007acc;
  color: white;
  padding: 20px;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  border-radius: 10px;
}

input[type="text"],
input[type="password"],
input[type="tel"] {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  box-sizing: border-box;
  font-size: 16px;
  border-radius: 8px;
  border: 1px solid #ccc;
}

button {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  font-size: 16px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

.password-toggle {
  text-align: center;
  margin-bottom: 10px;
}

.link-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-top: 10px;
}

.link-row a {
  text-decoration: none;
  color: #007acc;
}

.group-box {
  background: white;
  border: 1px solid #ccc;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 10px 0;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.arrow-right,
.arrow-left {
  cursor: pointer;
  font-size: 20px;
  color: #007acc;
}

.member-item {
  background: #fff;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
  margin: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-remove {
  color: black;
  cursor: pointer;
  font-weight: bold;
}
