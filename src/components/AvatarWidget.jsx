import { useEffect, useRef, useState, useCallback } from 'react';
import AvatarSprite from '@/components/AvatarSprite.jsx';
import { useWizard } from '@/contexts/WizardContext.jsx';

const TypingText = ({ text, onDone }) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
        onDone?.();
      }
    }, 22);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <span>
      {displayed}
      {!done && <span className="ml-0.5 animate-pulse">_</span>}
    </span>
  );
};

const AvatarWidget = () => {
  const { avatarState, triggerAvatarSpeak, viewer } = useWizard();

  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const chatEndRef = useRef(null);

  const avatar = avatarState;
  const colorPrimary = avatar?.colorPrimary || '#a78bfa';
  const colorSecondary = avatar?.colorSecondary || '#7c3aed';
  const avatarName = avatar?.name || 'Avatar';

  // Only show if we have a viewer and avatar data
  const shouldRender = Boolean(viewer) && Boolean(avatar);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    const newHistory = trimmed
      ? [...history, { role: 'user', text: trimmed }]
      : [...history];

    if (trimmed) setHistory(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const apiHistory = newHistory.slice(0, trimmed ? -1 : undefined).map((m) => ({
        role: m.role === 'avatar' ? 'assistant' : 'user',
        content: m.text,
      }));

      const replyText = await triggerAvatarSpeak({
        message: trimmed || undefined,
        history: apiHistory,
      });
      setHistory([...newHistory, { role: 'avatar', text: replyText || '...' }]);
    } catch {
      setHistory([...newHistory, { role: 'avatar', text: 'El Avatar contempla en silencio...' }]);
    } finally {
      setLoading(false);
    }
  }, [history, triggerAvatarSpeak]);

  const handleOpen = () => {
    setOpen(true);
    if (!initialized) {
      setInitialized(true);
      sendMessage('');
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || loading) return;
    sendMessage(inputText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed top-6 right-6 z-[800] flex flex-col items-end gap-2">
      {/* Chat panel */}
      {open && (
        <div
          className="flex flex-col"
          style={{
            width: 280,
            maxHeight: 380,
            background: 'linear-gradient(180deg, rgba(10,4,28,0.97) 0%, rgba(6,4,18,0.99) 100%)',
            border: `1px solid ${colorPrimary}66`,
            boxShadow: `0 0 32px ${colorPrimary}22`,
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{ borderColor: `${colorPrimary}33` }}
          >
            <span
              className="font-mono text-[11px] uppercase tracking-[0.28em]"
              style={{ color: colorPrimary }}
            >
              {avatarName}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-xs transition-colors"
              style={{ color: `${colorSecondary}cc` }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 100 }}>
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="font-mono text-xs leading-5 px-3 py-2 rounded max-w-[85%]"
                  style={
                    msg.role === 'avatar'
                      ? { background: `${colorPrimary}11`, color: colorPrimary, border: `1px solid ${colorPrimary}33` }
                      : { background: `${colorSecondary}22`, color: '#e4b9ff', border: `1px solid ${colorSecondary}44` }
                  }
                >
                  {i === history.length - 1 && msg.role === 'avatar' && !loading
                    ? <TypingText text={msg.text} />
                    : msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="font-mono text-xs px-3 py-2 rounded"
                  style={{ color: colorPrimary, background: `${colorPrimary}11`, border: `1px solid ${colorPrimary}22` }}
                >
                  <span className="animate-pulse">el Avatar contempla...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-3 py-2 border-t flex gap-2 items-center"
            style={{ borderColor: `${colorPrimary}22` }}
          >
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Hablar con ${avatarName}...`}
              disabled={loading}
              className="flex-1 bg-transparent font-mono text-xs outline-none border-b pb-1"
              style={{ color: colorPrimary, borderColor: `${colorPrimary}44`, caretColor: colorPrimary }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !inputText.trim()}
              className="font-mono text-xs transition-colors"
              style={{ color: inputText.trim() && !loading ? colorPrimary : `${colorPrimary}33` }}
            >
              ↵
            </button>
          </div>
        </div>
      )}

      {/* Sprite toggle button */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className="rounded-full p-1 transition-all"
        title={`Hablar con tu Avatar: ${avatarName}`}
        style={{
          background: `${colorSecondary}22`,
          border: `1px solid ${colorPrimary}55`,
          boxShadow: open ? `0 0 16px ${colorPrimary}55` : 'none',
        }}
      >
        <AvatarSprite size={48} talking={loading} colorPrimary={colorPrimary} colorSecondary={colorSecondary} />
      </button>
    </div>
  );
};

export default AvatarWidget;
