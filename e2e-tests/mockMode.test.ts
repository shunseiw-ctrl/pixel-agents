import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension, sleep } from './helpers/activation';

suite('Mock Mode', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('未起動時のstop安全', async () => {
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('pixel-agents.stopMockMode');
    }, 'stopMockMode should be safe when not running');
  });

  test('startMockMode実行可', async () => {
    // startMockMode shows a QuickPick — dismiss it programmatically
    const commandPromise = vscode.commands.executeCommand('pixel-agents.startMockMode');
    // Wait for QuickPick to appear, then close it
    await sleep(500);
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
    // Command should resolve after QuickPick is dismissed (user cancelled)
    await assert.doesNotReject(async () => {
      await commandPromise;
    }, 'startMockMode should not throw');
  });

  test('stop冪等性', async () => {
    for (let i = 0; i < 3; i++) {
      await assert.doesNotReject(
        async () => {
          await vscode.commands.executeCommand('pixel-agents.stopMockMode');
        },
        `stopMockMode attempt ${i + 1} should be safe`,
      );
    }
  });
});
