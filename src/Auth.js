import { useState } from "react";

import "./Auth.css";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

const handleSubmit = async () => {
    if (!email || !password) return setError("Please fill in all fields");
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Simple local auth store (replace with a real backend auth endpoint when ready)
      const users = JSON.parse(localStorage.getItem("intellio_users") || "{}");

      if (isLogin) {
        // Sign in
        const existingUser = users[email];
        if (!existingUser || existingUser.password !== password) {
          setError("Invalid email or password");
          setLoading(false);
          return;
        }
        localStorage.setItem("intellio_current_user", email);
        setMessage("Signed in successfully!");
        if (onAuthSuccess) onAuthSuccess(email);
      } else {
        // Sign up
        if (users[email]) {
          setError("An account with this email already exists");
          setLoading(false);
          return;
        }
        users[email] = { password };
        localStorage.setItem("intellio_users", JSON.stringify(users));
        localStorage.setItem("intellio_current_user", email);
        setMessage("Account created successfully!");
        if (onAuthSuccess) onAuthSuccess(email);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">✦</div>
        <h1 className="auth-title">Intellio AI</h1>
        <p className="auth-subtitle">{isLogin ? "Welcome back!" : "Create your account"}</p>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <div className="auth-field">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <div className="auth-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
        </button>

        <p className="auth-switch">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}>
            {isLogin ? " Sign Up" : " Sign In"}
          </span>
        </p>

        {/* Debug info — remove after fixing */}
        {/* <p style={{ fontSize:"10px", color:"#ccc", textAlign:"center", marginTop:"8px", wordBreak:"break-all" }}>
          {window.location.href}
        </p> */}
      </div>
    </div>
  );
}
