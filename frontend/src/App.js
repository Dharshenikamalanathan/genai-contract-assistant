import React, { useState } from "react";
import Login from "./Login";
import MainApp from "./MainApp";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const handleLogout = () => {
    localStorage.removeItem("token"); // clear token
    setToken(null);
  };

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return <MainApp token={token} onLogout={handleLogout} />;
}

export default App;

