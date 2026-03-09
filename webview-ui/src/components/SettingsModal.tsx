import { useEffect, useState } from 'react';

import { isSoundEnabled, setSoundEnabled } from '../notificationSound.js';
import { vscode } from '../vscodeApi.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  showThoughts: boolean;
  onToggleThoughts: () => void;
}

const menuItemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '6px 10px',
  fontSize: '24px',
  color: 'rgba(255, 255, 255, 0.8)',
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  cursor: 'pointer',
  textAlign: 'left',
};

const checkboxStyle = (checked: boolean): React.CSSProperties => ({
  width: 14,
  height: 14,
  border: '2px solid rgba(255, 255, 255, 0.5)',
  borderRadius: 0,
  background: checked ? 'rgba(90, 140, 255, 0.8)' : 'transparent',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  lineHeight: 1,
  color: '#fff',
});

const NOTIFY_KEYS = {
  error: 'pixel-agents.notifyError',
  loop: 'pixel-agents.notifyLoop',
  complete: 'pixel-agents.notifyComplete',
  inputWait: 'pixel-agents.notifyInputWait',
} as const;

export function SettingsModal({
  isOpen,
  onClose,
  isDebugMode,
  onToggleDebugMode,
  showThoughts,
  onToggleThoughts,
}: SettingsModalProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [soundLocal, setSoundLocal] = useState(isSoundEnabled);
  const [notifyError, setNotifyError] = useState(true);
  const [notifyLoop, setNotifyLoop] = useState(true);
  const [notifyComplete, setNotifyComplete] = useState(true);
  const [notifyInputWait, setNotifyInputWait] = useState(true);

  // Listen for settings loaded from extension
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'settingsLoaded') {
        if (msg.notifyError !== undefined) setNotifyError(msg.notifyError as boolean);
        if (msg.notifyLoop !== undefined) setNotifyLoop(msg.notifyLoop as boolean);
        if (msg.notifyComplete !== undefined) setNotifyComplete(msg.notifyComplete as boolean);
        if (msg.notifyInputWait !== undefined) setNotifyInputWait(msg.notifyInputWait as boolean);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!isOpen) return null;

  const toggleNotify = (key: string, current: boolean, setter: (v: boolean) => void) => {
    const newVal = !current;
    setter(newVal);
    vscode.postMessage({ type: 'setNotifySetting', key, enabled: newVal });
  };

  return (
    <>
      {/* Dark backdrop — click to close */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 49,
        }}
      />
      {/* Centered modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          padding: '4px',
          boxShadow: 'var(--pixel-shadow)',
          minWidth: 200,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        {/* Header with title and X button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px',
            borderBottom: '1px solid var(--pixel-border)',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.9)' }}>設定</span>
          <button
            onClick={onClose}
            onMouseEnter={() => setHovered('close')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 'close' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderRadius: 0,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            X
          </button>
        </div>
        {/* Menu items */}
        <button
          onClick={() => {
            vscode.postMessage({ type: 'openSessionsFolder' });
            onClose();
          }}
          onMouseEnter={() => setHovered('sessions')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'sessions' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          セッションフォルダを開く
        </button>
        <button
          onClick={() => {
            vscode.postMessage({ type: 'exportLayout' });
            onClose();
          }}
          onMouseEnter={() => setHovered('export')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'export' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          レイアウトをエクスポート
        </button>
        <button
          onClick={() => {
            vscode.postMessage({ type: 'importLayout' });
            onClose();
          }}
          onMouseEnter={() => setHovered('import')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'import' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          レイアウトをインポート
        </button>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--pixel-border)', margin: '4px 0' }} />

        <button
          onClick={() => {
            const newVal = !isSoundEnabled();
            setSoundEnabled(newVal);
            setSoundLocal(newVal);
            vscode.postMessage({ type: 'setSoundEnabled', enabled: newVal });
          }}
          onMouseEnter={() => setHovered('sound')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'sound' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>サウンド通知</span>
          <span style={checkboxStyle(soundLocal)}>{soundLocal ? 'X' : ''}</span>
        </button>
        <button
          onClick={onToggleThoughts}
          onMouseEnter={() => setHovered('thoughts')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'thoughts' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>思考つぶやき表示</span>
          <span style={checkboxStyle(showThoughts)}>{showThoughts ? 'X' : ''}</span>
        </button>

        {/* Notification settings */}
        <div style={{ borderTop: '1px solid var(--pixel-border)', margin: '4px 0' }} />
        <div
          style={{
            padding: '2px 10px',
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          通知設定
        </div>
        <button
          onClick={() => toggleNotify(NOTIFY_KEYS.error, notifyError, setNotifyError)}
          onMouseEnter={() => setHovered('nError')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            fontSize: '22px',
            background: hovered === 'nError' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>エラー通知</span>
          <span style={checkboxStyle(notifyError)}>{notifyError ? 'X' : ''}</span>
        </button>
        <button
          onClick={() => toggleNotify(NOTIFY_KEYS.loop, notifyLoop, setNotifyLoop)}
          onMouseEnter={() => setHovered('nLoop')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            fontSize: '22px',
            background: hovered === 'nLoop' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>ループ検知通知</span>
          <span style={checkboxStyle(notifyLoop)}>{notifyLoop ? 'X' : ''}</span>
        </button>
        <button
          onClick={() => toggleNotify(NOTIFY_KEYS.complete, notifyComplete, setNotifyComplete)}
          onMouseEnter={() => setHovered('nComplete')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            fontSize: '22px',
            background: hovered === 'nComplete' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>タスク完了通知</span>
          <span style={checkboxStyle(notifyComplete)}>{notifyComplete ? 'X' : ''}</span>
        </button>
        <button
          onClick={() => toggleNotify(NOTIFY_KEYS.inputWait, notifyInputWait, setNotifyInputWait)}
          onMouseEnter={() => setHovered('nInput')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            fontSize: '22px',
            background: hovered === 'nInput' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>入力待ち通知</span>
          <span style={checkboxStyle(notifyInputWait)}>{notifyInputWait ? 'X' : ''}</span>
        </button>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--pixel-border)', margin: '4px 0' }} />

        <button
          onClick={onToggleDebugMode}
          onMouseEnter={() => setHovered('debug')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'debug' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>デバッグビュー</span>
          {isDebugMode && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'rgba(90, 140, 255, 0.8)',
                flexShrink: 0,
              }}
            />
          )}
        </button>
      </div>
    </>
  );
}
