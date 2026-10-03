import React, { useState } from 'react';
import { QUIZ_QUESTIONS } from '../data/mockData';
import { ScreenType } from '../types';

interface BirdQuizScreenProps {
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}

export const BirdQuizScreen: React.FC<BirdQuizScreenProps> = ({ onNavigate, showToast }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('B');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [xp, setXp] = useState(1240);
  const [streak, setStreak] = useState(7);

  const question = QUIZ_QUESTIONS[currentQuestionIndex] || QUIZ_QUESTIONS[0];
  const isCorrect = selectedOptionId === question.correctOptionId;

  const handleCheckAnswer = () => {
    if (!selectedOptionId) {
      showToast('Please select an option first');
      return;
    }
    setIsAnswerChecked(true);
    if (selectedOptionId === question.correctOptionId) {
      setXp((prev) => prev + 50);
      showToast('+50 XP! Field identification verified');
    } else {
      showToast('Incorrect specimen. Check the plumage notes.');
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = (currentQuestionIndex + 1) % QUIZ_QUESTIONS.length;
    setCurrentQuestionIndex(nextIdx);
    setSelectedOptionId('B');
    setIsAnswerChecked(false);
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-2 px-4">
      {/* Quiz Meta & Progress Header */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold text-[#181c20]">
              Question {question.questionNumber}
            </span>
            <span className="text-[12px] text-[#42493e] font-semibold">
              / {question.totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-[#ebeef3] px-2.5 py-1 rounded-full text-[#181c20]">
              <span className="material-symbols-outlined text-[15px] text-[#904d00]">stars</span>
              <span className="text-[12px] font-bold">{xp.toLocaleString()} XP</span>
            </div>
            <div className="flex items-center gap-1 bg-[#ffdcc3] text-[#6e3900] px-2.5 py-1 rounded-full">
              <span className="text-[12px] font-bold">{streak} day streak 🔥</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#e0e3e8] overflow-hidden">
          <div
            className="h-full bg-[#2d5a27] rounded-full transition-all duration-300"
            style={{ width: `${(question.questionNumber / question.totalQuestions) * 100}%` }}
          ></div>
        </div>
      </section>

      {/* Question Prompt */}
      <section className="pt-4 pb-1">
        <h2 className="text-[20px] font-bold text-[#181c20]">{question.prompt}</h2>
        <p className="text-[12px] text-[#42493e] mt-0.5">{question.subPrompt}</p>
      </section>

      {/* Observation Photo Card */}
      <section className="py-2.5">
        <div className="relative w-full rounded-2xl overflow-hidden bg-[#ebeef3] shadow-sm aspect-[4/3]">
          <img
            src={question.imageUrl}
            alt="Quiz Observation Specimen"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white">
            <span className="material-symbols-outlined text-[14px]">photo_camera</span>
            <span className="text-[11px] font-semibold">Field Identification</span>
          </div>
        </div>
      </section>

      {/* Multiple Choice Options */}
      <section className="flex flex-col gap-2 pt-1">
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (!isAnswerChecked) {
                  setSelectedOptionId(opt.id);
                }
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all active:scale-[0.99] shadow-xs ${
                isSelected
                  ? 'bg-[#2d5a27] text-white shadow-sm'
                  : 'bg-white text-[#181c20] hover:bg-[#f1f4f9]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#e0e3e8] text-[#42493e]'
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[15px] font-semibold">{opt.text}</span>
              </div>

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-white text-[#2d5a27]' : 'bg-[#e0e3e8]'
                }`}
              >
                {isSelected && (
                  <span className="material-symbols-outlined text-[16px] font-bold">done</span>
                )}
              </div>
            </button>
          );
        })}
      </section>

      {/* Primary Action: Check Answer */}
      {!isAnswerChecked ? (
        <div className="pt-3 pb-1">
          <button
            type="button"
            onClick={handleCheckAnswer}
            className="w-full h-12 rounded-xl bg-[#2d5a27] text-white font-bold text-[13px] tracking-wider uppercase shadow-sm flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
          >
            <span>Check Answer</span>
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </button>
        </div>
      ) : (
        /* Verified Feedback Card */
        <section className="pt-2 animate-in fade-in">
          <div
            className={`w-full rounded-2xl p-4 shadow-sm flex flex-col gap-2.5 ${
              isCorrect ? 'bg-[#c7ecce] text-[#01210f]' : 'bg-[#ffdad6] text-[#93000a]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isCorrect ? 'bg-[#2d5a27] text-white' : 'bg-[#ba1a1a] text-white'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isCorrect ? 'check_circle' : 'cancel'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-[16px] font-bold">
                    {isCorrect ? question.factTitle : 'Not quite right!'}
                  </span>
                  <span className="text-[13px] italic opacity-90">{question.factSpecies}</span>
                </div>
                <p className="text-[13px] leading-snug mt-1 opacity-90">{question.factText}</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextQuestion}
                className="w-full h-11 rounded-xl bg-[#20402b] text-white font-bold text-[13px] flex items-center justify-center gap-2 active:opacity-90 shadow-sm transition-opacity"
              >
                <span>Next Question</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
