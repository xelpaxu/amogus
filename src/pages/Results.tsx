import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiAlertOctagon, FiUser, FiCode, FiTerminal,
  FiActivity, FiZap, FiCornerDownRight, FiChevronRight,
  FiHome, FiEye, FiCrosshair, FiRadio, FiLock, FiUnlock,
  FiClock, FiLayers, FiServer, FiGitBranch,
} from "react-icons/fi";
import { MdOutlineBiotech } from "react-icons/md";
import bgvid from "../../assets/ui-assets/bg.mp4";
import { getAvatarById } from "../avatars";

// ─── Helpers ───────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const GLITCH_CHARS = '█▓▒░╔╗╚╝║═╬┼┤├┬┴─│ABCDEF0123456789';

// ─── Types ────────────────────────────────────────────────────
interface PlayerResult {
  playerId: string; name: string; avatarId: string;
  prediction: "IMPOSTOR" | "CREWMATE"; group_similarity: number; is_suspicious: boolean;
}
interface PlayerSubmission {
  id: string; name: string; avatarId: string; sentence: string; code: string;
}
interface Particle {
  id: number; x: number; y: number; size: string;
  duration: number; delay: number; color: string; drift: number;
}

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
}> = ({ position, delay, color = '#ff51fa', size = 50 }) => {
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
    <div className="absolute pointer-events-none" style={{ width: size, height: size, ...parseStyle(positions[position]), transform: `rotate(${rotations[position]})`, animation: `bracketDraw 0.6s ${delay}s both cubic-bezier(0.22, 1, 0.36, 1)` }}>
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="absolute top-0 left-0 h-full w-[2px]" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
      <div className="absolute top-0 left-0 w-2.5 h-2.5" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
    </div>
  );
};

// ─── Typewriter hook ────────────────────────────────────────────
function useTypewriter(text: string, speed = 28, delay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false); let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1)); i++;
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return { displayed, done };
}

// ─── Animated number ────────────────────────────────────────────
function AnimatedPct({ value, delay = 0 }: { value: number; delay?: number }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let start = 0; const target = Math.round(value * 100 * 10) / 10;
      const step = target / 40;
      const id = setInterval(() => {
        start = Math.min(start + step, target); setCur(Math.round(start * 10) / 10);
        if (start >= target) clearInterval(id);
      }, 25);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return <>{cur.toFixed(1)}</>;
}

// ─── ScanBar ────────────────────────────────────────────────────
const ScanBar = ({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) => {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), delay + 100); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div className="relative h-[3px] w-full bg-white/5 overflow-hidden rounded-full">
      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, background: color, boxShadow: `0 0 8px ${color}88` }} />
      <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ left: `${w}%`, transform: "translateX(-100%)", transition: "left 1000ms ease-out", transitionDelay: `${delay}ms` }} />
    </div>
  );
};

