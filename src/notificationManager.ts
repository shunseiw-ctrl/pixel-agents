import { exec } from 'child_process';
import * as vscode from 'vscode';

import {
  GLOBAL_KEY_NOTIFY_COMPLETE,
  GLOBAL_KEY_NOTIFY_ERROR,
  GLOBAL_KEY_NOTIFY_INPUT_WAIT,
  GLOBAL_KEY_NOTIFY_LOOP,
  GLOBAL_KEY_SOUND_ENABLED,
  NOTIFY_COOLDOWN_ERROR_MS,
  NOTIFY_COOLDOWN_INPUT_MS,
  NOTIFY_COOLDOWN_LOOP_MS,
} from './constants.js';

export type NotifyType = 'error' | 'loop' | 'complete' | 'inputWait';

const COOLDOWNS: Record<NotifyType, number> = {
  error: NOTIFY_COOLDOWN_ERROR_MS,
  loop: NOTIFY_COOLDOWN_LOOP_MS,
  complete: 0,
  inputWait: NOTIFY_COOLDOWN_INPUT_MS,
};

const SETTING_KEYS: Record<NotifyType, string> = {
  error: GLOBAL_KEY_NOTIFY_ERROR,
  loop: GLOBAL_KEY_NOTIFY_LOOP,
  complete: GLOBAL_KEY_NOTIFY_COMPLETE,
  inputWait: GLOBAL_KEY_NOTIFY_INPUT_WAIT,
};

const SOUNDS: Record<NotifyType, string> = {
  error: '/System/Library/Sounds/Sosumi.aiff',
  loop: '/System/Library/Sounds/Sosumi.aiff',
  complete: '/System/Library/Sounds/Glass.aiff',
  inputWait: '/System/Library/Sounds/Tink.aiff',
};

// Module-level context reference — set once by the extension
let extensionContext: vscode.ExtensionContext | null = null;

// Track last notification time per agent × type
const lastNotifyTime = new Map<string, number>();

export function initNotificationManager(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

function getKey(agentId: number, type: NotifyType): string {
  return `${agentId}:${type}`;
}

function isThrottled(agentId: number, type: NotifyType): boolean {
  const key = getKey(agentId, type);
  const last = lastNotifyTime.get(key) || 0;
  const cooldown = COOLDOWNS[type];
  return Date.now() - last < cooldown;
}

function markSent(agentId: number, type: NotifyType): void {
  lastNotifyTime.set(getKey(agentId, type), Date.now());
}

function isEnabled(type: NotifyType): boolean {
  if (!extensionContext) return true;
  return extensionContext.globalState.get<boolean>(SETTING_KEYS[type], true);
}

function isSoundEnabled(): boolean {
  if (!extensionContext) return true;
  return extensionContext.globalState.get<boolean>(GLOBAL_KEY_SOUND_ENABLED, true);
}

// Windows SystemSounds mapping (no file paths needed — uses .NET built-in sounds)
const WINDOWS_SYSTEM_SOUNDS: Record<NotifyType, string> = {
  error: '[System.Media.SystemSounds]::Hand.Play()',
  loop: '[System.Media.SystemSounds]::Hand.Play()',
  complete: '[System.Media.SystemSounds]::Asterisk.Play()',
  inputWait: '[System.Media.SystemSounds]::Exclamation.Play()',
};

function playSound(type: NotifyType): void {
  if (process.platform === 'darwin') {
    const soundPath = SOUNDS[type];
    exec(`afplay "${soundPath}"`, (err) => {
      if (err) console.log(`[Pixel Agents] Sound play error: ${err.message}`);
    });
  } else if (process.platform === 'win32') {
    const psCommand = WINDOWS_SYSTEM_SOUNDS[type];
    exec(`powershell -c "${psCommand}"`, (err) => {
      if (err) console.log(`[Pixel Agents] Sound play error: ${err.message}`);
    });
  }
  // Linux: skip native sound — webview-side Web Audio API chime provides notification
}

export function sendNotification(agentId: number, type: NotifyType, message: string): void {
  if (!isEnabled(type)) return;
  if (isThrottled(agentId, type)) return;

  markSent(agentId, type);

  if (type === 'error' || type === 'loop') {
    vscode.window.showWarningMessage(message);
  } else {
    vscode.window.showInformationMessage(message);
  }

  if (isSoundEnabled()) {
    playSound(type);
  }
}

export function clearAgentCooldowns(agentId: number): void {
  for (const key of lastNotifyTime.keys()) {
    if (key.startsWith(`${agentId}:`)) {
      lastNotifyTime.delete(key);
    }
  }
}
