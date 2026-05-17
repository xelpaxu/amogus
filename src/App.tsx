import { BrowserRouter, Routes, Route } from "react-router-dom";
import PlayerSetup from "./pages/PlayerSetup";
import GameLobby from "./pages/ServerLobby";
import RoomLobby from "./pages/RoomLobby";
import GameScreen from "./pages/GameScreen";

export default function App() {
  return (
    <BrowserRouter>
      <div className="dark min-h-screen bg-background text-on-background font-body selection:bg-secondary selection:text-white overflow-hidden">
        <Routes>
          <Route path="/" element={<PlayerSetup />} />
          <Route path="/game_lobby" element={<GameLobby />} />
          <Route path="/room_lobby/:roomId" element={<RoomLobby />} />

          {/* ✅ dynamic game screen */}
          <Route path="/game_screen/:roomId" element={<GameScreen />} />

          {/* optional fallback */}
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}