import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { socket } from "../socket";
import { Clock } from "lucide-react";

const QUESTIONS = [
  {
    key: "sentence",
    label: "Describe what you're doing",
    placeholder: "I am building a responsive web app..."
  },
  {
    key: "keywords",
    label: "Keywords",
    placeholder: "html, css, react"
  },
  {
    key: "code",
    label: "Sample Code",
    placeholder: "function App() { return <div>Hello</div> }"
  }
];

const GameScreen: React.FC = () => {
  const location = useLocation();
  const { roomId, theme } = location.state || {};

  const [step, setStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [answers, setAnswers] = useState({
    sentence: "",
    keywords: "",
    code: ""
  });

  // ⏱️ TIMER
  useEffect(() => {
    if (isSubmitted) return;

    if (timeLeft <= 0) {
      handleSubmit(); // auto submit
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isSubmitted]);

  // 📡 LISTEN FOR NEXT STEP FROM SERVER
  useEffect(() => {
    socket.on("next_question", (data) => {
      setStep(data.step);
      setTimeLeft(45);
      setIsSubmitted(false);
    });

    socket.on("round_finished", () => {
      console.log("GO TO RESULT SCREEN");
      // navigate("/results")
    });

    return () => {
      socket.off("next_question");
      socket.off("round_finished");
    };
  }, []);

  const handleSubmit = () => {
    if (isSubmitted) return;

    setIsSubmitted(true);

    socket.emit("submit_answer_step", {
      roomId,
      step,
      answer: answers[QUESTIONS[step].key as keyof typeof answers]
    });
  };

  const handleChange = (value: string) => {
    const key = QUESTIONS[step].key;
    setAnswers((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="min-h-screen bg-[#0c0c1f] text-white flex flex-col">

      {/* HEADER */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-[#46465c]/20">
        <div className="text-xl font-black text-[#ffe483] uppercase italic">
          THEME: <span className="text-[#ff51fa]">{theme}</span>
        </div>

        <div className="flex items-center gap-2 text-[#81ecff] font-bold">
          <Clock size={18} />
          <span>{timeLeft}s</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">

        <div className="w-full max-w-2xl space-y-6">

          {/* QUESTION */}
          <h2 className="text-2xl font-bold text-[#81ecff] uppercase tracking-widest">
            {QUESTIONS[step].label}
          </h2>

          {/* INPUT */}
          <textarea
            disabled={isSubmitted}
            value={answers[QUESTIONS[step].key as keyof typeof answers]}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full h-40 bg-black border border-[#46465c] rounded-lg p-4 text-white font-mono focus:outline-none focus:border-[#81ecff] disabled:opacity-50"
            placeholder={QUESTIONS[step].placeholder}
          />

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitted}
            className="w-full bg-[#ff51fa] text-[#400040] py-4 rounded-lg font-black uppercase tracking-widest disabled:opacity-50"
          >
            {isSubmitted ? "WAITING..." : "SUBMIT"}
          </button>

        </div>
      </main>
    </div>
  );
};

export default GameScreen;