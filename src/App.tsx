import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import LandingScreen from "./pages/Landing";
import PlayerSetup from "./pages/PlayerSetup";
import GameLobby from "./pages/ServerLobby";
import RoomLobby from "./pages/RoomLobby";
import GameScreen from "./pages/GameScreen";
import ResultScreen from "./pages/Results";
import RoleRevealScreen from "./pages/RoleReveal";

// 🎵 Import your audio file — adjust the path to wherever it lives
import bgMusic from "../assets/sounds/bgmusic.mp3";

function GlobalAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Browsers block autoplay until the user interacts with the page.
    // We listen for the first interaction, then start playback.
    const startAudio = () => {
      audio.play().catch(() => {
        // Still blocked (e.g. permissions policy) — silently ignore.
      });
      window.removeEventListener("pointerdown", startAudio);
      window.removeEventListener("keydown", startAudio);
    };

    window.addEventListener("pointerdown", startAudio);
    window.addEventListener("keydown", startAudio);

    return () => {
      window.removeEventListener("pointerdown", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
  }, []);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <>
      {/* Hidden audio element — persists for the entire session */}
      <audio ref={audioRef} src={bgMusic} loop preload="auto" style={{ display: "none" }} />

      {/* Mute / unmute toggle — fixed to bottom-right corner */}
      <button
        onClick={toggleMute}
        title={muted ? "Unmute music" : "Mute music"}
        className="fixed bottom-5 right-5 z-[9999] w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-[#46465c]/50 text-[#aaa8c3] hover:text-[#81ecff] hover:border-[#81ecff] backdrop-blur-sm transition-all"
        style={{ fontSize: "18px" }}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* GlobalAudio lives outside <Routes> so it never unmounts on navigation */}
      <GlobalAudio />

      <div className="dark min-h-screen bg-background text-on-background font-body selection:bg-secondary selection:text-white overflow-hidden">
        <Routes>

          <Route path="/" element={<LandingScreen />} />
          <Route path="/setup" element={<PlayerSetup />} />
          <Route path="/game_lobby" element={<GameLobby />} />
          <Route path="/room_lobby/:roomId" element={<RoomLobby />} />
          <Route path="/game_screen/:roomId" element={<GameScreen />} />
          <Route path="/result/:roomId" element={<ResultScreen />} />
          <Route path="/role_reveal/:roomId" element={<RoleRevealScreen />} />
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}