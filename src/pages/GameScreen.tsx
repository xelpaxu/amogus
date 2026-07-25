import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import bgvid from "../../assets/ui-assets/bg.mp4";

// ─── Helpers ───────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const GLITCH_CHARS = '█▓▒░╔╗╚╝║═╬┼┤├┬┴─│ABCDEF0123456789';

// ─── Types ────────────────────────────────────────────────────
interface Particle {
  id: number; x: number; y: number; size: string;
  duration: number; delay: number; color: string; drift: number;
}

const QUESTIONS = [
  { key: "sentence", label: "Describe what you're doing", placeholder: "I am building a responsive web app...", prefix: "// prompt_01", tag: "DESCRIPTION" },
  { key: "keywords", label: "Keywords", placeholder: "html, css, react", prefix: "// prompt_02", tag: "KEYWORDS" },
  { key: "code", label: "Sample Code", placeholder: "function App() { return <div>Hello</div> }", prefix: "// prompt_03", tag: "CODE_SAMPLE" },
];

// ─── Particle Component ────────────────────────────────────────
const Particle: React.FC<{ p: Particle }> = ({ p }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
      background: p.color,
      boxShadow: `0 0 ${parseInt(p.size) * 3}px ${p.color}, 0 0 ${parseInt(p.size) * 6}px ${p.color}44`,
      animation: `particleFloat ${p.duration}s ${p.delay}s infinite ease-in-out`,
      '--drift': `${p.drift}px`,
    } as React.CSSProperties}
  />
);