// ─── HexGrid ────────────────────────────────────────────────────
const HexGrid = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="hex" width="56" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(10)">
        <polygon points="28,4 52,16 52,40 28,52 4,40 4,16" fill="none" stroke="#81ecff" strokeWidth="0.8" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hex)" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// ─── MAIN RESULT SCREEN ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const ResultScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId: paramRoomId } = useParams();

  const {
    results = [] as PlayerResult[], impostor = "UNKNOWN",
    similarity_matrix = [] as number[][], theme = "N/A", fake_theme = "N/A",
    roomId = paramRoomId || "0000", players = [] as PlayerSubmission[],
  } = location.state || {};

  const [activeTab, setActiveTab] = useState<"verdict" | "matrix" | "audit">("verdict");
  const [selectedPlayer, setSelectedPlayer] = useState<string>(players[0]?.id || "");
  const [blink, setBlink] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [revealImpostor, setRevealImpostor] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [glitchImpostor, setGlitchImpostor] = useState("...");

  // A/B video refs
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [, setActiveVideo] = useState<'a' | 'b'>('a');
  const CROSSFADE_OFFSET = 1.5;
  const FADE_DURATION = 800;

  // Particles
  const particles = useRef<Particle[]>(
    Array.from({ length: 25 }, (_, i) => ({
      id: i, x: rand(0, 100), y: rand(0, 100), size: `${rand(1, 4)}px`,
      duration: rand(8, 16), delay: rand(0, 6),
      color: pick(['#ff51fa', '#81ecff', '#ffe483', '#ff51fa88', '#81ecff66']),
      drift: rand(-30, 30),
    }))
  ).current;

  const impostorName = impostor.toUpperCase();
  const { displayed: typedName } = useTypewriter(impostorName, 60, 1200);

  // Content reveal
  useEffect(() => { const t = setTimeout(() => setShowContent(true), 200); return () => clearTimeout(t); }, []);

  // Impostor glitch
  useEffect(() => {
    if (!impostorName || impostorName === "UNKNOWN") return;
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (Math.random() > 0.85) {
          const arr = impostorName.split('');
          const idx = Math.floor(Math.random() * arr.length);
          arr[idx] = pick(GLITCH_CHARS.split(''));
          setGlitchImpostor(impostorName);
          setTimeout(() => setGlitchImpostor(impostorName), rand(50, 120));
        }
      }, 130);
    }, 2500);
    return () => { clearTimeout(start); if (interval) clearInterval(interval); };
  }, [impostorName]);

  // Mount + blink
  useEffect(() => {
    const t = setTimeout(() => setRevealImpostor(true), 800);
    const b = setInterval(() => setBlink(v => !v), 530);
    return () => { clearTimeout(t); clearInterval(b); };
  }, []);

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

  const safeMatrix: number[][] = similarity_matrix?.length > 0
    ? similarity_matrix
    : results.map((_: PlayerResult, r: number) => results.map((__: PlayerResult, c: number) => r === c ? 1 : 0.45 + ((r * c * 0.07) % 0.4)));
  const auditPlayer = players.find((p: PlayerSubmission) => p.id === selectedPlayer) || players[0];
  const impostorResult = results.find((r: PlayerResult) => r.prediction === "IMPOSTOR");

  // ─── Empty state ────────────────────────────────────────────────
  if (results.length === 0) {
    return (
      <div className="dark min-h-screen bg-[#04040a] flex items-center justify-center p-6" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap'); * { font-family: 'Share Tech Mono', monospace !important; } .orbitron { font-family: 'Orbitron', sans-serif !important; }`}</style>
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-5xl font-black text-[#ff51fa] orbitron">404</div>
          <div className="text-[#ff51fa] text-sm tracking-widest uppercase animate-pulse">Signal Lost</div>
          <p className="text-gray-600 text-xs leading-relaxed">Telemetry data not found. Session may have expired.</p>
          <button onClick={() => navigate("/")} className="w-full py-3 border border-[#ff51fa]/40 text-[#ff51fa] text-xs tracking-widest uppercase hover:bg-[#ff51fa]/10 transition-all cursor-pointer">← Return to Base</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="dark">
      {/* ── Background: A/B crossfade video ── */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        <video ref={videoARef} className="absolute w-full h-full object-cover" muted playsInline preload="auto" style={{ opacity: 1, transition: `opacity ${FADE_DURATION}ms ease` }}><source src={bgvid} type="video/mp4" /></video>
        <video ref={videoBRef} className="absolute w-full h-full object-cover" muted playsInline preload="auto" style={{ opacity: 0, transition: `opacity ${FADE_DURATION}ms ease` }}><source src={bgvid} type="video/mp4" /></video>
        <div className="absolute inset-0 bg-[#04040a]/80" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(255,81,250,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(129,236,255,0.05) 0%, transparent 50%)" }} />
        <HexGrid />
      </div>

      {/* ── All Keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
        :root { --pink: #ff51fa; --cyan: #81ecff; --green: #28c840; --yellow: #ffe483; --red: #ff4444; --dark: #04040a; --card: rgba(8,8,18,0.85); }
        * { font-family: 'Share Tech Mono', monospace !important; }
        .orbitron { font-family: 'Orbitron', sans-serif !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(129,236,255,0.2); border-radius: 2px; }
        
        @keyframes particleFloat { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; } 25% { transform: translate(calc(var(--drift) * 0.5), -12px) scale(1.1); opacity: 0.7; } 50% { transform: translate(var(--drift), -25px) scale(0.6); opacity: 0.15; } 75% { transform: translate(calc(var(--drift) * -0.3), -8px) scale(1); opacity: 0.5; } }
        @keyframes bracketDraw { 0% { opacity: 0; clip-path: inset(0 100% 100% 0); } 100% { opacity: 1; clip-path: inset(0 0 0 0); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes borderTrace { 0% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; } 25% { background-position: 100% 0%, 100% 100%, 0% 100%, 0% 0%; } 50% { background-position: 100% 100%, 0% 100%, 0% 0%, 100% 0%; } 75% { background-position: 0% 100%, 0% 0%, 100% 0%, 100% 100%; } 100% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes gridScroll { 0% { transform: perspective(500px) rotateX(60deg) translateY(0); } 100% { transform: perspective(500px) rotateX(60deg) translateY(50px); } }
        @keyframes flickerIn { 0% { opacity: 0; } 8% { opacity: 0.7; } 12% { opacity: 0.2; } 20% { opacity: 0.9; } 28% { opacity: 0.4; } 45% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes dataPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glitchClip1 { 0%, 100% { clip-path: inset(0 0 93% 0); transform: translate(0); } 8% { clip-path: inset(18% 0 62% 0); transform: translate(-3px, 1px); } 16% { clip-path: inset(48% 0 22% 0); transform: translate(2px, -1px); } 24% { clip-path: inset(78% 0 5% 0); transform: translate(-1px, 0); } 32%, 100% { clip-path: inset(0 0 93% 0); transform: translate(0); } }
        @keyframes glitchClip2 { 0%, 100% { clip-path: inset(93% 0 0 0); transform: translate(0); } 12% { clip-path: inset(10% 0 70% 0); transform: translate(3px, -1px); } 20% { clip-path: inset(40% 0 30% 0); transform: translate(-2px, 1px); } 28% { clip-path: inset(70% 0 8% 0); transform: translate(1px, 0); } 36%, 100% { clip-path: inset(93% 0 0 0); transform: translate(0); } }
        @keyframes borderPulse { 0%,100% { border-color: rgba(255,81,250,0.3); box-shadow: 0 0 12px rgba(255,81,250,0.1); } 50% { border-color: rgba(255,81,250,0.7); box-shadow: 0 0 30px rgba(255,81,250,0.25), inset 0 0 20px rgba(255,81,250,0.05); } }
        @keyframes terminalFlash { 0% { opacity: 0; } 5% { opacity: 0.03; } 10% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes pulseRing { 0% { transform: scale(0.8); opacity: 0.6; } 50% { transform: scale(1.2); opacity: 0.1; } 100% { transform: scale(0.8); opacity: 0.6; } }
        
        .glitch-wrap { position: relative; display: inline-block; }
        .glitch-wrap::before, .glitch-wrap::after { content: attr(data-text); position: absolute; top: 0; left: 0; font-family: inherit !important; font-size: inherit; font-weight: inherit; color: inherit; }
        .glitch-wrap::before { color: var(--cyan); animation: glitchClip1 3s 1.2s infinite; text-shadow: none; }
        .glitch-wrap::after { color: var(--pink); animation: glitchClip2 3s 1.5s infinite; text-shadow: none; }
        .impostor-pulse { animation: borderPulse 2.5s ease-in-out infinite; }
        .tab-btn { position: relative; transition: color 0.2s; }
        .tab-btn::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--cyan); box-shadow: 0 0 10px var(--cyan); transform: scaleX(0); transition: transform 0.25s ease; }
        .tab-btn.active::after { transform: scaleX(1); }
        .player-card { transition: all 0.25s ease; cursor: default; }
        .player-card:hover { transform: translateY(-2px); }
        .mcell { transition: all 0.15s ease; }
        .mcell:hover { transform: scale(1.12); z-index: 20; }
        .trace-frame { position: absolute; inset: 8px; border: 1px solid transparent; background: linear-gradient(#ff51fa22, #ff51fa22) top left, linear-gradient(#81ecff22, #81ecff22) top right, linear-gradient(#ffe48322, #ffe48322) bottom right, linear-gradient(#ff51fa22, #ff51fa22) bottom left; background-size: 25% 1px, 25% 1px, 25% 1px, 25% 1px; background-repeat: no-repeat; animation: borderTrace 6s linear infinite; pointer-events: none; }
        .cyber-grid { position: absolute; bottom: 0; left: -50%; width: 200%; height: 20vh; background-image: linear-gradient(rgba(129,236,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(129,236,255,0.03) 1px, transparent 1px); background-size: 60px 60px; transform: perspective(500px) rotateX(60deg); transform-origin: center top; animation: gridScroll 3s linear infinite; mask-image: linear-gradient(to bottom, transparent, black 40%); -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%); pointer-events: none; }
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
        <CornerBracket position="tl" delay={0.4} color="#ff51fa" size={50} />
        <CornerBracket position="tr" delay={0.6} color="#81ecff" size={50} />
        <CornerBracket position="br" delay={0.8} color="#ff51fa" size={50} />
        <CornerBracket position="bl" delay={1.0} color="#81ecff" size={50} />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MAIN CONTENT ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="relative z-20 min-h-screen text-white overflow-x-hidden"
        style={{ animation: showContent ? 'flickerIn 0.8s 0.15s both' : 'none', opacity: showContent ? undefined : 0 }}
      >
        {/* ── TOP STATUS BAR ── */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2 border-b border-white/6 bg-black/60 backdrop-blur-md text-[10px] tracking-widest text-gray-600 uppercase" style={{ animation: 'fadeSlideUp 0.5s 0.3s both' }}>
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" style={{ boxShadow: "0 0 6px var(--green)", animation: 'dataPulse 2s infinite' }} />
            <span>SYSTEM ONLINE</span>
            <span className="text-gray-700">|</span>
            <FiRadio className="w-3 h-3 text-[var(--cyan)]" />
            <span>ROOM <span className="text-gray-400">{roomId}</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[var(--pink)]">ANALYSIS COMPLETE</span>
            <span className="text-gray-700">|</span>
            <FiClock className="w-3 h-3" />
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="relative min-h-screen pt-10 pb-8 px-4 md:px-6 max-w-7xl mx-auto">

          {/* ── HERO: IMPOSTOR REVEAL ── */}
          <div
            className="relative mt-8 mb-6 overflow-hidden rounded-2xl border"
            style={{
              borderColor: "rgba(255,81,250,0.25)",
              background: "linear-gradient(135deg, rgba(30,0,30,0.9) 0%, rgba(8,8,20,0.95) 60%, rgba(0,10,30,0.9) 100%)",
              boxShadow: "0 0 60px rgba(255,81,250,0.08), inset 0 0 60px rgba(255,81,250,0.03)",
              animation: 'fadeSlideUp 0.6s 0.4s both',
            }}
          >
            {/* Hero corner brackets */}
            <div className="absolute inset-0 pointer-events-none p-4 z-10">
              <CornerBracket position="tl" delay={0.6} color="#ff51fa" size={40} />
              <CornerBracket position="tr" delay={0.8} color="#81ecff" size={40} />
              <CornerBracket position="br" delay={1.0} color="#ff51fa" size={40} />
              <CornerBracket position="bl" delay={1.2} color="#81ecff" size={40} />
            </div>

            {/* Scanline on hero */}
            <div className="absolute inset-0 pointer-events-none opacity-15 z-[5]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }} />

            {/* BG watermark */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[100px] font-black orbitron leading-none select-none pointer-events-none" style={{ color: "rgba(255,81,250,0.04)", letterSpacing: "-4px" }}>
              IMPOSTOR
            </div>

            {/* Pulsing rings behind icon */}
            <div className="absolute left-20 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-32 h-32 rounded-full border border-[#ff51fa22]" style={{ animation: 'pulseRing 3s infinite ease-in-out' }} />
            </div>
            <div className="absolute left-20 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-48 h-48 rounded-full border border-[#ff51fa11]" style={{ animation: 'pulseRing 4s 0.5s infinite ease-in-out' }} />
            </div>

            <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-8 z-10">
              {/* Left: alert icon */}
              <div className="shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center impostor-pulse border" style={{ background: "rgba(255,81,250,0.08)" }}>
                <FiCrosshair className="w-10 h-10 text-[var(--pink)]" style={{ filter: "drop-shadow(0 0 12px var(--pink))" }} />
              </div>

              {/* Center: name reveal */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-[9px] tracking-[0.3em] uppercase" style={{ color: "rgba(255,68,68,0.9)" }}>
                  <FiAlertOctagon className="w-3 h-3" />
                  LOO-BERT ISOLATION RESULT
                </div>
                <div>
                  <div className="text-[11px] text-gray-600 tracking-widest uppercase mb-1">TARGET IDENTIFIED</div>
                  <div
                    className="glitch-wrap orbitron font-black leading-none"
                    data-text={glitchImpostor || typedName}
                    style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--pink)", textShadow: "0 0 30px rgba(255,81,250,0.5), 0 0 60px rgba(255,81,250,0.2)" }}
                  >
                    {typedName}
                    {!revealImpostor && <span className="opacity-60">█</span>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 max-w-lg leading-relaxed">
                  Semantic embedding diverged from group centroid by{" "}
                  <span style={{ color: "var(--pink)" }}>{impostorResult ? ((1 - impostorResult.group_similarity) * 100).toFixed(1) : "—"}%</span>
                  . Subject responses failed to cluster within the LOO threshold.
                </p>
              </div>

              {/* Right: theme pills */}
              <div className="shrink-0 space-y-2 text-right">
                <div>
                  <div className="text-[9px] text-gray-600 tracking-widest uppercase mb-1">Crew Theme</div>
                  <div className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border" style={{ color: "var(--cyan)", borderColor: "rgba(129,236,255,0.25)", background: "rgba(129,236,255,0.07)", textShadow: "0 0 12px var(--cyan)" }}>
                    {theme}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-600 tracking-widest uppercase mb-1">Decoy Theme</div>
                  <div className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border" style={{ color: "var(--pink)", borderColor: "rgba(255,81,250,0.25)", background: "rgba(255,81,250,0.07)", textShadow: "0 0 12px var(--pink)" }}>
                    {fake_theme}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── TAB NAV ── */}
          <div className="flex items-end gap-0 border-b border-white/8 mb-6" style={{ animation: 'fadeSlideUp 0.5s 0.6s both' }}>
            {([
              { id: "verdict", label: "Anomaly Verdict", icon: FiEye },
              { id: "matrix", label: "Correlation Matrix", icon: FiLayers },
              { id: "audit", label: "Source Audit", icon: FiTerminal },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`tab-btn flex items-center gap-2 px-5 py-3 text-xs tracking-widest uppercase transition-colors cursor-pointer ${activeTab === id ? "active text-[var(--cyan)]" : "text-gray-600 hover:text-gray-400"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => navigate("/game_lobby")} className="flex items-center gap-2 px-4 py-3 text-xs text-gray-600 hover:text-white tracking-widest uppercase transition-colors cursor-pointer">
              <FiHome className="w-3.5 h-3.5" />
              Lobby
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════
              TAB: VERDICT
          ══════════════════════════════════════════════════════ */}
          {activeTab === "verdict" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Player cards */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map((player: PlayerResult, idx: number) => {
                  const avatar = getAvatarById(player.avatarId);
                  const isImp = player.prediction === "IMPOSTOR";
                  const simPct = player.group_similarity * 100;
                  const barColor = isImp ? "var(--pink)" : "var(--green)";
                  return (
                    <div
                      key={player.playerId}
                      className="player-card relative overflow-hidden rounded-xl border p-5"
                      style={{
                        background: isImp ? "linear-gradient(135deg, rgba(40,0,30,0.9), rgba(12,6,18,0.95))" : "rgba(8,10,20,0.85)",
                        borderColor: isImp ? "rgba(255,81,250,0.35)" : "rgba(255,255,255,0.07)",
                        boxShadow: isImp ? "0 0 24px rgba(255,81,250,0.08)" : "none",
                        animation: `slideInUp 0.5s ${idx * 0.07 + 0.1}s ease both`,
                      }}
                    >
                      {/* Scanline on card */}
                      <div className="absolute inset-0 pointer-events-none opacity-10 z-[5]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }} />
                      {/* Top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: isImp ? "linear-gradient(90deg, var(--pink), transparent)" : "linear-gradient(90deg, rgba(255,255,255,0.05), transparent)" }} />
                      {/* Card corners */}
                      <div className="absolute inset-0 pointer-events-none z-10 p-1.5">
                        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-[#ff51fa33]" />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#81ecff33]" />
                        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#81ecff33]" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-[#ff51fa33]" />
                      </div>
                      {/* Watermark rank */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl font-black orbitron select-none pointer-events-none" style={{ color: isImp ? "rgba(255,81,250,0.06)" : "rgba(255,255,255,0.03)" }}>
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="relative space-y-4 z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg overflow-hidden border shrink-0"
                              style={{
                                borderColor: isImp
                                  ? "rgba(255,81,250,0.3)"
                                  : "rgba(255,255,255,0.08)",
                              }}
                            >
                              <img
                                src={avatar?.image}
                                alt={avatar?.alt}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="text-sm font-bold uppercase tracking-wider text-white">{player.name}</div>
                              <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">{player.avatarId}</div>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider" style={{ background: isImp ? "rgba(255,50,50,0.12)" : "rgba(40,200,64,0.1)", borderColor: isImp ? "rgba(255,68,68,0.35)" : "rgba(40,200,64,0.3)", color: isImp ? "#ff4444" : "var(--green)" }}>
                            {isImp ? <FiUnlock className="w-3 h-3" /> : <FiLock className="w-3 h-3" />}
                            {player.prediction}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[9px] tracking-widest uppercase">
                            <span className="text-gray-600 flex items-center gap-1"><FiActivity className="w-3 h-3" /> Conformity Index</span>
                            <span style={{ color: barColor, textShadow: `0 0 8px ${barColor}` }} className="font-bold text-xs">
                              <AnimatedPct value={player.group_similarity} delay={idx * 70 + 200} />%
                            </span>
                          </div>
                          <ScanBar pct={simPct} color={barColor} delay={idx * 70 + 200} />
                        </div>
                        {player.is_suspicious && (
                          <div className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase px-2 py-1 rounded border" style={{ color: "var(--yellow)", borderColor: "rgba(255,228,131,0.2)", background: "rgba(255,228,131,0.05)" }}>
                            <FiZap className="w-3 h-3" /> Semantic Outlier Flagged
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right sidebar */}
              <div className="lg:col-span-4 space-y-3">
                <div className="rounded-xl border p-5 space-y-4" style={{ animation: 'slideInLeft 0.6s 0.2s ease both', background: "rgba(6,8,18,0.9)", borderColor: "rgba(129,236,255,0.1)" }}>
                  <div className="flex items-center gap-2 pb-3 border-b border-white/6">
                    <MdOutlineBiotech className="w-4 h-4" style={{ color: "var(--cyan)" }} />
                    <span className="text-[10px] tracking-widest uppercase text-gray-400">Model Telemetry</span>
                  </div>
                  {[
                    { label: "Architecture", val: "DistilBERT", icon: FiServer },
                    { label: "Strategy", val: "LOO Centroid", icon: FiGitBranch },
                    { label: "Threshold", val: "Δ 0.70", icon: FiZap },
                    { label: "Input Prompts", val: "3 Steps", icon: FiLayers },
                    { label: "Vector Dim", val: "768 F32", icon: FiCode },
                    { label: "Players", val: String(results.length), icon: FiUser },
                  ].map(({ label, val, icon: Icon }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/4 last:border-0">
                      <span className="flex items-center gap-1.5 text-[10px] text-gray-600 tracking-widest uppercase"><Icon className="w-3 h-3 opacity-60" />{label}</span>
                      <span className="text-[10px] text-gray-300 font-bold">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border p-5 space-y-3" style={{ animation: 'slideInLeft 0.6s 0.3s ease both', background: "rgba(6,8,18,0.9)", borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 pb-3 border-b border-white/6">
                    <FiActivity className="w-4 h-4 text-gray-500" />
                    <span className="text-[10px] tracking-widest uppercase text-gray-400">Score Ranking</span>
                  </div>
                  {[...results].sort((a: PlayerResult, b: PlayerResult) => a.group_similarity - b.group_similarity).map((p: PlayerResult, i: number) => (
                    <div key={p.playerId} className="flex items-center gap-3">
                      <span className="orbitron text-[10px] font-black w-5 text-right shrink-0" style={{ color: i === 0 ? "var(--pink)" : "rgba(255,255,255,0.25)" }}>#{i + 1}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400 flex-1 truncate">{p.name}</span>
                      <span className="text-[10px] font-bold" style={{ color: i === 0 ? "var(--pink)" : "var(--green)" }}>{(p.group_similarity * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB: MATRIX
          ══════════════════════════════════════════════════════ */}
          {activeTab === "matrix" && (
            <div style={{ animation: 'zoomIn 0.5s both' }} className="space-y-4">
              <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(6,8,18,0.9)", borderColor: "rgba(129,236,255,0.1)" }}>
                <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
                  <div>
                    <h3 className="text-[var(--cyan)] text-sm tracking-widest uppercase flex items-center gap-2" style={{ textShadow: "0 0 12px var(--cyan)" }}>
                      <FiLayers className="w-4 h-4" /> Cosine Similarity Matrix
                    </h3>
                    <p className="text-[9px] text-gray-600 mt-1 tracking-wide">Pairwise semantic proximity of all player embeddings</p>
                  </div>
                  <div className="text-[9px] text-gray-700 uppercase tracking-widest">{results.length} × {results.length}</div>
                </div>
                <div className="p-5 overflow-x-auto">
                  <div className="inline-grid gap-1" style={{ gridTemplateColumns: `80px repeat(${results.length}, minmax(64px, 1fr))` }}>
                    <div />
                    {results.map((p: PlayerResult, i: number) => (
                      <div key={i} className="text-center text-[9px] font-bold uppercase tracking-tight truncate pb-2 px-1 transition-colors" style={{ color: hoveredCell && (hoveredCell[0] === i || hoveredCell[1] === i) ? "var(--cyan)" : "rgba(255,255,255,0.3)" }}>
                        {p.name}
                      </div>
                    ))}
                    {results.map((row: PlayerResult, r: number) => (
                      <React.Fragment key={r}>
                        <div className="flex items-center pr-3 text-[9px] uppercase font-bold truncate border-r border-white/5 transition-colors" style={{ height: 52, color: hoveredCell && (hoveredCell[0] === r || hoveredCell[1] === r) ? "var(--cyan)" : "rgba(255,255,255,0.3)" }}>
                          {row.name}
                        </div>
                        {results.map((col: PlayerResult, c: number) => {
                          const val = safeMatrix[r]?.[c] ?? 0.5; const isDiag = r === c;
                          const isHov = hoveredCell !== null && (hoveredCell[0] === r || hoveredCell[1] === c);
                          let bg = "rgba(40,40,80,0.4)", textColor = "rgba(160,160,220,0.7)", borderC = "rgba(80,80,140,0.2)", shadow = "none";
                          if (isDiag) { bg = "rgba(129,236,255,0.06)"; textColor = "var(--cyan)"; borderC = "rgba(129,236,255,0.2)"; }
                          else if (val > 0.85) { bg = "rgba(40,200,64,0.1)"; textColor = "var(--green)"; borderC = "rgba(40,200,64,0.25)"; shadow = "0 0 8px rgba(40,200,64,0.15)"; }
                          else if (val > 0.65) { bg = "rgba(129,236,255,0.06)"; textColor = "var(--cyan)"; borderC = "rgba(129,236,255,0.15)"; }
                          else if (val < 0.4) { bg = "rgba(255,68,68,0.12)"; textColor = "#ff4444"; borderC = "rgba(255,68,68,0.3)"; shadow = "0 0 10px rgba(255,68,68,0.2)"; }
                          return (
                            <div key={c} className="mcell rounded-lg border flex flex-col items-center justify-center select-none cursor-crosshair" style={{ height: 52, background: bg, borderColor: borderC, boxShadow: shadow, filter: isHov ? "brightness(1.3)" : "brightness(1)" }} onMouseEnter={() => setHoveredCell([r, c])} onMouseLeave={() => setHoveredCell(null)} title={`${row.name} × ${col.name}: ${val.toFixed(4)}`}>
                              <span className="text-[11px] font-bold leading-tight" style={{ color: textColor }}>{val.toFixed(2)}</span>
                              <span className="text-[7px] opacity-40 uppercase tracking-widest" style={{ color: textColor }}>cos_θ</span>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-2 text-[9px] tracking-widest text-gray-600 uppercase">
                  {[
                    { color: "rgba(40,200,64,0.3)", border: "rgba(40,200,64,0.4)", label: "> 0.85 Strong" },
                    { color: "rgba(129,236,255,0.1)", border: "rgba(129,236,255,0.3)", label: "0.65–0.85 Normal" },
                    { color: "rgba(60,60,120,0.4)", border: "rgba(100,100,180,0.2)", label: "0.40–0.65 Weak" },
                    { color: "rgba(255,68,68,0.15)", border: "rgba(255,68,68,0.35)", label: "< 0.40 Anomaly" },
                  ].map(({ color, border, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-4 h-3 rounded-sm border" style={{ background: color, borderColor: border }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB: AUDIT
          ══════════════════════════════════════════════════════ */}
          {activeTab === "audit" && (
            <div style={{ animation: 'fadeIn 0.4s both' }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-[9px] text-gray-600 uppercase tracking-widest pl-1 mb-3">SELECT DOSSIER</div>
                {players.map((p: PlayerSubmission) => {
                  const ev = results.find((r: PlayerResult) => r.playerId === p.id);
                  const isImp = ev?.prediction === "IMPOSTOR";
                  const isSelected = p.id === selectedPlayer;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlayer(p.id)}
                      className="w-full text-left rounded-xl border px-4 py-3 transition-all flex items-center justify-between gap-2 cursor-pointer"
                      style={{ background: isSelected ? "rgba(129,236,255,0.05)" : "rgba(6,8,18,0.8)", borderColor: isSelected ? "rgba(129,236,255,0.3)" : "rgba(255,255,255,0.06)", boxShadow: isSelected ? "0 0 16px rgba(129,236,255,0.05)" : "none" }}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wide text-white truncate">{p.name}</div>
                        <div className="text-[9px] text-gray-600 mt-0.5 truncate">{p.id.substring(0, 8)}…</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isImp && <span className="w-2 h-2 rounded-full" style={{ background: "var(--pink)", boxShadow: "0 0 6px var(--pink)" }} />}
                        {isSelected && <FiChevronRight className="w-3 h-3" style={{ color: "var(--cyan)" }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="md:col-span-3">
                {auditPlayer ? (() => {
                  const ev = results.find((r: PlayerResult) => r.playerId === auditPlayer.id);
                  const isImp = ev?.prediction === "IMPOSTOR";
                  return (
                    <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(4,4,12,0.95)", borderColor: isImp ? "rgba(255,81,250,0.25)" : "rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                            <span className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                            <span className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
                          </div>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1.5"><FiTerminal className="w-3 h-3" style={{ color: "var(--cyan)" }} />audit_{auditPlayer.name.toLowerCase()}.log</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border" style={{ color: isImp ? "#ff4444" : "var(--green)", borderColor: isImp ? "rgba(255,68,68,0.3)" : "rgba(40,200,64,0.3)", background: isImp ? "rgba(255,68,68,0.08)" : "rgba(40,200,64,0.08)" }}>{ev?.prediction || "—"}</span>
                          <span className="text-[9px] text-gray-600 border border-white/8 px-2 py-0.5 rounded">READ ONLY</span>
                        </div>
                      </div>
                      <div className="p-5 space-y-5">
                        {ev && (
                          <div className="rounded-lg border p-4 space-y-2" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.06)" }}>
                            <div className="flex justify-between text-[9px] uppercase tracking-widest">
                              <span className="text-gray-600 flex items-center gap-1.5"><FiActivity className="w-3 h-3" /> Conformity Score</span>
                              <span style={{ color: isImp ? "var(--pink)" : "var(--green)", textShadow: `0 0 8px ${isImp ? "var(--pink)" : "var(--green)"}` }} className="font-bold">{(ev.group_similarity * 100).toFixed(1)}%</span>
                            </div>
                            <ScanBar pct={ev.group_similarity * 100} color={isImp ? "var(--pink)" : "var(--green)" } delay={100} />
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="text-[9px] text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><FiCornerDownRight className="w-3 h-3" /> prompt_01 — Description</div>
                          <div className="rounded-lg border px-4 py-3 text-xs text-gray-300 leading-relaxed min-h-[48px]" style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.06)" }}>
                            {auditPlayer.sentence || <span className="text-gray-700 italic">// No input recorded</span>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-[9px] text-gray-600 uppercase tracking-widest flex items-center gap-1.5"><FiCode className="w-3 h-3" /> prompt_03 — Code Sample</div>
                          <div className="relative rounded-lg border overflow-hidden" style={{ background: "rgba(0,0,8,0.7)", borderColor: "rgba(255,255,255,0.06)" }}>
                            <div className="absolute left-0 top-0 bottom-0 w-9 border-r flex flex-col items-center pt-3.5 select-none" style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.04)" }}>
                              {Array.from({ length: 8 }).map((_, i) => (<span key={i} className="text-[9px] text-gray-800 leading-5">{i + 1}</span>))}
                            </div>
                            <pre className="pl-12 pr-4 pt-3.5 pb-3.5 text-xs leading-5 overflow-x-auto whitespace-pre-wrap min-h-[80px]" style={{ color: "#c0ffc0" }}>
                              {auditPlayer.code || <span className="text-gray-700 italic">{"// Empty payload submitted"}</span>}
                            </pre>
                            <div className="flex items-center justify-between px-4 py-2 border-t text-[9px] text-gray-700" style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(255,255,255,0.04)" }}>
                              <span className="flex items-center gap-2"><FiCode className="w-3 h-3 text-yellow-600" /> JS · UTF-8 · LF</span>
                              <span>{auditPlayer.code?.length || 0} chars{blink && <span style={{ color: "var(--pink)" }} className="ml-1">█</span>}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-48 rounded-xl border border-dashed flex items-center justify-center text-xs text-gray-700" style={{ borderColor: "rgba(255,255,255,0.06)" }}>No dossier selected</div>
                )}
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="mt-8 flex items-center justify-between text-[9px] text-gray-700 uppercase tracking-widest border-t border-white/5 pt-4" style={{ animation: 'fadeSlideUp 0.5s 1s both' }}>
            <span>Vector Evaluation Engine v0.2.4</span>
            <span className="flex items-center gap-1.5" style={{ color: "var(--green)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)", animation: 'dataPulse 2s infinite' }} />
              All Systems Nominal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;