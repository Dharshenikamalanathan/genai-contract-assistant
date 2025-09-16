import React, { useState } from "react";

function Login({ setToken }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      // Always trim whitespace to avoid mismatch
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await res.json();
      console.log("✅ Login success, token:", data.token); // Debug log

      // Save token to state + localStorage
      setToken(data.token);
      localStorage.setItem("token", data.token);

      // Clear error on success
      setError("");
    } catch (err) {
      console.error("❌ Login failed:", err.message); // Debug log
      setError("❌ Login failed: Invalid username or password");
    }
  };

  return (
    <div className="container">
      <h1>🔐 Login</h1>

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br />

      <button onClick={handleLogin}>Login</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default Login;
