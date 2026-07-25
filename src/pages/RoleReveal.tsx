import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Fingerprint, Crosshair, ShieldCheck, Wifi, ShieldAlert } from "lucide-react";

const ROLE_DURATION_MS = 4200;

// ─── Helpers ───────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// ─── Particle ──────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: string;
  duration: number;
  delay: number;
  color: string;
  drift: number;
}

const Particle: React.FC<{ p: Particle }> = ({ p }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: `${p.x}%`,
      top: `${p.y}%`,
      width: p.size,
      height: p.size,
      background: p.color,
      boxShadow: `0 0 ${parseInt(p.size) * 3}px ${p.color}, 0 0 ${parseInt(p.size) * 6}px ${p.color}44`,
      animation: `particleFloat ${p.duration}s ${p.delay}s infinite ease-in-out`,
      '--drift': `${p.drift}px`,
    } as React.CSSProperties}
  />
);

// ─── Corner Bracket ────────────────────────────────────────────
const CornerBracket: React.FC<{
  position: 'tl' | 'tr' | 'bl' | 'br';
  delay: number;
  color?: string;
}> = ({ position, delay, color = '#ff51fa' }) => {
  const rotations = { tl: '0deg', tr: '90deg', br: '180deg', bl: '270deg' };
  const positions: Record<string, string> = {
    tl: 'top: 0; left: 0;',
    tr: 'top: 0; right: 0;',
    br: 'bottom: 0; right: 0;',
    bl: 'bottom: 0; left: 0;',
  };

  const parseStyle = (s: string): React.CSSProperties => {
    const style: Record<string, string> = {};
    s.split(';').forEach((part) => {
      const [key, val] = part.split(':').map((x) => x.trim());
      if (key && val) {
        const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        style[camel] = val;
      }
    });
    return style as React.CSSProperties;
  };

  return (
    <div
      className="absolute w-6 h-6 pointer-events-none"
      style={{
        ...parseStyle(positions[position]),
        transform: `rotate(${rotations[position]})`,
        animation: `bracketDraw 0.5s ${delay}s both cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-[2px]"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
      <div
        className="absolute top-0 left-0 h-full w-[2px]"
        style={{ background: `linear-gradient(180deg, ${color}, transparent)` }}
      />
      <div
        className="absolute top-0 left-0 w-1.5 h-1.5"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </div>
  );
};


const RoleRevealScreen: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const gameData = location.state as {
    roomId: string;
    real_theme: string;
    fake_theme: string;
    impostorId: string;
    currentPlayerId: string;               
    players: { id: string; name: string; avatarId: string }[];
  };

  const [phase, setPhase] = useState<"reveal" | "leaving">("reveal");
  
  // Stable particles ref
  const particles = useRef<Particle[]>(
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: rand(0, 100),
      y: rand(0, 100),
      size: `${rand(1, 3)}px`,
      duration: rand(8, 16),
      delay: rand(0, 6),
      color: pick(['#ff51fa', '#81ecff', '#ffe483', '#ff51fa88', '#81ecff66']),
      drift: rand(-30, 30),
    }))
  ).current;

  useEffect(() => {
    if (!gameData) {
      navigate("/game_lobby");
      return;
    }
    const timer = setTimeout(() => {
      setPhase("leaving");
      setTimeout(() => {
        navigate(`/game_screen/${roomId}`, {
          state: {
            roomId,
            realTheme: gameData.real_theme,
            fakeTheme: gameData.fake_theme,
            impostorId: gameData.impostorId,
            players: gameData.players,
          },
        });
      }, 600);
    }, ROLE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [gameData, navigate, roomId]);

  if (!gameData) return null;

  const isImpostor = gameData.currentPlayerId === gameData.impostorId;
  const me = gameData.players.find((p) => p.id === gameData.currentPlayerId);
  const displayTheme = isImpostor ? gameData.fake_theme : gameData.real_theme;
  
  const accentColor = isImpostor ? '#ff51fa' : '#81ecff';
  const CIRCUMFERENCE = 290; // 2 * PI * 46

  return (
    <div className="dark h-screen w-screen overflow-hidden relative flex items-center justify-center font-mono text-[#e5e3ff]">
      <style>{`
        @keyframes particleFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          25% { transform: translate(calc(var(--drift) * 0.5), -15px) scale(1.2); opacity: 0.9; }
          50% { transform: translate(var(--drift), -30px) scale(0.7); opacity: 0.3; }
          75% { transform: translate(calc(var(--drift) * -0.3), -10px) scale(1.1); opacity: 0.7; }
        }
        @keyframes bracketDraw {
          0% { opacity: 0; clip-path: inset(0 100% 100% 0); }
          100% { opacity: 1; clip-path: inset(0 0 0 0); }
        }
        @keyframes scanMove {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes roleReveal {
          0%   { opacity: 0; transform: scale(0.85) translateY(20px); filter: blur(12px); }
          60%  { opacity: 1; transform: scale(1.03) translateY(-2px); filter: blur(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        .reveal-enter { animation: roleReveal 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }

        @keyframes revealLeave {
          0%   { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.08); filter: blur(10px); }
        }
        .reveal-leave { animation: revealLeave 0.5s ease-in forwards; }

        @keyframes avatarFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .avatar-float { animation: avatarFloat 3s ease-in-out infinite; }

        @keyframes roleGlow {
          0%, 100% { box-shadow: 0 0 20px ${isImpostor ? 'rgba(255,81,250,0.4)' : 'rgba(129,236,255,0.3)'}, 0 0 60px ${isImpostor ? 'rgba(255,81,250,0.1)' : 'rgba(129,236,255,0.1)'}; }
          50%       { box-shadow: 0 0 30px ${isImpostor ? 'rgba(255,81,250,0.8)' : 'rgba(129,236,255,0.6)'}, 0 0 80px ${isImpostor ? 'rgba(255,81,250,0.2)' : 'rgba(129,236,255,0.2)'}; }
        }
        .role-ring { animation: roleGlow 1.8s ease-in-out infinite; }

        @keyframes labelFlash {
          0%, 100% { opacity: 1; }
          30% { opacity: 0.3; }
          60% { opacity: 1; }
        }
        .label-flash { animation: labelFlash 0.6s ease 0.5s 2; }

        @keyframes themeFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .theme-fade { animation: themeFade 0.5s ease 1.2s both; }

        @keyframes countdown {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: ${CIRCUMFERENCE}; }
        }
        .countdown-ring {
          stroke-dasharray: ${CIRCUMFERENCE};
          stroke-dashoffset: 0;
          animation: countdown ${ROLE_DURATION_MS}ms linear forwards;
          transform: rotate(-90deg);
          transform-origin: center;
        }
        .cyber-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(129,236,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129,236,255,0.06) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .trace-frame {
          position: absolute;
          inset: 8px;
          border: 1px solid transparent;
          background:
            linear-gradient(${accentColor}44, ${accentColor}44) top left,
            linear-gradient(#81ecff44, #81ecff44) top right,
            linear-gradient(#ffe48344, #ffe48344) bottom right,
            linear-gradient(${accentColor}44, ${accentColor}44) bottom left;
          background-size: 25% 1px, 25% 1px, 25% 1px, 25% 1px;
          background-repeat: no-repeat;
          animation: borderTrace 6s linear infinite;
          pointer-events: none;
        }
        @keyframes borderTrace {
          0% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; }
          25% { background-position: 100% 0%, 100% 100%, 0% 100%, 0% 0%; }
          50% { background-position: 100% 100%, 0% 100%, 0% 0%, 100% 0%; }
          75% { background-position: 0% 100%, 0% 0%, 100% 0%, 100% 100%; }
          100% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; }
        }
        @keyframes dataPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Background Layers */}
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="cyber-grid z-[5]" />
      
      {/* CRT Scanlines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-40" />
      
      {/* Moving Scanline Bar */}
      <div
        className="absolute left-0 w-full h-[2px] z-40 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(129,236,255,0.12), transparent)',
          animation: 'scanMove 4s linear infinite',
        }}
      />

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {particles.map((p) => (
          <Particle key={p.id} p={p} />
        ))}
      </div>

      {/* Ambient Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[6]">
        <div
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: accentColor, top: "10%", left: "15%" }}
        />
        <div
          className="absolute w-48 h-48 rounded-full blur-3xl opacity-[0.08]"
          style={{ background: "#ffe483", bottom: "15%", right: "20%" }}
        />
      </div>

      {/* Trace Frame */}
      <div className="trace-frame z-[35]" />

      {/* Corner Brackets */}
      <div className="absolute inset-0 z-[36] pointer-events-none p-2">
        <CornerBracket position="tl" delay={0.2} color={accentColor} />
        <CornerBracket position="tr" delay={0.4} color="#81ecff" />
        <CornerBracket position="br" delay={0.6} color={accentColor} />
        <CornerBracket position="bl" delay={0.8} color="#81ecff" />
      </div>

      {/* ── REVEAL STATE ── */}
      <div className={`relative z-20 flex flex-col items-center gap-3 px-4 ${phase === "leaving" ? "reveal-leave" : "reveal-enter"}`}>
        
        {/* System header */}
        <div className="text-[8px] tracking-[0.5em] text-[#46465c] uppercase flex items-center gap-2">
          <span className="w-4 h-[1px] bg-[#46465c]" />
          identity_reveal.exe
          <span className="w-4 h-[1px] bg-[#46465c]" />
        </div>

        {/* Avatar + Ring Container */}
        <div className="relative avatar-float my-2">
          {/* SVG Countdown Ring */}
          <svg width="96" height="96" className="absolute inset-0" style={{ zIndex: 2 }}>
            <circle
              cx="48" cy="48" r="46" fill="none"
              stroke={`${accentColor}15`}
              strokeWidth="2"
            />
            <circle
              cx="48" cy="48" r="46" fill="none"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
              className="countdown-ring"
            />
          </svg>

          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center role-ring`}
            style={{ background: `${accentColor}10` }}
          >
            <div
              className="w-[76px] h-[76px] rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${accentColor}20, #070712)`,
                border: `1px solid ${accentColor}40`,
              }}
            >
              {/* Replaced Emoji with Lucide Icon */}
              {isImpostor ? (
                <ShieldAlert size={32} className="text-[#ff51fa] drop-shadow-[0_0_10px_rgba(255,81,250,0.8)]" />
              ) : (
                <Fingerprint size={32} className="text-[#81ecff] drop-shadow-[0_0_10px_rgba(129,236,255,0.8)]" />
              )}
            </div>
          </div>
        </div>

        {/* Player Name */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[#46465c] text-[8px] tracking-[0.4em] uppercase">player</span>
          <span className="text-white text-sm font-black tracking-widest uppercase" style={{ textShadow: `0 0 10px ${accentColor}40` }}>
            {me?.name ?? "Unknown"}
          </span>
        </div>

        {/* Role Badge */}
        <div
          className={`label-flash relative px-6 py-2 border font-black text-xs tracking-[0.3em] uppercase flex items-center gap-2`}
          style={{
            background: `${accentColor}15`,
            borderColor: `${accentColor}60`,
            color: accentColor,
            boxShadow: `inset 0 0 20px ${accentColor}10, 0 0 15px ${accentColor}20`
          }}
        >
          <div className="absolute top-1 left-1 w-2 h-2 border-t border-l" style={{ borderColor: `${accentColor}80` }} />
          <div className="absolute top-1 right-1 w-2 h-2 border-t border-r" style={{ borderColor: `${accentColor}80` }} />
          <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l" style={{ borderColor: `${accentColor}80` }} />
          <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r" style={{ borderColor: `${accentColor}80` }} />
          
          {isImpostor ? <Crosshair size={14} /> : <ShieldCheck size={14} />}
          {isImpostor ? "Impostor" : "Crewmate"}
        </div>

        {/* Role Description */}
        <p className="text-[#46465c] text-[10px] text-center max-w-[280px] leading-relaxed tracking-wide">
          {isImpostor
            ? "You received a FAKE theme. Blend in — don't get caught."
            : "You have the real theme. Code well and sniff out the impostor."}
        </p>

        {/* Theme Reveal */}
        <div className="theme-fade flex flex-col items-center gap-1.5 mt-1">
          <span className="text-[#46465c] text-[8px] tracking-[0.4em] uppercase">your theme</span>
          <div className="relative px-5 py-1.5 border border-[#ffe48333] rounded-sm bg-black/60">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ffe48355]" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ffe48355]" />
            <span
              className="font-black text-base tracking-widest uppercase"
              style={{
                color: "#ffe483",
                textShadow: "0 0 15px rgba(255,228,131,0.6)",
              }}
            >
              {displayTheme?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade8088]" style={{ animation: 'dataPulse 1s infinite' }} />
          <p className="text-[#2a2a3c] text-[8px] tracking-widest uppercase">
            synchronizing game state...
          </p>
        </div>
      </div>

      {/* Room ID & Side HUD Watermark */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-between items-end px-4 z-30 pointer-events-none">
        <div className="flex items-center gap-2 text-[7px] font-mono tracking-widest text-[#81ecff22] uppercase">
          <Wifi size={8} />
          <span>Node: Secure</span>
        </div>
        <div className="text-[#1e1e2e] text-[8px] tracking-[0.4em]">
          ROOM:{roomId ?? "????"}
        </div>
      </div>
    </div>
  );
};

export default RoleRevealScreen;