import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension, getExtensionCommands } from './helpers/activation';

suite('Command Registration', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('showPanel コマンド登録済み', async () => {
    const cmds = await getExtensionCommands();
    assert.ok(cmds.includes('pixel-agents.showPanel'), 'showPanel should be registered');
  });

  test('exportDefaultLayout コマンド登録済み', async () => {
    const cmds = await getExtensionCommands();
    assert.ok(
      cmds.includes('pixel-agents.exportDefaultLayout'),
      'exportDefaultLayout should be registered',
    );
  });

  test('startMockMode コマンド登録済み', async () => {
    const cmds = await getExtensionCommands();
    assert.ok(cmds.includes('pixel-agents.startMockMode'), 'startMockMode should be registered');
  });

  test('stopMockMode コマンド登録済み', async () => {
    const cmds = await getExtensionCommands();
    assert.ok(cmds.includes('pixel-agents.stopMockMode'), 'stopMockMode should be registered');
  });

  test('showPanel コマンド実行可', async () => {
    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('pixel-agents.showPanel');
    }, 'showPanel should execute without error');
  });
});
