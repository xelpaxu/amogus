import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { getAvatarById } from '../avatars';
import {
  Plus,
  Search,
  Users,
  Globe,
  Lock,
  ArrowLeft,
  Wifi,
  Shield,
  Zap,
  Radio,
} from 'lucide-react';
import bgvid from '../../assets/ui-assets/bg.mp4';

// ─── Helpers ───────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const GLITCH_CHARS = '█▓▒░╔╗╚╝║═╬┼┤├┬┴─│ABCDEF0123456789';

// ─── Types ────────────────────────────────────────────────────
interface Server {
  id: string;
  name: string;
  mode: string;
  players: number;
  maxPlayers: number;
  region: string;
  isPrivate: boolean;
  isPopular: boolean;
}

interface CreateServerForm {
  name: string;
  isPrivate: boolean;
  maxPlayers: number;
}

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

// ─── Particle Component ────────────────────────────────────────
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
  size?: number;
}> = ({ position, delay, color = '#ff51fa', size = 40 }) => {
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
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        ...parseStyle(positions[position]),
        transform: `rotate(${rotations[position]})`,
        animation: `bracketDraw 0.5s ${delay}s both cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="absolute top-0 left-0 h-full w-[2px]" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
      <div className="absolute top-0 left-0 w-2 h-2" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
};

// ─── Server Card ───────────────────────────────────────────────
const ServerCard: React.FC<{
  server: Server;
  onJoin: () => void;
  index: number;
}> = ({ server, onJoin, index }) => {
  const fillPercent = (server.players / server.maxPlayers) * 100;
  const barColor = fillPercent > 80 ? '#ff51fa' : fillPercent > 50 ? '#ffe483' : '#81ecff';

  return (
    <div
      onClick={onJoin}
      className="group relative bg-[#17172f]/80 backdrop-blur-sm border border-[#46465c]/30 rounded-xl cursor-pointer overflow-hidden transition-all duration-300 hover:border-[#81ecff]/40 hover:shadow-[0_0_40px_rgba(129,236,255,0.15)] hover:-translate-y-1 active:translate-y-0"
      style={{ animation: `fadeSlideUp 0.45s ${0.2 + index * 0.06}s both cubic-bezier(0.22, 1, 0.36, 1)` }}
    >
      {/* Card scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-10"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)' }}
      />

      {/* Popular badge */}
      {server.isPopular && (
        <div
          className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded bg-[#ff51fa22] border border-[#ff51fa44]"
          style={{ animation: 'dataPulse 2s infinite' }}
        >
          <Zap size={10} className="text-[#ff51fa]" />
          <span className="font-mono text-[8px] text-[#ff51fa] tracking-widest uppercase">Hot</span>
        </div>
      )}

      {/* Private badge */}
      {server.isPrivate && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded bg-[#ffe48322] border border-[#ffe48344]">
          <Lock size={10} className="text-[#ffe483]" />
          <span className="font-mono text-[8px] text-[#ffe483] tracking-widest uppercase">Private</span>
        </div>
      )}

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] z-10 transition-all duration-300 opacity-40 group-hover:opacity-100"
        style={{ background: `linear-gradient(180deg, #ff51fa, #81ecff)` }}
      />

      {/* Corner brackets inside card */}
      <div className="absolute inset-0 pointer-events-none z-10 p-2">
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#ff51fa33] group-hover:border-[#ff51fa66] transition-colors" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#81ecff33] group-hover:border-[#81ecff66] transition-colors" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#81ecff33] group-hover:border-[#81ecff66] transition-colors" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#ff51fa33] group-hover:border-[#ff51fa66] transition-colors" />
      </div>

      <div className="relative z-10 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: fillPercent >= server.maxPlayers ? '#ff51fa' : '#4ade80',
                  boxShadow: `0 0 8px ${fillPercent >= server.maxPlayers ? '#ff51fa88' : '#4ade8088'}`,
                  animation: 'dataPulse 2s infinite',
                }}
              />
              <h3 className="font-headline font-black text-lg md:text-xl text-[#ffe483] uppercase tracking-tight truncate">
                {server.name}
              </h3>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs md:text-sm ml-5">
              <div className="flex items-center gap-1.5">
                <span className="text-[#aaa8c3]/60">MODE:</span>
                <span className="font-bold text-[#81ecff]">{server.mode}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe size={12} className="text-[#81ecff]/60" />
                <span className="font-bold text-[#81ecff]/80">{server.region}</span>
              </div>
            </div>
          </div>

          {/* Right: Players + Join */}
          <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
            {/* Player count with mini bar */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#81ecff]/60" />
                <span className="font-headline font-bold text-[#ffe483] text-sm">
                  {server.players}<span className="text-[#aaa8c3]/40">/{server.maxPlayers}</span>
                </span>
              </div>
              <div className="w-20 h-[3px] bg-[#46465c]/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${fillPercent}%`,
                    background: barColor,
                    boxShadow: `0 0 6px ${barColor}66`,
                  }}
                />
              </div>
            </div>

            <button
              className="bg-[#ffe483] text-[#635200] px-6 py-3 rounded-lg font-headline font-black text-sm uppercase tracking-wider shadow-[0_5px_0_#635200] transition-all hover:shadow-[0_3px_0_#635200] hover:translate-y-[2px] active:shadow-[0_1px_0_#635200] active:translate-y-[4px] disabled:opacity-40"
              disabled={server.players >= server.maxPlayers}
            >
              {server.players >= server.maxPlayers ? 'FULL' : 'JOIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ─── MAIN GAME LOBBY ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const GameLobby: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const playerInfo = (location.state as { name: string; avatarId: string }) || {
    name: 'Guest',
    avatarId: 'fox',
  };

  const [view, setView] = useState<'servers' | 'create'>('servers');
  const [searchQuery, setSearchQuery] = useState('');
  const [servers, setServers] = useState<Server[]>([]);
  const [isSpawning, setIsSpawning] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [glitchTitle, setGlitchTitle] = useState('choose a server to join');
  const [createForm, setCreateForm] = useState<CreateServerForm>({
    name: '',
    isPrivate: false,
    maxPlayers: 16,
  });

  // A/B video refs
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [, setActiveVideo] = useState<'a' | 'b'>('a');
  const CROSSFADE_OFFSET = 1.5;
  const FADE_DURATION = 800;

  // Particles
  const particles = useRef<Particle[]>(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: rand(0, 100),
      y: rand(0, 100),
      size: `${rand(1, 3)}px`,
      duration: rand(10, 18),
      delay: rand(0, 7),
      color: pick(['#ff51fa', '#81ecff', '#ffe483', '#ff51fa88', '#81ecff66']),
      drift: rand(-25, 25),
    }))
  ).current;

  // Content reveal
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
          const base = 'choose a server to join';
          const arr = base.split('');
          const idx = Math.floor(Math.random() * arr.length);
          arr[idx] = pick(GLITCH_CHARS.split(''));
          setGlitchTitle(arr.join(''));
          setTimeout(() => setGlitchTitle('choose a server to join'), rand(50, 120));
        }
      }, 130);
    }, 1800);
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
        setTimeout(() => { current.pause(); current.currentTime = 0; }, FADE_DURATION + 50);
      }
    };
    vidA.addEventListener('timeupdate', handleTimeUpdate);
    vidB.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      vidA.removeEventListener('timeupdate', handleTimeUpdate);
      vidB.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const API_URL = import.meta.env.VITE_GAME_SERVER_URL;

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/servers`);
        if (!response.ok) throw new Error('Server not responding');
        const data = await response.json();
        setServers(data);
      } catch (error) {
        console.error('Lobby Error:', error);
      }
    };
    fetchServers();
    socket.on('update_rooms_list', fetchServers);
    socket.on('room_created', (data) => {
      setIsSpawning(false);
      navigate(`/room_lobby/${data.room_id}`, { state: playerInfo });
    });
    return () => {
      socket.off('update_rooms_list');
      socket.off('room_created');
    };
  }, [navigate, playerInfo]);

  const handleJoinServer = useCallback((roomId: string) => {
    navigate(`/room_lobby/${roomId}`, { state: playerInfo });
  }, [navigate, playerInfo]);

  const handleCreateServer = useCallback(() => {
    if (!createForm.name) return;
    setIsSpawning(true);
    socket.emit('create_room', {
      name: playerInfo.name,
      avatarId: playerInfo.avatarId,
      roomName: createForm.name,
      maxPlayers: createForm.maxPlayers,
      isPrivate: createForm.isPrivate,
    });
  }, [createForm, playerInfo]);

  const filteredServers = servers.filter((server) =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dark">
      {/* ── Background: A/B crossfade video ── */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        <video
          ref={videoARef}
          className="absolute w-full h-full object-cover"
          muted playsInline preload="auto"
          style={{ opacity: 1, transition: `opacity ${FADE_DURATION}ms ease` }}
        >
          <source src={bgvid} type="video/mp4" />
        </video>
        <video
          ref={videoBRef}
          className="absolute w-full h-full object-cover"
          muted playsInline preload="auto"
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
        .bg-gradient-radial { background-image: radial-gradient(circle at center, var(--tw-gradient-stops)); }

        @keyframes particleFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          25% { transform: translate(calc(var(--drift) * 0.5), -12px) scale(1.1); opacity: 0.8; }
          50% { transform: translate(var(--drift), -25px) scale(0.7); opacity: 0.2; }
          75% { transform: translate(calc(var(--drift) * -0.3), -8px) scale(1); opacity: 0.6; }
        }
        @keyframes bracketDraw {
          0% { opacity: 0; clip-path: inset(0 100% 100% 0); }
          100% { opacity: 1; clip-path: inset(0 0 0 0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glitchClip1 {
          0%, 100% { clip-path: inset(0 0 93% 0); transform: translate(0); }
          8% { clip-path: inset(18% 0 62% 0); transform: translate(-3px, 1px); }
          16% { clip-path: inset(48% 0 22% 0); transform: translate(2px, -1px); }
          24% { clip-path: inset(78% 0 5% 0); transform: translate(-1px, 0); }
          32%, 100% { clip-path: inset(0 0 93% 0); transform: translate(0); }
        }
        @keyframes glitchClip2 {
          0%, 100% { clip-path: inset(93% 0 0 0); transform: translate(0); }
          12% { clip-path: inset(10% 0 70% 0); transform: translate(3px, -1px); }
          20% { clip-path: inset(40% 0 30% 0); transform: translate(-2px, 1px); }
          28% { clip-path: inset(70% 0 8% 0); transform: translate(1px, 0); }
          36%, 100% { clip-path: inset(93% 0 0 0); transform: translate(0); }
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
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.35; }
          50% { transform: scale(1.05); opacity: 0.12; }
          100% { transform: scale(0.95); opacity: 0.35; }
        }
        @keyframes flickerIn {
          0% { opacity: 0; } 8% { opacity: 0.7; } 12% { opacity: 0.2; }
          20% { opacity: 0.9; } 28% { opacity: 0.4; } 45% { opacity: 1; } 100% { opacity: 1; }
        }
        @keyframes dataPulse {
          0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; }
        }
        @keyframes soundBar {
          0% { height: 3px; } 100% { height: 16px; }
        }
        @keyframes spinLoader {
          0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }
        }
        @keyframes overlayScan {
          0% { transform: translateY(-100%); } 100% { transform: translateY(100%); }
        }

        .glitch-base { position: relative; }
        .glitch-base::before, .glitch-base::after {
          content: attr(data-text); position: absolute; top: 0; left: 0;
          width: 100%; height: 100%; pointer-events: none;
        }
        .glitch-base::before {
          color: #ff51fa; animation: glitchClip1 2.8s infinite linear;
          opacity: 0.5; mix-blend-mode: screen;
        }
        .glitch-base::after {
          color: #81ecff; animation: glitchClip2 2.8s infinite linear;
          opacity: 0.35; mix-blend-mode: screen;
        }

        .holo-btn {
          position: relative;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.08) 37%, transparent 50%);
          background-size: 200% 100%;
          animation: holoShimmer 3s infinite linear;
        }
        .holo-btn::before {
          content: ''; position: absolute; inset: -2px; border-radius: inherit; padding: 2px;
          background: linear-gradient(90deg, #ff51fa, #81ecff, #ffe483, #ff51fa, #81ecff);
          background-size: 400% 100%; animation: borderTrace 4s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          opacity: 0.5; transition: opacity 0.3s;
        }
        .holo-btn:hover::before { opacity: 1; }

        .cyber-input { position: relative; }
        .cyber-input::after {
          content: ''; position: absolute; inset: -1px; border-radius: inherit;
          background: linear-gradient(90deg, #81ecff, #ff51fa, #81ecff);
          background-size: 200% 100%; animation: holoShimmer 4s linear infinite;
          z-index: -1; opacity: 0; transition: opacity 0.3s;
        }
        .cyber-input:focus-within::after { opacity: 1; }

        .trace-frame {
          position: absolute; inset: 14px; border: 1px solid transparent;
          background:
            linear-gradient(#ff51fa33, #ff51fa33) top left,
            linear-gradient(#81ecff33, #81ecff33) top right,
            linear-gradient(#ffe48333, #ffe48333) bottom right,
            linear-gradient(#ff51fa33, #ff51fa33) bottom left;
          background-size: 25% 1px, 25% 1px, 25% 1px, 25% 1px;
          background-repeat: no-repeat; animation: borderTrace 6s linear infinite;
          pointer-events: none;
        }

        .cyber-grid {
          position: absolute; bottom: 0; left: -50%; width: 200%; height: 30vh;
          background-image:
            linear-gradient(rgba(129,236,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129,236,255,0.06) 1px, transparent 1px);
          background-size: 60px 60px;
          transform: perspective(500px) rotateX(60deg); transform-origin: center top;
          animation: gridScroll 3s linear infinite;
          mask-image: linear-gradient(to bottom, transparent, black 40%);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%);
          pointer-events: none;
        }
      `}</style>

      {/* ── CRT Scanlines ── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-40" />

      {/* ── Moving Scanline Bar ── */}
      <div
        className="absolute left-0 w-full h-[2px] z-40 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(129,236,255,0.1), transparent)', animation: 'scanline 5s linear infinite' }}
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
      <div className="absolute inset-0 z-[36] pointer-events-none p-3">
        <CornerBracket position="tl" delay={0.5} />
        <CornerBracket position="tr" delay={0.7} color="#81ecff" />
        <CornerBracket position="br" delay={0.9} />
        <CornerBracket position="bl" delay={1.1} color="#81ecff" />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MAIN CONTENT ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="relative min-h-screen text-[#e5e3ff] font-body selection:bg-[#ff51fa] selection:text-white overflow-hidden"
        style={{ animation: showContent ? 'flickerIn 0.8s 0.15s both' : 'none', opacity: showContent ? undefined : 0 }}
      >
        {/* ── Header ── */}
        <header
          className="w-full top-0 px-6 py-4 flex justify-between items-center max-w-screen-2xl mx-auto z-50 border-b border-[#46465c]/15 bg-[#0c0c1f]/60 backdrop-blur-md"
          style={{ animation: 'fadeSlideUp 0.5s 0.3s both' }}
        >
          <div className="flex items-center gap-3">
            {view === 'create' && (
              <button
                onClick={() => setView('servers')}
                className="text-[#81ecff] hover:text-[#ffe483] transition-colors p-2 rounded-lg hover:bg-white/5"
              >
                <ArrowLeft size={22} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="text-xl md:text-2xl font-black text-[#ffe483] uppercase italic font-headline tracking-tight drop-shadow-[0_0_10px_rgba(255,228,131,0.25)]">
                {view === 'servers' ? 'SERVERS' : 'CREATE SERVER'}
              </div>
              {view === 'servers' && (
                <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded bg-[#4ade8022] border border-[#4ade8033]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade8088]" style={{ animation: 'dataPulse 2s infinite' }} />
                  <span className="font-mono text-[8px] text-[#4ade80] tracking-widest uppercase">Live</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 mr-2 px-2 py-1 rounded bg-[#81ecff11] border border-[#81ecff22]">
              <Radio size={10} className="text-[#81ecff]" style={{ animation: 'dataPulse 1.5s infinite' }} />
              <span className="font-mono text-[8px] text-[#81ecff66] tracking-widest uppercase">Connected</span>
            </div>
            <span className="text-[#81ecff] font-headline font-bold uppercase tracking-widest text-sm hidden sm:inline">
              {playerInfo.name}
            </span>
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#ffe48344] hover:ring-[#ffe483] transition-all shadow-[0_0_10px_rgba(255,228,131,0.2)] bg-[#1d1d37]">
              <img
                alt={getAvatarById(playerInfo.avatarId)?.alt || 'avatar'}
                className="w-full h-full object-cover"
                src={getAvatarById(playerInfo.avatarId)?.image || ''}
              />
            </div>
          </div>
        </header>

        {/* ── Side HUD Left ── */}
        <div className="absolute left-4 top-1/4 space-y-2 z-30 pointer-events-none hidden xl:block">
          {[
            { icon: <Wifi size={10} />, label: 'PING', val: '24ms' },
            { icon: <Shield size={10} />, label: 'PROTO', val: 'WSS' },
            { icon: <Radio size={10} />, label: 'NODES', val: `${servers.length}` },
          ].map((item, i) => (
            <div
              key={item.label}
              className="flex items-center gap-2 font-mono text-[8px] tracking-widest"
              style={{ color: '#81ecff28', animation: `fadeSlideUp 0.4s ${0.7 + i * 0.12}s both` }}
            >
              <span style={{ color: '#ff51fa33' }}>{item.icon}</span>
              <span>{item.label}</span>
              <span style={{ color: '#81ecff44' }}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* ── Main Content ── */}
        <main className="relative min-h-[calc(100vh-72px)] p-4 md:p-6 pb-32 z-20">
          {view === 'servers' ? (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Title Section */}
              <div className="space-y-4" style={{ animation: 'fadeSlideUp 0.6s 0.4s both' }}>
                <div className="text-[10px] tracking-[0.5em] text-[#ff51fa44] font-mono uppercase">
                  ◈ NETWORK BROWSE ◈
                </div>
                <h1
                  className="glitch-base font-headline font-black text-3xl sm:text-4xl md:text-5xl tracking-tighter text-[#ffe483] italic uppercase"
                  data-text={glitchTitle}
                >
                  <span className="relative z-10">
                    choose a server to <span className="text-[#81ecff]">join</span>
                  </span>
                </h1>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-[1px] bg-gradient-to-r from-[#ff51fa33] to-transparent" />
                  <p className="text-[#aaa8c3]/60 font-body font-bold tracking-widest uppercase text-xs">
                    {filteredServers.length} terminal{filteredServers.length !== 1 ? 's' : ''} active
                  </p>
                </div>
              </div>

              {/* Search + Create Bar */}
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-3"
                style={{ animation: 'fadeSlideUp 0.5s 0.55s both' }}
              >
                <div className="md:col-span-2 cyber-input rounded-lg">
                  <div className="relative">
                    <input
                      className="w-full bg-black/60 backdrop-blur-md border-2 border-[#46465c]/30 focus:border-[#81ecff]/60 rounded-lg py-3.5 px-5 text-base font-headline text-[#e5e3ff] outline-none transition-all placeholder:text-[#aaa8c3]/25 shadow-inner"
                      placeholder="Search servers..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#81ecff]/30" size={18} />
                  </div>
                </div>

                <button
                  onClick={() => setView('create')}
                  className="holo-btn relative bg-[#ff51fa] text-[#400040] py-3.5 rounded-lg font-headline font-black text-base tracking-widest uppercase italic overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_25px_rgba(255,81,250,0.25)] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff51fa]"
                >
                  <Plus size={18} strokeWidth={3} />
                  <span>CREATE</span>
                </button>
              </div>

              {/* Sound wave divider */}
              <div
                className="flex items-center justify-center gap-[2px] h-3 opacity-20 pointer-events-none"
                style={{ animation: 'fadeSlideUp 0.4s 0.6s both' }}
              >
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[2px] rounded-full"
                    style={{
                      background: i % 3 === 0 ? '#ff51fa' : i % 3 === 1 ? '#81ecff' : '#ffe483',
                      animation: `soundBar ${0.3 + Math.random() * 0.5}s ${Math.random() * 0.2}s infinite ease-in-out alternate`,
                    }}
                  />
                ))}
              </div>

              {/* Server List */}
              <div className="space-y-3">
                {filteredServers.length > 0 ? (
                  filteredServers.map((server, i) => (
                    <ServerCard
                      key={server.id}
                      server={server}
                      onJoin={() => handleJoinServer(server.id)}
                      index={i}
                    />
                  ))
                ) : (
                  <div
                    className="relative bg-[#17172f]/60 backdrop-blur-sm border border-[#46465c]/20 rounded-xl p-12 text-center overflow-hidden"
                    style={{ animation: 'fadeSlideUp 0.5s 0.5s both' }}
                  >
                    {/* Empty state scanlines */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-15"
                      style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }}
                    />
                    <div className="relative z-10 space-y-4">
                      <div className="text-4xl opacity-20">◈</div>
                      <p className="text-[#aaa8c3]/50 text-sm font-mono tracking-widest uppercase">
                        No terminals active in the current network
                      </p>
                      <p className="text-[#aaa8c3]/25 text-xs font-mono tracking-wider">
                        Try creating a new server or adjust your search
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── CREATE SERVER VIEW ── */
            <div className="max-w-2xl mx-auto" style={{ animation: 'fadeSlideUp 0.5s 0.2s both' }}>
              <div className="relative bg-[#17172f]/80 backdrop-blur-sm border border-[#46465c]/30 rounded-xl overflow-hidden">
                {/* Form scanlines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-15 z-10"
                  style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }}
                />

                {/* Form corner brackets */}
                <div className="absolute inset-0 pointer-events-none z-10 p-3">
                  <CornerBracket position="tl" delay={0.3} color="#ff51fa" size={28} />
                  <CornerBracket position="tr" delay={0.4} color="#81ecff" size={28} />
                  <CornerBracket position="br" delay={0.5} color="#ff51fa" size={28} />
                  <CornerBracket position="bl" delay={0.6} color="#81ecff" size={28} />
                </div>

                <div className="relative z-20 p-8 space-y-8">
                  <div className="space-y-2">
                    <div className="text-[10px] tracking-[0.5em] text-[#ff51fa44] font-mono uppercase">
                      ◈ NEW INSTANCE ◈
                    </div>
                    <h2 className="font-headline font-black text-3xl md:text-4xl text-[#ffe483] italic uppercase">
                      SPAWN A <span className="text-[#ff51fa]">SERVER</span>
                    </h2>
                  </div>

                  <div className="space-y-5">
                    {/* Server Name */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#81ecff]/60 mb-2">
                        <span className="w-3 h-[1px] bg-[#81ecff33]" />
                        server name
                        <span className="w-3 h-[1px] bg-[#81ecff33]" />
                      </label>
                      <div className="cyber-input rounded-lg">
                        <input
                          className="w-full bg-black/60 backdrop-blur-md border-2 border-[#46465c]/30 focus:border-[#81ecff]/60 rounded-lg py-4 px-5 text-lg font-headline font-bold text-[#e5e3ff] outline-none transition-all placeholder:text-[#aaa8c3]/25 shadow-inner"
                          placeholder="Enter server name"
                          value={createForm.name}
                          onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateServer(); }}
                          maxLength={32}
                        />
                      </div>
                      <div className="flex justify-end mt-1">
                        <span className="font-mono text-[8px] text-[#aaa8c3]/15">{createForm.name.length}/32</span>
                      </div>
                    </div>

                    {/* Max Players */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#81ecff]/60 mb-2">
                        <span className="w-3 h-[1px] bg-[#81ecff33]" />
                        max players
                        <span className="w-3 h-[1px] bg-[#81ecff33]" />
                      </label>
                      <div className="cyber-input rounded-lg">
                        <input
                          className="w-full bg-black/60 backdrop-blur-md border-2 border-[#46465c]/30 focus:border-[#81ecff]/60 rounded-lg py-4 px-5 text-lg font-headline text-[#e5e3ff] outline-none transition-all shadow-inner"
                          type="number"
                          min={2}
                          max={32}
                          value={createForm.maxPlayers}
                          onChange={(e) => setCreateForm({ ...createForm, maxPlayers: Math.min(32, Math.max(2, parseInt(e.target.value) || 16)) })}
                        />
                      </div>
                    </div>

                    {/* Privacy Toggle */}
                    <div className="flex items-center justify-between bg-black/30 rounded-lg p-4 border border-[#46465c]/20">
                      <div className="flex items-center gap-3">
                        <Lock size={16} className="text-[#ff51fa]/60" />
                        <div>
                          <div className="text-sm font-headline font-bold text-[#e5e3ff] uppercase tracking-wide">Private Server</div>
                          <div className="text-[10px] text-[#aaa8c3]/40 font-mono tracking-wider">Requires invite link to join</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setCreateForm({ ...createForm, isPrivate: !createForm.isPrivate })}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                          createForm.isPrivate ? 'bg-[#ff51fa] shadow-[0_0_15px_rgba(255,81,250,0.4)]' : 'bg-[#46465c]/40'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                            createForm.isPrivate ? 'left-6' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#46465c]/15">
                    <button
                      onClick={() => setView('servers')}
                      className="bg-[#17172f] text-[#aaa8c3]/60 py-4 rounded-lg font-headline font-bold uppercase tracking-wider border border-[#46465c]/20 hover:border-[#aaa8c3]/30 hover:text-[#aaa8c3] transition-all text-sm cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleCreateServer}
                      disabled={!createForm.name || isSpawning}
                      className="bg-[#ffe483] text-[#635200] py-4 rounded-lg font-headline font-black text-base tracking-widest uppercase shadow-[0_8px_0_#635200] hover:shadow-[0_4px_0_#635200] hover:translate-y-[4px] active:shadow-[0_1px_0_#635200] active:translate-y-[7px] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSpawning ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" style={{ animation: 'spinLoader 0.8s linear infinite' }}>
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          SPAWNING...
                        </span>
                      ) : (
                        'LAUNCH'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── SPAWNING OVERLAY ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isSpawning && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl">
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)' }}
          />
          <div
            className="absolute left-0 w-full h-[2px] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(129,236,255,0.15), transparent)', animation: 'overlayScan 2s linear infinite' }}
          />

          <div className="relative z-10 space-y-8 text-center">
            {/* Hexagonal spinner */}
            <div className="relative w-24 h-24 mx-auto">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                style={{ animation: 'spinLoader 2s linear infinite' }}
              >
                <polygon
                  points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                  fill="none"
                  stroke="url(#spinGrad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="150 100"
                />
                <defs>
                  <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff51fa" />
                    <stop offset="50%" stopColor="#81ecff" />
                    <stop offset="100%" stopColor="#ffe483" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#81ecff] shadow-[0_0_15px_#81ecff,0_0_30px_#81ecff66]" style={{ animation: 'dataPulse 0.8s infinite' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-headline font-black text-xl tracking-widest text-[#ffe483] uppercase italic">
                SPAWNING SERVER
              </div>
              <div className="font-mono text-[10px] tracking-[0.4em] text-[#81ecff44] uppercase" style={{ animation: 'dataPulse 1.5s infinite' }}>
                ◈ INITIALIZING NETWORK INSTANCE ◈
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-56 mx-auto h-[2px] bg-[#46465c]/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #ff51fa, #81ecff, #ffe483, #81ecff, #ff51fa)',
                  backgroundSize: '200% 100%',
                  animation: 'holoShimmer 1s linear infinite',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLobby;