import { useEffect, useRef, useState } from 'react';
import type { PurchaseOrder } from '../types.ts';
import { formatINR } from '../lib/api.ts';

interface AmbientVoiceDockProps {
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  language: 'en' | 'hi' | 'ta' | 'kn';
  onChangeLanguage: (lang: 'en' | 'hi' | 'ta' | 'kn') => void;
  queuedPrompt?: string | null;
  onClearQueuedPrompt?: () => void;
  onAskConcierge: (
    prompt: string,
    source: 'voice' | 'text',
  ) => Promise<{
    reply: string;
    badge: string;
    draftPo?: PurchaseOrder;
    suggestedBundle?: boolean;
  } | null>;
  onApproveDraftPo: (po: PurchaseOrder) => Promise<void>;
  onOpenFullConcierge: () => void;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

export function AmbientVoiceDock({
  isOpen,
  onToggleOpen,
  language,
  onChangeLanguage,
  queuedPrompt,
  onClearQueuedPrompt,
  onAskConcierge,
  onApproveDraftPo,
  onOpenFullConcierge,
  onNotify,
}: AmbientVoiceDockProps) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [promptInput, setPromptInput] = useState('');
  const [transcript, setTranscript] = useState(
    'Ready for voice or text commands across 10 active SKUs and 5 regional distributors.',
  );
  const [replyText, setReplyText] = useState(
    'Parle-G 200g is at 8 packs (critical low before 4:30 PM rush). Say "Order 50 Parle-G" to stage a GST-ready PO.',
  );
  const [replyBadge, setReplyBadge] = useState('Live Atelier Telemetry');
  const [pendingPo, setPendingPo] = useState<PurchaseOrder | undefined>(undefined);
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState<1 | 1.25 | 1.5>(1);
  const [spokenWordIdx, setSpokenWordIdx] = useState<number>(-1);
  const recognitionRef = useRef<any>(null);
  const karaokeTimerRef = useRef<number | null>(null);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (karaokeTimerRef.current) {
      window.clearInterval(karaokeTimerRef.current);
      karaokeTimerRef.current = null;
    }
    setSpokenWordIdx(-1);
    setPhase((prev) => (prev === 'speaking' ? 'idle' : prev));
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const speakResponse = (text: string) => {
    stopSpeaking();
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPhase('idle');
      return;
    }

    const words = text.split(/\s+/).filter(Boolean);
    setPhase('speaking');
    setSpokenWordIdx(0);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.lang =
      language === 'hi'
        ? 'hi-IN'
        : language === 'ta'
          ? 'ta-IN'
          : language === 'kn'
            ? 'kn-IN'
            : 'en-IN';

    let currentIdx = 0;
    const msPerWord = Math.round(310 / speechRate);
    karaokeTimerRef.current = window.setInterval(() => {
      currentIdx += 1;
      if (currentIdx >= words.length) {
        if (karaokeTimerRef.current) window.clearInterval(karaokeTimerRef.current);
        karaokeTimerRef.current = null;
      } else {
        setSpokenWordIdx(currentIdx);
      }
    }, msPerWord);

