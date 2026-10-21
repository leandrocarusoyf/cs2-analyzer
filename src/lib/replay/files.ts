import path from 'node:path';
import { realpath } from 'node:fs/promises';

export const replayRoot = path.resolve(process.cwd(), 'data/replays');
export async function resolveReplayFile(stored: string): Promise<string> {
  const resolved = path.resolve(process.cwd(), stored);
  const relative = path.relative(replayRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Invalid replay path');
  // Resolve symlinks as well as lexical traversal.
  try {
    const actual = await realpath(resolved);
    const rel = path.relative(await realpath(replayRoot), actual);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Invalid replay target');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return resolved;
}
