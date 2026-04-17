import React, { useState } from 'react';
import { Settings, HelpCircle, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AVATARS } from '../avatars';

const PlayerSetup: React.FC = () => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>('fox');
  const [playerName, setPlayerName] = useState<string>('');

  const navigate = useNavigate();

  const handleEnterGame = () => {
    if (!playerName.trim()) {
      alert("Please enter a Player Tag first!");
      return;
    }

    navigate('/game_lobby', { 
      state: { 
        name: playerName, 
        avatarId: selectedAvatar 
      } 
    });
  };

  const avatars = AVATARS;

  return (
    <div className="dark">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .tonal-carving-no-borders {
          background-color: #0c0c1f;
        }
        .pulse-on-select:active {
          transform: scale(1.1);
        }
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      <div className="min-h-screen bg-[#0c0c1f] text-[#e5e3ff] font-body selection:bg-[#ff51fa] selection:text-white overflow-hidden">
        {/* TopAppBar */}
        <header className="w-full top-0 px-6 py-4 flex justify-between items-center max-w-screen-2xl mx-auto tonal-carving-no-borders z-50">
          <div className="text-2xl font-black text-[#ffe483] uppercase italic font-headline tracking-tight">
            SYNT-ASK
          </div>
          <div className="flex items-center gap-6">
            <button className="text-[#aaa8c3] hover:text-[#81ecff] transition-colors scale-95 active:duration-100 p-2">
              <Settings size={24} />
            </button>
            <button className="text-[#aaa8c3] hover:text-[#81ecff] transition-colors scale-95 active:duration-100 p-2">
              <HelpCircle size={24} />
            </button>
            <div className="w-10 h-10 rounded-full border-2 border-[#ffe483] overflow-hidden shadow-[0_0_15px_rgba(255,228,131,0.3)]">
              <img
                alt="Profile"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPCtSujL6i0zn_3QXZW1a70XB_IysAZDqOB20iCZSkpLzDCfXj1dBOc8mjr-P14RrgCHWXxBBtMKH3TEGQhrqXQQXAGBduUSuDoBnGyuEAicfoEgEF74OHp2BtSHyzNDWcUbThqN8AgY4NU6qGFhfAVNG2v5jaE-AyP7jW961hr8wq4oLbTlVnU7sPWWAyoB5FVqs30-RLgrvjIbTFLv5axHZBpnMxYur0iCmsOr1vZoV7N3whm846g9_NOOf3v7zRshY_IpMR_PPj"
              />
            </div>
          </div>
        </header>

        <main className="relative min-h-[calc(100vh-80px)] flex items-center justify-center p-6 pb-32">
          {/* Background Energy Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#ff51fa]/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#81ecff]/10 blur-[120px] rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ffe483]/5 blur-[160px] rounded-full"></div>
          </div>

          <div className="relative w-full max-w-4xl space-y-12">
            {/* Header Section */}
            <div className="text-center space-y-4">
              <h1 className="font-headline font-black text-5xl md:text-7xl tracking-tighter text-[#ffe483] italic uppercase">
                CHOOSE YOUR <span className="text-[#ff51fa]">AVATAR</span>
              </h1>
            </div>

            {/* Avatar Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl mx-auto py-2">
              {avatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className="group relative flex flex-col items-center cursor-pointer"
                  onClick={() => setSelectedAvatar(avatar.id)}
                >
                  <div
                    className={`w-[10rem] aspect-square rounded-xl bg-[#1d1d37] overflow-hidden transition-all duration-300 ${
                      selectedAvatar === avatar.id
                        ? 'ring-4 ring-[#ffe483] shadow-[0_0_30px_rgba(255,228,131,0.4)] scale-105'
                        : 'border border-[#46465c]/20 hover:border-[#81ecff] hover:scale-105'
                    }`}
                  >
                    <img
                      className={`w-full h-full object-cover transition-all ${
                        selectedAvatar === avatar.id ? 'grayscale-0' : 'grayscale-[0.5] group-hover:grayscale-0'
                      }`}
                      alt={avatar.alt}
                      src={avatar.image}
                    />
                  </div>
                  <p className={`mt-3 font-headline font-bold text-sm tracking-tight transition-colors ${
                    selectedAvatar === avatar.id ? 'text-[#ffe483]' : 'text-[#aaa8c3]'
                  }`}>
                    {avatar.name}
                  </p>
                </div>
              ))}
            </div>

            {/* Input & Action Section */}
            <div className="w-full max-w-md mx-auto space-y-8">
              <div className="relative group">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#81ecff] mb-3 ml-2">
                  Player Tag
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-[#000000] border-2 border-[#46465c]/20 focus:border-[#81ecff]/40 rounded-lg py-5 px-6 text-xl font-headline font-bold text-[#e5e3ff] outline-none transition-all placeholder:text-[#aaa8c3]/30 shadow-inner"
                    placeholder="Enter your name"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#81ecff]/40">
                    <Edit size={20} />
                  </span>
                </div>
              </div>
              <button 
                onClick={handleEnterGame}
                className="group relative w-full bg-[#ffe483] text-[#635200] py-6 rounded-lg font-headline font-black text-2xl tracking-widest uppercase italic overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_12px_0_#635200]">
                <span className="relative z-10">ENTER GAME</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PlayerSetup;