import { useState, useCallback } from "react";

interface Avatar {
  id: string;
  name: string;
  src: string;
  alt: string;
  accentColor: "primary" | "tertiary" | "secondary";
}

const AVATARS: Avatar[] = [
  {
    id: "foxy",
    name: "FOXY",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_-WVxBjat2Cz9K42yWY6mKBqG96DefUaqtlq5h_VOuQpEqiCsTGiuPgPRTE64SYORQS0c0U3PKdEr_Z1ryttN1TH2BOGbnLcgpFDYg0XT6se6kqkNFI43UZz3BMiXwDYuyRDluJJotsHd1-qZlHPkdVCjPKhre2jxZMGxQCIvxG6Nx78n8UfJg3tBRcuaEbYP6BDheqD227kywubayUJsXvHVC0VBoNrU75iSpfWrFF6FGfWHB6OEcT846jYBpAlab3UvYo3kcSPG",
    alt: "vibrant 2d cartoon fox avatar with orange fur and a mischievous grin on a cosmic dark blue background",
    accentColor: "primary",
  },
  {
    id: "cyber",
    name: "CYBER",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXJR0nB7NCS0ZheV0qhsO-RgGZDVT8xBUCBfwq3PSmBUPtQVDgsc2NZOJmBSy3ApQ9pZQMowCfCnozU5_LK0jBKAamr510wjUsrNUijfBbk0fr9SUUdZgxUBGOCJ9VcJJkTHobmZTJktWQob_a1zB_SljR4C-H0ZI7E00bJXOMSuCmTLHaoeTng2zEaWkEBXN-5cIVpXOEeuEyfRwbVtJOrZFkFYeXXUzNa2HT-j4-tIMc021x900z97pP6J4RrIchz6vfhVM5OYyc",
    alt: "sleek futuristic 2d robot avatar with cyan neon lights and a digital display face on a dark background",
    accentColor: "tertiary",
  },
  {
    id: "merlin",
    name: "MERLIN",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBCS_YG2Ndaq5AwSkuBO_sUlXePM4Zzc6b3_FdE50YPQr-PqTPeOBhMHSkIO8mnDULHiXUgEIb9nGAro6_l9cjpJTGEsIVg158UbOv9M8Gs3eNBE8XftsCA9KpwTmcfBFlo3dNVHoctKRjYTl5bSdC0gswkiH0rL27KhIqAJzYBGKMNjaz4OpiISYdO_6oVuatdEHplQTIjQ3IyT8eXcOFxLJhQECwAl-NLH3ec8Ze3HMpNWBBvcxQZLfb0yHu844ZESWlnIHsEvSA8",
    alt: "mystical 2d wizard avatar with a purple hat and glowing magic staff on a cosmic dark background",
    accentColor: "secondary",
  },
  {
    id: "spooky",
    name: "SPOOKY",
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDi_2g6IvyAISJ2jkzAVy6dtNGnx3zxmG__MiG_cfSYoDxa5p4AyfTAkhKaOVFn8Si1X9NuGa0MF7Cru5pn_g9njlQl-WNALpBEixFXd-CPbV8EHtPqiDKCuNTuZTNH_aRO0NIWrZbNeR4trmYF3gu7Hvrlu8mbsN8mDCMVeN2JT_uZKS2kLaj3h3dH8UsWPvTbrZB6TIkq9iKSjrF-bftbcYkhLcrvNOAENb2wZ2myCRFNL5N0V0ir7mbmn-nsoCe8Af3Vu9KhhWjV",
    alt: "cute spooky 2d ghost avatar with glowing eyes and a soft spectral blue outline on a dark background",
    accentColor: "primary",
  },
];

const ACCENT = {
  primary: {
    activeRing: "ring-primary shadow-[0_0_30px_rgba(255,228,131,0.4)]",
    hoverBorder: "hover:border-primary",
    label: "text-primary",
    hoverLabel: "group-hover:text-primary",
  },
  tertiary: {
    activeRing: "ring-tertiary shadow-[0_0_30px_rgba(129,236,255,0.4)]",
    hoverBorder: "hover:border-tertiary",
    label: "text-tertiary",
    hoverLabel: "group-hover:text-tertiary",
  },
  secondary: {
    activeRing: "ring-secondary shadow-[0_0_30px_rgba(255,81,250,0.4)]",
    hoverBorder: "hover:border-secondary",
    label: "text-secondary",
    hoverLabel: "group-hover:text-secondary",
  },
} as const;

