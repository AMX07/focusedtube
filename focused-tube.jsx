import { useState, useEffect, useRef, useCallback } from "react";

const SERIES = {
  title: "Neural Networks: Zero to Hero",
  author: "Andrej Karpathy",
  videos: [
    { id: "VMj-3S1tku0", title: "The spelled-out intro to neural networks and backpropagation: building micrograd", duration: "2:25:47", ep: 1 },
    { id: "PaCmpygFfXo", title: "The spelled-out intro to language modeling: building makemore", duration: "1:57:44", ep: 2 },
    { id: "TCH_1BHY58I", title: "Building makemore Part 2: MLP", duration: "1:15:47", ep: 3 },
    { id: "P6sfmUTpUmc", title: "Building makemore Part 3: Activations & Gradients, BatchNorm", duration: "1:55:55", ep: 4 },
    { id: "q8SA3rM6ckI", title: "Building makemore Part 4: Becoming a Backprop Ninja", duration: "1:51:42", ep: 5 },
    { id: "t3YJ5hKiMQ0", title: "Building makemore Part 5: Building a WaveNet", duration: "56:23", ep: 6 },
    { id: "kCc8FmEb1nY", title: "Let's build GPT: from scratch, in code, spelled out", duration: "1:56:20", ep: 7 },
    { id: "zduSFxRajkE", title: "Let's build the GPT Tokenizer", duration: "2:03:41", ep: 8 },
    { id: "7xTGNNLPyMI", title: "Let's reproduce GPT-2 (124M)", duration: "4:01:30", ep: 9 },
  ],
};

const STORAGE_KEY = "focustube_progress";

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseDuration(str) {
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function ProgressBar({ current, total, color = "#E8C547" }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

function NotesPanel({ videoId, notes, onSave }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    setText(notes[videoId] || "");
  }, [videoId, notes]);

  const handleSave = () => {
    onSave(videoId, text);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
          Notes
        </span>
        <button
          onClick={handleSave}
          style={{
            background: "rgba(232,197,71,0.15)", border: "1px solid rgba(232,197,71,0.3)",
            color: "#E8C547", padding: "4px 12px", borderRadius: 4, cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 0.5,
          }}
        >
          Save
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Take notes while watching..."
        style={{
          flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 6, padding: 12, color: "rgba(255,255,255,0.85)", fontSize: 13,
          fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.7, resize: "none",
          outline: "none",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(232,197,71,0.2)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; }}
      />
    </div>
  );
}