// ─── Corner Bracket ────────────────────────────────────────────
const CornerBracket: React.FC<{
  position: 'tl' | 'tr' | 'bl' | 'br'; delay: number; color?: string; size?: number;
}> = ({ position, delay, color = '#ff51fa', size = 36 }) => {
  const rotations = { tl: '0deg', tr: '90deg', br: '180deg', bl: '270deg' };
  const positions: Record<string, string> = {
    tl: 'top: 0; left: 0;', tr: 'top: 0; right: 0;',
    br: 'bottom: 0; right: 0;', bl: 'bottom: 0; left: 0;',
  };
  const parseStyle = (s: string): React.CSSProperties => {
    const style: Record<string, string> = {};
    s.split(';').forEach((part) => {
      const [key, val] = part.split(':').map((x) => x.trim());
      if (key && val) { const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); style[camel] = val; }
    });
    return style as React.CSSProperties;
  };
  return (
    <div className="absolute pointer-events-none" style={{ width: size, height: size, ...parseStyle(positions[position]), transform: `rotate(${rotations[position]})`, animation: `bracketDraw 0.5s ${delay}s both cubic-bezier(0.22, 1, 0.36, 1)` }}>
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="absolute top-0 left-0 h-full w-[2px]" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
      <div className="absolute top-0 left-0 w-2 h-2" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ─── MAIN GAME SCREEN ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const GameScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    roomId, realTheme: initialRealTheme, fakeTheme: initialFakeTheme, impostorId: initialImpostorId,
  } = location.state || {};

  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [submittedStep, setSubmittedStep] = useState<number | null>(null);
  const [blink, setBlink] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [glitchTheme, setGlitchTheme] = useState("LOADING...");

  const [impostorId, setImpostorId] = useState(initialImpostorId || null);
  const [realTheme, setRealTheme] = useState(initialRealTheme || "");
  const [fakeTheme, setFakeTheme] = useState(initialFakeTheme || "");
  const [showDebug, setShowDebug] = useState(false);

  const [answers, setAnswers] = useState({ sentence: "", keywords: "", code: "" });

  // A/B video refs
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [, setActiveVideo] = useState<'a' | 'b'>('a');
  const CROSSFADE_OFFSET = 1.5;
  const FADE_DURATION = 800;

  // Refs to avoid stale closures
  const answersRef = useRef(answers);
  const stepRef = useRef(step);
  const submittedStepRef = useRef<number | null>(submittedStep);
  const roomIdRef = useRef(roomId);

  // Particles
  const particles = useRef<Particle[]>(
    Array.from({ length: 15 }, (_, i) => ({
      id: i, x: rand(0, 100), y: rand(0, 100), size: `${rand(1, 3)}px`,
      duration: rand(12, 20), delay: rand(0, 8),
      color: pick(['#ff51fa', '#81ecff', '#ffe483', '#ff51fa88', '#81ecff66']),
      drift: rand(-20, 20),
    }))
  ).current;

  const displayTheme = (socket.id === impostorId) ? fakeTheme : realTheme;
  const isImpostor = socket.id === impostorId;
  const isSubmitted = submittedStep === step;
  const q = QUESTIONS[step];
  const timerPct = (timeLeft / 45) * 100;
  const timerColor = timeLeft > 20 ? "#81ecff" : timeLeft > 10 ? "#ffe483" : "#ff4f4f";

  // Keep refs in sync
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { submittedStepRef.current = submittedStep; }, [submittedStep]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // Content reveal
  useEffect(() => { const t = setTimeout(() => setShowContent(true), 200); return () => clearTimeout(t); }, []);

  // Theme glitch
  useEffect(() => {
    if (!displayTheme) return;
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (Math.random() > 0.9) {
          const base = displayTheme.toUpperCase();
          const arr = base.split('');
          const idx = Math.floor(Math.random() * arr.length);
          arr[idx] = pick(GLITCH_CHARS.split(''));
          setGlitchTheme(arr.join(''));
          setTimeout(() => setGlitchTheme(displayTheme.toUpperCase()), rand(50, 120));
        }
      }, 150);
    }, 2000);
    return () => { clearTimeout(start); if (interval) clearInterval(interval); };
  }, [displayTheme]);

  // Blinking cursor
  useEffect(() => { const interval = setInterval(() => setBlink((b) => !b), 530); return () => clearInterval(interval); }, []);

  // Video crossfade
  useEffect(() => {
    const vidA = videoARef.current; const vidB = videoBRef.current;
    if (!vidA || !vidB) return;
    vidA.load(); vidB.load(); vidA.play().catch(() => {});
    let active: 'a' | 'b' = 'a';
    const handleTimeUpdate = () => {
      const current = active === 'a' ? vidA : vidB; const next = active === 'a' ? vidB : vidA;
      const remaining = current.duration - current.currentTime;
      if (!isNaN(remaining) && remaining <= CROSSFADE_OFFSET) {
        next.currentTime = 0; next.play().catch(() => {});
        current.style.transition = `opacity ${FADE_DURATION}ms ease`; next.style.transition = `opacity ${FADE_DURATION}ms ease`;
        current.style.opacity = '0'; next.style.opacity = '1';
        active = active === 'a' ? 'b' : 'a'; setActiveVideo(active);
        setTimeout(() => { current.pause(); current.currentTime = 0; }, FADE_DURATION + 50);
      }
    };
    vidA.addEventListener('timeupdate', handleTimeUpdate); vidB.addEventListener('timeupdate', handleTimeUpdate);
    return () => { vidA.removeEventListener('timeupdate', handleTimeUpdate); vidB.removeEventListener('timeupdate', handleTimeUpdate); };
  }, []);

  // Request game state on mount
  useEffect(() => { if (!roomId) return; socket.emit("get_game_state", { roomId }); }, [roomId]);

  // Socket listeners
  useEffect(() => {
    const handleGameStarted = (data: any) => {
      setRealTheme(data.real_theme ?? data.realTheme ?? "");
      setFakeTheme(data.fake_theme ?? data.fakeTheme ?? "");
      setImpostorId(data.impostorId ?? data.impostor_id ?? null);
      setStep(data.step ?? 0); setTimeLeft(data.timeLeft ?? 45);
      setSubmittedStep(null); setAnswers({ sentence: "", keywords: "", code: "" });
    };
    const handleGameState = (data: any) => {
      setRealTheme(data.real_theme ?? data.realTheme ?? "");
      setFakeTheme(data.fake_theme ?? data.fakeTheme ?? "");
      setImpostorId(data.impostorId ?? data.impostor_id ?? null);
      setStep(data.step ?? 0); setTimeLeft(data.timeLeft ?? 45);
      if (data.answers) setAnswers(data.answers);
      if (data.isSubmitted) setSubmittedStep(data.step ?? 0);
    };
    const handleNextQuestion = (data: any) => {
      setStep(data.step); setTimeLeft(data.timeLeft ?? 45); setSubmittedStep(null);
    };
    const handleRoundFinished = (data: any) => {
      navigate(`/result/${roomId}`, {
        state: {
          results: data.results, impostor: data.impostor,
          similarity_matrix: data.similarity_matrix,
          theme: data.theme || realTheme, fake_theme: data.fake_theme || fakeTheme,
          roomId, players: data.players || data.submissions || []
        },
      });
    };
    const handleImpostorReassigned = (data: any) => { setImpostorId(data.newImpostorId ?? data.impostorId); };
    const handleTimerUpdate = (data: any) => {
      if (data.step !== stepRef.current) return; if (data.timeLeft < 0) return;
      setTimeLeft(data.timeLeft);
      if (data.timeLeft === 0 && submittedStepRef.current !== stepRef.current) {
        const currentQuestion = QUESTIONS[stepRef.current]; if (!currentQuestion) return;
        socket.emit("submit_answer_step", { roomId: roomIdRef.current, step: stepRef.current, answer: answersRef.current[currentQuestion.key as keyof typeof answersRef.current] });
      }
    };
    const handleSubmittedConfirmed = (data: any) => { setSubmittedStep(data.step); };

    socket.on("timer_update", handleTimerUpdate); socket.on("submitted_confirmed", handleSubmittedConfirmed);
    socket.on("game_started", handleGameStarted); socket.on("game_state", handleGameState);
    socket.on("next_question", handleNextQuestion); socket.on("round_finished", handleRoundFinished);
    socket.on("impostor_reassigned", handleImpostorReassigned);

    return () => {
      socket.off("timer_update", handleTimerUpdate); socket.off("submitted_confirmed", handleSubmittedConfirmed);
      socket.off("game_started", handleGameStarted); socket.off("game_state", handleGameState);
      socket.off("next_question", handleNextQuestion); socket.off("round_finished", handleRoundFinished);
      socket.off("impostor_reassigned", handleImpostorReassigned);
    };
  }, [navigate, roomId, realTheme, fakeTheme]);

  const handleChange = (value: string) => {
    const currentQuestion = QUESTIONS[stepRef.current]; if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    const currentQuestion = QUESTIONS[stepRef.current]; if (!currentQuestion) return;
    socket.emit("submit_answer_step", { roomId: roomIdRef.current, step: stepRef.current, answer: answersRef.current[currentQuestion.key as keyof typeof answersRef.current] });
  };

  return (
    <div className="dark">
      {/* ── Background: A/B crossfade video ── */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        <video ref={videoARef} className="absolute w-full h-full object-cover" muted playsInline preload="auto" style={{ opacity: 1, transition: `opacity ${FADE_DURATION}ms ease` }}><source src={bgvid} type="video/mp4" /></video>
        <video ref={videoBRef} className="absolute w-full h-full object-cover" muted playsInline preload="auto" style={{ opacity: 0, transition: `opacity ${FADE_DURATION}ms ease` }}><source src={bgvid} type="video/mp4" /></video>
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/80" />
      </div>

      {/* ── All Keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        * { font-family: 'JetBrains Mono', monospace !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .bg-gradient-radial { background-image: radial-gradient(circle at center, var(--tw-gradient-stops)); }
        @keyframes particleFloat { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; } 25% { transform: translate(calc(var(--drift) * 0.5), -10px) scale(1.1); opacity: 0.7; } 50% { transform: translate(var(--drift), -20px) scale(0.6); opacity: 0.15; } 75% { transform: translate(calc(var(--drift) * -0.3), -7px) scale(1); opacity: 0.5; } }
        @keyframes bracketDraw { 0% { opacity: 0; clip-path: inset(0 100% 100% 0); } 100% { opacity: 1; clip-path: inset(0 0 0 0); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes borderTrace { 0% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; } 25% { background-position: 100% 0%, 100% 100%, 0% 100%, 0% 0%; } 50% { background-position: 100% 100%, 0% 100%, 0% 0%, 100% 0%; } 75% { background-position: 0% 100%, 0% 0%, 100% 0%, 100% 100%; } 100% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes gridScroll { 0% { transform: perspective(500px) rotateX(60deg) translateY(0); } 100% { transform: perspective(500px) rotateX(60deg) translateY(50px); } }
        @keyframes flickerIn { 0% { opacity: 0; } 8% { opacity: 0.7; } 12% { opacity: 0.2; } 20% { opacity: 0.9; } 28% { opacity: 0.4; } 45% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes dataPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        @keyframes stepPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes terminalFlash { 0% { opacity: 0; } 5% { opacity: 0.15; } 10% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes glitchClip1 { 0%, 100% { clip-path: inset(0 0 93% 0); transform: translate(0); } 8% { clip-path: inset(18% 0 62% 0); transform: translate(-2px, 1px); } 16% { clip-path: inset(48% 0 22% 0); transform: translate(1px, -1px); } 24% { clip-path: inset(78% 0 5% 0); transform: translate(-1px, 0); } 32%, 100% { clip-path: inset(0 0 93% 0); transform: translate(0); } }
        @keyframes glitchClip2 { 0%, 100% { clip-path: inset(93% 0 0 0); transform: translate(0); } 12% { clip-path: inset(10% 0 70% 0); transform: translate(2px, -1px); } 20% { clip-path: inset(40% 0 30% 0); transform: translate(-1px, 1px); } 28% { clip-path: inset(70% 0 8% 0); transform: translate(1px, 0); } 36%, 100% { clip-path: inset(93% 0 0 0); transform: translate(0); } }
        @keyframes holoShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .glitch-base { position: relative; }
        .glitch-base::before, .glitch-base::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
        .glitch-base::before { color: #ff51fa; animation: glitchClip1 3s infinite linear; opacity: 0.5; mix-blend-mode: screen; }
        .glitch-base::after { color: #81ecff; animation: glitchClip2 3s infinite linear; opacity: 0.35; mix-blend-mode: screen; }
        .holo-btn { position: relative; background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.08) 37%, transparent 50%); background-size: 200% 100%; animation: holoShimmer 3s infinite linear; }
        .holo-btn::before { content: ''; position: absolute; inset: -2px; border-radius: inherit; padding: 2px; background: linear-gradient(90deg, #ff51fa, #81ecff, #ffe483, #ff51fa, #81ecff); background-size: 400% 100%; animation: borderTrace 4s linear infinite; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: 0.6; transition: opacity 0.3s; }
        .holo-btn:hover::before { opacity: 1; }
        .trace-frame { position: absolute; inset: 10px; border: 1px solid transparent; background: linear-gradient(#ff51fa22, #ff51fa22) top left, linear-gradient(#81ecff22, #81ecff22) top right, linear-gradient(#ffe48322, #ffe48322) bottom right, linear-gradient(#ff51fa22, #ff51fa22) bottom left; background-size: 25% 1px, 25% 1px, 25% 1px, 25% 1px; background-repeat: no-repeat; animation: borderTrace 6s linear infinite; pointer-events: none; }
        .cyber-grid { position: absolute; bottom: 0; left: -50%; width: 200%; height: 25vh; background-image: linear-gradient(rgba(129,236,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(129,236,255,0.04) 1px, transparent 1px); background-size: 60px 60px; transform: perspective(500px) rotateX(60deg); transform-origin: center top; animation: gridScroll 3s linear infinite; mask-image: linear-gradient(to bottom, transparent, black 40%); -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%); pointer-events: none; }
        .dev-textarea { background: rgba(0,0,0,0.7); border: 1px solid rgba(70,70,92,0.6); color: #e0ffe0; resize: none; caret-color: #ff51fa; line-height: 1.8; tab-size: 2; transition: border-color 0.2s, box-shadow 0.2s; }
        .dev-textarea:focus { outline: none; border-color: #81ecff; box-shadow: 0 0 0 1px rgba(129,236,255,0.2), inset 0 0 30px rgba(129,236,255,0.03); }
        .dev-textarea:disabled { opacity: 0.35; cursor: not-allowed; }
        .dev-textarea::placeholder { color: rgba(129,236,255,0.15); }
        .glow-pink { text-shadow: 0 0 12px rgba(255,81,250,0.6); }
        .glow-cyan { text-shadow: 0 0 12px rgba(129,236,255,0.5); }
        .active-step { animation: stepPulse 2s ease-in-out infinite; }
      `}</style>

      {/* ── CRT Scanlines ── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-40" />
      <div className="absolute left-0 w-full h-[2px] z-40 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(129,236,255,0.08), transparent)', animation: 'scanline 5s linear infinite' }} />

      {/* ── Particles ── */}
      <div className="absolute inset-0 pointer-events-none z-30">{particles.map((p) => <Particle key={p.id} p={p} />)}</div>

      {/* ── Cyber Grid ── */}
      <div className="cyber-grid z-[5]" />

      {/* ── Trace Frame ── */}
      <div className="trace-frame z-[35]" />

      {/* ── Corner Brackets ── */}
      <div className="absolute inset-0 z-[36] pointer-events-none p-2">
        <CornerBracket position="tl" delay={0.4} size={30} />
        <CornerBracket position="tr" delay={0.6} color="#81ecff" size={30} />
        <CornerBracket position="br" delay={0.8} size={30} />
        <CornerBracket position="bl" delay={1.0} color="#81ecff" size={30} />
      </div>

      {/* ── Debug Panel ── */}
      {showDebug && (
        <div className="fixed top-16 left-4 z-[100] bg-black/95 border border-[#ff51fa]/40 rounded-lg p-4 text-[10px] text-[#81ecff] max-w-xs space-y-1 shadow-[0_0_30px_rgba(255,81,250,0.2)]" style={{ animation: 'fadeSlideUp 0.3s both' }}>
          <div className="text-[#ff51fa] font-bold mb-2 tracking-widest">◈ DEBUG PANEL</div>
          <div>socket.id: <span className="text-[#ffe483]">{socket.id}</span></div>
          <div>roomId: <span className="text-[#ffe483]">{roomId}</span></div>
          <div>realTheme: "<span className="text-[#4ade80]">{realTheme}</span>"</div>
          <div>fakeTheme: "<span className="text-[#ff51fa]">{fakeTheme}</span>"</div>
          <div>impostorId: "<span className="text-[#ff51fa]">{impostorId}</span>"</div>
          <div>isImpostor: <span className={isImpostor ? "text-red-400" : "text-[#4ade80]"}>{String(isImpostor)}</span></div>
          <div>step: <span className="text-[#ffe483]">{step}</span> | timeLeft: <span className="text-[#ffe483]">{timeLeft}</span></div>
          <div>isSubmitted: <span className={isSubmitted ? "text-[#4ade80]" : "text-[#46465c]"}>{String(isSubmitted)}</span></div>
          <div>socket.connected: <span className="text-[#4ade80]">{String(socket.connected)}</span></div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MAIN CONTENT ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="relative z-20 min-h-screen text-white selection:bg-[#ff51fa] overflow-hidden"
        style={{ animation: showContent ? 'flickerIn 0.8s 0.15s both' : 'none', opacity: showContent ? undefined : 0 }}
      >
        <div className="min-h-screen flex flex-col">
          {/* ── Header ── */}
          <header className="relative flex justify-between items-center px-4 md:px-6 py-3 border-b border-[#46465c]/30 bg-[#0c0c1f]/70 backdrop-blur-md" style={{ animation: 'fadeSlideUp 0.5s 0.3s both' }}>
            {/* Left: Terminal dots + file name */}
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setShowDebug((d) => !d)}>
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[0_0_6px_#ff5f5766] group-hover:shadow-[0_0_12px_#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[0_0_6px_#febc2e66] group-hover:shadow-[0_0_12px_#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840] shadow-[0_0_6px_#28c84066] group-hover:shadow-[0_0_12px_#28c840]" />
              </div>
              <span className="text-[#46465c] text-xs hidden sm:inline">game.ts — room:{roomId ?? "????"}</span>
            </div>

            {/* Center: Theme display with glitch */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs tracking-widest uppercase">
              <span className="text-[#46465c] hidden md:inline">THEME:</span>
              <span
                className="glitch-base text-sm md:text-base font-extrabold glow-pink"
                data-text={glitchTheme}
                style={{ color: '#ff51fa' }}
              >
                {glitchTheme || "LOADING..."}
              </span>
            </div>

            {/* Right: Role badge + Timer */}
            <div className="flex items-center gap-3 md:gap-4">
              {impostorId && (
                <div
                  className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider transition-all duration-300 ${
                    isImpostor
                      ? "bg-red-600/80 text-white shadow-[0_0_15px_rgba(255,0,0,0.4)] border border-red-500/50"
                      : "bg-[#17172f] text-[#4ade80] border border-[#4ade8033] shadow-[0_0_10px_rgba(74,222,128,0.1)]"
                  }`}
                >
                  {isImpostor ? "🔪 IMPOSTOR" : "👾 CREWMATE"}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm font-bold tabular-nums transition-colors duration-500" style={{ color: timerColor }}>
                <span className="text-[#46465c] text-xs">T–</span>
                <span className="text-base">{String(timeLeft).padStart(2, "0")}s</span>
                <div className="w-16 md:w-20 h-1.5 bg-[#1a1a30] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${timerPct}%`, background: timerColor, boxShadow: `0 0 8px ${timerColor}` }}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* ── Step Indicator ── */}
          <div className="flex items-center border-b border-[#46465c]/20 bg-black/30 px-4 md:px-6 text-xs" style={{ animation: 'fadeSlideUp 0.5s 0.4s both' }}>
            {QUESTIONS.map((qItem, i) => (
              <div
                key={i}
                className={`relative px-3 md:px-5 py-2.5 border-r border-[#46465c]/20 cursor-default transition-all duration-300 ${
                  i === step
                    ? "text-[#81ecff] bg-[#0c0c1f]/80"
                    : i < step
                    ? "text-[#28c840]/60 hover:text-[#28c840]"
                    : "text-[#46465c] hover:text-[#6a6a82]"
                }`}
              >
                {i === step && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#81ecff] shadow-[0_0_8px_#81ecff]" />
                )}
                {i === step && <span className="active-step mr-1">▶</span>}
                {i < step && <span className="mr-1 text-[#28c840]/40">✓</span>}
                <span className="hidden sm:inline">{qItem.tag}</span>
                <span className="sm:hidden">{i + 1}</span>
              </div>
            ))}
            <div className="flex-1" />
            <span className="text-[#2a2a3c] pr-2 tracking-wider">
              step {step + 1}/{QUESTIONS.length}
            </span>
          </div>

          {/* ── Main Editor Area ── */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-8 md:py-10">
            <div key={step} className="w-full max-w-2xl space-y-4" style={{ animation: 'fadeSlideUp 0.35s both' }}>
              {/* Prompt prefix */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#ff51fa] shadow-[0_0 8px_#ff51fa66]" style={{ animation: 'dataPulse 2s infinite' }} />
                <span className="text-[#46465c] text-xs tracking-widest">{q.prefix}</span>
              </div>

              {/* Question label */}
              <div className="flex items-baseline gap-3">
                <span className="text-[#ff51fa] glow-pink text-lg font-bold">{">"}</span>
                <h2 className="text-sm md:text-base font-bold text-[#81ecff] glow-cyan uppercase tracking-[0.15em]">
                  {q.label}
                </h2>
              </div>

              {/* Terminal Textarea Container */}
              <div className="relative border border-[#46465c]/50 rounded-lg overflow-hidden bg-black/50 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                {/* Terminal title bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#0c0c1f]/80 border-b border-[#46465c]/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#ff51fa44]" />
                    <span className="text-[10px] text-[#46465c] tracking-widest uppercase">editor</span>
                  </div>
                  <span className="text-[10px] text-[#2a2a3c] tracking-wider">{q.tag}</span>
                </div>

                <div className="relative">
                  {/* Line numbers gutter */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-10 border-r border-[#46465c]/20 flex flex-col items-center pt-3 gap-[1px] select-none"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i} className="text-[#2a2a3c] text-xs leading-[1.8]">{i + 1}</span>
                    ))}
                  </div>

                  <textarea
                    disabled={isSubmitted}
                    value={answers[q.key as keyof typeof answers]}
                    onChange={(e) => handleChange(e.target.value)}
                    className="dev-textarea w-full h-44 pl-14 pr-4 pt-3 pb-3 text-sm rounded-none"
                    placeholder={q.placeholder}
                    spellCheck={false}
                  />
                </div>

                {/* Status bar */}
                <div className="flex justify-between items-center px-3 py-1.5 bg-[#0c0c1f]/80 border-t border-[#46465c]/30 text-[10px]">
                  <span className="text-[#2a2a3c]">UTF-8 · LF</span>
                  <div className="flex items-center gap-3">
                    <span className={isSubmitted ? "text-[#28c840]" : "text-[#2a2a3c]"}>
                      {isSubmitted ? "● LOCKED" : "● EDITING"}
                    </span>
                    <span className="text-[#2a2a3c]">
                      {answers[q.key as keyof typeof answers].length} chars
                      {blink && !isSubmitted ? (
                        <span className="text-[#ff51fa] ml-1">█</span>
                      ) : (
                        <span className="text-transparent ml-1">█</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit / Status */}
              {!isSubmitted ? (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleSubmit}
                    className="holo-btn relative bg-[#0c0c1f] border border-[#81ecff]/50 text-[#81ecff] text-xs font-bold uppercase tracking-widest rounded-lg px-10 py-3 hover:bg-[#81ecff]/10 hover:border-[#81ecff] hover:shadow-[0_0_20px_rgba(129,236,255,0.2)] active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#81ecff]"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span>▶</span> Submit Answer <span>◀</span>
                    </span>
                  </button>
                  <div className="text-center text-[#46465c] text-[10px] tracking-wider flex items-center gap-2">
                    <span style={{ animation: 'dataPulse 2s infinite' }}>⏳</span>
                    Auto-submits when timer reaches 0
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2" style={{ animation: 'fadeSlideUp 0.3s both' }}>
                  <div className="flex items-center gap-2 text-[#28c840] text-xs tracking-wider font-bold" style={{ animation: 'dataPulse 2s infinite' }}>
                    <span className="w-2 h-2 rounded-full bg-[#28c840] shadow-[0_0 8px_#28c84088]" />
                    Answer submitted — waiting for other players...
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* ── Footer ── */}
          <footer className="px-4 md:px-6 py-2 border-t border-[#46465c]/15 bg-[#0c0c1f]/50 backdrop-blur-sm flex justify-between items-center text-[10px] text-[#2a2a3c]" style={{ animation: 'fadeSlideUp 0.5s 0.6s both' }}>
            <span className="tracking-wider">devgame v0.1.0</span>
            <span className={`flex items-center gap-1.5 ${isSubmitted ? "text-[#28c840]" : "text-[#46465c]"}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isSubmitted ? '#28c840' : '#46465c', boxShadow: isSubmitted ? '0 0 6px #28c84088' : 'none' }} />
              {isSubmitted ? "SUBMITTED" : "ACTIVE"}
            </span>
            <span className="tracking-wider">socket: {roomId ?? "..."}</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;