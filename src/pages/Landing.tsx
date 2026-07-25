import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import bgvid from '../../assets/ui-assets/bg.mp4';
import coinSound from "../../assets/sounds/coindrop.mp3";

// ─── Tiny Helpers ───────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// ─── Glitch Characters Pool ────────────────────────────────────
const GLITCH_CHARS = '█▓▒░╔╗╚╝║═╬┼┤├┬┴─│┐┘┌└ABCDEF0123456789';

// ─── Particle Component ────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number; // Keep this as a number!
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
      boxShadow: `0 0 ${p.size * 3}px ${p.color}, 0 0 ${p.size * 6}px ${p.color}44`,
      animation: `particleFloat ${p.duration}s ${p.delay}s infinite ease-in-out`,
      '--drift': `${p.drift}px`,
    } as React.CSSProperties}
  />
);

// ─── Data Stream Column ────────────────────────────────────────
interface StreamChar {
  char: string;
  opacity: number;
}

const DataColumn: React.FC<{ x: number; speed: number; delay: number; height: number }> = ({
  x,
  speed,
  delay,
  height,
}) => {
  const [chars, setChars] = useState<StreamChar[]>([]);

  useEffect(() => {
    const count = Math.floor(height / 14);
    const initial = Array.from({ length: count }, () => ({
      char: pick(GLITCH_CHARS.split('')),
      opacity: rand(0.05, 0.25),
    }));
    setChars(initial);

    const interval = setInterval(() => {
      setChars((prev) =>
        prev.map((c) => ({
          char: Math.random() > 0.7 ? pick(GLITCH_CHARS.split('')) : c.char,
          opacity: rand(0.03, 0.3),
        }))
      );
    }, speed);
    return () => clearInterval(interval);
  }, [speed, height]);

  return (
    <div
      className="absolute top-0 font-mono text-[10px] leading-[14px] text-[#81ecff] pointer-events-none select-none"
      style={{
        left: `${x}%`,
        animation: `streamScroll ${speed * countOf(chars)}ms ${delay}ms infinite linear`,
      }}
    >
      {chars.map((c, i) => (
        <div key={i} style={{ opacity: c.opacity }}>
          {c.char}
        </div>
      ))}
    </div>
  );
};

function countOf(arr: unknown[]) { return arr.length || 20; }

// ─── Typing Effect Hook ────────────────────────────────────────
function useTyping(text: string, speed = 50, startDelay = 1500) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

// ─── Sound Wave Bars ───────────────────────────────────────────
const SoundWave: React.FC = () => (
  <div className="flex items-end justify-center gap-[3px] h-8 pointer-events-none">
    {Array.from({ length: 24 }).map((_, i) => (
      <div
        key={i}
        className="w-[3px] rounded-full"
        style={{
          background: i % 2 === 0 ? '#ff51fa' : '#81ecff',
          boxShadow: `0 0 6px ${i % 2 === 0 ? '#ff51fa88' : '#81ecff88'}`,
          animation: `soundBar ${0.4 + Math.random() * 0.6}s ${Math.random() * 0.3}s infinite ease-in-out alternate`,
          height: `${rand(4, 32)}px`,
        }}
      />
    ))}
  </div>
);