function SpeedControl({ speed, onSpeedChange }) {
  const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];
  return (
    <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: 2 }}>
      {speeds.map((s) => (
        <button
          key={s}
          onClick={() => onSpeedChange(s)}
          style={{
            background: speed === s ? "rgba(232,197,71,0.2)" : "transparent",
            border: speed === s ? "1px solid rgba(232,197,71,0.3)" : "1px solid transparent",
            color: speed === s ? "#E8C547" : "rgba(255,255,255,0.4)",
            padding: "4px 8px", borderRadius: 4, cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            transition: "all 0.2s ease",
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

export default function FocusTube() {
  const [currentVideo, setCurrentVideo] = useState(0);
  const [progress, setProgress] = useState({});
  const [completed, setCompleted] = useState({});
  const [notes, setNotes] = useState({});
  const [showNotes, setShowNotes] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaries, setSummaries] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);

  // Load saved progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.progress) setProgress(data.progress);
        if (data.completed) setCompleted(data.completed);
        if (data.notes) setNotes(data.notes);
        if (data.currentVideo !== undefined) setCurrentVideo(data.currentVideo);
        if (data.playbackSpeed) setPlaybackSpeed(data.playbackSpeed);
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Save progress
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress, completed, notes, currentVideo, playbackSpeed }));
    } catch (e) { /* ignore */ }
  }, [progress, completed, notes, currentVideo, playbackSpeed]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => initPlayer();
  }, []);

  const initPlayer = useCallback(() => {
    if (playerRef.current) playerRef.current.destroy();
    playerRef.current = new window.YT.Player("yt-player", {
      videoId: SERIES.videos[currentVideo].id,
      playerVars: {
        rel: 0, modestbranding: 1, iv_load_policy: 3,
        disablekb: 0, fs: 1, cc_load_policy: 0,
      },
      events: {
        onReady: (e) => {
          setPlayerReady(true);
          e.target.setPlaybackRate(playbackSpeed);
          const savedTime = progress[SERIES.videos[currentVideo].id];
          if (savedTime && savedTime > 10) e.target.seekTo(savedTime - 5, true);
        },
        onStateChange: (e) => {
          setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          if (e.data === window.YT.PlayerState.ENDED) {
            setCompleted((prev) => ({ ...prev, [SERIES.videos[currentVideo].id]: true }));
          }
        },
      },
    });
  }, [currentVideo]);

  // Track playback time
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPlaying && playerRef.current) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const t = playerRef.current.getCurrentTime();
          setCurrentTime(t);
          setProgress((prev) => ({ ...prev, [SERIES.videos[currentVideo].id]: t }));
        }
      }, 2000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, currentVideo]);

  const loadVideo = (index) => {
    setCurrentVideo(index);
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(SERIES.videos[index].id);
      const savedTime = progress[SERIES.videos[index].id];
      setTimeout(() => {
        if (playerRef.current && savedTime && savedTime > 10) {
          playerRef.current.seekTo(savedTime - 5, true);
        }
        if (playerRef.current) playerRef.current.setPlaybackRate(playbackSpeed);
      }, 500);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (playerRef.current && playerRef.current.setPlaybackRate) {
      playerRef.current.setPlaybackRate(speed);
    }
  };

  const handleNoteSave = (videoId, text) => {
    setNotes((prev) => ({ ...prev, [videoId]: text }));
  };

  const loadCustomVideo = () => {
    const match = customUrl.match(/(?:v=|\/)([\w-]{11})/);
    if (match) {
      if (playerRef.current && playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById(match[1]);
      }
      setShowCustom(false);
      setCustomUrl("");
    }
  };

  const fetchSummary = async (videoId) => {
    if (summaries[videoId]) {
      setShowSummary(true);
      return;
    }
    setSummaryLoading(true);
    setSummaryError(null);
    setShowSummary(true);
    try {
      const res = await fetch(`/api/summary/${videoId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSummaries((prev) => ({ ...prev, [videoId]: { text: data.summary, obsidianPath: data.obsidian_path } }));
    } catch (e) {
      setSummaryError(e.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const totalVideos = SERIES.videos.length;
  const completedCount = SERIES.videos.filter((v) => completed[v.id]).length;
  const totalDuration = SERIES.videos.reduce((acc, v) => acc + parseDuration(v.duration), 0);
  const totalWatched = SERIES.videos.reduce((acc, v) => acc + (progress[v.id] || 0), 0);
  const video = SERIES.videos[currentVideo];

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "#0A0A0B",
        color: "#E8E6E1",
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Subtle grain overlay */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <header style={{
        padding: "16px 24px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)",
        position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isPlaying ? "#E8C547" : "rgba(255,255,255,0.2)",
            boxShadow: isPlaying ? "0 0 12px rgba(232,197,71,0.4)" : "none",
            transition: "all 0.5s ease",
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
            letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
          }}>
            FocusTube
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <SpeedControl speed={playbackSpeed} onSpeedChange={handleSpeedChange} />
          <button
            onClick={() => setShowNotes(!showNotes)}
            style={{
              background: showNotes ? "rgba(232,197,71,0.15)" : "rgba(255,255,255,0.04)",
              border: showNotes ? "1px solid rgba(232,197,71,0.3)" : "1px solid rgba(255,255,255,0.08)",
              color: showNotes ? "#E8C547" : "rgba(255,255,255,0.5)",
              padding: "6px 14px", borderRadius: 6, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              letterSpacing: 0.5, transition: "all 0.2s ease",
            }}
          >
            ✎ Notes
          </button>
          <button
            onClick={() => fetchSummary(SERIES.videos[currentVideo].id)}
            style={{
              background: showSummary ? "rgba(232,197,71,0.15)" : "rgba(255,255,255,0.04)",
              border: showSummary ? "1px solid rgba(232,197,71,0.3)" : "1px solid rgba(255,255,255,0.08)",
              color: showSummary ? "#E8C547" : "rgba(255,255,255,0.5)",
              padding: "6px 14px", borderRadius: 6, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              letterSpacing: 0.5, transition: "all 0.2s ease",
            }}
          >
            ∑ Summary
          </button>
          <button
            onClick={() => setShowCustom(!showCustom)}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)",
              padding: "6px 14px", borderRadius: 6, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              letterSpacing: 0.5,
            }}
          >
            + URL
          </button>
        </div>
      </header>

      {/* Custom URL Input */}
      {showCustom && (
        <div style={{
          padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex", gap: 8, position: "relative", zIndex: 10,
        }}>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadCustomVideo()}
            placeholder="Paste YouTube URL..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, padding: "8px 14px", color: "#E8E6E1", fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace", outline: "none",
            }}
          />
          <button
            onClick={loadCustomVideo}
            style={{
              background: "rgba(232,197,71,0.15)", border: "1px solid rgba(232,197,71,0.3)",
              color: "#E8C547", padding: "8px 20px", borderRadius: 6, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            }}
          >
            Load
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        display: "flex", flex: 1, position: "relative", zIndex: 5,
        flexDirection: "row",
      }}>
        {/* Video + Notes Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Player */}
          <div style={{
            width: "100%", aspectRatio: "16 / 9", background: "#000",
            position: "relative",
          }}>
            <div id="yt-player" style={{ width: "100%", height: "100%" }} />
          </div>

          {/* Video Info */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: "#E8C547", background: "rgba(232,197,71,0.1)",
                padding: "2px 8px", borderRadius: 3, flexShrink: 0,
                border: "1px solid rgba(232,197,71,0.15)",
              }}>
                {String(video.ep).padStart(2, "0")}
              </span>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: 17, fontWeight: 500, margin: 0, lineHeight: 1.4,
                  color: "#E8E6E1", fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  {video.title}
                </h2>
                <div style={{
                  marginTop: 8, display: "flex", alignItems: "center", gap: 16,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                }}>
                  <span>{video.duration}</span>
                  <span>·</span>
                  <span>{formatTime(progress[video.id] || 0)} watched</span>
                  {completed[video.id] && (
                    <>
                      <span>·</span>
                      <span style={{ color: "#5CB85C" }}>✓ Completed</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar current={progress[video.id] || 0} total={parseDuration(video.duration)} />
            </div>
          </div>

          {/* Notes Panel (below video) */}
          {showNotes && (
            <div style={{ padding: "16px 24px", flex: 1, minHeight: 200 }}>
              <NotesPanel videoId={video.id} notes={notes} onSave={handleNoteSave} />
            </div>
          )}

          {/* Summary Panel (below video) */}
          {showSummary && (
            <div style={{
              padding: "16px 24px", flex: 1, minHeight: 200,
              borderTop: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
                }}>
                  Summary
                </span>
                <button
                  onClick={() => setShowSummary(false)}
                  style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.4)", padding: "4px 10px", borderRadius: 4,
                    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  }}
                >
                  ✕
                </button>
              </div>
              {summaryLoading && (
                <div style={{
                  color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13, padding: "24px 0", textAlign: "center",
                }}>
                  <span style={{ display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }}>
                    Fetching transcript &amp; generating summary…
                  </span>
                  <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
                </div>
              )}
              {summaryError && (
                <div style={{
                  color: "#E85454", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13, padding: "12px 16px", background: "rgba(232,84,84,0.08)",
                  borderRadius: 6, border: "1px solid rgba(232,84,84,0.2)",
                }}>
                  {summaryError}
                </div>
              )}
              {summaries[video.id] && !summaryLoading && (
                <>
                  {summaries[video.id].obsidianPath && (
                    <div style={{
                      marginBottom: 10, fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11, color: "rgba(136,108,196,0.8)",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{
                        display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                        background: "#886CC4",
                      }} />
                      Saved to Obsidian
                    </div>
                  )}
                  <div style={{
                    color: "rgba(255,255,255,0.85)", fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap",
                    background: "rgba(255,255,255,0.02)", borderRadius: 8,
                    padding: 20, border: "1px solid rgba(255,255,255,0.05)",
                    maxHeight: 500, overflowY: "auto",
                  }}>
                    {summaries[video.id].text}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Playlist */}
        <div style={{
          width: 340, borderLeft: "1px solid rgba(255,255,255,0.04)",
          display: "flex", flexDirection: "column", flexShrink: 0,
          background: "rgba(255,255,255,0.01)",
        }}>
          {/* Series Header */}
          <div style={{
            padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: 2, textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)", marginBottom: 6,
            }}>
              SERIES
            </div>
            <div style={{
              fontSize: 14, fontWeight: 500, color: "#E8E6E1",
              lineHeight: 1.3, marginBottom: 4,
            }}>
              {SERIES.title}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "rgba(255,255,255,0.35)",
            }}>
              {SERIES.author}
            </div>

            {/* Overall Progress */}
            <div style={{ marginTop: 14 }}>
              <div style={{
                display: "flex", justifyContent: "space-between", marginBottom: 6,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "rgba(255,255,255,0.3)", letterSpacing: 0.5,
              }}>
                <span>{completedCount}/{totalVideos} completed</span>
                <span>{Math.round((totalWatched / totalDuration) * 100)}%</span>
              </div>
              <ProgressBar current={totalWatched} total={totalDuration} color="#5CB85C" />
            </div>
          </div>

          {/* Video List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {SERIES.videos.map((v, i) => {
              const isActive = i === currentVideo;
              const isComplete = completed[v.id];
              const watchPct = progress[v.id] ? Math.min((progress[v.id] / parseDuration(v.duration)) * 100, 100) : 0;
              return (
                <button
                  key={v.id}
                  onClick={() => loadVideo(i)}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: isActive ? "rgba(232,197,71,0.06)" : "transparent",
                    border: "none", borderLeft: isActive ? "2px solid #E8C547" : "2px solid transparent",
                    padding: "12px 16px 12px 14px",
                    transition: "all 0.15s ease",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: isComplete ? "#5CB85C" : isActive ? "#E8C547" : "rgba(255,255,255,0.25)",
                    marginTop: 2, flexShrink: 0, width: 18, textAlign: "right",
                  }}>
                    {isComplete ? "✓" : String(v.ep).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, lineHeight: 1.4, fontWeight: isActive ? 500 : 400,
                      color: isActive ? "#E8E6E1" : "rgba(255,255,255,0.6)",
                      overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>
                      {v.title}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginTop: 4,
                    }}>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                        color: "rgba(255,255,255,0.25)",
                      }}>
                        {v.duration}
                      </span>
                      {watchPct > 0 && !isComplete && (
                        <div style={{
                          flex: 1, maxWidth: 60, height: 2,
                          background: "rgba(255,255,255,0.06)", borderRadius: 1,
                        }}>
                          <div style={{
                            width: `${watchPct}%`, height: "100%",
                            background: "rgba(232,197,71,0.5)", borderRadius: 1,
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Keyboard Shortcuts */}
          <div style={{
            padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.04)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(255,255,255,0.2)", lineHeight: 1.8,
          }}>
            <span style={{ letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4, display: "block" }}>
              Shortcuts
            </span>
            <span>Space — play/pause · ←→ — seek · ↑↓ — volume</span>
          </div>
        </div>
      </div>

      {/* Load fonts */}
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    </div>
  );
}
