import { BrowserRouter, Routes, Route } from "react-router-dom";
import PlayerSetup from "./pages/PlayerSetup";

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

          {/* Add your other routes below as you build them out */}
          {/* <Route path="/game" element={<GameScreen />} /> */}
          {/* <Route path="/store" element={<StoreScreen />} /> */}
          {/* <Route path="/profile" element={<ProfileScreen />} /> */}
          
          {/* Optional 404 Catch-all */}
          {/* <Route path="*" element={<NotFound />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}