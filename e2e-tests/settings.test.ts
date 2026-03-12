import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension, sleep } from './helpers/activation';

suite('Settings & Robustness', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('初期設定読み込み', async () => {
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('pixel-agents.panelView.focus');
    }, 'Panel should open without error after settings load');
  });

  test('stopMockMode空実行', async () => {
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('pixel-agents.stopMockMode');
    }, 'stopMockMode should be safe when mock is not running');
  });

  test('高速連打耐性', async () => {
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(Promise.resolve(vscode.commands.executeCommand('pixel-agents.showPanel')));
    }
    await assert.doesNotReject(async () => {
      await Promise.all(promises);
    }, 'Rapid showPanel calls should not crash');
    await sleep(1000);
  });
});
