import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";
import Auth from "./Auth";

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const getDate = () =>
  new Date().toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const suggestions = [
  "Explain quantum computing",
  "Write a Python function",
  "Search latest AI news",
  "Generate image of a sunset",
];

const IMAGE_KEYWORDS = [
  "generate image", "create image", "draw", "generate a picture",
  "show me a picture", "generate photo", "make an image",
  "create a photo", "paint", "illustrate", "generate a image",
  "create a image", "image of", "picture of", "photo of",
];

const SEARCH_KEYWORDS = [
  "search", "latest", "current", "today", "news", "right now",
  "what happened", "recent", "2024", "2025", "2026", "live",
  "price of", "score of", "weather in", "who won", "trending",
];

const BACKEND_URL = "https://naveenasenthil-intellio.hf.space";

// ── localStorage helpers (replaces Supabase 'chats' table) ──
const getHistoryKey = (uid) => `intellio_chats_${uid}`;

const loadHistoryFromStorage = (uid) => {
  try {
    const raw = localStorage.getItem(getHistoryKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistoryToStorage = (uid, history) => {
  localStorage.setItem(getHistoryKey(uid), JSON.stringify(history));
};

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

  // ── PDF states ──
  const [pdfFile, setPdfFile] = useState(null);       // uploaded PDF file object
  const [pdfMode, setPdfMode] = useState(false);       // true = chatting with PDF
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadHistory = useCallback((uid) => {
    setChatHistory(loadHistoryFromStorage(uid));
  }, []);

  // ── Check localStorage for an existing "session" on load ──
  useEffect(() => {
    const savedEmail = localStorage.getItem("intellio_current_user");
    if (savedEmail) {
      const fakeUser = { id: savedEmail, email: savedEmail };
      setUser(fakeUser);
      loadHistory(fakeUser.id);
    }
    setAuthReady(true);
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const saveChat = useCallback((msgs) => {
    if (!user || msgs.length === 0) return;
    const newEntry = {
      id: Date.now().toString(),
      title: msgs[0]?.text?.slice(0, 40) || "New Chat",
      date: getDate(),
      messages: msgs,
      created_at: Date.now(),
    };
    setChatHistory((prev) => {
      const updated = [newEntry, ...prev];
      saveHistoryToStorage(user.id, updated);
      return updated;
    });
  }, [user]);

  const deleteHistory = (id, e) => {
    e.stopPropagation();
    setChatHistory((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveHistoryToStorage(user.id, updated);
      return updated;
    });
    showToast("Deleted!");
  };

  const loadChat = (entry) => {
    setMessages(entry.messages);
    setSidebarOpen(false);
  };

  const clearChat = () => {
    if (messages.length > 0) saveChat(messages);
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

  // ── Upload PDF to backend ──
  const handlePdfUpload = async (file) => {
    if (!file || file.type !== "application/pdf") {
      showToast("Please select a PDF file"); return;
    }
    setUploadingPdf(true);
    showToast("Uploading PDF...");

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("uid", user.id);

      const response = await fetch(`${BACKEND_URL}/upload-pdf`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setPdfFile(file);
        setPdfMode(true);
        setMessages([{
          role: "bot",
          text: `📄 PDF **"${file.name}"** uploaded successfully! (${data.chunks} sections processed)\n\nAsk me anything about this document!`,
          time: getTime(),
        }]);
        showToast("PDF ready! Ask questions now");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      showToast("PDF upload failed: " + error.message);
    }
    setUploadingPdf(false);
  };

  // ── Exit PDF mode ──
  const exitPdfMode = () => {
    setPdfMode(false);
    setPdfFile(null);
    setMessages([]);
    showToast("Exited PDF mode");
  };

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: msg, time: getTime() }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    // ── PDF mode — chat with document ──
    if (pdfMode && pdfFile) {
      try {
        const response = await fetch(`${BACKEND_URL}/chat-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: msg,
            uid: user.id,
            filename: pdfFile.name,
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        const botText = data.choices?.[0]?.message?.content || "Sorry, I couldn't find an answer in the document.";
        setMessages((prev) => [...prev, { role: "bot", text: botText, time: getTime() }]);
      } catch (error) {
        setMessages((prev) => [...prev, { role: "bot", text: "Error: " + error.message, time: getTime() }]);
      }
      setLoading(false);
      return;
    }

    const isImageRequest = IMAGE_KEYWORDS.some((kw) => msg.toLowerCase().includes(kw));
    const isSearchRequest = SEARCH_KEYWORDS.some((kw) => msg.toLowerCase().includes(kw));

    if (isSearchRequest && !isImageRequest) {
      try {
        const response = await fetch(`${BACKEND_URL}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: msg }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        const botText = data.choices?.[0]?.message?.content || "Sorry, couldn't find results.";
        setMessages((prev) => [...prev, {
          role: "bot",
          text: botText,
          sources: data.sources || [],
          time: getTime(),
          isSearch: true,
        }]);
      } catch (error) {
        setMessages((prev) => [...prev, { role: "bot", text: "Search error: " + error.message, time: getTime() }]);
      }
      setLoading(false);
      return;
    }

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

  const handleSignOut = () => {
    localStorage.removeItem("intellio_current_user");
    setUser(null);
    setMessages([]);
    setChatHistory([]);
    showToast("Signed out!");
  };

  const handleAuthSuccess = (email) => {
    const fakeUser = { id: email, email };
    setUser(fakeUser);
    loadHistory(fakeUser.id);
  };

  if (!authReady) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Outfit,sans-serif", color:"#999", fontSize:"15px" }}>
      Loading...
    </div>
  );

  if (!user) return <Auth onAuthSuccess={handleAuthSuccess} />;

  return (
    <div className={`app ${darkMode ? "dark" : ""}`}>

      <div className={`overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* ── SIDEBAR ── */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">💬 Intellio AI</span>
          <button className="icon-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

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

        <div className="sidebar-actions">
          <button className="sidebar-btn" onClick={exportChat}>⬇ Export Chat</button>
          <button className="sidebar-btn" onClick={() => { setDarkMode(!darkMode); setSidebarOpen(false); }}>
            {darkMode ? "☀️ Light Mode" : "⚡ Dark Mode"}
          </button>
          <button className="sidebar-btn danger" onClick={handleSignOut}>🚪 Sign Out</button>
        </div>
      </div>

      {/* ── HEADER ── */}
      <div className="header">
        <div className="header-left">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <div >✦</div>
          <div className="header-info">
            {pdfMode ? (
              <>
                <div className="header-title">📄 PDF Mode</div>
                <div className="header-subtitle">{pdfFile?.name}</div>
              </>
            ) : (
              <>
                <div className="header-title">Intellio AI</div>
                <div className="header-subtitle">Chat · Image · PDF</div>
              </>
            )}
          </div>
        </div>
        <div className="header-actions">
          <span className="header-email">{user.email}</span>
          {pdfMode ? (
            <button className="icon-btn" onClick={exitPdfMode} title="Exit PDF Mode" style={{ color: "#ef4444" }}>✕</button>
          ) : (
            <>
              <button className="icon-btn" onClick={clearChat} title="Clear Chat">🗑</button>
              <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="Theme">
                {darkMode ? "☀️" : "⚡"}
              </button>
            </>
          )}
          <div className="status-badge"><div className="status-dot" />Online</div>
        </div>
      </div>

      {/* ── PDF BANNER — shown when PDF is active ── */}
      {pdfMode && pdfFile && (
        <div className="pdf-banner">
          <span>📄 Chatting with: <strong>{pdfFile.name}</strong></span>
          <button onClick={exitPdfMode}>✕ Exit</button>
        </div>
      )}

      {/* ── CHAT AREA ── */}
      <div className="chat-area">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div >✦</div>
            <div className="empty-title">How can I help you?</div>
            <div className="empty-subtitle">Chat with AI, generate images, or upload a PDF to ask questions!</div>
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
                {msg.role === "user" ? "👤" : "✦"}
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
                    {/* Show sources if search result */}
                    {msg.isSearch && msg.sources?.length > 0 && (
                      <div className="search-sources">
                        <div className="sources-title">🔍 Sources:</div>
                        {msg.sources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noreferrer" className="source-link">
                            {i + 1}. {s.title}
                          </a>
                        ))}
                      </div>
                    )}
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
            <div className="avatar ai">✦</div>
            <div className="image-progress">
              <div className="progress-label">✨ Generating your image...</div>
              <div className="progress-bar-track"><div className="progress-bar-fill" /></div>
            </div>
          </div>
        )}

        {uploadingPdf && (
          <div className="message-row">
            <div className="avatar ai">✦</div>
            <div className="image-progress">
              <div className="progress-label">📄 Processing PDF...</div>
              <div className="progress-bar-track"><div className="progress-bar-fill" /></div>
            </div>
          </div>
        )}

        {loading && !generatingImage && !uploadingPdf && (
          <div className="message-row">
            <div className="avatar ai">✦</div>
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
          {/* PDF upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => handlePdfUpload(e.target.files[0])}
          />
          <button
            className="voice-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload PDF"
            disabled={uploadingPdf}
          >
            +
          </button>

          <button className={`voice-btn ${listening ? "listening" : ""}`} onClick={toggleVoice}>
            {listening ? "🔴" : "🎤"}
          </button>

          <textarea
            ref={textareaRef}
            className="input-field"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              pdfMode
                ? `Ask anything about "${pdfFile?.name}"...`
                : listening
                ? "Listening..."
                : "Ask anything or say 'generate image of...'"
            }
            rows={1}
          />
          <button className="send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>↑</button>
        </div>
        <div className="input-footer">
          <span className="input-hint">
            {pdfMode ? "📄 PDF Mode — asking about document" : "Enter to send · Shift+Enter for new line"}
          </span>
          <span className="model-tag">{pdfMode ? "RAG · PDF" : "GPT · SDXL"}</span>
        </div>
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
