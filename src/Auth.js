import { useState } from "react";
import "./Auth.css";
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    localStorage.setItem("intellio_current_user", email);
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">✦</div>
        <h1 className="auth-title">Intellio AI</h1>
        <p className="auth-subtitle">{isLogin ? "Welcome back!" : "Create your account"}</p>
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
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? " Sign Up" : " Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}
