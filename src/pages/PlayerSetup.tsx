import React, { useState, useRef, useEffect } from 'react';
import { Settings, HelpCircle, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AVATARS } from '../avatars';
import bgvid from '../../assets/ui-assets/bg.mp4';
import { AVATAR_SOUNDS } from '../avatarSounds';

const PlayerSetup: React.FC = () => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>('fox');
  const [playerName, setPlayerName] = useState<string>('');

  // A/B video refs for seamless crossfade loop
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [ , setActiveVideo] = useState<'a' | 'b'>('a');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isEntering, setIsEntering] = useState(false);

  // How many seconds before the end to start preloading & fading
  const CROSSFADE_OFFSET = 1.5; // seconds
  const FADE_DURATION = 800; // ms

  useEffect(() => {
    const vidA = videoARef.current;
    const vidB = videoBRef.current;
    if (!vidA || !vidB) return;

    // Preload both, play A first
    vidA.load();
    vidB.load();
    vidA.play().catch(() => {});

    let active: 'a' | 'b' = 'a';

    const handleTimeUpdate = () => {
      const current = active === 'a' ? vidA : vidB;
      const next    = active === 'a' ? vidB : vidA;

      const remaining = current.duration - current.currentTime;
      if (!isNaN(remaining) && remaining <= CROSSFADE_OFFSET) {
        // Prepare next video from the start
        next.currentTime = 0;
        next.play().catch(() => {});

        // Fade current out, next in
        current.style.transition = `opacity ${FADE_DURATION}ms ease`;
        next.style.transition    = `opacity ${FADE_DURATION}ms ease`;
        current.style.opacity = '0';
        next.style.opacity    = '1';

        active = active === 'a' ? 'b' : 'a';
        setActiveVideo(active);

        // Pause the old video after fade completes so it's ready for next swap
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

  const handleEnterGame = () => {
    if (!playerName.trim()) {
      alert("Please enter a Player Tag first!");
      return;
    }

    setIsEntering(true);

    // Stop previous sound
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    // Create avatar voice
    const sound = new Audio(AVATAR_SOUNDS[selectedAvatar]);

    currentAudioRef.current = sound;

    // Wait until metadata loads to get exact duration
    sound.onloadedmetadata = () => {
      const duration = sound.duration * 1000;

      // Match animation speed dynamically
      document.documentElement.style.setProperty(
        '--avatar-animation-duration',
        `${duration}ms`
      );

      sound.play().catch((err) => {
        console.log("Audio play failed:", err);
      });

      // Navigate EXACTLY after sound ends
      setTimeout(() => {
        navigate('/game_lobby', {
          state: {
            name: playerName,
            avatarId: selectedAvatar
          }
        });
      }, duration);
    };
  };

  const avatars = AVATARS;

  return (
    <div className="dark">
      {/* ── Background: A/B crossfade video ── */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        {/* Video A — starts visible */}
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

        {/* Video B — starts invisible */}
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

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pulse-on-select:active { transform: scale(1.1); }
        .bg-gradient-radial {
          background-image: radial-gradient(circle at center, var(--tw-gradient-stops));
        }

        @keyframes avatarZoom {
          0% {
            transform: scale(0.5);
            opacity: 0;
            filter: blur(10px);
          }

          40% {
            opacity: 1;
            filter: blur(0px);
          }

          100% {
            transform: scale(2.2);
            opacity: 0;
            filter: blur(4px);
          }
        }

        .animate-avatarZoom {
          animation: avatarZoom var(--avatar-animation-duration) ease forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
      `}</style>

      {/* ── Main content ── */}
      <div className="relative min-h-screen text-[#e5e3ff] font-body selection:bg-[#ff51fa] selection:text-white overflow-hidden">
        <header className="w-full top-0 px-6 py-4 flex justify-between items-center max-w-screen-2xl mx-auto z-50 bg-transparent">
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

        <main className="relative flex items-center justify-center p-6 pb-32">
          <div className="w-full max-w-7xl mx-auto space-y-3">
            <div className="text-center space-y-4">
              <h1 className="font-headline font-black text-5xl md:text-7xl tracking-tighter text-[#ffe483] italic uppercase">
                choose your <span className="text-[#ff51fa]">character</span> po
              </h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl mx-auto py-2">
              {avatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className="group relative flex flex-col items-center cursor-pointer"
                  onClick={() => setSelectedAvatar(avatar.id)}
                >
                  <div
                    className={`w-[10rem] aspect-square rounded-xl bg-[#1d1d37]/80 backdrop-blur-sm overflow-hidden transition-all duration-300 ${
                      selectedAvatar === avatar.id
                        ? 'ring-4 ring-[#ffe483] shadow-[0_0_30px_rgba(255,228,131,0.4)] scale-105'
                        : 'border border-[#46465c]/40 hover:border-[#81ecff] hover:scale-105'
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

            <div className="w-full max-w-md mx-auto space-y-8">
              <div className="relative group">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#81ecff] mb-3 ml-2">
                  player tag
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-black/50 backdrop-blur-sm border-2 border-[#46465c]/40 focus:border-[#81ecff]/60 rounded-lg py-5 px-6 text-xl font-headline font-bold text-[#e5e3ff] outline-none transition-all placeholder:text-[#aaa8c3]/40 shadow-inner"
                    placeholder="ikaw ba si cardo?"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#81ecff]/60">
                    <Edit size={20} />
                  </span>
                </div>
              </div>
              <button
                onClick={handleEnterGame}
                className="group relative w-full bg-[#ffe483] text-[#635200] py-6 rounded-lg font-headline font-black text-2xl tracking-widest uppercase italic overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_12px_0_#635200]"
              >
                <span className="relative z-10">sulod ta</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
              {isEntering && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
                <img
                  src={avatars.find(a => a.id === selectedAvatar)?.image}
                  alt="Selected Avatar"
                  className="w-[220px] md:w-[380px] object-cover rounded-2xl border-4 border-[#ffe483]
                  shadow-[0_0_60px_rgba(255,228,131,0.6)]
                  animate-avatarZoom"
                />
              </div>
            )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PlayerSetup;