import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

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

const GameLobby: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get player data from PlayerSetup state
  const playerInfo = location.state as { name: string; avatarId: string } || { name: 'Guest', avatarId: 'fox' };

  const [view, setView] = useState<'servers' | 'create'>('servers');
  const [searchQuery, setSearchQuery] = useState('');
  const [servers, setServers] = useState<Server[]>([]);
  const [isSpawning, setIsSpawning] = useState(false);
  const [createForm, setCreateForm] = useState<CreateServerForm>({
    name: '',
    isPrivate: false,
    maxPlayers: 16,
  });

  // Inside your GameLobby component
  useEffect(() => {
    const fetchServers = async () => {
      try {
        // FIX: Ensure this is port 8000, NOT 5000
        const response = await fetch('http://localhost:8000/api/servers');
        if (!response.ok) throw new Error("Server not responding");
        const data = await response.json();
        setServers(data);
      } catch (error) {
        console.error("Lobby Error:", error);
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

  // 2. Handle Joining a Server
  const handleJoinServer = (roomId: string) => {
    navigate(`/room_lobby/${roomId}`, { state: playerInfo });
  };

  // 3. Handle Creating a Server (Socket.io)
  const handleCreateServer = () => {
    if (!createForm.name) return;
    setIsSpawning(true);

    socket.emit('create_room', {
      name: playerInfo.name,
      avatarId: playerInfo.avatarId,
      roomName: createForm.name,
      maxPlayers: createForm.maxPlayers,
      isPrivate: createForm.isPrivate
    });
  };

 const filteredServers = servers.filter((server) =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dark">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .tonal-carving-no-borders { background-color: #0c0c1f; }
        .server-card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .server-card-hover:hover { transform: translateY(-4px); box-shadow: 0 0 30px rgba(255, 81, 250, 0.3); }
      `}</style>

      <div className="min-h-screen bg-[#0c0c1f] text-[#e5e3ff] font-body selection:bg-[#ff51fa] selection:text-white overflow-hidden">
        <header className="w-full top-0 px-6 py-4 flex justify-between items-center max-w-screen-2xl mx-auto tonal-carving-no-borders z-50 border-b border-[#46465c]/20">
          <div className="flex items-center gap-3">
            {view === 'create' && (
              <button onClick={() => setView('servers')} className="text-[#81ecff] hover:text-[#ffe483] transition-colors p-2">
                <ArrowLeft size={24} />
              </button>
            )}
            <div className="text-2xl font-black text-[#ffe483] uppercase italic font-headline tracking-tight">
              {view === 'servers' ? 'SYNT-ASK SERVERS' : 'CREATE SERVER'}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[#81ecff] font-bold uppercase tracking-widest text-sm">{playerInfo.name}</span>
            <div className="w-10 h-10 rounded-full border-2 border-[#ffe483] overflow-hidden shadow-[0_0_15px_rgba(255,228,131,0.3)] bg-[#1d1d37]">
                <img
                  alt={getAvatarById(playerInfo.avatarId)?.alt || 'avatar'}
                  className="w-full h-full object-cover"
                  src={getAvatarById(playerInfo.avatarId)?.image || ''}
                />
            </div>
          </div>
        </header>

        <main className="relative min-h-[calc(100vh-80px)] p-6 pb-32">
          {view === 'servers' ? (
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="space-y-6">
                <div>
                  <h1 className="font-headline font-black text-4xl md:text-5xl tracking-tighter text-[#ffe483] italic uppercase">
                    FIND A <span className="text-[#81ecff]">SERVER</span>
                  </h1>
                  <p className="text-[#aaa8c3] font-body font-bold tracking-widest uppercase text-sm mt-2">
                    {filteredServers.length} servers available
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <input
                        className="w-full bg-[#000000] border-2 border-[#46465c]/20 focus:border-[#81ecff]/40 rounded-lg py-4 px-6 text-lg font-headline text-[#e5e3ff] outline-none transition-all placeholder:text-[#aaa8c3]/30 shadow-inner"
                        placeholder="Search servers..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#81ecff]/40" size={20} />
                    </div>
                  </div>

                  <button
                    onClick={() => setView('create')}
                    className="group relative bg-[#ff51fa] text-[#400040] py-4 rounded-lg font-headline font-black text-lg tracking-widest uppercase italic overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,81,250,0.3)] flex items-center justify-center gap-2"
                  >
                    <Plus size={20} strokeWidth={3} />
                    <span>CREATE</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredServers.length > 0 ? (
                  filteredServers.map((server) => (
                    <div
                      key={server.id}
                      onClick={() => handleJoinServer(server.id)}
                      className="server-card-hover bg-[#17172f] border border-[#46465c]/30 rounded-xl p-6 cursor-pointer group relative overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-headline font-black text-xl text-[#ffe483] uppercase tracking-tight">{server.name}</h3>
                            {server.isPrivate && <Lock size={18} className="text-[#ff51fa]" />}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[#aaa8c3]">MODE:</span>
                              <span className="font-bold text-[#81ecff]">{server.mode}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe size={14} className="text-[#81ecff]" />
                              <span className="font-bold text-[#81ecff]">{server.region}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 md:gap-8">
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-[#81ecff]" />
                            <span className="font-headline font-bold text-[#ffe483]">
                              {server.players}/{server.maxPlayers}
                            </span>
                          </div>

                          <button className="bg-[#ffe483] text-[#635200] px-8 py-4 rounded-lg font-headline font-black uppercase tracking-wider shadow-[0_6px_0_#635200]">
                            JOIN
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-[#17172f] border border-[#46465c]/30 rounded-xl p-12 text-center">
                    <p className="text-[#aaa8c3] text-lg">No terminals active in the current network.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#17172f] border border-[#46465c]/30 rounded-xl p-8 space-y-8">
                <h2 className="font-headline font-black text-4xl text-[#ffe483] italic uppercase mb-2">
                  SPAWN A <span className="text-[#ff51fa]">SERVER</span>
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#81ecff] mb-3">SERVER NAME</label>
                    <input
                      className="w-full bg-[#000000] border-2 border-[#46465c]/20 focus:border-[#81ecff]/40 rounded-lg py-4 px-6 text-lg font-headline text-[#e5e3ff] outline-none"
                      placeholder="Enter server name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#81ecff] mb-3">MAX PLAYERS</label>
                    <input
                      className="w-full bg-[#000000] border-2 border-[#46465c]/20 rounded-lg py-4 px-6 text-lg text-[#e5e3ff]"
                      type="number"
                      value={createForm.maxPlayers}
                      onChange={(e) => setCreateForm({ ...createForm, maxPlayers: parseInt(e.target.value) || 16 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#46465c]/20">
                  <button onClick={() => setView('servers')} className="bg-[#17172f] text-[#aaa8c3] py-4 rounded-lg font-headline font-bold uppercase border-2 border-[#46465c]/20">CANCEL</button>
                  <button
                    onClick={handleCreateServer}
                    disabled={!createForm.name || isSpawning}
                    className="bg-[#ffe483] text-[#635200] py-4 rounded-lg font-headline font-black text-lg tracking-widest uppercase shadow-[0_12px_0_#635200] disabled:opacity-50"
                  >
                    {isSpawning ? 'SPAWNING...' : 'LAUNCH'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default GameLobby;