const PROFILE_SRC =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDPCtSujL6i0zn_3QXZW1a70XB_IysAZDqOB20iCZSkpLzDCfXj1dBOc8mjr-P14RrgCHWXxBBtMKH3TEGQhrqXQQXAGBduUSuDoBnGyuEAicfoEgEF74OHp2BtSHyzNDWcUbThqN8AgY4NU6qGFhfAVNG2v5jaE-AyP7jW961hr8wq4oLbTlVnU7sPWWAyoB5FVqs30-RLgrvjIbTFLv5axHZBpnMxYur0iCmsOr1vZoV7N3whm846g9_NOOf3v7zRshY_IpMR_PPj";

export default function PlayerSetup() {
  const [selectedId, setSelectedId] = useState<string>("foxy");
  const [playerTag, setPlayerTag] = useState("");

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!playerTag.trim()) return;
    console.log({ selectedId, playerTag });
  }, [selectedId, playerTag]);

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col">
      {/* ── TopAppBar ── */}
      <header className="w-full px-6 py-4 flex justify-between items-center max-w-screen-2xl mx-auto z-50">
        <div className="text-2xl font-black text-primary uppercase italic font-headline tracking-tight">
          NEON PLAYROOM
        </div>
        <div className="flex items-center gap-6">
          <button className="text-on-surface-variant hover:text-tertiary transition-colors active:scale-95">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="text-on-surface-variant hover:text-tertiary transition-colors active:scale-95">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden shadow-[0_0_15px_rgba(255,228,131,0.3)]">
            <img
              alt="Profile"
              className="w-full h-full object-cover"
              src={PROFILE_SRC}
            />
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative flex-1 flex items-center justify-center p-6 pb-32">
        {/* Background Energy */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-secondary/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-tertiary/10 blur-[120px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[160px] rounded-full" />
        </div>

        <div className="relative w-full max-w-4xl space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="font-headline font-extrabold text-5xl md:text-7xl tracking-tighter text-primary italic uppercase">
              CHOOSE YOUR <span className="text-secondary">HERO</span>
            </h1>
            <p className="text-on-surface-variant font-body font-bold tracking-widest uppercase text-sm">
              Step into the grid
            </p>
          </div>

          {/* Avatar Selection */}
          <div className="flex flex-col items-center gap-8">
            <div className="w-full flex items-center justify-center gap-4 md:gap-8 overflow-x-auto py-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {AVATARS.map((avatar) => {
                const active = selectedId === avatar.id;
                const a = ACCENT[avatar.accentColor];

                return (
                  <div
                    key={avatar.id}
                    className="group relative flex-shrink-0 cursor-pointer"
                    onClick={() => handleSelect(avatar.id)}
                  >
                    <div
                      className={`
                        w-32 h-32 md:w-48 md:h-48 rounded-xl bg-surface-container-high
                        overflow-hidden transition-all duration-300
                        ${
                          active
                            ? `${a.activeRing} scale-105`
                            : `border border-outline-variant/20 ${a.hoverBorder} hover:scale-105`
                        }
                      `}
                    >
                      <img
                        className={`
                          w-full h-full object-cover transition-all duration-300
                          ${active ? "grayscale-0" : "grayscale-[0.5] group-hover:grayscale-0"}
                        `}
                        alt={avatar.alt}
                        src={avatar.src}
                      />

                      {active && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary text-on-primary rounded-full p-2 shadow-lg scale-110">
                            <span className="material-symbols-outlined [font-variation-settings:'wght'_700]">
                              check
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <p
                      className={`
                        mt-4 text-center font-headline font-bold tracking-tight transition-colors
                        ${active ? a.label : `text-on-surface-variant ${a.hoverLabel}`}
                      `}
                    >
                      {avatar.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input & Action */}
          <div className="w-full max-w-md mx-auto space-y-8">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-tertiary mb-3 ml-2">
                Player Tag
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-tertiary/40 rounded-lg py-5 px-6 text-xl font-headline font-bold text-on-surface outline-none transition-all placeholder:text-on-surface-variant/30 shadow-inner"
                  placeholder="Enter your name"
                  type="text"
                  value={playerTag}
                  onChange={(e) => setPlayerTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-tertiary/40 material-symbols-outlined">
                  edit
                </span>
              </div>
            </div>

            <button
              className="group relative w-full bg-primary text-on-primary py-6 rounded-lg font-headline font-black text-2xl tracking-widest uppercase italic overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_12px_0_#635200] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              onClick={handleSubmit}
              disabled={!playerTag.trim()}
            >
              <span className="relative z-10">ENTER WORLD</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}