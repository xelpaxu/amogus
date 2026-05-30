import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { socket } from "../socket";
import { getAvatarById } from "../avatars";
import { Settings, HelpCircle, LogOut } from "lucide-react";

type Player = {
  id: string;
  name: string;
  avatarId: string;
};

const getAvatarColor = (avatarId: string) => {
  const colors: Record<string, string> = {
    fox: "border-orange-500",
    cyber: "border-cyan-400",
    merlin: "border-purple-500",
    spooky: "border-pink-400",
  };
  return colors[avatarId] || "border-gray-400";
};

const PlayerCard: React.FC<{ player: Player; isHost: boolean }> = ({
  player,
  isHost,
}) => {
  return (
    <div className="relative rounded-xl p-8 bg-[#17172f]/60 backdrop-blur-xl border border-white/10 flex flex-col items-center hover:-translate-y-2 transition-all">
      {isHost && (
        <div className="absolute -top-4 -right-4 bg-[#ffe483] p-2 rounded-full rotate-12 shadow-[0_0_15px_rgba(255,228,131,0.5)] z-10">
          👑
        </div>
      )}

      <div className="mb-6 relative">
        <div
          className={`w-32 h-32 rounded-full border-4 ${getAvatarColor(
            player.avatarId
          )} p-1 bg-[#0c0c1f]`}
        >
          <img
            alt={getAvatarById(player.avatarId)?.alt || "avatar"}
            className="w-full h-full rounded-full object-cover"
            src={getAvatarById(player.avatarId)?.image || ""}
          />
        </div>
      </div>

      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
        {player.name}
      </h3>

      <p
        className={`text-xs font-bold uppercase mt-2 tracking-widest ${
          isHost ? "text-[#ffe483]" : "text-[#81ecff]"
        }`}
      >
        {isHost ? "ROOM HOST" : "CODER"}
      </p>
    </div>
  );
};

const RoomLobby: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [players, setPlayers] = useState<Player[]>([]);
  const [hostSid, setHostSid] = useState<string>("");

  const playerInfo = location.state as {
    name: string;
    avatarId: string;
  };

  // 🔌 SOCKET CONNECTION + JOIN
  useEffect(() => {
    if (!roomId || !playerInfo) {
      navigate("/game_lobby");
      return;
    }

    const handleConnect = () => {
      socket.emit("join_existing_room", {
        room_id: roomId,
        name: playerInfo.name,
        avatarId: playerInfo.avatarId,
      });
    };

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [roomId, playerInfo, navigate]);

  // 📡 LISTEN FOR SERVER UPDATES
  useEffect(() => {
    const updateList = (data: { players: Player[]; host: string }) => {
      // remove duplicates just in case
      const uniquePlayers = data.players.filter(
        (p, index, self) =>
          index === self.findIndex((x) => x.id === p.id)
      );

      setPlayers(uniquePlayers);
      setHostSid(data.host);
    };

    socket.on("player_joined", updateList);
    socket.on("room_created", updateList);

    socket.on("game_started", (data) => {
      navigate("/game_screen", {
        state: { ...playerInfo, ...data, roomId },
      });
    });

    return () => {
      socket.off("player_joined", updateList);
      socket.off("room_created", updateList);
      socket.off("game_started");
    };
  }, [navigate, playerInfo, roomId]);

  // ▶ START GAME
  const handleStartGame = () => {
    socket.emit("start_game", { room_id: roomId });
  };

  // 🚪 LEAVE ROOM
  const handleLeave = () => {
    socket.emit("leave_room_manually", { room_id: roomId });
    socket.disconnect(); // optional but cleaner
    navigate("/game_lobby");
  };

  const isMeHost = socket.id === hostSid;

  return (
    <div className="min-h-screen bg-[#0c0c1f] text-white font-body selection:bg-[#ff51fa]">
      {/* HEADER */}
      <header className="w-full px-6 py-4 flex justify-between items-center max-w-screen-2xl mx-auto border-b border-[#46465c]/20">
        <div className="text-2xl font-black text-[#ffe483] uppercase italic tracking-tight">
          Terminal <span className="text-[#81ecff]">#{roomId}</span>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-[#aaa8c3] hover:text-[#81ecff] p-2">
            <Settings size={24} />
          </button>
          <button className="text-[#aaa8c3] hover:text-[#81ecff] p-2">
            <HelpCircle size={24} />
          </button>

          <div className="w-10 h-10 rounded-full border-2 border-[#ffe483] overflow-hidden bg-[#1d1d37]">
            <img
              alt={getAvatarById(playerInfo.avatarId)?.alt || "avatar"}
              className="w-full h-full object-cover"
              src={getAvatarById(playerInfo.avatarId)?.image || ""}
            />
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="px-6 text-center py-12">
        <h1 className="text-6xl md:text-8xl font-black italic text-[#ffe483] uppercase tracking-tighter">
          CODING <span className="text-[#ff51fa]">DEN</span>
        </h1>

        {/* PLAYERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12 max-w-7xl mx-auto">
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} isHost={p.id === hostSid} />
          ))}

          {Array.from({ length: Math.max(0, 4 - players.length) }).map(
            (_, i) => (
              <div
                key={`empty-${i}`}
                className="rounded-xl p-8 bg-[#17172f]/20 border border-dashed border-white/5 flex flex-col items-center justify-center opacity-40"
              >
                <div className="w-32 h-32 rounded-full border-4 border-gray-700 mb-6 bg-black/20" />
                <div className="h-6 w-24 bg-gray-800 rounded animate-pulse" />
              </div>
            )
          )}
        </div>

        {/* ACTIONS */}
        <div className="mt-20 flex flex-col items-center gap-6">
          {isMeHost ? (
            <button
              onClick={handleStartGame}
              disabled={players.length < 2}
              className="bg-[#ffe483] text-[#635200] font-black text-3xl px-16 py-6 rounded-lg hover:scale-[1.05] active:scale-95 transition-all shadow-[0_10px_0_#635200] disabled:opacity-50"
            >
              START SESSION
            </button>
          ) : (
            <div className="text-[#81ecff] font-bold animate-pulse uppercase tracking-widest py-4">
              Waiting for Host...
            </div>
          )}

          <button
            onClick={handleLeave}
            className="flex items-center gap-2 text-gray-500 hover:text-red-400 transition-colors uppercase font-bold text-sm tracking-widest"
          >
            <LogOut size={18} />
            DISCONNECT
          </button>
        </div>
      </main>
    </div>
  );
};

export default RoomLobby;
