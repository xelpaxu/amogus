import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import bgvid from "../../assets/ui-assets/bg.mp4";
import { getAvatarById, AVATARS } from "../avatars";

type PlayerResult = {
  playerId: string;
  name: string;
  prediction: string;
  confidence: number;
  is_suspicious: boolean;
  avatarId?: string;   // 👈 added optional avatarId
};

type LocationState = {
  results: PlayerResult[];
  theme: string;
  impostorId: string;
  roomId: string;
  players?: { id: string; avatarId: string }[]; // 👈 optional avatar mapping
};

const ResultScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const { results, theme, impostorId, roomId, players } = state || {};

  const handleReturnToLobby = () => {
    socket.emit("leave_room_manually", { room_id: roomId });
    socket.disconnect();
    navigate("/game_lobby");
  };

  if (!results || !theme || !impostorId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Invalid game data. Please return to lobby.</p>
          <button
            onClick={() => navigate("/game_lobby")}
            className="mt-4 px-6 py-2 bg-[#81ecff] text-black font-bold rounded"
          >
            Go to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Build a map from playerId to avatarId
  const avatarMap: Record<string, string> = {};
  if (players) {
    players.forEach((p) => {
      avatarMap[p.id] = p.avatarId;
    });
  } else {
    // Fallback: use avatarId from result if present, or default to first avatar
    results.forEach((p) => {
      avatarMap[p.playerId] = p.avatarId || AVATARS[0].id;
    });
  }

  const impostor = results.find((p) => p.playerId === impostorId);
  const impostorName = impostor?.name || "Unknown";

  // Safe avatar fetcher
  const getSafeAvatar = (avatarId: string) => {
    const avatar = getAvatarById(avatarId);
    return avatar || AVATARS[0]; // fallback to first avatar
  };

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
        .glow-pink { text-shadow: 0 0 12px rgba(255,81,250,0.6); }
        .glow-cyan { text-shadow: 0 0 12px rgba(129,236,255,0.5); }
        .result-card {
          backdrop-filter: blur(12px);
          transition: all 0.2s;
        }
        .result-card:hover {
          transform: translateY(-4px);
          border-color: #ff51fa;
        }
      `}</style>

      {/* Video Background */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        <video className="absolute w-full h-full object-cover" autoPlay muted loop playsInline>
          <source src={bgvid} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/90" />
        <div className="scanlines absolute inset-0 opacity-20" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black italic text-[#ffe483] uppercase tracking-tighter glow-pink">
              ROUND <span className="text-[#ff51fa]">FINISHED</span>
            </h1>
            <div className="mt-4 text-sm uppercase tracking-widest text-[#81ecff]">
              THEME: <span className="font-bold">{theme.toUpperCase()}</span>
            </div>
          </div>

          {/* Impostor Reveal */}
          <div className="mb-12 p-6 bg-red-900/30 border-2 border-red-500 rounded-2xl text-center backdrop-blur-md">
            <div className="text-6xl mb-2">🔪</div>
            <div className="text-2xl font-black uppercase tracking-wider text-red-300">
              THE IMPOSTOR WAS
            </div>
            <div className="text-4xl font-black text-white mt-2">{impostorName}</div>
            <div className="text-xs text-red-200/70 mt-2">
              {impostor?.is_suspicious ? "✅ Correctly identified as suspicious" : "⚠️ Avoided detection"}
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {results.map((player) => {
              const isImpostor = player.playerId === impostorId;
              const avatarId = avatarMap[player.playerId] || AVATARS[0].id;
              const avatar = getSafeAvatar(avatarId);
              return (
                <div
                  key={player.playerId}
                  className={`result-card rounded-xl p-5 border-2 backdrop-blur-xl ${
                    isImpostor
                      ? "bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.3)]"
                      : "bg-[#17172f]/60 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#81ecff] bg-black/50">
                      <img
                        src={avatar.image}
                        alt={avatar.alt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-lg text-white">{player.name}</span>
                        {isImpostor && (
                          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full uppercase font-bold">
                            Impostor
                          </span>
                        )}
                        {!isImpostor && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase">
                            Crewmate
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-300">
                        <div className="flex justify-between">
                          <span>ML Prediction:</span>
                          <span className="font-mono">{player.prediction}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Confidence:</span>
                          <span className="font-mono">{(player.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Suspicious:</span>
                          <span className={player.is_suspicious ? "text-red-400" : "text-green-400"}>
                            {player.is_suspicious ? "YES" : "NO"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={handleReturnToLobby}
              className="px-8 py-4 bg-[#81ecff] text-[#042d36] font-black text-xl rounded-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(129,236,255,0.3)] uppercase tracking-wider"
            >
              RETURN TO LOBBY
            </button>
            <button
              onClick={() => navigate("/game_lobby")}
              className="px-8 py-4 bg-gray-700 text-white font-black text-xl rounded-lg hover:bg-gray-600 transition-all uppercase tracking-wider"
            >
              EXIT GAME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;