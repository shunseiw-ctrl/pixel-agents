import { useState } from 'react';

interface OnboardingOverlayProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: '>_',
    title: 'ステップ 1',
    text: 'ターミナルで claude を起動してください',
  },
  {
    icon: '🧑‍💻',
    title: 'ステップ 2',
    text: 'エージェントがオフィスに出現します',
  },
  {
    icon: '👆',
    title: 'ステップ 3',
    text: 'クリックでターミナルにフォーカスできます',
  },
];

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  boxShadow: 'var(--pixel-shadow)',
  padding: '24px 32px',
  maxWidth: 360,
  width: '90%',
  textAlign: 'center',
  color: 'var(--pixel-text)',
};

const btnStyle: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: '18px',
  background: 'var(--pixel-accent)',
  color: '#fff',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  cursor: 'pointer',
};

const skipBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: '16px',
  background: 'transparent',
  color: 'var(--pixel-text-dim)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  cursor: 'pointer',
};

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '36px', marginBottom: 12 }}>{current.icon}</div>
        <div
          style={{
            fontSize: '14px',
            color: 'var(--pixel-text-dim)',
            marginBottom: 4,
          }}
        >
          {current.title}
        </div>
        <div style={{ fontSize: '20px', marginBottom: 20 }}>{current.text}</div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button style={skipBtnStyle} onClick={onComplete}>
            スキップ
          </button>
          <button
            style={btnStyle}
            onClick={() => {
              if (isLast) {
                onComplete();
              } else {
                setStep((s) => s + 1);
              }
            }}
          >
            {isLast ? '始める' : '次へ'}
          </button>
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === step ? 'var(--pixel-accent)' : 'var(--pixel-border)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