// ─── Corner Bracket ────────────────────────────────────────────
const CornerBracket: React.FC<{
  position: 'tl' | 'tr' | 'bl' | 'br';
  delay: number;
}> = ({ position, delay }) => {
  const rotations = { tl: '0deg', tr: '90deg', br: '180deg', bl: '270deg' };
  const origins: Record<string, string> = {
    tl: 'top: 0; left: 0;',
    tr: 'top: 0; right: 0;',
    br: 'bottom: 0; right: 0;',
    bl: 'bottom: 0; left: 0;',
  };

  return (
    <div
      className="absolute w-12 h-12 pointer-events-none"
      style={{
        ...parseStyle(origins[position]),
        transform: `rotate(${rotations[position]})`,
        animation: `bracketDraw 0.6s ${delay}s both cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#ff51fa] to-transparent" />
      <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-[#ff51fa] to-transparent" />
      <div className="absolute top-0 left-0 w-2 h-2 bg-[#ff51fa] shadow-[0_0_8px_#ff51fa]" />
    </div>
  );
};

function parseStyle(s: string): React.CSSProperties {
  const style: Record<string, string> = {};
  s.split(';').forEach((part) => {
    const [key, val] = part.split(':').map((x) => x.trim());
    if (key && val) {
      const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      style[camel] = val;
    }
  });
  return style as React.CSSProperties;
}

// ─── HUD Readout ───────────────────────────────────────────────
const HudReadout: React.FC<{ label: string; delay: number; side: 'left' | 'right' }> = ({
  label,
  delay,
  side,
}) => {
  const [value, setValue] = useState('---');
  useEffect(() => {
    const t = setTimeout(() => {
      setValue(
        side === 'left'
          ? `${(rand(0, 999) | 0).toString().padStart(3, '0')}.${rand(10, 99) | 0}`
          : `${rand(80, 100) | 0}%`
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, side]);

  return (
    <div
      className="font-mono text-[9px] tracking-widest pointer-events-none select-none"
      style={{
        color: '#81ecff55',
        animation: `fadeIn 0.4s ${delay}ms both`,
      }}
    >
      <span className="text-[#ff51fa44]">{label}</span>{' '}
      <span className="text-[#81ecff88]">{value}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ─── MAIN LANDING SCREEN ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const LandingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [glitchText, setGlitchText] = useState('SYNT-ASK');
  const [showContent, setShowContent] = useState(false);

  // A/B video refs for seamless crossfade loop
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [, setActiveVideo] = useState<'a' | 'b'>('a');
  const CROSSFADE_OFFSET = 1.5;
  const FADE_DURATION = 800;

  const coinAudioRef = useRef(new Audio(coinSound));

  // Typing subtitle
  const { displayed: subtitle, done: subtitleDone } = useTyping(
    'The Ultimate Cyber Lobby Experience',
    45,
    1800
  );

  // Staggered content reveal
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Glitch effect on title
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (Math.random() > 0.85) {
          const arr = 'SYNT-ASK'.split('');
          const idx = Math.floor(Math.random() * arr.length);
          arr[idx] = pick(GLITCH_CHARS.split(''));
          setGlitchText(arr.join(''));
          setTimeout(() => setGlitchText('SYNT-ASK'), rand(50, 150));
        }
      }, 100);
    }, 2000);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, []);

  // Generate particles
    const particles = useRef<Particle[]>(
        Array.from({ length: 30 }, (_, i) => ({
            id: i,
            x: rand(0, 100),
            y: rand(0, 100),
            size: rand(2, 5), // Changed: Removed the string template literal template wrapper
            duration: rand(6, 14),
            delay: rand(0, 5),
            color: pick(['#ff51fa', '#81ecff', '#ffe483', '#ff51fa88', '#81ecff66']),
            drift: rand(-40, 40),
        }))
    ).current;

  // Video crossfade logic
  useEffect(() => {
    const vidA = videoARef.current;
    const vidB = videoBRef.current;
    if (!vidA || !vidB) return;

    vidA.load();
    vidB.load();
    vidA.play().catch(() => {});

    let active: 'a' | 'b' = 'a';

    const handleTimeUpdate = () => {
      const current = active === 'a' ? vidA : vidB;
      const next = active === 'a' ? vidB : vidA;

      const remaining = current.duration - current.currentTime;
      if (!isNaN(remaining) && remaining <= CROSSFADE_OFFSET) {
        next.currentTime = 0;
        next.play().catch(() => {});

        current.style.transition = `opacity ${FADE_DURATION}ms ease`;
        next.style.transition = `opacity ${FADE_DURATION}ms ease`;
        current.style.opacity = '0';
        next.style.opacity = '1';

        active = active === 'a' ? 'b' : 'a';
        setActiveVideo(active);

        setTimeout(() => {
          current.pause();
          current.currentTime = 0;
        }, FADE_DURATION + 50);
      }
    };

    vidA.addEventListener('timeupdate', handleTimeUpdate);
    vidB.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      vidA.removeEventListener('timeupdate', handleTimeUpdate);
      vidB.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

    const handleStart = useCallback(() => {
    coinAudioRef.current.currentTime = 0;
    coinAudioRef.current.play();

    setIsExiting(true);

    setTimeout(() => navigate('/setup'), 600);
    }, [navigate]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStart]);

  return (
    <div
      className={`relative min-h-screen overflow-hidden transition-all duration-500 ${
        isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* ── Background: A/B crossfade video ── */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        <video
          ref={videoARef}
          className="absolute w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
          style={{ opacity: 1, transition: `opacity ${FADE_DURATION}ms ease` }}
        >
          <source src={bgvid} type="video/mp4" />
        </video>
        <video
          ref={videoBRef}
          className="absolute w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
          style={{ opacity: 0, transition: `opacity ${FADE_DURATION}ms ease` }}
        >
          <source src={bgvid} type="video/mp4" />
        </video>
        {/* 2. CHANGED: Dropped opacity of black tint from 50% to 20% so your 3D alien details don't get drowned out */}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/10 to-black/80" />
      </div>

      {/* ── All Keyframes ── */}
      <style>{`
        /* ── Core Animations ── */
        @keyframes textGlow {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(255,81,250,0.6),
              0 0 40px rgba(255,81,250,0.2),
              0 2px 0 #000;
            transform: scale(1);
          }
          50% {
            text-shadow:
              0 0 35px rgba(129,236,255,0.9),
              0 0 70px rgba(129,236,255,0.4),
              0 0 100px rgba(255,81,250,0.2),
              0 2px 0 #000;
            transform: scale(1.02);
          }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          25% { transform: translate(calc(var(--drift) * 0.5), -20px) scale(1.2); opacity: 1; }
          50% { transform: translate(var(--drift), -40px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(calc(var(--drift) * -0.3), -15px) scale(1.1); opacity: 0.8; }
        }
        @keyframes soundBar {
          0% { height: 4px; }
          100% { height: 28px; }
        }
        @keyframes bracketDraw {
          0% { opacity: 0; clip-path: inset(0 100% 100% 0); }
          100% { opacity: 1; clip-path: inset(0 0 0 0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glitchClip1 {
          0%, 100% { clip-path: inset(0 0 95% 0); transform: translate(0); }
          10% { clip-path: inset(20% 0 60% 0); transform: translate(-4px, 1px); }
          20% { clip-path: inset(50% 0 20% 0); transform: translate(3px, -1px); }
          30% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, 0); }
          40%, 100% { clip-path: inset(0 0 95% 0); transform: translate(0); }
        }
        @keyframes glitchClip2 {
          0%, 100% { clip-path: inset(95% 0 0 0); transform: translate(0); }
          15% { clip-path: inset(10% 0 70% 0); transform: translate(5px, -1px); }
          25% { clip-path: inset(40% 0 30% 0); transform: translate(-3px, 2px); }
          35% { clip-path: inset(70% 0 10% 0); transform: translate(2px, 0); }
          45%, 100% { clip-path: inset(95% 0 0 0); transform: translate(0); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.15; }
          100% { transform: scale(0.8); opacity: 0.6; }
        }
        @keyframes borderTrace {
          0% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; }
          25% { background-position: 100% 0%, 100% 100%, 0% 100%, 0% 0%; }
          50% { background-position: 100% 100%, 0% 100%, 0% 0%, 100% 0%; }
          75% { background-position: 0% 100%, 0% 0%, 100% 0%, 100% 100%; }
          100% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; }
        }
        @keyframes holoShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes flickerIn {
          0% { opacity: 0; }
          10% { opacity: 0.8; }
          15% { opacity: 0.2; }
          25% { opacity: 0.9; }
          30% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes gridScroll {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(50px); }
        }
        @keyframes hexSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dataPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }

        .animate-pulseGlow { animation: textGlow 2.5s infinite ease-in-out; }
        .bg-gradient-radial {
          background-image: radial-gradient(circle at center, var(--tw-gradient-stops));
        }

        /* ── Glitch Title Layers ── */
        .glitch-base {
          position: relative;
        }
        .glitch-base::before,
        .glitch-base::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .glitch-base::before {
          color: #ff51fa;
          animation: glitchClip1 3s infinite linear;
          opacity: 0.7;
          mix-blend-mode: screen;
        }
        .glitch-base::after {
          color: #81ecff;
          animation: glitchClip2 3s infinite linear;
          opacity: 0.5;
          mix-blend-mode: screen;
        }

        /* ── Holo Button ── */
        .holo-btn {
          position: relative;
          background: linear-gradient(
            110deg,
            transparent 25%,
            rgba(255,255,255,0.06) 37%,
            transparent 50%
          );
          background-size: 200% 100%;
          animation: holoShimmer 3s infinite linear;
        }
        .holo-btn::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(
            90deg,
            #ff51fa,
            #81ecff,
            #ffe483,
            #ff51fa,
            #81ecff
          );
          background-size: 400% 100%;
          animation: borderTrace 4s linear infinite;
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.7;
          transition: opacity 0.3s;
        }
        .holo-btn:hover::before {
          opacity: 1;
        }

        /* ── Tracing Border Frame ── */
        .trace-frame {
          position: absolute;
          inset: 20px;
          border: 1px solid transparent;
          background:
            linear-gradient(#ff51fa, #ff51fa) top left,
            linear-gradient(#81ecff, #81ecff) top right,
            linear-gradient(#ffe483, #ffe483) bottom right,
            linear-gradient(#ff51fa, #ff51fa) bottom left;
          background-size: 25% 2px, 25% 2px, 25% 2px, 25% 2px;
          background-repeat: no-repeat;
          animation: borderTrace 6s linear infinite;
          pointer-events: none;
          opacity: 0.3;
        }

        /* ── Perspective Grid Floor ── */
        .cyber-grid {
          position: absolute;
          bottom: 0;
          left: -50%;
          width: 200%;
          height: 40vh;
          background-image:
            linear-gradient(rgba(129,236,255,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129,236,255,0.12) 1px, transparent 1px);
          background-size: 60px 60px;
          transform: perspective(500px) rotateX(60deg);
          transform-origin: center top;
          animation: gridScroll 3s linear infinite;
          mask-image: linear-gradient(to bottom, transparent, black 40%);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%);
          pointer-events: none;
        }

        /* ── Cursor blink for typing ── */
        .typing-cursor::after {
          content: '█';
          animation: blink 0.7s infinite step-end;
          color: #81ecff;
          margin-left: 2px;
          font-size: 0.85em;
        }
      `}</style>

      {/* ── CRT Scanline Overlay ── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-10" />

      {/* ── Moving Scanline Bar ── */}
      <div
        className="absolute left-0 w-full h-[2px] z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(129,236,255,0.15), transparent)',
          animation: 'scanline 4s linear infinite',
        }}
      />

      {/* ── Floating Particles ── */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {particles.map((p) => (
          <Particle key={p.id} p={p} />
        ))}
      </div>

      {/* ── Cyber Grid Floor ── */}
      <div className="cyber-grid z-[5]" />

      {/* ── HUD Trace Frame ── */}
      <div className="trace-frame z-[15]" />

      {/* ── Corner Brackets ── */}
      <div className="absolute inset-0 z-[16] pointer-events-none p-5">
        <CornerBracket position="tl" delay={0.8} />
        <CornerBracket position="tr" delay={1.0} />
        <CornerBracket position="br" delay={1.2} />
        <CornerBracket position="bl" delay={1.4} />
      </div>

      {/* ── Left HUD Readouts ── */}
      <div className="absolute left-8 top-1/4 space-y-3 z-20 pointer-events-none hidden md:block">
        <HudReadout label="SYS.LOAD" delay={1500} side="left" />
        <HudReadout label="NET.PING" delay={1800} side="left" />
        <HudReadout label="MEM.ALLOC" delay={2100} side="left" />
        <HudReadout label="FPS" delay={2400} side="left" />
        <div
          className="w-16 h-[1px] mt-2"
          style={{
            background: 'linear-gradient(90deg, #ff51fa66, transparent)',
            animation: 'fadeIn 0.4s 2600ms both',
          }}
        />
        <div
          className="font-mono text-[8px] text-[#81ecff33] tracking-wider"
          style={{ animation: 'fadeIn 0.4s 2700ms both' }}
        >
          ENCRYPTED<br />CHANNEL<br />ACTIVE
        </div>
      </div>

      {/* ── Right HUD Readouts ── */}
      <div className="absolute right-8 top-1/4 space-y-3 z-20 pointer-events-none hidden md:block text-right">
        <HudReadout label="UPTIME" delay={1600} side="right" />
        <HudReadout label="SYNC" delay={1900} side="right" />
        <HudReadout label="BAND" delay={2200} side="right" />
        <HudReadout label="LINK" delay={2500} side="right" />
        <div
          className="w-16 h-[1px] mt-2 ml-auto"
          style={{
            background: 'linear-gradient(270deg, #81ecff66, transparent)',
            animation: 'fadeIn 0.4s 2600ms both',
          }}
        />
        <div
          className="font-mono text-[8px] text-[#ff51fa33] tracking-wider"
          style={{ animation: 'fadeIn 0.4s 2700ms both' }}
        >
          NODE<br />VERIFIED<br />
          <span style={{ color: '#4ade8044' }}>● ONLINE</span>
        </div>
      </div>

      {/* ── Rotating Hex Decoration ── */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[6] pointer-events-none"
        style={{ animation: 'hexSpin 30s linear infinite' }}
      >
        <svg width="500" height="500" viewBox="0 0 500 500" fill="none" className="opacity-[0.04]">
          <polygon
            points="250,30 460,140 460,360 250,470 40,360 40,140"
            stroke="#81ecff"
            strokeWidth="1"
            fill="none"
          />
          <polygon
            points="250,70 430,165 430,335 250,430 70,335 70,165"
            stroke="#ff51fa"
            strokeWidth="0.5"
            fill="none"
          />
          <polygon
            points="250,110 400,190 400,310 250,390 100,310 100,190"
            stroke="#ffe483"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      </div>

      {/* ── Pulsing Rings Behind Title ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[7] pointer-events-none">
        <div
          className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full border border-[#ff51fa22]"
          style={{ animation: 'pulseRing 4s infinite ease-in-out' }}
        />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[7] pointer-events-none">
        <div
          className="w-[400px] h-[400px] md:w-[650px] md:h-[650px] rounded-full border border-[#81ecff11]"
          style={{ animation: 'pulseRing 5s 1s infinite ease-in-out' }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MAIN CONTENT ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 4. CHANGED: Added "pointer-events-none" to the main text wrapper, 
          and added "pointer-events-auto" to the interactive button.
          This lets mouse tracking calculations slide cleanly beneath text blocks! */}
      <div className="relative z-20 flex flex-col items-center justify-between min-h-screen py-12 px-4 text-center pointer-events-none">
        {/* ── Top Status Bar ── */}
        <div
          className="flex items-center gap-4 text-[10px] tracking-[0.3em] font-mono uppercase"
          style={{
            color: '#81ecff55',
            animation: 'flickerIn 1s 0.5s both',
          }}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade8088]" />
          <span>SYSTEM ONLINE</span>
          <span className="text-[#ff51fa44]">│</span>
          <span>READY TO LAUNCH</span>
          <span className="text-[#ff51fa44]">│</span>
          <span style={{ animation: 'dataPulse 2s infinite' }}>v3.7.1</span>
        </div>

        {/* ── Title Block ── */}
        <div
          className="space-y-5 select-none my-auto"
          style={{
            animation: showContent ? 'flickerIn 0.8s 0.6s both' : 'none',
            opacity: showContent ? undefined : 0,
          }}
        >
          {/* Pre-title tag */}
          <div className="text-[10px] md:text-xs tracking-[0.5em] text-[#ff51fa66] font-mono uppercase">
            ◈ WELCOME TO ◈
          </div>

          {/* Main Title with Glitch */}
          <div className="relative">
            <h1
              className="glitch-base font-headline font-black text-7xl md:text-9xl lg:text-[10rem] tracking-tighter text-[#ffe483] italic uppercase drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] animate-pulseGlow"
              data-text={glitchText}
            >
              <span className="relative z-10">{glitchText}</span>
            </h1>

            {/* Reflection */}
            <div
              className="absolute -bottom-4 left-0 w-full font-headline font-black text-7xl md:text-9xl lg:text-[10rem] tracking-tighter italic uppercase pointer-events-none select-none"
              style={{
                transform: 'scaleY(-1)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent 60%)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent 60%)',
                filter: 'blur(2px)',
              }}
              aria-hidden
            >
              <span className="text-[#ffe483]">SYNT-</span>
              <span className="text-[#ff51fa]">ASK</span>
            </div>
          </div>

          {/* Typing Subtitle */}
          <p
            className={`text-[#aaa8c3] text-sm md:text-base tracking-[0.4em] uppercase font-semibold pl-2 min-h-[1.5em] ${
              subtitleDone ? '' : 'typing-cursor'
            }`}
          >
            {subtitle}
          </p>

          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-[#ff51fa44]" />
            <div className="w-2 h-2 border border-[#81ecff44] rotate-45" />
            <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-[#81ecff44]" />
          </div>
        </div>

        {/* ── Bottom Action Area ── */}
        <div
          className="w-full max-w-md space-y-6"
          style={{
            animation: showContent ? 'flickerIn 0.8s 1.2s both' : 'none',
            opacity: showContent ? undefined : 0,
          }}
        >
          {/* Sound Wave */}
          <div className="flex justify-center opacity-60">
            <SoundWave />
          </div>

          {/* Holographic Button */}
          <button
            onClick={handleStart}
            className="holo-btn relative w-full py-5 rounded-lg bg-black/40 backdrop-blur-sm cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff51fa] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] pointer-events-auto"
            aria-label="Start game"
          >
            <span className="relative z-10 font-headline font-black text-2xl md:text-3xl tracking-widest text-[#ffe483] uppercase italic group-hover:text-[#81ecff] transition-colors duration-300">
              INSERT COIN
            </span>

            {/* Sub-label inside button */}
            <div className="relative z-10 text-[9px] tracking-[0.3em] text-[#aaa8c3]/40 font-mono uppercase mt-1 group-hover:text-[#aaa8c3]/70 transition-colors">
              PRESS ENTER OR CLICK TO CONTINUE
            </div>

            {/* Corner accents on button */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-[#ff51fa55] group-hover:border-[#ff51fa] transition-colors" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-[#81ecff55] group-hover:border-[#81ecff] transition-colors" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#81ecff55] group-hover:border-[#81ecff] transition-colors" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#ff51fa55] group-hover:border-[#ff51fa] transition-colors" />
          </button>

          {/* Footer Credits */}
          <div className="flex items-center justify-center gap-3 text-[9px] uppercase tracking-[0.2em] text-[#aaa8c3]/25 font-mono">
            <span>© 2026</span>
            <span className="text-[#ff51fa22]">◆</span>
            <span>SYNT-ASK NETWORK</span>
            <span className="text-[#ff51fa22]">◆</span>
            <span>ALL RIGHTS RESERVED</span>
          </div>
        </div>
      </div>

      {/* ── Side Data Streams (Matrix-ish) ── */}
      <div className="absolute inset-0 pointer-events-none z-[8] overflow-hidden opacity-40 hidden lg:block">
        {Array.from({ length: 5 }).map((_, i) => (
          <DataColumn
            key={`left-${i}`}
            x={2 + i * 2.5}
            speed={300 + i * 80}
            delay={i * 400}
            height={100 + i * 40}
          />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <DataColumn
            key={`right-${i}`}
            x={88 + i * 2.5}
            speed={250 + i * 90}
            delay={i * 350}
            height={120 + i * 30}
          />
        ))}
      </div>
    </div>
  );
};

export default LandingScreen;