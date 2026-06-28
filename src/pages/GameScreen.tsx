import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import bgvid from "../../assets/ui-assets/bg.mp4";

const QUESTIONS = [
  {
    key: "sentence",
    label: "Describe what you're doing",
    placeholder: "I am building a responsive web app...",
    prefix: "// prompt_01",
    tag: "DESCRIPTION",
  },
  {
    key: "keywords",
    label: "Keywords",
    placeholder: "html, css, react",
    prefix: "// prompt_02",
    tag: "KEYWORDS",
  },
  {
    key: "code",
    label: "Sample Code",
    placeholder: "function App() { return <div>Hello</div> }",
    prefix: "// prompt_03",
    tag: "CODE_SAMPLE",
  },
];

const GameScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    roomId,
    realTheme: initialRealTheme,
    fakeTheme: initialFakeTheme,
    impostorId: initialImpostorId,
  } = location.state || {};

  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [submittedStep, setSubmittedStep] = useState<number | null>(null);
  const [blink, setBlink] = useState(true);
  
  const [impostorId, setImpostorId] = useState(initialImpostorId || null);
  const [realTheme, setRealTheme] = useState(initialRealTheme || "");
  const [fakeTheme, setFakeTheme] = useState(initialFakeTheme || "");

  const [answers, setAnswers] = useState({
    sentence: "",
    keywords: "",
    code: "",
  });

  // 🔥 REFS to avoid stale closures in timer
  const answersRef = useRef(answers);
  const stepRef = useRef(step);
  const submittedStepRef = useRef<number | null>(submittedStep);
  const roomIdRef = useRef(roomId);

  // Update refs whenever state changes
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  
  useEffect(() => {
    submittedStepRef.current = submittedStep;
  }, [submittedStep]);
  
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(interval);
  }, []);

  // Request game state on mount
  useEffect(() => {
    if (!roomId) return;
    console.log("[GameScreen] Mounting, requesting game state for room:", roomId);
    socket.emit("get_game_state", { roomId });
  }, [roomId]);

  // Socket listeners
  useEffect(() => {
    const handleGameStarted = (data: any) => {
      console.log("[GameScreen] Received game_started:", data);
      setRealTheme(data.real_theme ?? data.realTheme ?? "");
      setFakeTheme(data.fake_theme ?? data.fakeTheme ?? "");
      setImpostorId(data.impostorId ?? data.impostor_id ?? null);
      setStep(data.step ?? 0);
      setTimeLeft(data.timeLeft ?? 45);
      setSubmittedStep(null);
      setAnswers({ sentence: "", keywords: "", code: "" });
    };

    const handleGameState = (data: any) => {
      console.log("[GameScreen] Received game_state:", data);
      setRealTheme(data.real_theme ?? data.realTheme ?? "");
      setFakeTheme(data.fake_theme ?? data.fakeTheme ?? "");
      setImpostorId(data.impostorId ?? data.impostor_id ?? null);
      setStep(data.step ?? 0);
      setTimeLeft(data.timeLeft ?? 45);
      if (data.answers) setAnswers(data.answers);
      if (data.isSubmitted) {
        setSubmittedStep(data.step ?? 0);
      }
    };

    const handleNextQuestion = (data: any) => {
      console.log("[GameScreen] Received next_question:", data);
      setStep(data.step);
      setTimeLeft(data.timeLeft ?? 45);
      setSubmittedStep(null);
      // Reset answers for new question? No - keep existing for next step
    };

    const handleRoundFinished = (data: any) => {
      console.log("[GameScreen] Received round_finished from server:", data);
      
      // Make sure your backend wraps the raw Flask keys or names them exactly like this:
      navigate(`/result/${roomId}`, {
        state: {
          results: data.results,                     // Flask parsed evaluation data: array of { name, group_similarity }
          impostor: data.impostor,                   // Name of the caught impostor string
          similarity_matrix: data.similarity_matrix, // Full cross-correlation array from Python
          theme: data.theme || realTheme,            
          fake_theme: data.fake_theme || fakeTheme,  
          roomId,
          // Pass the complete game-state ledger so the text boxes can display the code/sentence strings
          players: data.players || data.submissions || [] 
        },
      });
    };

    const handleImpostorReassigned = (data: any) => {
      console.log("[GameScreen] Received impostor_reassigned:", data);
      setImpostorId(data.newImpostorId ?? data.impostorId);
    };

        // Add this inside your socket listeners useEffect
    const handleTimerUpdate = (data: any) => {
      if (data.step !== stepRef.current) return;

      if (data.timeLeft < 0) return;

      setTimeLeft(data.timeLeft);
    };

    const handleSubmittedConfirmed = (data: any) => {
      console.log("[GameScreen] Submission confirmed for step:", data.step);
      setSubmittedStep(data.step);
    };

    // Add these to socket.on
    socket.on("timer_update", handleTimerUpdate);
    socket.on("submitted_confirmed", handleSubmittedConfirmed);

    socket.on("game_started", handleGameStarted);
    socket.on("game_state", handleGameState);
    socket.on("next_question", handleNextQuestion);
    socket.on("round_finished", handleRoundFinished);
    socket.on("impostor_reassigned", handleImpostorReassigned);

    return () => {
      socket.off("game_started", handleGameStarted);
      socket.off("game_state", handleGameState);
      socket.off("next_question", handleNextQuestion);
      socket.off("round_finished", handleRoundFinished);
      socket.off("impostor_reassigned", handleImpostorReassigned);
      socket.off("timer_update", handleTimerUpdate);
      socket.off("submitted_confirmed", handleSubmittedConfirmed);
    };
  }, [navigate, roomId]);

  const handleChange = (value: string) => {
    const currentQuestion = QUESTIONS[stepRef.current];

    if (!currentQuestion) return;

    const key = currentQuestion.key;

    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const timerPct = (timeLeft / 45) * 100;
  const timerColor =
    timeLeft > 20 ? "#81ecff" : timeLeft > 10 ? "#ffe483" : "#ff4f4f";
  const q = QUESTIONS[step];

  const isImpostor = socket.id === impostorId;
  const displayTheme = isImpostor ? fakeTheme : realTheme;

  const [showDebug, setShowDebug] = useState(false);
  const isSubmitted = submittedStep === step;
  
  return (
    <div className="relative min-h-screen text-white font-mono selection:bg-[#ff51fa] overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        * { font-family: 'JetBrains Mono', monospace !important; }
        .bg-gradient-radial {
          background-image: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
        .scanlines {
          background-image: linear-gradient(
            to bottom,
            transparent 50%,
            rgba(255,255,255,0.03) 51%
          );
          background-size: 100% 4px;
          animation: scanlineMove 8s linear infinite;
        }
        @keyframes scanlineMove {
          from { transform: translateY(0); }
          to { transform: translateY(100px); }
        }
        .scanline::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.08) 3px,
            rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
        }
        .dev-textarea {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(70,70,92,0.6);
          color: #e0ffe0;
          resize: none;
          caret-color: #ff51fa;
          line-height: 1.7;
          tab-size: 2;
          transition: border-color 0.2s;
        }
        .dev-textarea:focus {
          outline: none;
          border-color: #81ecff;
          box-shadow: 0 0 0 1px rgba(129,236,255,0.2), inset 0 0 24px rgba(129,236,255,0.03);
        }
        .dev-textarea:disabled { opacity: 0.4; }
        .dev-textarea::placeholder { color: rgba(129,236,255,0.2); }
        .glow-pink { text-shadow: 0 0 12px rgba(255,81,250,0.6); }
        .glow-cyan { text-shadow: 0 0 12px rgba(129,236,255,0.5); }
        @keyframes stepPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .active-step { animation: stepPulse 2s ease-in-out infinite; }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeSlide 0.35s ease forwards; }
      `}</style>

      {/* Debug panel - click top-left dots to toggle */}
      {showDebug && (
        <div className="fixed top-16 left-4 z-50 bg-black/90 border border-[#ff51fa]/40 rounded p-3 text-[10px] text-[#81ecff] max-w-xs space-y-1">
          <div>socket.id: {socket.id}</div>
          <div>roomId: {roomId}</div>
          <div>realTheme: "{realTheme}"</div>
          <div>fakeTheme: "{fakeTheme}"</div>
          <div>impostorId: "{impostorId}"</div>
          <div>isImpostor: {String(isImpostor)}</div>
          <div>step: {step}</div>
          <div>timeLeft: {timeLeft}</div>
          <div>isSubmitted: {String(isSubmitted)}</div>
          <div>socket.connected: {String(socket.connected)}</div>
        </div>
      )}

      {/* Video Background */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        <video className="absolute w-full h-full object-cover" autoPlay muted loop playsInline>
          <source src={bgvid} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/80" />
        <div className="scanlines absolute inset-0 opacity-20" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="relative scanline flex justify-between items-center px-6 py-3 border-b border-[#46465c]/40 bg-black/30">
          <div
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => setShowDebug((d) => !d)}
          >
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-[#46465c] text-xs">game.ts — room:{roomId ?? "????"}</span>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 text-xs tracking-widest text-[#46465c] uppercase">
            THEME:{" "}
            <span className="text-[#ff51fa] font-bold glow-pink">
              {displayTheme ? displayTheme.toUpperCase() : "LOADING..."}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {impostorId && (
              <div
                className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  isImpostor
                    ? "bg-red-600 text-white shadow-[0_0_10px_red]"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {isImpostor ? "🔪 IMPOSTOR" : "👾 CREWMATE"}
              </div>
            )}
            <div
              className="flex items-center gap-2 text-sm font-bold tabular-nums transition-colors duration-500"
              style={{ color: timerColor }}
            >
              <span className="text-[#46465c]">T–</span>
              <span>{String(timeLeft).padStart(2, "0")}s</span>
              <div className="w-20 h-1 bg-[#1a1a30] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${timerPct}%`,
                    background: timerColor,
                    boxShadow: `0 0 6px ${timerColor}`,
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 border-b border-[#46465c]/30 bg-black/20 px-6 text-xs">
          {QUESTIONS.map((q, i) => (
            <div
              key={i}
              className={`px-4 py-2 border-r border-[#46465c]/30 cursor-default transition-all duration-200 ${
                i === step
                  ? "text-[#81ecff] bg-[#0c0c1f] border-t-2 border-t-[#81ecff] -mt-px"
                  : "text-[#46465c] hover:text-[#6a6a82]"
              }`}
            >
              {i === step && <span className="active-step">▶ </span>}
              {q.tag}
            </div>
          ))}
          <div className="flex-1" />
          <span className="text-[#2a2a3c] pr-2">
            step {step + 1}/{QUESTIONS.length}
          </span>
        </div>
        
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div key={step} className="w-full max-w-2xl space-y-5 fade-in">
            <div className="text-xs text-[#46465c] tracking-widest">{q.prefix}</div>
            <div className="flex items-baseline gap-3">
              <span className="text-[#ff51fa] glow-pink text-lg font-bold">{">"}</span>
              <h2 className="text-base font-bold text-[#81ecff] glow-cyan uppercase tracking-[0.2em]">
                {q.label}
              </h2>
            </div>
            <div className="relative border border-[#46465c]/50 rounded-sm bg-black/50 overflow-hidden">
              <div
                className="absolute left-0 top-0 bottom-0 w-10 border-r border-[#46465c]/30 flex flex-col items-center pt-3 gap-[1px]"
                style={{ background: "rgba(0,0,0,0.3)" }}
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="text-[#2a2a3c] text-xs leading-6 select-none">
                    {i + 1}
                  </span>
                ))}
              </div>
              <textarea
                disabled={isSubmitted}
                value={answers[q.key as keyof typeof answers]}
                onChange={(e) => handleChange(e.target.value)}
                className="dev-textarea w-full h-44 pl-14 pr-4 pt-3 pb-3 text-sm"
                placeholder={q.placeholder}
                spellCheck={false}
              />
              <div className="flex justify-between items-center px-3 py-1 bg-black/40 border-t border-[#46465c]/30 text-[10px] text-[#2a2a3c]">
                <span>UTF-8 · LF</span>
                <span>
                  {answers[q.key as keyof typeof answers].length} chars
                  {blink && !isSubmitted ? (
                    <span className="text-[#ff51fa] ml-1">█</span>
                  ) : (
                    <span className="text-transparent ml-1">█</span>
                  )}
                </span>
              </div>
            </div>

            {/* Auto-submit hint */}
            {!isSubmitted ? (
              <div className="text-center text-[#46465c] text-xs tracking-wider py-2">
                ⏳ Your answer will be submitted automatically when the timer reaches 0
              </div>
            ) : (
              <div className="text-center text-[#28c840] text-xs tracking-wider py-2">
                ✓ Answer submitted — waiting for other players...
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-2 border-t border-[#46465c]/20 bg-black/20 flex justify-between text-[10px] text-[#2a2a3c]">
          <span>devgame v0.1.0</span>
          <span className={isSubmitted ? "text-[#28c840]" : "text-[#46465c]"}>
            {isSubmitted ? "● SUBMITTED" : "● ACTIVE"}
          </span>
          <span>socket: {roomId ?? "..."}</span>
        </footer>
      </div>
    </div>
  );
};

export default GameScreen;