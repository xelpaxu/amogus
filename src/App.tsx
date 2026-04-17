import { BrowserRouter, Routes, Route } from "react-router-dom";
import PlayerSetup from "./pages/PlayerSetup";
import GameLobby from "./pages/ServerLobby";
import RoomLobby from "./pages/RoomLobby";

export default function App() {
  return (
    <BrowserRouter>
      {/* 
        Root wrapper enforcing your dark mode class and base theme tokens.
        (If you set class="dark" in your index.html <body>, you can remove it here)
      */}
      <div className="dark min-h-screen bg-background text-on-background font-body selection:bg-secondary selection:text-white overflow-hidden">
        <Routes>
          {/* Player Setup / Home Screen */}
          <Route path="/" element={<PlayerSetup />} />
          <Route path="/game_lobby" element={<GameLobby />} />
          <Route path="/room_lobby/:roomId" element={<RoomLobby />} />  

          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}