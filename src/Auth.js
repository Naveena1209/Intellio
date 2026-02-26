import { useState } from "react";
import { supabase } from "./supabase";
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
      // ✅ Debug — check what URL supabase is using
      console.log("Supabase URL:", supabase.supabaseUrl);

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log("Login response:", data, error);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        console.log("Signup response:", data, error);
        if (error) throw error;
        setMessage("Check your email to confirm your account!");
      }
    } catch (err) {
      console.error("Auth error:", err);
      // Show exact error on screen for mobile debugging
      setError(err.message);
    }

    setLoading(false);
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