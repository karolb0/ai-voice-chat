'use client';

import { useEffect, useRef, useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

export default function ChatDock() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // NEW: session id for backend conversation
  const [sessionId, setSessionId] = useState<string | null>(null);

  // TTS flag (sound) and avatar visibility (video)
  const [ttsOn, setTtsOn] = useState(false);         // start muted
  const [showAgent, setShowAgent] = useState(false); // start hidden

  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const AGENT_IFRAME_SRC =
    'https://app.heygen.com/embedded-player/89ac4042c06148dcb498f82d208e91d2';

  // auto-scroll
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // STT init
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR: any =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const text = e?.results?.[0]?.[0]?.transcript;
      if (text) {
        setInput(text);
        sendMessage(text); // auto send when finished talking
      }
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);

    recognitionRef.current = rec;
  }, []);

  // TTS helper
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !ttsOn) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    } catch {}
  };

  // Backend API URL - use environment variable or default to localhost
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

  // ---- core send ----
  const sendMessage = async (forced?: string) => {
    const text = (forced ?? input).trim();
    if (!text || loading) return;

    if (!forced) setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      // Call backend API directly with correct format
      const res = await fetch(`${BACKEND_URL}/v1/incoming-user-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          session_id: sessionId || undefined,
        }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        data = { error: await res.text() };
      }

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : JSON.stringify(data);
        setMessages((p) => [...p, { role: 'assistant', content: `⚠️ ${msg}` }]);
        return;
      }

      // Backend returns session_id (snake_case)
      if (data?.session_id) {
        setSessionId(data.session_id);
      }

      // Backend returns generated_text
      const reply: string = data?.generated_text || 'No response received.';

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch (e: any) {
      setMessages((p) => [
        ...p,
        { role: 'assistant', content: `⚠️ ${e?.message || 'Request failed'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    if (isRecording) {
      try {
        rec.stop();
      } catch {}
      setIsRecording(false);
    } else {
      try {
        rec.start();
        setIsRecording(true);
      } catch {}
    }
  };

  // right button → toggles BOTH: TTS + avatar visibility
  const toggleVoiceAndAvatar = () => {
    setTtsOn((v) => !v);
    setShowAgent((v) => !v);
  };

  return (
    <div className="relative min-h-screen bg-white text-gray-900">
      {/* LOGO */}
      <div className="absolute top-4 right-4 z-50">
        <img
          src="https://www.jbu.edu/hs-fs/hubfs/logo/logo-images/JBU_primary_stack_color_cmyk.png?width=389&name=JBU_primary_stack_color_cmyk.png"
          alt="JBU Logo"
          className="h-16 w-auto object-contain drop-shadow"
        />
      </div>

      {/* avatar/video – bigger, higher, no background box */}
      {showAgent && (
        <div className="w-full flex justify-center -mt-4">
          <iframe
            src={AGENT_IFRAME_SRC}
            title="HeyGen video player"
            frameBorder="0"
            allow="encrypted-media; fullscreen;"
            allowFullScreen
            className="w-[440px] h-[540px] md:w-[520px] md:h-[620px] rounded-none border-none"
            style={{ background: 'transparent' }}
          />
        </div>
      )}

      {/* chat list */}
      <div
        ref={listRef}
        className="mx-auto w-full max-w-3xl h-[100svh] overflow-y-auto pb-36 px-4 pt-6"
      >
        {messages.length === 0 && !showAgent && (
          <div className="text-center text-gray-600 mt-24">
            <h1 className="text-2xl font-semibold mb-2">JBU Virtual Assistant</h1>
            <p>Type a message below to start chatting.</p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-jbu-navy text-white rounded-br-sm'
                    : 'bg-jbu-light text-jbu-dark border border-jbu-navy/20 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-xs text-jbu-navy animate-pulse">Typing…</div>
          )}
        </div>
      </div>

      {/* dock */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-jbu-light bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div className="flex gap-2 items-center">
            {/* mic button (STT) */}
            <button
              onClick={toggleRecording}
              className={`rounded-xl px-3 py-2 border transition ${
                isRecording
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-900 border-jbu-light hover:bg-gray-100'
              }`}
              title="Speak"
            >
              {isRecording ? '● Rec' : '🎤'}
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-xl border border-jbu-light bg-gray-100 text-gray-900 px-3 py-2 shadow-sm focus:border-jbu-navy focus:outline-none focus:ring-2 focus:ring-jbu-navy/20"
            />

            {/* speaker button (TTS + show/hide avatar) */}
            <button
              onClick={toggleVoiceAndAvatar}
              className={`rounded-xl px-3 py-2 border border-jbu-light transition ${
                ttsOn
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : 'bg-white text-gray-900 opacity-60'
              }`}
              title={ttsOn ? 'Voice on (avatar visible)' : 'Voice off (avatar hidden)'}
            >
              {ttsOn ? '🔈' : '🔇'}
            </button>

            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-jbu-navy hover:bg-jbu-dark px-4 py-2 text-white disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}