    utterance.onend = () => {
      if (karaokeTimerRef.current) window.clearInterval(karaokeTimerRef.current);
      karaokeTimerRef.current = null;
      setSpokenWordIdx(-1);
      setPhase('idle');
    };
    utterance.onerror = () => {
      if (karaokeTimerRef.current) window.clearInterval(karaokeTimerRef.current);
      karaokeTimerRef.current = null;
      setSpokenWordIdx(-1);
      setPhase('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSubmitIntent = async (textToAsk: string, source: 'voice' | 'text' = 'text') => {
    const clean = textToAsk.trim();
    if (!clean) return;
    stopSpeaking();
    setTranscript(clean);
    setPromptInput('');
    setPhase('thinking');

    const result = await onAskConcierge(clean, source);
    if (!result) {
      setPhase('idle');
      return;
    }
    setReplyText(result.reply);
    setReplyBadge(result.badge);
    setPendingPo(result.draftPo);
    speakResponse(result.reply);
  };

  useEffect(() => {
    if (queuedPrompt && queuedPrompt.trim()) {
      const next = queuedPrompt;
      onClearQueuedPrompt?.();
      void handleSubmitIntent(next, 'text');
    }
  }, [queuedPrompt]);

  const handleToggleMic = () => {
    if (phase === 'listening') {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setPhase('idle');
      return;
    }

    stopSpeaking();
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      onNotify(
        'Browser speech capture unavailable — type your command below or click a quick voice chip.',
        'info',
      );
      return;
    }

    const rec = new SpeechRec();
    rec.lang =
      language === 'hi'
        ? 'hi-IN'
        : language === 'ta'
          ? 'ta-IN'
          : language === 'kn'
            ? 'kn-IN'
            : 'en-IN';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    let finalText = '';
    setPhase('listening');
    setTranscript('Listening to store floor microphone...');

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += chunk;
        } else {
          interim += chunk;
        }
      }
      const display = (finalText || interim).trim();
      if (display) setTranscript(display);
    };

    rec.onend = () => {
      if (finalText.trim()) {
        void handleSubmitIntent(finalText.trim(), 'voice');
      } else {
        setPhase('idle');
      }
    };

    rec.onerror = () => {
      setPhase('idle');
      onNotify('Microphone permission denied or unavailable. Use text input below.', 'info');
    };

    try {
      rec.start();
    } catch {
      setPhase('idle');
    }
  };

  const replyWords = replyText.split(/\s+/).filter(Boolean);

  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-40 pointer-events-none">
        <button
          type="button"
          onClick={() => onToggleOpen(true)}
          className="pointer-events-auto flex items-center gap-3 pl-2.5 pr-4 py-2 rounded-full bg-[#251b14] text-[#fcf9f3] shadow-xl border border-[#715b33]/50 hover:bg-[#3b3028] transition-all cursor-pointer group"
        >
          <span className="relative w-8 h-8 rounded-full flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-linear-to-tr from-[#715b33] via-[#dfc392] to-[#fddfab] animate-orb-fluid" />
            <span className="relative material-symbols-outlined text-[16px] text-[#251b14]">
              graphic_eq
            </span>
          </span>
          <span className="text-left">
            <span className="block text-xs font-semibold leading-tight">Ask SmartStock AI</span>
            <span className="block text-[10px] text-[#dfc392]">Voice & PO Co-Pilot</span>
          </span>
          <span className="w-2 h-2 rounded-full bg-[#dbe7cb] animate-pulse" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 lg:left-76 z-40 pointer-events-none flex justify-end">
      <div className="pointer-events-auto w-full max-w-4xl rounded-3xl bg-[#251b14] text-[#fcf9f3] shadow-2xl border border-[#715b33]/40 overflow-hidden animate-live-border">
        <div className="px-5 py-4 flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-[#fcf9f3]/10">
          {/* Waving ChatGPT-style Orb */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={handleToggleMic}
              title={phase === 'listening' ? 'Stop listening' : 'Tap to speak'}
              className="relative w-14 h-14 flex items-center justify-center cursor-pointer"
            >
              {(phase === 'listening' || phase === 'speaking') && (
                <>
                  <span className="absolute inset-0 rounded-full border border-[#dfc392]/60 animate-ripple-1" />
                  <span className="absolute inset-0 rounded-full border border-[#fddfab]/50 animate-ripple-2" />
                </>
              )}
              <span
                className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center animate-orb-fluid transition-all ${
                  phase === 'listening'
                    ? 'bg-linear-to-tr from-[#ba1a1a] via-[#dfc392] to-[#fddfab] scale-105'
                    : phase === 'thinking'
                      ? 'bg-linear-to-tr from-[#715b33] via-[#dbe7cb] to-[#fddfab] animate-pulse'
                      : 'bg-linear-to-tr from-[#3b3028] via-[#715b33] to-[#fddfab]'
                }`}
              >
                <span className="material-symbols-outlined text-[#251b14] text-[22px]">
                  {phase === 'listening' ? 'mic' : phase === 'speaking' ? 'volume_up' : 'graphic_eq'}
                </span>
              </span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#fddfab]">
                  {phase === 'listening'
                    ? 'Acoustic Capture Live'
                    : phase === 'thinking'
                      ? 'Gemini 4 Reasoning...'
                      : phase === 'speaking'
                        ? 'Concierge Speaking'
                        : 'Ambient Voice Ready'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#3b3028] text-[10px] text-[#dfc392] font-medium">
                  {replyBadge}
                </span>
              </div>
              <p className="text-xs text-[#d5c3b8] mt-1 line-clamp-1">
                Heard: <span className="text-[#fcf9f3] italic">"{transcript}"</span>
              </p>
            </div>
          </div>

          {/* Acoustic Soundbars + Controls */}
          <div className="flex-1 flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
            {phase === 'speaking' && (
              <div className="flex items-center gap-1 h-7 px-2.5 rounded-full bg-[#3b3028]">
                {[0, 120, 240, 80, 190].map((delay, i) => (
                  <span
                    key={i}
                    className="w-1 bg-[#fddfab] rounded-full"
                    style={{
                      animation: `soundBarDance 0.75s ease-in-out infinite ${delay}ms`,
                      height: '12px',
                    }}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center bg-[#3b3028] rounded-full p-0.5 text-[11px]">
              {(['en', 'hi', 'ta', 'kn'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onChangeLanguage(l)}
                  className={`px-2 py-0.5 rounded-full uppercase cursor-pointer transition-colors ${
                    language === l
                      ? 'bg-[#fddfab] text-[#251b14] font-bold'
                      : 'text-[#d5c3b8] hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setSpeechRate((prev) => (prev === 1 ? 1.25 : prev === 1.25 ? 1.5 : 1))
              }
              className="px-2.5 py-1 rounded-full bg-[#3b3028] text-[11px] font-semibold text-[#fddfab] hover:bg-[#4e453f] cursor-pointer font-numeric-data"
              title="Voice playback speed"
            >
              {speechRate}x
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isMuted) stopSpeaking();
                setIsMuted((m) => !m);
              }}
              className="p-1.5 rounded-full bg-[#3b3028] text-[#d5c3b8] hover:text-white cursor-pointer"
              title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenFullConcierge}
              className="px-3 py-1 rounded-full bg-[#715b33] text-white text-xs font-semibold hover:bg-[#8a7041] cursor-pointer"
            >
              Full Workspace
            </button>

            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onToggleOpen(false);
              }}
              className="p-1.5 rounded-full bg-[#3b3028] text-[#d5c3b8] hover:text-white cursor-pointer"
              title="Minimize Voice Dock"
            >
              <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
            </button>
          </div>
        </div>

        {/* Karaoke Spoken Response + Draft PO Card */}
        <div className="px-5 py-3.5 bg-[#1d150f]/60 space-y-3">
          <div className="text-sm leading-relaxed text-[#f2dfd3]">
            {replyWords.map((word, idx) => (
              <span
                key={idx}
                className={
                  phase === 'speaking' && idx === spokenWordIdx
                    ? 'bg-[#fddfab] text-[#251b14] px-1 rounded font-semibold transition-colors'
                    : phase === 'speaking' && idx < spokenWordIdx
                      ? 'text-[#ffffff]'
                      : 'text-[#d5c3b8]'
                }
              >
                {word}{' '}
              </span>
            ))}
          </div>

          {pendingPo && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#3b3028] border border-[#dfc392]/30">
              <div className="text-xs">
                <span className="font-semibold text-[#fddfab]">{pendingPo.poNumber}</span>
                <span className="text-[#d5c3b8] ml-2">
                  {pendingPo.productName} • {pendingPo.qty} {pendingPo.unitLabel} •{' '}
                  <strong className="text-white font-numeric-data">
                    {formatINR(pendingPo.totalAmount)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPendingPo(undefined)}
                  className="px-2.5 py-1 rounded-lg text-xs text-[#d5c3b8] hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const poToSave = pendingPo;
                    setPendingPo(undefined);
                    await onApproveDraftPo(poToSave);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#dbe7cb] text-[#17200f] text-xs font-semibold hover:bg-[#bfcab0] cursor-pointer"
                >
                  Approve & Dispatch PO
                </button>
              </div>
            </div>
          )}

          {/* Input + Quick Intent Chips */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmitIntent(promptInput, 'text');
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 bg-[#3b3028] rounded-xl px-3 py-2 border border-[#715b33]/40">
              <button
                type="button"
                onClick={handleToggleMic}
                className={`p-1 rounded-lg cursor-pointer ${
                  phase === 'listening'
                    ? 'bg-[#ba1a1a] text-white'
                    : 'text-[#fddfab] hover:bg-[#4e453f]'
                }`}
                title="Voice Capture"
              >
                <span className="material-symbols-outlined text-[18px]">mic</span>
              </button>
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask SmartStock Concierge (e.g. Check Parle-G risk, Stage PO for Dettol)..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-[#a7978d] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                'Parle-G restock risk?',
                'Draft Dettol PO',
                'Ugadi gift bundle',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void handleSubmitIntent(chip, 'text')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#3b3028] hover:bg-[#4e453f] text-[11px] text-[#dfc392] whitespace-nowrap cursor-pointer"
                >
                  {chip}
                </button>
              ))}
              <button
                type="submit"
                disabled={phase === 'thinking' || !promptInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#fddfab] text-[#251b14] text-xs font-semibold hover:bg-[#dfc392] disabled:opacity-50 cursor-pointer shrink-0"
              >
                Send Intent
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
