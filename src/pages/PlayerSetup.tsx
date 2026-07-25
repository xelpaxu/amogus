import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, HelpCircle, Edit, Volume2, Shield, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AVATARS } from '../avatars';
import bgvid from '../../assets/ui-assets/bg.mp4';
import { AVATAR_SOUNDS } from '../avatarSounds';

// ─── Helpers ───────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const GLITCH_CHARS = '█▓▒░╔╗╚╝║═╬┼┤├┬┴─│ABCDEF0123456789';

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
        className="absolute top-0 left-0 w-1.5 h-1.5" // Reduced dot size
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </div>
  );
};

// ─── Avatar Card ───────────────────────────────────────────────
const AvatarCard: React.FC<{
  avatar: (typeof AVATARS)[number];
  isSelected: boolean;
  onClick: () => void;
  index: number;
}> = ({ avatar, isSelected, onClick, index }) => (
  <div
    className="group relative flex flex-col items-center cursor-pointer"
    onClick={onClick}
    style={{
      animation: `fadeSlideUp 0.5s ${0.3 + index * 0.08}s both cubic-bezier(0.22, 1, 0.36, 1)`,
    }}
  >
    {/* Selection ring glow */}
    {isSelected && (
      <div
        className="absolute -inset-1.5 rounded-xl z-0"
        style={{
          background: 'conic-gradient(from 0deg, #ff51fa, #81ecff, #ffe483, #ff51fa)',
          animation: 'hexSpin 4s linear infinite',
          filter: 'blur(6px)',
          opacity: 0.5,
        }}
      />
    )}

    <div
      className={`relative w-full aspect-square rounded-lg overflow-hidden transition-all duration-300 z-10 ${
        isSelected
          ? 'ring-2 ring-[#ffe483] scale-105'
          : 'border border-[#46465c]/40 hover:border-[#81ecff]/60 hover:scale-[1.03]'
      }`}
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(255,228,131,0.1), rgba(255,81,250,0.05))'
          : 'rgba(29,29,55,0.8)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Card corner brackets */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#ff51fa55]" />
        <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#81ecff55]" />
        <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-[#81ecff55]" />
        <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-[#ff51fa55]" />
      </div>

      {/* Scanline on card */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-30"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        }}
      />

      <img
        className={`w-full h-full object-cover transition-all duration-500 ${
          isSelected ? 'grayscale-0 brightness-110' : 'grayscale-[0.6] group-hover:grayscale-0 group-hover:brightness-105'
        }`}
        alt={avatar.alt}
        src={avatar.image}
      />

      {/* Hover overlay */}
      <div
        className={`absolute inset-0 z-10 transition-all duration-300 ${
          isSelected
            ? 'bg-gradient-to-t from-[#ffe483]/20 via-transparent to-transparent'
            : 'bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100'
        }`}
      />

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 z-20">
          <div className="w-4 h-4 rounded-full bg-[#ffe483] flex items-center justify-center shadow-[0_0_8px_rgba(255,228,131,0.6)]">
            <span className="text-[#635200] text-[8px] font-black">✓</span>
          </div>
        </div>
      )}

      {/* ID tag */}
      <div className="absolute bottom-1 left-1 z-20 font-mono text-[6px] tracking-widest text-white/30 uppercase"> 
        ID:{avatar.id.toUpperCase().slice(0, 6)}
      </div>
    </div>

    <p
      className={`mt-1.5 font-headline font-bold text-[11px] tracking-tight transition-all duration-300 ${
        isSelected ? 'text-[#ffe483] drop-shadow-[0_0_6px_rgba(255,228,131,0.4)]' : 'text-[#aaa8c3] group-hover:text-[#81ecff]'
      }`}
    >
      {avatar.name}
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// ─── MAIN PLAYER SETUP ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const PlayerSetup: React.FC = () => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>('fox');
  const [playerName, setPlayerName] = useState<string>('');
  const [isEntering, setIsEntering] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [glitchTitle, setGlitchTitle] = useState('choose your character');

  // A/B video refs for seamless crossfade loop
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [, setActiveVideo] = useState<'a' | 'b'>('a');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const CROSSFADE_OFFSET = 1.5;
  const FADE_DURATION = 800;

  // Particles (stable ref)
  const particles = useRef<Particle[]>(
    Array.from({ length: 20 }, (_, i) => ({ // Slightly fewer particles
      id: i,
      x: rand(0, 100),
      y: rand(0, 100),
      size: `${rand(1, 3)}px`, // Smaller particles
      duration: rand(8, 16),
      delay: rand(0, 6),
      color: pick(['#ff51fa', '#81ecff', '#ffe483', '#ff51fa88', '#81ecff66']),
      drift: rand(-30, 30),
    }))
  ).current;

  // Stagger content reveal
  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Title glitch
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (Math.random() > 0.88) {
          const base = 'choose your character';
          const arr = base.split('');
          const idx = Math.floor(Math.random() * arr.length);
          arr[idx] = pick(GLITCH_CHARS.split(''));
          setGlitchTitle(arr.join(''));
          setTimeout(() => setGlitchTitle('choose your character'), rand(50, 120));
        }
      }, 120);
    }, 1500);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, []);

  // Video crossfade
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

  const navigate = useNavigate();

  const handleEnterGame = useCallback(() => {
    if (!playerName.trim()) {
      const input = document.getElementById('player-tag-input');
      if (input) {
        input.style.animation = 'none';
        input.offsetHeight; // trigger reflow
        input.style.animation = 'shakeInput 0.4s ease';
        input.style.borderColor = '#ff51fa';
        setTimeout(() => {
          input.style.borderColor = '';
          input.style.animation = '';
        }, 600);
      }
      return;
    }

    setIsEntering(true);

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const sound = new Audio(AVATAR_SOUNDS[selectedAvatar]);
    currentAudioRef.current = sound;

    sound.onloadedmetadata = () => {
      const duration = sound.duration * 1000;
      document.documentElement.style.setProperty('--avatar-animation-duration', `${duration}ms`);
      sound.play().catch((err) => console.log('Audio play failed:', err));

      setTimeout(() => {
        navigate('/game_lobby', {
          state: { name: playerName, avatarId: selectedAvatar },
        });
      }, duration);
    };
  }, [playerName, selectedAvatar, navigate]);

  const avatars = AVATARS;

  return (
    // Enforce fixed viewport size and hide overflow
    <div className="dark h-screen w-screen overflow-hidden relative">
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
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/80" />
      </div>

      {/* ── All Keyframes ── */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .bg-gradient-radial {
          background-image: radial-gradient(circle at center, var(--tw-gradient-stops));
        }

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
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glitchClip1 {
          0%, 100% { clip-path: inset(0 0 92% 0); transform: translate(0); }
          8% { clip-path: inset(15% 0 65% 0); transform: translate(-3px, 1px); }
          16% { clip-path: inset(45% 0 25% 0); transform: translate(2px, -1px); }
          24% { clip-path: inset(75% 0 5% 0); transform: translate(-1px, 0); }
          32%, 100% { clip-path: inset(0 0 92% 0); transform: translate(0); }
        }
        @keyframes glitchClip2 {
          0%, 100% { clip-path: inset(92% 0 0 0); transform: translate(0); }
          12% { clip-path: inset(8% 0 72% 0); transform: translate(4px, -1px); }
          20% { clip-path: inset(38% 0 32% 0); transform: translate(-2px, 1px); }
          28% { clip-path: inset(68% 0 8% 0); transform: translate(1px, 0); }
          36%, 100% { clip-path: inset(92% 0 0 0); transform: translate(0); }
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
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes gridScroll {
          0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
          100% { transform: perspective(500px) rotateX(60deg) translateY(50px); }
        }
        @keyframes hexSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.4; }
          50% { transform: scale(1.05); opacity: 0.15; }
          100% { transform: scale(0.95); opacity: 0.4; }
        }
        @keyframes flickerIn {
          0% { opacity: 0; }
          8% { opacity: 0.7; }
          12% { opacity: 0.2; }
          20% { opacity: 0.9; }
          28% { opacity: 0.4; }
          45% { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes dataPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes shakeInput {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-1px); }
        }
        @keyframes avatarZoom {
          0% { transform: scale(0.3) rotate(-5deg); opacity: 0; filter: blur(15px) brightness(2); }
          20% { opacity: 1; filter: blur(0px) brightness(1.2); }
          40% { transform: scale(1) rotate(0deg); filter: blur(0px) brightness(1); }
          100% { transform: scale(2.5) rotate(3deg); opacity: 0; filter: blur(8px) brightness(0.5); }
        }
        .animate-avatarZoom { animation: avatarZoom var(--avatar-animation-duration) ease forwards; }
        @keyframes overlayGlitch {
          0%, 100% { clip-path: inset(0); }
          5% { clip-path: inset(20% 0 60% 0); transform: translateX(-5px); }
          10% { clip-path: inset(0); transform: translateX(0); }
          50% { clip-path: inset(0); }
          55% { clip-path: inset(60% 0 10% 0); transform: translateX(4px); }
          60% { clip-path: inset(0); transform: translateX(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Glitch title */
        .glitch-base { position: relative; }
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
          animation: glitchClip1 2.5s infinite linear;
          opacity: 0.6;
          mix-blend-mode: screen;
        }
        .glitch-base::after {
          color: #81ecff;
          animation: glitchClip2 2.5s infinite linear;
          opacity: 0.4;
          mix-blend-mode: screen;
        }

        /* Holo button */
        .holo-btn {
          position: relative;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.08) 37%, transparent 50%);
          background-size: 200% 100%;
          animation: holoShimmer 3s infinite linear;
        }
        .holo-btn::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(90deg, #ff51fa, #81ecff, #ffe483, #ff51fa, #81ecff);
          background-size: 400% 100%;
          animation: borderTrace 4s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.6;
          transition: opacity 0.3s;
        }
        .holo-btn:hover::before { opacity: 1; }

        /* Trace frame */
        .trace-frame {
          position: absolute;
          inset: 8px; // Tighter frame
          border: 1px solid transparent;
          background:
            linear-gradient(#ff51fa44, #ff51fa44) top left,
            linear-gradient(#81ecff44, #81ecff44) top right,
            linear-gradient(#ffe48344, #ffe48344) bottom right,
            linear-gradient(#ff51fa44, #ff51fa44) bottom left;
          background-size: 25% 1px, 25% 1px, 25% 1px, 25% 1px;
          background-repeat: no-repeat;
          animation: borderTrace 6s linear infinite;
          pointer-events: none;
        }

        /* Cyber grid */
        .cyber-grid {
          position: absolute;
          bottom: 0;
          left: -50%;
          width: 200%;
          height: 35vh;
          background-image:
            linear-gradient(rgba(129,236,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129,236,255,0.08) 1px, transparent 1px);
          background-size: 60px 60px;
          transform: perspective(500px) rotateX(60deg);
          transform-origin: center top;
          animation: gridScroll 3s linear infinite;
          mask-image: linear-gradient(to bottom, transparent, black 40%);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%);
          pointer-events: none;
        }

        /* Input glow border */
        .cyber-input { position: relative; }
        .cyber-input::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(90deg, #81ecff, #ff51fa, #81ecff);
          background-size: 200% 100%;
          animation: holoShimmer 4s linear infinite;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .cyber-input:focus-within::after { opacity: 1; }
      `}</style>

      {/* ── CRT Scanlines ── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-40" />

      {/* ── Moving Scanline Bar ── */}
      <div
        className="absolute left-0 w-full h-[2px] z-40 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(129,236,255,0.12), transparent)',
          animation: 'scanline 5s linear infinite',
        }}
      />

      {/* ── Particles ── */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {particles.map((p) => (
          <Particle key={p.id} p={p} />
        ))}
      </div>

      {/* ── Cyber Grid ── */}
      <div className="cyber-grid z-[5]" />

      {/* ── Trace Frame ── */}
      <div className="trace-frame z-[35]" />

      {/* ── Corner Brackets ── */}
      <div className="absolute inset-0 z-[36] pointer-events-none p-2"> // Tighter padding
        <CornerBracket position="tl" delay={0.6} />
        <CornerBracket position="tr" delay={0.8} color="#81ecff" />
        <CornerBracket position="br" delay={1.0} />
        <CornerBracket position="bl" delay={1.2} color="#81ecff" />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MAIN CONTENT ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="relative h-full w-full text-[#e5e3ff] font-body selection:bg-[#ff51fa] selection:text-white overflow-hidden flex flex-col"
        style={{ animation: showContent ? 'flickerIn 0.8s 0.2s both' : 'none', opacity: showContent ? undefined : 0 }}
      >
        {/* ── Header ── */}
        <header
          className="w-full px-4 py-2 flex justify-between items-center max-w-screen-2xl mx-auto z-50 flex-shrink-0" // Reduced py
          style={{ animation: 'fadeSlideUp 0.5s 0.4s both' }}
        >
          <div className="flex items-center gap-2">
            <div className="text-lg font-black text-[#ffe483] uppercase italic font-headline tracking-tight drop-shadow-[0_0_10px_rgba(255,228,131,0.3)]">
              SYNT-ASK
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded bg-[#4ade8022] border border-[#4ade8033]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade8088]" style={{ animation: 'dataPulse 2s infinite' }} />
              <span className="font-mono text-[8px] text-[#4ade80] tracking-widest uppercase">Live</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button className="relative text-[#aaa8c3] hover:text-[#81ecff] transition-colors p-1.5 rounded-lg hover:bg-white/5 group">
              <Settings size={16} />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[6px] text-[#81ecff44] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                SETTINGS
              </span>
            </button>
            <button className="relative text-[#aaa8c3] hover:text-[#81ecff] transition-colors p-1.5 rounded-lg hover:bg-white/5 group">
              <HelpCircle size={16} />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[6px] text-[#81ecff44] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                HELP
              </span>
            </button>
            <div className="w-px h-5 bg-[#46465c]/40 mx-1" />
            <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#ffe48344] hover:ring-[#ffe483] transition-all shadow-[0_0_10px_rgba(255,228,131,0.2)]">
              <img
                alt="Profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPCtSujL6i0zn_3QXZW1a70XB_IysAZDqOB20iCZSkpLzDCfXj1dBOc8mjr-P14RrgCHWXxBBtMKH3TEGQhrqXQQXAGBduUSuDoBnGyuEAicfoEgEF74OHp2BtSHyzNDWcUbThqN8AgY4NU6qGFhfAVNG2v5jaE-AyP7jW961hr8wq4oLbTlVnU7sPWWAyoB5FVqs30-RLgrvjIbTFLv5axHZBpnMxYur0iCmsOr1vZoV7N3whm846g9_NOOf3v7zRshY_IpMR_PPj"
              />
            </div>
          </div>
        </header>

        {/* ── Side HUD Left ── */}
        <div className="absolute left-4 top-1/4 space-y-1.5 z-30 pointer-events-none hidden lg:block">
          {[
            { icon: <Wifi size={8} />, label: 'PING', val: '24ms' },
            { icon: <Shield size={8} />, label: 'SEC', val: 'AES-256' },
            { icon: <Volume2 size={8} />, label: 'AUDIO', val: 'ON' },
          ].map((item, i) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 font-mono text-[7px] tracking-widest"
              style={{ color: '#81ecff33', animation: `fadeSlideUp 0.4s ${0.8 + i * 0.15}s both` }}
            >
              <span style={{ color: '#ff51fa44' }}>{item.icon}</span>
              <span>{item.label}</span>
              <span style={{ color: '#81ecff55' }}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* ── Side HUD Right ── */}
        <div className="absolute right-4 top-1/4 space-y-1.5 z-30 pointer-events-none hidden lg:block text-right">
          {['SLOT: 01', 'NODE: PH', 'RTT: OK'].map((text, i) => (
            <div
              key={text}
              className="font-mono text-[7px] tracking-widest"
              style={{ color: '#ff51fa22', animation: `fadeSlideUp 0.4s ${0.9 + i * 0.15}s both` }}
            >
              {text}
            </div>
          ))}
        </div>

        {/* ── Main Content Area ── */}
        <main className="relative flex-1 flex items-center justify-center px-4 pb-4 z-20">
          <div className="w-full max-w-3xl mx-auto space-y-4">
            {/* Title */}
            <div
              className="text-center space-y-1" // Reduced space-y
              style={{ animation: 'fadeSlideUp 0.6s 0.5s both' }}
            >
              <div className="text-[8px] tracking-[0.5em] text-[#ff51fa55] font-mono uppercase">
                ◈ CHARACTER SELECT ◈
              </div>
              <h1
                className="glitch-base font-headline font-black text-2xl sm:text-3xl md:text-4xl tracking-tighter text-[#ffe483] italic uppercase" // Massively reduced text size
                data-text={glitchTitle}
              >
                <span className="relative z-10">
                  choose your <span className="text-[#ff51fa]">character</span>
                </span>
              </h1>
              <div className="flex items-center justify-center gap-3 pt-0.5">
                <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#ff51fa33]" />
                <div className="w-1.5 h-1.5 border border-[#81ecff33] rotate-45" />
                <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#81ecff33]" />
              </div>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full max-w-xl mx-auto">
              {avatars.map((avatar, i) => (
                <AvatarCard
                  key={avatar.id}
                  avatar={avatar}
                  isSelected={selectedAvatar === avatar.id}
                  onClick={() => setSelectedAvatar(avatar.id)}
                  index={i}
                />
              ))}
            </div>

            {/* Input + Button */}
            <div
              className="w-full max-w-sm mx-auto space-y-2" // Reduced max-w and space-y
              style={{ animation: 'fadeSlideUp 0.6s 0.9s both' }}
            >
              {/* Player Tag Input */}
              <div className="cyber-input relative rounded-lg">
                <label className="block text-[8px] font-bold uppercase tracking-[0.3em] text-[#81ecff]/70 mb-1 ml-1 flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-[#81ecff44]" />
                  player tag
                  <span className="w-4 h-[1px] bg-[#81ecff44]" />
                </label>
                <div className="relative">
                  <input
                    id="player-tag-input"
                    className="w-full bg-black/60 backdrop-blur-md border-2 border-[#46465c]/40 focus:border-[#81ecff]/80 rounded-lg py-2.5 px-3 text-sm font-headline font-bold text-[#e5e3ff] outline-none transition-all placeholder:text-[#aaa8c3]/30 shadow-inner" // Smaller padding and text
                    placeholder="enter your name"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEnterGame();
                    }}
                    maxLength={16}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#81ecff]/30 group-focus-within:text-[#81ecff]/70 transition-colors">
                    <Edit size={14} />
                  </span>
                </div>
                {/* Character counter */}
                <div className="absolute bottom-2 right-3 font-mono text-[8px] text-[#aaa8c3]/20">
                  {playerName.length}/16
                </div>
              </div>

              {/* Enter Button */}
              <button
                onClick={handleEnterGame}
                className="holo-btn relative w-full bg-[#ffe483] text-[#635200] py-3 rounded-lg font-headline font-black text-base md:text-lg tracking-widest uppercase italic overflow-hidden transition-all hover:scale-[1.02] active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe483] focus-visible:ring-offset-2 focus-visible:ring-offset-black" // Reduced padding and text
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <span>Enter Game</span>
                </span>
                {/* Button corner accents */}
                <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#635200]/30 z-10" />
                <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-[#635200]/30 z-10" />
                <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-[#635200]/30 z-10" />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-[#635200]/30 z-10" />
              </button>
            </div>
          </div>
        </main>

        {/* ── Footer ── */}
        <div
          className="w-full flex justify-center z-30 pointer-events-none pb-2 flex-shrink-0"
          style={{ animation: 'fadeSlideUp 0.5s 1.2s both' }}
        >
          <div className="flex items-center gap-4 text-[7px] font-mono tracking-[0.2em] text-[#aaa8c3]/15 uppercase">
            <span>sys.protocol.v3</span>
            <span className="text-[#ff51fa11]">│</span>
            <span>encrypted</span>
            <span className="text-[#ff51fa11]">│</span>
            <span>© 2026 synt-ask</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── ENTERING OVERLAY ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isEntering && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg animate-fadeIn">
          {/* Overlay scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_3px] pointer-events-none" />

          {/* Overlay glitch flashes */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(transparent 50%, rgba(255,81,250,0.03) 50%)',
              backgroundSize: '100% 4px',
              animation: 'overlayGlitch 0.8s 0.2s steps(1) infinite',
            }}
          />

          {/* Avatar */}
          <div className="relative">
            <img
              src={avatars.find((a) => a.id === selectedAvatar)?.image}
              alt="Selected Avatar"
              className="w-[150px] md:w-[250px] object-cover rounded-2xl border-2 border-[#ffe483] shadow-[0_0_80px_rgba(255,228,131,0.5),0_0_120px_rgba(255,81,250,0.2)] animate-avatarZoom" // Smaller image
            />
          </div>

          {/* Loading text */}
          <div
            className="mt-12 font-mono text-[9px] tracking-[0.4em] text-[#81ecff44] uppercase" // Less margin, smaller text
            style={{ animation: 'dataPulse 1s infinite' }}
          >
            ◈ CONNECTING TO LOBBY ◈
          </div>

          {/* Mini progress bar */}
          <div className="mt-2 w-36 h-[2px] bg-[#46465c]/30 rounded-full overflow-hidden"> // Shorter bar
            <div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #ff51fa, #81ecff, #ffe483)',
                animation: 'holoShimmer 1.5s linear infinite',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSetup;