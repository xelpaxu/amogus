import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { socket } from "../socket";
import { getAvatarById } from "../avatars";
import { Settings, HelpCircle, LogOut, Minimize2, Maximize2 } from "lucide-react";
import bgvid from "../../assets/ui-assets/bg.mp4";

type Player = {
  id: string;
  name: string;
  avatarId: string;
};

type ChatMessage = {
  id: string;
  sender: string;
  avatarId: string;
  message: string;
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
    <>
    <style>{`
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
        from {
          transform: translateY(0);
        }

        to {
          transform: translateY(100px);
        }
      }

      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }

      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `}</style>
  {/* ── Cinematic Video Background ── */}
  <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
    <video
      className="absolute w-full h-full object-cover"
      autoPlay
      muted
      loop
      playsInline
    >
      <source src={bgvid} type="video/mp4" />
    </video>

    {/* Dark Overlay */}
    <div className="absolute inset-0 bg-black/65" />

    {/* Cyber Radial Glow */}
    <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/80" />

    {/* Animated Scanlines */}
    <div className="scanlines absolute inset-0 opacity-20" />
  </div>
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
        {isHost ? "tag iya ko di to" : "mga others"}
      </p>
    </div>
    </>
  );
};

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const playerInfo = location.state as {
    name: string;
    avatarId: string;
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current && !chatCollapsed) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, chatCollapsed]);

  // 🔌 SOCKET CONNECTION + JOIN (without chat message listener)
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

  // 📡 LISTEN FOR SERVER UPDATES (players, game start)
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
      navigate(`/role_reveal/${roomId}`, {
        state: {
          roomId,
          real_theme: data.real_theme,
          fake_theme: data.fake_theme,
          impostorId: data.impostorId,
          currentPlayerId: socket.id,
          players: data.players,
        },
      });
    });

    return () => {
      socket.off("player_joined", updateList);
      socket.off("room_created", updateList);
      socket.off("game_started");
    };
  }, [navigate, playerInfo, roomId]);

  // 💬 CHAT MESSAGE HANDLER (with unread count logic when collapsed)
  useEffect(() => {
    const handleReceiveMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      // Increment unread count if chat is collapsed and message is not from current user
      if (chatCollapsed && message.sender !== playerInfo?.name) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on("receive_room_message", handleReceiveMessage);

    return () => {
      socket.off("receive_room_message", handleReceiveMessage);
    };
  }, [chatCollapsed, playerInfo?.name]);

  // ▶ START GAME
  const handleStartGame = () => {
    if (players.length < 4) {
      alert("Minimum 4 players required to start the game.");
      return;
    }

    socket.emit("start_game", { room_id: roomId });
  };
  
  // 🚪 LEAVE ROOM
  const handleLeave = () => {
    socket.emit("leave_room_manually", { room_id: roomId });
    socket.disconnect();
    navigate("/game_lobby");
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    socket.emit("send_room_message", {
      room_id: roomId,
      sender: playerInfo.name,
      avatarId: playerInfo.avatarId,
      message: chatInput,
    });

    setChatInput("");
  };

  const handleToggleChat = () => {
    if (chatCollapsed) {
      // Opening chat: reset unread count
      setUnreadCount(0);
    }
    setChatCollapsed(!chatCollapsed);
  };

  const isMeHost = socket.id === hostSid;

  return (
    <div className="relative min-h-screen text-white font-body selection:bg-[#ff51fa] overflow-hidden">
      {/* HEADER */}
      <header className="w-full px-6 py-4 flex justify-between items-center max-w-screen-2xl mx-auto border-b border-[#46465c]/20">
        <div className="text-2xl font-black text-[#ffe483] uppercase italic tracking-tight">
          Prisinto <span className="text-[#81ecff]">#{roomId}</span>
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
          tililipon ta <span className="text-[#ff51fa]">di</span>
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
              disabled={players.length < 4}
              className="bg-[#ffe483] text-[#635200] font-black text-3xl px-16 py-6 rounded-lg hover:scale-[1.05] active:scale-95 transition-all shadow-[0_10px_0_#635200] disabled:opacity-50"
            >
              SUGOD TA
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

      {/* FLOATING CHAT WIDGET (Bottom Right, Collapsible) */}
      <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6 w-full sm:w-96">
        <div className="bg-[#17172f]/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-black/30 cursor-pointer" onClick={handleToggleChat}>
            <div className="flex items-center gap-2">
              <h2 className="text-md font-black text-[#81ecff] tracking-wider">
                storhanay kamo di ah
              </h2>
              {unreadCount > 0 && chatCollapsed && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {!chatCollapsed && messages.length > 0 && (
                <span className="text-xs uppercase tracking-widest text-[#aaa8c3]">
                  ({messages.length})
                </span>
              )}
            </div>
            <button className="text-[#aaa8c3] hover:text-[#81ecff] transition-colors p-1">
              {chatCollapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
          </div>

          {/* Chat Body - Conditional Render */}
          {!chatCollapsed && (
            <>
              {/* Messages Area */}
              <div 
                ref={scrollContainerRef}
                className="h-[320px] overflow-y-auto p-3 space-y-3 no-scrollbar"
              >
                {messages.length > 0 ? (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 bg-black/20 rounded-xl p-3 border border-white/5"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#81ecff] shrink-0">
                        <img
                          src={getAvatarById(msg.avatarId)?.image || ""}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-black text-[#ffe483] uppercase tracking-wide text-sm">
                            {msg.sender}
                          </span>
                          <span className="text-[10px] text-[#81ecff] uppercase tracking-widest">
                            online
                          </span>
                        </div>
                        <p className="text-[#e5e3ff] text-sm break-words">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-[#aaa8c3] uppercase tracking-widest text-xs">
                    No messages yet...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-white/10 p-3 flex gap-2 bg-black/20">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Say something..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[#81ecff] placeholder:text-[#666]"
                />

                <button
                  onClick={handleSendMessage}
                  className="bg-[#81ecff] text-[#042d36] px-5 rounded-xl font-black uppercase tracking-wider text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(129,236,255,0.3)]"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;