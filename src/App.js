import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";
import Auth from "./Auth";
import { supabase } from "./supabase";

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const getDate = () =>
  new Date().toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const suggestions = [
  "Explain quantum computing",
  "Write a Python function",
  "Generate image of a sunset",
  "Generate image of a futuristic city",
];

const IMAGE_KEYWORDS = [
  "generate image", "create image", "draw", "generate a picture",
  "show me a picture", "generate photo", "make an image",
  "create a photo", "paint", "illustrate", "generate a image",
  "create a image", "image of", "picture of", "photo of",
];

const BACKEND_URL = "https://naveenasenthil-intellio.hf.space";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [toast, setToast] = useState("");
  const [listening, setListening] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  const loadHistory = useCallback(async (uid) => {
    const { data, error } = await supabase
      .from("chats").select("*").eq("uid", uid)
      .order("created_at", { ascending: false });
    if (error) console.error("Load history error:", error);
    else setChatHistory(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (session?.user) loadHistory(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadHistory(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const saveChat = useCallback(async (msgs) => {
    if (!user || msgs.length === 0) return;
    const { data, error } = await supabase.from("chats").insert({
      uid: user.id,
      title: msgs[0]?.text?.slice(0, 40) || "New Chat",
      date: getDate(), messages: msgs, created_at: Date.now(),
    }).select();
    if (error) console.error("Save error:", error);
    else if (data) setChatHistory((prev) => [data[0], ...prev]);
  }, [user]);

  const deleteHistory = async (id, e) => {
    e.stopPropagation();
    await supabase.from("chats").delete().eq("id", id);
    setChatHistory((prev) => prev.filter((c) => c.id !== id));
    showToast("Deleted!");
  };

  const loadChat = (entry) => {
    setMessages(entry.messages);
    setSidebarOpen(false);
  };

  const clearChat = async () => {
    if (messages.length > 0) await saveChat(messages);
    setMessages([]);
    setSidebarOpen(false);
    showToast("Chat cleared & saved!");
  };

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Copied!");
  };

  const exportChat = () => {
    const content = messages
      .map((m) => `${m.role === "user" ? "You" : "Intellio AI"} [${m.time}]:\n${m.text || "[Image]"}\n`)
      .join("\n---\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "intellio-chat.txt"; a.click();
    showToast("Chat exported!");
    setSidebarOpen(false);
  };

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      showToast("Voice not supported"); return;
    }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start(); setListening(true);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: msg, time: getTime() }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const isImageRequest = IMAGE_KEYWORDS.some((kw) => msg.toLowerCase().includes(kw));

    if (isImageRequest) {
      setGeneratingImage(true);
      try {
        const response = await fetch(`${BACKEND_URL}/generate-image`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: msg }),
        });
        const data = await response.json();
        if (data.image) {
          setMessages((prev) => [...prev, {
            role: "bot", type: "image", image: data.image,
            text: `Here's your image for: "${msg}"`, time: getTime(),
          }]);
        } else throw new Error(data.error || "No image returned");
      } catch (error) {
        setMessages((prev) => [...prev, { role: "bot", text: "Could not generate image: " + error.message, time: getTime() }]);
      }
      setGeneratingImage(false);
    } else {
      try {
        const history = messages.map((m) => ({
          role: m.role === "user" ? "user" : "assistant", content: m.text,
        }));
        const response = await fetch(`${BACKEND_URL}/chat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...history, { role: "user", content: msg }] }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        const botText =
          data.choices?.[0]?.message?.content ||
          data.choices?.[0]?.text ||
          "Sorry, I couldn't respond.";
        setMessages((prev) => [...prev, { role: "bot", text: botText, time: getTime() }]);
      } catch (error) {
        setMessages((prev) => [...prev, { role: "bot", text: "Error: " + error.message, time: getTime() }]);
      }
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    showToast("Signed out!");
  };

  if (!authReady) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Outfit,sans-serif", color:"#999", fontSize:"15px" }}>
      Loading...
    </div>
  );

  if (!user) return <Auth />;

  return (
    <div className={`app ${darkMode ? "dark" : ""}`}>

      <div className={`overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* ── SIDEBAR ── full menu with all actions */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">💬 Intellio AI</span>
          <button className="icon-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        {/* User email */}
        <div className="sidebar-user">👤 {user.email}</div>

        <button className="new-chat-btn" onClick={clearChat}>+ New Chat</button>

        <div className="sidebar-body">
          {chatHistory.length === 0 ? (
            <div className="empty-history">No saved chats yet</div>
          ) : (
            chatHistory.map((entry) => (
              <div key={entry.id} className="history-item" onClick={() => loadChat(entry)}>
                <div className="history-item-title">{entry.title}</div>
                <div className="history-item-date">{entry.date}</div>
                <button
                  onClick={(e) => deleteHistory(entry.id, e)}
                  style={{ marginTop:"6px", fontSize:"11px", color:"#f87171", background:"none", border:"none", cursor:"pointer", fontFamily:"Outfit,sans-serif" }}
                >🗑 Delete</button>
              </div>
            ))
          )}
        </div>

        {/* All actions at bottom of sidebar */}
        <div className="sidebar-actions">
          <button className="sidebar-btn" onClick={exportChat}>⬇ Export Chat</button>
          <button className="sidebar-btn" onClick={() => { setDarkMode(!darkMode); setSidebarOpen(false); }}>
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          <button className="sidebar-btn danger" onClick={handleSignOut}>🚪 Sign Out</button>
        </div>
      </div>

      {/* ── HEADER — only 3 buttons on mobile ── */}
      <div className="header">
        <div className="header-left">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="Menu">☰</button>
          <div className="logo-icon">🤖</div>
          <div className="header-info">
            <div className="header-title">Intellio AI</div>
            <div className="header-subtitle">Chat · Image Generation</div>
          </div>
        </div>
        <div className="header-actions">
          {/* Desktop only */}
          <span className="header-email">{user.email}</span>
          <button className="icon-btn desktop-only" onClick={exportChat} title="Export">⬇</button>
          {/* Visible on all screens */}
          <button className="icon-btn" onClick={clearChat} title="Clear Chat">🗑</button>
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="Theme">
            {darkMode ? "☀️" : "🌙"}
          </button>
          {/* Desktop only */}
          <button className="icon-btn desktop-only" onClick={handleSignOut} title="Sign Out">🚪</button>
          <div className="status-badge"><div className="status-dot" />Online</div>
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div className="chat-area">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <div className="empty-title">How can I help you?</div>
            <div className="empty-subtitle">Chat with AI or generate images — just describe what you want.</div>
            <div className="suggestions">
              {suggestions.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              <div className={`avatar ${msg.role === "user" ? "user" : "ai"}`}>
                {msg.role === "user" ? "👤" : "🤖"}
              </div>
              <div className="message-content">
                {msg.type === "image" ? (
                  <div className="message-bubble image-bubble">
                    <div className="image-caption">{msg.text}</div>
                    <img src={msg.image} alt="Generated" className="generated-image" />
                    <a href={msg.image} download="intellio-image.png" className="image-download">↓ Download</a>
                  </div>
                ) : (
                  <div className={`message-bubble ${msg.role === "user" ? "user" : "ai"}`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )}
                <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                  <div className="message-time">{msg.time}</div>
                  <div className="message-actions">
                    <button className="action-btn" onClick={() => copyMessage(msg.text)}>📋 Copy</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {generatingImage && (
          <div className="message-row">
            <div className="avatar ai">🤖</div>
            <div className="image-progress">
              <div className="progress-label">✨ Generating your image...</div>
              <div className="progress-bar-track"><div className="progress-bar-fill" /></div>
            </div>
          </div>
        )}

        {loading && !generatingImage && (
          <div className="message-row">
            <div className="avatar ai">🤖</div>
            <div className="typing-bubble">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT ── */}
      <div className="input-area">
        <div className="input-container">
          <button className={`voice-btn ${listening ? "listening" : ""}`} onClick={toggleVoice}>
            {listening ? "🔴" : "🎤"}
          </button>
          <textarea
            ref={textareaRef}
            className="input-field"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={listening ? "Listening..." : "Ask anything or say 'generate image of...'"}
            rows={1}
          />
          <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>↑</button>
        </div>
        <div className="input-footer">
          <span className="input-hint">Enter to send · Shift+Enter for new line</span>
          <span className="model-tag">GPT · SDXL</span>
        </div>
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}