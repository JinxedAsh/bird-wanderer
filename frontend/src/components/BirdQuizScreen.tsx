import React, { useEffect, useRef, useState } from 'react';
import { retention, type PracticeState } from '../lib/retention';
import { SessionExpiredError } from '../lib/auth';
import { PhotoCredit } from './SpeciesPhoto';
import { useDialogFocus } from '../lib/useDialogFocus';
import { ScreenType } from '../types';

interface BirdQuizScreenProps {
  onSessionExpired?: () => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}

export const BirdQuizScreen: React.FC<BirdQuizScreenProps> = ({
  onNavigate,
  showToast,
  onSessionExpired,
}) => {
  const [data, setData] = useState<PracticeState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [confirmRestart, setConfirmRestart] = useState(false);
  const restartDialog = useDialogFocus(confirmRestart, () => setConfirmRestart(false));
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const run = async (action: (signal: AbortSignal) => Promise<PracticeState>) => {
    const request = controller.current;
    if (!request || request.signal.aborted || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await action(request.signal);
      if (!request.signal.aborted) setData(next);
    } catch (failure) {
      if (!request.signal.aborted) {
        if (failure instanceof SessionExpiredError) onSessionExpired?.();
        else setError(failure instanceof Error ? failure.message : 'Practice could not be loaded.');
      }
    } finally {
      if (!request.signal.aborted) {
        pending.current = false;
        setBusy(false);
      }
    }
  };
  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    pending.current = false;
    void run((signal) => retention.load(signal));
    return () => request.abort();
  }, []);
  const question = data?.session?.question;
  const feedback = data?.session?.feedback;
  useEffect(() => {
    setSelectedOptionId(feedback?.selectedOptionId || '');
    setPhotoFailed(false);
  }, [question?.id, feedback?.selectedOptionId]);
  const isAnswerChecked = Boolean(feedback),
    isCorrect = Boolean(feedback?.correct);
  const xp = data?.stats.xp || 0,
    streak = data?.stats.streak || 0;
  const handleCheckAnswer = () => {
    if (!selectedOptionId || !data?.session || isAnswerChecked || photoFailed) return;
    void run((signal) =>
      retention.answer(data.session!.id, data.session!.currentIndex, selectedOptionId, signal),
    );
  };
  const handleNextQuestion = () => {
    if (data?.session)
      void run((signal) => retention.next(data.session!.id, data.session!.currentIndex, signal));
  };
  const issue = error && (
    <div role="alert" className="my-3 rounded-xl bg-white p-3 text-[13px]">
      <p>{error}</p>
      <button
        type="button"
        disabled={busy}
        className="min-h-11 underline"
        onClick={() => void run((signal) => retention.load(signal))}
      >
        Reload practice
      </button>
    </div>
  );
  const challenges = data && (
    <details className="mt-4 rounded-xl bg-white p-3 text-[13px]">
      <summary className="min-h-11 cursor-pointer font-bold">Photography challenges · this week</summary>
      <p className="mb-2 text-[12px]">
        Based on your current journal records published this week ({data.stats.timezone}). User-reported
        progress, not independent identification or proof of a visit. Deleting a record updates progress; no
        challenge XP is awarded.
      </p>
      {data.stats.challenges.map((challenge) => (
        <div key={challenge.id} className="my-3">
          <p>{challenge.title}</p>
          <progress
            className="w-full"
            max={challenge.target}
            value={Math.min(challenge.progress, challenge.target)}
            aria-label={challenge.title}
          />
          <p>
            {challenge.progress} / {challenge.target}
            {challenge.progress >= challenge.target ? ' · Complete' : ''}
          </p>
        </div>
      ))}
    </details>
  );
  if (!data)
    return (
      <div className="px-4 py-5 pb-28">{issue || <p role="status">Loading your practice progress…</p>}</div>
    );
  if (!question)
    return (
      <div className="px-4 py-5 pb-28 text-[#181c20]">
        {issue}
        <section className="rounded-2xl bg-white p-4">
          <h2 className="text-[20px] font-bold">
            {data.session?.status === 'completed' ? 'Practice complete' : 'Bird identification practice'}
          </h2>
          {data.session?.status === 'completed' && (
            <p className="mt-2 text-[16px]">
              Score: {data.session.score} / {data.session.totalQuestions}
            </p>
          )}
          <p className="my-3 text-[13px]">
            {xp} XP · {streak} day streak · {data.stats.completedSessions} completed sessions
          </p>
          <p className="my-3 text-[12px]">
            Ten source-matched, credited reference photos. Progress is saved after each answer; correct
            answers earn 50 XP once. Complete a session to record a practice day ({data.stats.timezone}). This
            is learning practice, not a verified sighting assessment.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run((signal) => retention.start(false, signal))}
            className="min-h-12 w-full rounded-xl bg-[#2d5a27] px-3 font-bold text-white"
          >
            {busy
              ? 'Loading credited photographs…'
              : data.session
                ? 'Start another practice'
                : 'Start 10-question practice'}
          </button>
        </section>
        {challenges}
        <button type="button" onClick={() => onNavigate('journal')} className="mt-3 min-h-11 underline">
          Open journal
        </button>
      </div>
    );

  return (
    <div className="flex flex-col w-full pb-28 pt-2 px-4">
      {issue}
      {/* Quiz Meta & Progress Header */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold text-[#181c20]">Question {question.questionNumber}</span>
            <span className="text-[12px] text-[#42493e] font-semibold">/ {question.totalQuestions}</span>
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
            key={`${question.imageUrl}:${photoAttempt}`}
            onError={() => setPhotoFailed(true)}
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

      <figure>
        <details className="my-2 text-[12px]">
          <summary className="min-h-11 cursor-pointer">Photograph source and licence</summary>
          <PhotoCredit photo={question.photoCredit} full />
          <p>Source filenames may name the species; this is practice, not a closed-book exam.</p>
        </details>
      </figure>
      {photoFailed && (
        <div role="alert" className="my-2 text-[13px]">
          <p>
            The reference image is unavailable. Retry loading it or start over; no replacement species image
            is inferred.
          </p>
          <button
            type="button"
            onClick={() => {
              setPhotoFailed(false);
              setPhotoAttempt((value) => value + 1);
            }}
            className="min-h-11 underline"
          >
            Retry image
          </button>
        </div>
      )}
      {/* Multiple Choice Options */}
      <section className="flex flex-col gap-2 pt-1">
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isSelected}
              disabled={busy || isAnswerChecked || photoFailed}
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
                {isSelected && <span className="material-symbols-outlined text-[16px] font-bold">done</span>}
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
            disabled={busy || !selectedOptionId || photoFailed}
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
                    {isCorrect ? feedback?.factTitle : 'Not quite right!'}
                  </span>
                  <span className="text-[13px] italic opacity-90">{feedback?.factSpecies}</span>
                </div>
                <p className="text-[13px] leading-snug mt-1 opacity-90">{feedback?.factText}</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={busy}
                className="w-full h-11 rounded-xl bg-[#20402b] text-white font-bold text-[13px] flex items-center justify-center gap-2 active:opacity-90 shadow-sm transition-opacity"
              >
                <span>
                  {busy
                    ? 'Saving…'
                    : question.questionNumber === question.totalQuestions
                      ? 'Finish practice'
                      : 'Next Question'}
                </span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirmRestart(true)}
        className="mt-3 min-h-11 text-[12px] underline"
      >
        Start over
      </button>
      {challenges}
      {confirmRestart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            ref={restartDialog}
            role="dialog"
            aria-modal="true"
            aria-label="Restart practice confirmation"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl bg-white p-4 text-[13px] shadow-xl"
          >
            <h2 className="mb-2 text-[18px] font-bold">Start a new practice?</h2>
            <p>Saved answers keep their XP. This unfinished session will not count toward your streak.</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl bg-[#ebeef3]"
                onClick={() => setConfirmRestart(false)}
              >
                Keep current practice
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl bg-[#2d5a27] text-white"
                onClick={() => {
                  setConfirmRestart(false);
                  void run((signal) => retention.start(true, signal));
                }}
              >
                Restart practice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
