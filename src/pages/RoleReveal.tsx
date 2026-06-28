import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const ROLE_DURATION_MS = 4200;

const RoleRevealScreen: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const gameData = location.state as {
    roomId: string;
    real_theme: string;
    fake_theme: string;
    impostorId: string;
    currentPlayerId: string;               // 👈 added: the ID of this client
    players: { id: string; name: string; avatarId: string }[];
  };

  const [phase, setPhase] = useState<"reveal" | "leaving">("reveal");

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

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center font-mono"
      style={{ background: "#070712" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;900&display=swap');
        * { font-family: 'JetBrains Mono', monospace !important; }

        @keyframes scanMove {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .scanline-sweep {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background: linear-gradient(to bottom, transparent 0%, rgba(129,236,255,0.04) 50%, transparent 100%);
          height: 40px;
          animation: scanMove 3s linear infinite;
        }
        .grid-bg {
          position: fixed; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(70,70,92,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(70,70,92,0.08) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        @keyframes roleReveal {
          0%   { opacity: 0; transform: scale(0.85) translateY(30px); filter: blur(12px); }
          60%  { opacity: 1; transform: scale(1.03) translateY(-4px); filter: blur(0); }
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
          50% { transform: translateY(-10px); }
        }
        .avatar-float { animation: avatarFloat 3s ease-in-out infinite; }

        @keyframes impostorGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(255,60,60,0.5), 0 0 80px rgba(255,60,60,0.2); }
          50%       { box-shadow: 0 0 50px rgba(255,60,60,0.9), 0 0 120px rgba(255,60,60,0.4); }
        }
        .impostor-ring { animation: impostorGlow 1.8s ease-in-out infinite; }

        @keyframes crewGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(129,236,255,0.4), 0 0 80px rgba(129,236,255,0.15); }
          50%       { box-shadow: 0 0 50px rgba(129,236,255,0.7), 0 0 120px rgba(129,236,255,0.3); }
        }
        .crew-ring { animation: crewGlow 2s ease-in-out infinite; }

        @keyframes labelFlash {
          0%, 100% { opacity: 1; }
          30% { opacity: 0.3; }
          60% { opacity: 1; }
        }
        .label-flash { animation: labelFlash 0.6s ease 0.5s 2; }

        @keyframes themeFade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .theme-fade { animation: themeFade 0.5s ease 1.2s both; }

        .corner-tl { position: fixed; top: 24px; left: 24px; width: 48px; height: 48px;
          border-top: 2px solid rgba(129,236,255,0.25); border-left: 2px solid rgba(129,236,255,0.25); }
        .corner-br { position: fixed; bottom: 24px; right: 24px; width: 48px; height: 48px;
          border-bottom: 2px solid rgba(129,236,255,0.25); border-right: 2px solid rgba(129,236,255,0.25); }
        .corner-tr { position: fixed; top: 24px; right: 24px; width: 48px; height: 48px;
          border-top: 2px solid rgba(129,236,255,0.25); border-right: 2px solid rgba(129,236,255,0.25); }
        .corner-bl { position: fixed; bottom: 24px; left: 24px; width: 48px; height: 48px;
          border-bottom: 2px solid rgba(129,236,255,0.25); border-left: 2px solid rgba(129,236,255,0.25); }

        @keyframes countdown {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: 264; }
        }
        .countdown-ring {
          stroke-dasharray: 264;
          stroke-dashoffset: 0;
          animation: countdown ${ROLE_DURATION_MS}ms linear forwards;
          transform: rotate(-90deg);
          transform-origin: center;
        }
      `}</style>

      {/* Background layers */}
      <div className="grid-bg" />
      <div className="scanline-sweep" />
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />

      {/* Ambient colored orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{
            background: isImpostor ? "#ff3c3c" : "#81ecff",
            top: "10%", left: "15%",
          }}
        />
        <div
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-8"
          style={{
            background: isImpostor ? "#ff51fa" : "#00b894",
            bottom: "15%", right: "20%",
          }}
        />
      </div>

      {/* ── REVEAL STATE ── */}
      <div className={`relative z-10 flex flex-col items-center gap-8 ${phase === "leaving" ? "reveal-leave" : "reveal-enter"}`}>
        {/* System header */}
        <div className="text-[10px] tracking-[0.5em] text-[#46465c] uppercase">
          // identity_reveal.exe
        </div>

        {/* Avatar + ring */}
        <div className="relative avatar-float">
          <svg width="160" height="160" className="absolute inset-0" style={{ zIndex: 2 }}>
            <circle
              cx="80" cy="80" r="42" fill="none"
              stroke={isImpostor ? "rgba(255,60,60,0.15)" : "rgba(129,236,255,0.1)"}
              strokeWidth="3"
            />
            <circle
              cx="80" cy="80" r="42" fill="none"
              stroke={isImpostor ? "#ff3c3c" : "#81ecff"}
              strokeWidth="3"
              strokeLinecap="round"
              className="countdown-ring"
            />
          </svg>

          <div
            className={`w-40 h-40 rounded-full flex items-center justify-center ${isImpostor ? "impostor-ring" : "crew-ring"}`}
            style={{ background: isImpostor ? "rgba(255,60,60,0.06)" : "rgba(129,236,255,0.06)" }}
          >
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-5xl select-none"
              style={{
                background: isImpostor
                  ? "radial-gradient(circle at 35% 35%, #3d0000, #1a0000)"
                  : "radial-gradient(circle at 35% 35%, #001a2e, #000d1a)",
                border: `2px solid ${isImpostor ? "rgba(255,60,60,0.4)" : "rgba(129,236,255,0.3)"}`,
              }}
            >
              {me?.avatarId ? (
                <span>
                  {["🤖","👾","🦊","🐸","🐼","🦁","🐯","🐺"][parseInt(me.avatarId) % 8] ?? "👾"}
                </span>
              ) : "👾"}
            </div>
          </div>
        </div>

        {/* Player name */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[#46465c] text-[10px] tracking-[0.4em] uppercase">player</span>
          <span className="text-white text-xl font-black tracking-widest uppercase">
            {me?.name ?? "Unknown"}
          </span>
        </div>

        {/* Role badge */}
        <div
          className={`label-flash px-8 py-3 rounded-sm border font-black text-lg tracking-[0.3em] uppercase ${
            isImpostor
              ? "bg-red-950/60 border-red-500/60 text-red-400"
              : "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
          }`}
          style={{
            boxShadow: isImpostor
              ? "inset 0 0 30px rgba(255,60,60,0.1)"
              : "inset 0 0 30px rgba(129,236,255,0.08)",
          }}
        >
          {isImpostor ? "🔪 IMPOSTOR" : "👾 CREWMATE"}
        </div>

        {/* Role description */}
        <p className="text-[#46465c] text-xs text-center max-w-xs leading-relaxed tracking-wide">
          {isImpostor
            ? "You have been given a FAKE theme. Blend in — don't get caught."
            : "You have the real theme. Code well and sniff out the impostor."}
        </p>

        {/* Theme reveal */}
        <div className="theme-fade flex flex-col items-center gap-2 mt-2">
          <span className="text-[#46465c] text-[10px] tracking-[0.4em] uppercase">your theme</span>
          <div className="px-6 py-2 border border-[#46465c]/40 rounded-sm bg-black/40">
            <span
              className="font-black text-2xl tracking-widest uppercase"
              style={{
                color: isImpostor ? "#ff6b6b" : "#ff51fa",
                textShadow: isImpostor
                  ? "0 0 20px rgba(255,107,107,0.6)"
                  : "0 0 20px rgba(255,81,250,0.6)",
              }}
            >
              {displayTheme?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-[#2a2a3c] text-[10px] tracking-widest mt-4">
          game starting automatically...
        </p>
      </div>

      {/* Room ID watermark */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[#1e1e2e] text-[10px] tracking-[0.4em]">
        ROOM:{roomId ?? "????"}
      </div>
    </div>
  );
};

export default RoleRevealScreen;