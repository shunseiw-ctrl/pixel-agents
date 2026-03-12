import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LAYOUT_DIR = path.join(os.homedir(), '.pixel-agents');
const LAYOUT_FILE = path.join(LAYOUT_DIR, 'layout.json');

export function backupLayoutFile(): string | null {
  try {
    if (fs.existsSync(LAYOUT_FILE)) {
      return fs.readFileSync(LAYOUT_FILE, 'utf-8');
    }
  } catch {
    // File doesn't exist or can't be read
  }
  return null;
}

export function restoreLayoutFile(content: string | null): void {
  try {
    if (content === null) {
      // No backup — remove file if it was created during test
      if (fs.existsSync(LAYOUT_FILE)) {
        fs.unlinkSync(LAYOUT_FILE);
      }
    } else {
      fs.writeFileSync(LAYOUT_FILE, content, 'utf-8');
    }
  } catch {
    // Best effort restore
  }
}

export function readLayoutFile(): unknown | null {
  try {
    if (fs.existsSync(LAYOUT_FILE)) {
      const raw = fs.readFileSync(LAYOUT_FILE, 'utf-8');
      return JSON.parse(raw) as unknown;
    }
  } catch {
    // File doesn't exist or is invalid JSON
  }
  return null;
}

export function layoutDirExists(): boolean {
  return fs.existsSync(LAYOUT_DIR);
}

export function layoutFileExists(): boolean {
  return fs.existsSync(LAYOUT_FILE);
}
