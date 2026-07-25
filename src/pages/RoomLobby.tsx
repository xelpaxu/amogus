import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { getAvatarById } from '../avatars';
import { Settings, HelpCircle, LogOut, Minimize2, Maximize2, Wifi, Shield, Radio, Crown } from 'lucide-react';
import bgvid from '../../assets/ui-assets/bg.mp4';

// ─── Helpers ───────────────────────────────────────────────────
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const GLITCH_CHARS = '█▓▒░╔╗╚╝║═╬┼┤├┬┴─│ABCDEF0123456789';

// ─── Types ────────────────────────────────────────────────────
type Player = { id: string; name: string; avatarId: string; };
type ChatMessage = { id: string; sender: string; avatarId: string; message: string; };

interface Particle {
  id: number; x: number; y: number; size: string;
  duration: number; delay: number; color: string; drift: number;
}

const getAvatarColor = (avatarId: string) => {
  const colors: Record<string, string> = {
    fox: '#f97316', cyber: '#22d3ee', merlin: '#a855f7', spooky: '#ec4899',
  };
  return colors[avatarId] || '#6b7280';
};

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
}> = ({ position, delay, color = '#ff51fa', size = 40 }) => {
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

// ─── Player Card ───────────────────────────────────────────────
const PlayerCard: React.FC<{ player: Player; isHost: boolean; index: number }> = ({
  player, isHost, index
}) => {
  const color = getAvatarColor(player.avatarId);
  return (
    <div
      className="group relative rounded-xl p-6 bg-[#17172f]/60 backdrop-blur-xl border border-white/10 flex flex-col items-center hover:-translate-y-2 transition-all duration-300 overflow-hidden"
      style={{ animation: `fadeSlideUp 0.5s ${0.2 + index * 0.1}s both cubic-bezier(0.22, 1, 0.36, 1)` }}
    >
      {/* Card scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-10" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }} />
      
      {/* Card corners */}
      <div className="absolute inset-0 pointer-events-none z-10 p-2">
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/10 group-hover:border-[#81ecff]/40 transition-colors" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/10 group-hover:border-[#ff51fa]/40 transition-colors" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/10 group-hover:border-[#ff51fa]/40 transition-colors" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/10 group-hover:border-[#81ecff]/40 transition-colors" />
      </div>

      {/* Host Badge */}
      {isHost && (
        <div className="absolute -top-3 -right-3 bg-[#0c0c1f] p-2.5 rounded-full border-2 border-[#ffe483] shadow-[0_0_20px_rgba(255,228,131,0.5)] z-20 group-hover:scale-110 transition-transform">
          <Crown size={16} className="text-[#ffe483]" />
        </div>
      )}

      <div className="mb-4 relative z-10">
        <div
          className="w-28 h-28 rounded-full p-1 bg-[#0c0c1f] transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(129,236,255,0.3)]"
          style={{ border: `3px solid ${color}`, boxShadow: `0 0 15px ${color}44` }}
        >
          <img
            alt={getAvatarById(player.avatarId)?.alt || "avatar"}
            className="w-full h-full rounded-full object-cover"
            src={getAvatarById(player.avatarId)?.image || ""}
          />
        </div>
        {/* Status dot */}
        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#0c0c1f] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80]" style={{ animation: 'dataPulse 2s infinite' }} />
        </div>
      </div>

      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter z-10 truncate max-w-full">
        {player.name}
      </h3>

      <p className="text-[10px] font-bold uppercase mt-2 tracking-[0.2em] z-10" style={{ color: isHost ? '#ffe483' : '#81ecff' }}>
        {isHost ? "◆ HOST" : "◇ PLAYER"}
      </p>
    </div>
  );
};

// ─── Empty Slot ────────────────────────────────────────────────
const EmptySlot: React.FC<{ index: number }> = ({ index }) => (
  <div
    className="relative rounded-xl p-6 bg-[#17172f]/20 border border-dashed border-[#46465c]/30 flex flex-col items-center justify-center overflow-hidden"
    style={{ animation: `fadeSlideUp 0.5s ${0.2 + index * 0.1}s both cubic-bezier(0.22, 1, 0.36, 1)` }}
  >
    <div className="absolute inset-0 pointer-events-none opacity-10" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(129,236,255,0.1) 3px, rgba(129,236,255,0.1) 4px)' }} />
    <div className="w-28 h-28 rounded-full border-2 border-dashed border-[#46465c]/40 mb-4 bg-black/20 flex items-center justify-center">
      <span className="text-[#46465c]/40 text-3xl font-thin">?</span>
    </div>
    <div className="h-3 w-20 bg-[#46465c]/20 rounded animate-pulse" />
    <div className="font-mono text-[8px] text-[#46465c]/30 tracking-widest mt-3 uppercase" style={{ animation: 'dataPulse 3s infinite' }}>
      Awaiting Signal...
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// ─── MAIN ROOM LOBBY ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const RoomLobby: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [players, setPlayers] = useState<Player[]>([]);
  const [hostSid, setHostSid] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [glitchTitle, setGlitchTitle] = useState('gather room');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // A/B video refs
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [, setActiveVideo] = useState<'a' | 'b'>('a');
  const CROSSFADE_OFFSET = 1.5;
  const FADE_DURATION = 800;

  // Particles
  const particles = useRef<Particle[]>(
    Array.from({ length: 20 }, (_, i) => ({
      id: i, x: rand(0, 100), y: rand(0, 100), size: `${rand(1, 3)}px`,
      duration: rand(10, 18), delay: rand(0, 7),
      color: pick(['#ff51fa', '#81ecff', '#ffe483', '#ff51fa88', '#81ecff66']),
      drift: rand(-25, 25),
    }))
  ).current;

  const playerInfo = location.state as { name: string; avatarId: string; };

  // Content reveal
  useEffect(() => { const t = setTimeout(() => setShowContent(true), 200); return () => clearTimeout(t); }, []);

  // Title glitch
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (Math.random() > 0.88) {
          const base = 'gather room';
          const arr = base.split('');
          const idx = Math.floor(Math.random() * arr.length);
          arr[idx] = pick(GLITCH_CHARS.split(''));
          setGlitchTitle(arr.join(''));
          setTimeout(() => setGlitchTitle('gather room'), rand(50, 120));
        }
      }, 130);
    }, 1800);
    return () => { clearTimeout(start); if (interval) clearInterval(interval); };
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

  // Auto-scroll chat
  useEffect(() => {
    if (scrollContainerRef.current && !chatCollapsed) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, chatCollapsed]);

  // Socket: Connect & Join
  useEffect(() => {
    if (!roomId || !playerInfo) { navigate("/game_lobby"); return; }
    const handleConnect = () => {
      socket.emit("join_existing_room", { room_id: roomId, name: playerInfo.name, avatarId: playerInfo.avatarId });
    };
    if (!socket.connected) { socket.connect(); } else { handleConnect(); }
    socket.on("connect", handleConnect);
    return () => { socket.off("connect", handleConnect); };
  }, [roomId, playerInfo, navigate]);

  // Socket: Updates
  useEffect(() => {
    const updateList = (data: { players: Player[]; host: string }) => {
      const uniquePlayers = data.players.filter((p, index, self) => index === self.findIndex((x) => x.id === p.id));
      setPlayers(uniquePlayers); setHostSid(data.host);
    };
    socket.on("player_joined", updateList);
    socket.on("room_created", updateList);
    socket.on("game_started", (data) => {
      navigate(`/role_reveal/${roomId}`, { state: { roomId, real_theme: data.real_theme, fake_theme: data.fake_theme, impostorId: data.impostorId, currentPlayerId: socket.id, players: data.players } });
    });
    return () => { socket.off("player_joined", updateList); socket.off("room_created", updateList); socket.off("game_started"); };
  }, [navigate, playerInfo, roomId]);

  // Socket: Chat
  useEffect(() => {
    const handleReceiveMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      if (chatCollapsed && message.sender !== playerInfo?.name) { setUnreadCount((prev) => prev + 1); }
    };
    socket.on("receive_room_message", handleReceiveMessage);
    return () => { socket.off("receive_room_message", handleReceiveMessage); };
  }, [chatCollapsed, playerInfo?.name]);

  const handleStartGame = () => {
    if (players.length < 4) {
      const btn = document.getElementById('start-game-btn');
      if (btn) { btn.style.animation = 'none'; btn.offsetHeight; btn.style.animation = 'shakeInput 0.4s ease'; setTimeout(() => btn.style.animation = '', 500); }
      return;
    }
    socket.emit("start_game", { room_id: roomId });
  };

  const handleLeave = () => { socket.emit("leave_room_manually", { room_id: roomId }); socket.disconnect(); navigate("/game_lobby"); };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("send_room_message", { room_id: roomId, sender: playerInfo.name, avatarId: playerInfo.avatarId, message: chatInput });
    setChatInput("");
  };

  const handleToggleChat = () => { if (chatCollapsed) setUnreadCount(0); setChatCollapsed(!chatCollapsed); };
  const isMeHost = socket.id === hostSid;

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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .bg-gradient-radial { background-image: radial-gradient(circle at center, var(--tw-gradient-stops)); }
        @keyframes particleFloat { 0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; } 25% { transform: translate(calc(var(--drift) * 0.5), -12px) scale(1.1); opacity: 0.8; } 50% { transform: translate(var(--drift), -25px) scale(0.7); opacity: 0.2; } 75% { transform: translate(calc(var(--drift) * -0.3), -8px) scale(1); opacity: 0.6; } }
        @keyframes bracketDraw { 0% { opacity: 0; clip-path: inset(0 100% 100% 0); } 100% { opacity: 1; clip-path: inset(0 0 0 0); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glitchClip1 { 0%, 100% { clip-path: inset(0 0 93% 0); transform: translate(0); } 8% { clip-path: inset(18% 0 62% 0); transform: translate(-3px, 1px); } 16% { clip-path: inset(48% 0 22% 0); transform: translate(2px, -1px); } 24% { clip-path: inset(78% 0 5% 0); transform: translate(-1px, 0); } 32%, 100% { clip-path: inset(0 0 93% 0); transform: translate(0); } }
        @keyframes glitchClip2 { 0%, 100% { clip-path: inset(93% 0 0 0); transform: translate(0); } 12% { clip-path: inset(10% 0 70% 0); transform: translate(3px, -1px); } 20% { clip-path: inset(40% 0 30% 0); transform: translate(-2px, 1px); } 28% { clip-path: inset(70% 0 8% 0); transform: translate(1px, 0); } 36%, 100% { clip-path: inset(93% 0 0 0); transform: translate(0); } }
        @keyframes borderTrace { 0% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; } 25% { background-position: 100% 0%, 100% 100%, 0% 100%, 0% 0%; } 50% { background-position: 100% 100%, 0% 100%, 0% 0%, 100% 0%; } 75% { background-position: 0% 100%, 0% 0%, 100% 0%, 100% 100%; } 100% { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100%; } }
        @keyframes holoShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes gridScroll { 0% { transform: perspective(500px) rotateX(60deg) translateY(0); } 100% { transform: perspective(500px) rotateX(60deg) translateY(50px); } }
        @keyframes flickerIn { 0% { opacity: 0; } 8% { opacity: 0.7; } 12% { opacity: 0.2; } 20% { opacity: 0.9; } 28% { opacity: 0.4; } 45% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes dataPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        @keyframes shakeInput { 0%, 100% { transform: translateX(0); } 15% { transform: translateX(-8px); } 30% { transform: translateX(6px); } 45% { transform: translateX(-4px); } 60% { transform: translateX(3px); } 75% { transform: translateX(-1px); } }
        @keyframes waitingPulse { 0%, 100% { opacity: 0.5; text-shadow: 0 0 10px rgba(129,236,255,0.4); } 50% { opacity: 1; text-shadow: 0 0 25px rgba(129,236,255,0.8), 0 0 50px rgba(129,236,255,0.3); } }
        .glitch-base { position: relative; }
        .glitch-base::before, .glitch-base::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
        .glitch-base::before { color: #ff51fa; animation: glitchClip1 2.8s infinite linear; opacity: 0.5; mix-blend-mode: screen; }
        .glitch-base::after { color: #81ecff; animation: glitchClip2 2.8s infinite linear; opacity: 0.35; mix-blend-mode: screen; }
        .holo-btn { position: relative; background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.08) 37%, transparent 50%); background-size: 200% 100%; animation: holoShimmer 3s infinite linear; }
        .holo-btn::before { content: ''; position: absolute; inset: -2px; border-radius: inherit; padding: 2px; background: linear-gradient(90deg, #ff51fa, #81ecff, #ffe483, #ff51fa, #81ecff); background-size: 400% 100%; animation: borderTrace 4s linear infinite; -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: 0.6; transition: opacity 0.3s; }
        .holo-btn:hover::before { opacity: 1; }
        .cyber-input { position: relative; }
        .cyber-input::after { content: ''; position: absolute; inset: -1px; border-radius: inherit; background: linear-gradient(90deg, #81ecff, #ff51fa, #81ecff); background-size: 200% 100%; animation: holoShimmer 4s linear infinite; z-index: -1; opacity: 0; transition: opacity 0.3s; }
        .cyber-input:focus-within::after { opacity: 1; }
        .trace-frame { position: absolute; inset: 14px; border: 1px solid transparent; background: linear-gradient(#ff51fa33, #ff51fa33) top left, linear-gradient(#81ecff33, #81ecff33) top right, linear-gradient(#ffe48333, #ffe48333) bottom right, linear-gradient(#ff51fa33, #ff51fa33) bottom left; background-size: 25% 1px, 25% 1px, 25% 1px, 25% 1px; background-repeat: no-repeat; animation: borderTrace 6s linear infinite; pointer-events: none; }
        .cyber-grid { position: absolute; bottom: 0; left: -50%; width: 200%; height: 30vh; background-image: linear-gradient(rgba(129,236,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(129,236,255,0.06) 1px, transparent 1px); background-size: 60px 60px; transform: perspective(500px) rotateX(60deg); transform-origin: center top; animation: gridScroll 3s linear infinite; mask-image: linear-gradient(to bottom, transparent, black 40%); -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%); pointer-events: none; }
      `}</style>

      {/* ── CRT Scanlines ── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none z-40" />
      <div className="absolute left-0 w-full h-[2px] z-40 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(129,236,255,0.1), transparent)', animation: 'scanline 5s linear infinite' }} />

      {/* ── Particles ── */}
      <div className="absolute inset-0 pointer-events-none z-30">{particles.map((p) => <Particle key={p.id} p={p} />)}</div>

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
        className="relative min-h-screen text-white font-body selection:bg-[#ff51fa] selection:text-white overflow-hidden"
        style={{ animation: showContent ? 'flickerIn 0.8s 0.15s both' : 'none', opacity: showContent ? undefined : 0 }}
      >
        {/* ── Header ── */}
        <header className="w-full px-6 py-4 flex justify-between items-center max-w-screen-2xl mx-auto z-50 border-b border-[#46465c]/15 bg-[#0c0c1f]/60 backdrop-blur-md" style={{ animation: 'fadeSlideUp 0.5s 0.3s both' }}>
          <div className="flex items-center gap-3">
            <div className="text-xl md:text-2xl font-black text-[#ffe483] uppercase italic tracking-tight drop-shadow-[0_0_10px_rgba(255,228,131,0.25)]">
              PRISINTO <span className="text-[#81ecff]">#{roomId}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded bg-[#4ade8022] border border-[#4ade8033]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade8088]" style={{ animation: 'dataPulse 2s infinite' }} />
              <span className="font-mono text-[8px] text-[#4ade80] tracking-widest uppercase">Live</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 mr-2 px-2 py-1 rounded bg-[#81ecff11] border border-[#81ecff22]">
              <UsersIcon size={10} className="text-[#81ecff]" />
              <span className="font-mono text-[8px] text-[#81ecff66] tracking-widest uppercase">{players.length}/4+</span>
            </div>
            <button className="text-[#aaa8c3] hover:text-[#81ecff] p-2 rounded-lg hover:bg-white/5 transition-colors"><Settings size={20} /></button>
            <button className="text-[#aaa8c3] hover:text-[#81ecff] p-2 rounded-lg hover:bg-white/5 transition-colors"><HelpCircle size={20} /></button>
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#ffe48344] hover:ring-[#ffe483] transition-all shadow-[0_0_10px_rgba(255,228,131,0.2)] bg-[#1d1d37]">
              <img alt={getAvatarById(playerInfo.avatarId)?.alt || "avatar"} className="w-full h-full object-cover" src={getAvatarById(playerInfo.avatarId)?.image || ""} />
            </div>
          </div>
        </header>

        {/* ── Side HUD ── */}
        <div className="absolute left-4 top-1/4 space-y-2 z-30 pointer-events-none hidden xl:block">
          {[{ icon: <Wifi size={10} />, label: 'PING', val: '24ms' }, { icon: <Shield size={10} />, label: 'PROTO', val: 'WSS' }, { icon: <Radio size={10} />, label: 'ROOM', val: `${roomId}` }].map((item, i) => (
            <div key={item.label} className="flex items-center gap-2 font-mono text-[8px] tracking-widest" style={{ color: '#81ecff28', animation: `fadeSlideUp 0.4s ${0.7 + i * 0.12}s both` }}>
              <span style={{ color: '#ff51fa33' }}>{item.icon}</span><span>{item.label}</span><span style={{ color: '#81ecff44' }}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* ── Main ── */}
        <main className="px-6 text-center py-12 z-20 relative pb-48 md:pb-40">
          {/* Title */}
          <div className="space-y-3" style={{ animation: 'fadeSlideUp 0.6s 0.4s both' }}>
            <div className="text-[10px] tracking-[0.5em] text-[#ff51fa44] font-mono uppercase">◈ WAITING ZONE ◈</div>
            <h1 className="glitch-base font-headline font-black text-5xl md:text-7xl lg:text-8xl italic text-[#ffe483] uppercase tracking-tighter" data-text={glitchTitle}>
              <span className="relative z-10">gather <span className="text-[#ff51fa]">room</span></span>
            </h1>
            <div className="flex items-center justify-center gap-3 pt-1">
              <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#ff51fa33]" />
              <div className="w-1.5 h-1.5 border border-[#81ecff33] rotate-45" />
              <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#81ecff33]" />
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 max-w-5xl mx-auto">
            {players.map((p, i) => (
              <PlayerCard key={p.id} player={p} isHost={p.id === hostSid} index={i} />
            ))}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <EmptySlot key={`empty-${i}`} index={players.length + i} />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-16 flex flex-col items-center gap-6" style={{ animation: 'fadeSlideUp 0.5s 0.8s both' }}>
            {isMeHost ? (
              <button
                id="start-game-btn"
                onClick={handleStartGame}
                disabled={players.length < 4}
                className="holo-btn relative bg-[#ffe483] text-[#635200] font-black text-2xl md:text-3xl px-12 md:px-16 py-5 rounded-xl uppercase italic tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px 0_#635200] hover:shadow-[0_6px 0_#635200] hover:translate-y-[4px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe483]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  START ROUND
                </span>
                {players.length < 4 && <div className="absolute -bottom-6 left-0 right-0 text-[10px] font-mono tracking-widest text-[#ff51fa66] uppercase z-10">Requires 4 players</div>}
              </button>
            ) : (
              <div className="py-5 px-8 border border-[#81ecff33] rounded-xl bg-[#81ecff05]" style={{ animation: 'waitingPulse 2s infinite ease-in-out' }}>
                <span className="text-[#81ecff] font-headline font-black uppercase tracking-[0.3em] text-lg md:text-xl">
                  Waiting for Host...
                </span>
              </div>
            )}

            <button
              onClick={handleLeave}
              className="group flex items-center gap-2 text-[#aaa8c3]/40 hover:text-red-400 transition-colors uppercase font-bold text-xs tracking-[0.2em] cursor-pointer"
            >
              <LogOut size={16} className="group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
              DISCONNECT
            </button>
          </div>
        </main>

        {/* ── Footer ── */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-30 pointer-events-none" style={{ animation: 'fadeSlideUp 0.5s 1s both' }}>
          <div className="flex items-center gap-4 text-[8px] font-mono tracking-[0.2em] text-[#aaa8c3]/12 uppercase">
            <span>sys.protocol.v3</span><span className="text-[#ff51fa0a]">│</span><span>encrypted</span><span className="text-[#ff51fa0a]">│</span><span>© 2026 synt-ask</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── FLOATING CHAT WIDGET ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6 w-full sm:w-96" style={{ animation: 'fadeSlideUp 0.5s 1.2s both' }}>
        <div className="bg-[#0c0c1f]/95 backdrop-blur-2xl border border-[#46465c]/40 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-[#46465c]/30 flex items-center justify-between bg-black/40 cursor-pointer group hover:bg-black/60 transition-colors" onClick={handleToggleChat}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade80]" style={{ animation: 'dataPulse 2s infinite' }} />
              <h2 className="text-sm font-headline font-black text-[#81ecff] tracking-wider">COMMS</h2>
              {unreadCount > 0 && chatCollapsed && (
                <span className="bg-[#ff51fa] text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-[0_0_10px_#ff51fa88]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {!chatCollapsed && messages.length > 0 && (
                <span className="text-[10px] font-mono tracking-widest text-[#aaa8c3]/40">[{messages.length}]</span>
              )}
            </div>
            <button className="text-[#aaa8c3]/60 hover:text-[#81ecff] transition-colors p-1 hover:bg-white/5 rounded">
              {chatCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
          </div>

          {/* Chat Body */}
          {!chatCollapsed && (
            <>
              <div ref={scrollContainerRef} className="h-[320px] overflow-y-auto p-3 space-y-2 no-scrollbar bg-[#080818]/50">
                {messages.length > 0 ? messages.map((msg, index) => (
                  <div key={index} className="flex items-start gap-3 bg-[#17172f]/60 rounded-lg p-3 border border-[#46465c]/20 hover:border-[#81ecff22] transition-colors">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[#81ecff44] shrink-0 bg-[#1d1d37]">
                      <img src={getAvatarById(msg.avatarId)?.image || ""} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-headline font-black text-[#ffe483] uppercase tracking-wide text-xs truncate">{msg.sender}</span>
                        <span className="text-[8px] text-[#81ecff44] uppercase tracking-widest shrink-0">tx</span>
                      </div>
                      <p className="text-[#e5e3ff]/90 text-sm break-words leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-[#aaa8c3]/30">
                    <span className="text-2xl opacity-30">◈</span>
                    <span className="font-mono text-[10px] tracking-widest uppercase">No transmissions yet...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-[#46465c]/30 p-3 flex gap-2 bg-black/30">
                <div className="cyber-input flex-1 rounded-lg">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                    placeholder="Broadcast message..."
                    className="w-full bg-black/60 backdrop-blur-md border border-[#46465c]/30 focus:border-[#81ecff]/60 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-all placeholder:text-[#666] font-body"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  className="bg-[#81ecff] text-[#042d36] px-5 rounded-lg font-headline font-black uppercase tracking-wider text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(129,236,255,0.2)] hover:shadow-[0_0_30px_rgba(129,236,255,0.4)] cursor-pointer"
                >
                  TX
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Tiny helper icon for header since we don't need to import Users just for this
const UsersIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

export default RoomLobby;