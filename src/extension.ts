import * as vscode from 'vscode';

import {
  COMMAND_EXPORT_DEFAULT_LAYOUT,
  COMMAND_SHOW_PANEL,
  COMMAND_START_MOCK,
  COMMAND_STOP_MOCK,
  VIEW_ID,
} from './constants.js';
import { isMockRunning, startMockMode, stopMockMode } from './mockMode.js';
import { initNotificationManager } from './notificationManager.js';
import { PixelAgentsViewProvider } from './PixelAgentsViewProvider.js';

let providerInstance: PixelAgentsViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  initNotificationManager(context);
  const provider = new PixelAgentsViewProvider(context);
  providerInstance = provider;

  context.subscriptions.push(vscode.window.registerWebviewViewProvider(VIEW_ID, provider));

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_SHOW_PANEL, () => {
      vscode.commands.executeCommand(`${VIEW_ID}.focus`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_EXPORT_DEFAULT_LAYOUT, () => {
      provider.exportDefaultLayout();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_START_MOCK, async () => {
      if (isMockRunning()) {
        vscode.window.showWarningMessage('モックモードは既に実行中です');
        return;
      }
      const pattern = await vscode.window.showQuickPick(
        [
          { label: 'normal', description: '通常のツール使用→完了を繰り返す' },
          { label: 'error', description: '途中でエラーが発生する' },
          { label: 'loop', description: '同じツールを繰り返しループ検知が発動' },
          { label: 'mixed', description: '3パターンを並行実行' },
        ],
        { placeHolder: 'モックパターンを選択' },
      );
      if (!pattern) return;
      const countStr = await vscode.window.showInputBox({
        prompt: 'エージェント数 (1-5)',
        value: '3',
      });
      if (!countStr) return;
      const count = Math.max(1, Math.min(5, parseInt(countStr, 10) || 3));
      startMockMode(
        provider.getWebview(),
        count,
        pattern.label as 'normal' | 'error' | 'loop' | 'mixed',
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_STOP_MOCK, () => {
      if (!isMockRunning()) {
        vscode.window.showWarningMessage('モックモードは実行されていません');
        return;
      }
      stopMockMode();
    }),
  );
}

export function deactivate() {
  providerInstance?.dispose();
}
