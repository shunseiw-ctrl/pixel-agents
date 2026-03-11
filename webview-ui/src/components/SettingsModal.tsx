import { useEffect, useState } from 'react';

import {
  getMasterVolume,
  isNotificationSoundEnabled,
  isSoundEnabled,
  isTypingSoundEnabled,
  setMasterVolume,
  setNotificationSoundEnabled,
  setSoundEnabled,
  setTypingSoundEnabled,
} from '../notificationSound.js';
import { vscode } from '../vscodeApi.js';

export interface AgentAppearance {
  id: number;
  palette: number;
  hueShift: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  showThoughts: boolean;
  onToggleThoughts: () => void;
  agents?: number[];
  agentAppearances?: AgentAppearance[];
  onChangeAppearance?: (id: number, palette: number, hueShift: number) => void;
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
  agents,
  agentAppearances,
  onChangeAppearance,
}: SettingsModalProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [soundLocal, setSoundLocal] = useState(isSoundEnabled);
  const [typingSoundLocal, setTypingSoundLocal] = useState(isTypingSoundEnabled);
  const [notifSoundLocal, setNotifSoundLocal] = useState(isNotificationSoundEnabled);
  const [volumeLocal, setVolumeLocal] = useState(getMasterVolume);
  const [presets, setPresets] = useState<
    Array<{
      name: string;
      description: string;
      cols: number;
      rows: number;
      seats: number;
    }>
  >([]);
  const [showPresets, setShowPresets] = useState(false);
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
      } else if (msg.type === 'layoutPresetsLoaded') {
        setPresets(msg.presets as typeof presets);
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
        <button
          onClick={() => {
            if (!showPresets) {
              vscode.postMessage({ type: 'getLayoutPresets' });
            }
            setShowPresets((v) => !v);
          }}
          onMouseEnter={() => setHovered('presets')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...menuItemBase,
            background: hovered === 'presets' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          }}
        >
          <span>テンプレートを選ぶ</span>
          <span style={{ fontSize: '16px' }}>{showPresets ? '▲' : '▼'}</span>
        </button>
        {showPresets && presets.length > 0 && (
          <div style={{ padding: '2px 8px 4px' }}>
            {presets.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  if (
                    confirm(
                      `テンプレート「${p.name}」を読み込みますか？\n現在のレイアウトは上書きされます。`,
                    )
                  ) {
                    vscode.postMessage({ type: 'loadLayoutPreset', name: p.name });
                    onClose();
                  }
                }}
                onMouseEnter={() => setHovered(`preset-${p.name}`)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '4px 8px',
                  margin: '2px 0',
                  fontSize: '20px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  background:
                    hovered === `preset-${p.name}`
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {p.description} ({p.cols}×{p.rows}, {p.seats}席)
                </div>
              </button>
            ))}
          </div>
        )}

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
          <span>サウンド (マスター)</span>
          <span style={checkboxStyle(soundLocal)}>{soundLocal ? 'X' : ''}</span>
        </button>
        {soundLocal && (
          <>
            <button
              onClick={() => {
                const newVal = !isTypingSoundEnabled();
                setTypingSoundEnabled(newVal);
                setTypingSoundLocal(newVal);
                vscode.postMessage({
                  type: 'setSoundSetting',
                  key: 'typingSound',
                  enabled: newVal,
                });
              }}
              onMouseEnter={() => setHovered('typingSound')}
              onMouseLeave={() => setHovered(null)}
              style={{
                ...menuItemBase,
                fontSize: '22px',
                paddingLeft: 24,
                background: hovered === 'typingSound' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              }}
            >
              <span>タイピング音</span>
              <span style={checkboxStyle(typingSoundLocal)}>{typingSoundLocal ? 'X' : ''}</span>
            </button>
            <button
              onClick={() => {
                const newVal = !isNotificationSoundEnabled();
                setNotificationSoundEnabled(newVal);
                setNotifSoundLocal(newVal);
                vscode.postMessage({
                  type: 'setSoundSetting',
                  key: 'notificationSound',
                  enabled: newVal,
                });
              }}
              onMouseEnter={() => setHovered('notifSound')}
              onMouseLeave={() => setHovered(null)}
              style={{
                ...menuItemBase,
                fontSize: '22px',
                paddingLeft: 24,
                background: hovered === 'notifSound' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              }}
            >
              <span>通知音</span>
              <span style={checkboxStyle(notifSoundLocal)}>{notifSoundLocal ? 'X' : ''}</span>
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px 4px 24px',
                fontSize: '22px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <span>音量</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(volumeLocal * 100)}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) / 100;
                  setMasterVolume(v);
                  setVolumeLocal(v);
                  vscode.postMessage({ type: 'setSoundSetting', key: 'masterVolume', value: v });
                }}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '18px', minWidth: 32, textAlign: 'right' }}>
                {Math.round(volumeLocal * 100)}%
              </span>
            </div>
          </>
        )}
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

        {/* Character customization */}
        {agents && agents.length > 0 && onChangeAppearance && (
          <>
            <div style={{ borderTop: '1px solid var(--pixel-border)', margin: '4px 0' }} />
            <div
              style={{
                padding: '2px 10px',
                fontSize: '20px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              キャラクターカスタマイズ
            </div>
            {agents.map((agentId) => {
              const appearance = agentAppearances?.find((a) => a.id === agentId);
              if (!appearance) return null;
              return (
                <div key={agentId} style={{ padding: '4px 10px' }}>
                  <div
                    style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: 4 }}
                  >
                    Agent #{agentId}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '18px',
                      color: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    <span>パレット:</span>
                    {[0, 1, 2, 3, 4, 5].map((p) => (
                      <button
                        key={p}
                        onClick={() => onChangeAppearance(agentId, p, appearance.hueShift)}
                        style={{
                          width: 20,
                          height: 20,
                          border:
                            appearance.palette === p
                              ? '2px solid #5a8cff'
                              : '1px solid rgba(255,255,255,0.3)',
                          borderRadius: 0,
                          background: `hsl(${[30, 200, 350, 50, 150, 280][p]}, 50%, 40%)`,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 4,
                      fontSize: '18px',
                      color: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    <span>色相:</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={appearance.hueShift}
                      onChange={(e) => {
                        onChangeAppearance(
                          agentId,
                          appearance.palette,
                          parseInt(e.target.value, 10),
                        );
                      }}
                      style={{ flex: 1, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '16px', minWidth: 32, textAlign: 'right' }}>
                      {appearance.hueShift}°
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}

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
