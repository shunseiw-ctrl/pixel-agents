import * as vscode from 'vscode';

const EXTENSION_ID = 'pablodelucca.pixel-agents';

export async function activateExtension(): Promise<vscode.Extension<unknown>> {
  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  if (!ext) {
    throw new Error(`Extension ${EXTENSION_ID} not found`);
  }
  if (!ext.isActive) {
    await ext.activate();
  }
  return ext;
}

export async function focusPanelAndWait(delayMs = 2000): Promise<void> {
  await vscode.commands.executeCommand('pixel-agents.panelView.focus');
  await sleep(delayMs);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getExtensionCommands(prefix = 'pixel-agents.'): Promise<string[]> {
  const all = await vscode.commands.getCommands(true);
  return all.filter((cmd) => cmd.startsWith(prefix));
}
