// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sevenZip from '7zip-bin';
import { processDemoFile } from '../scripts/process-demo.mjs';
import { extractDemoArchive } from '../scripts/extract-demo-archive.mjs';

const execAsync = promisify(execFile);
const raw = {
  map: 'de_nuke', playedAt: '2026-10-18T12:00:00Z',
  teamCtName: 'Alpha', teamTName: 'Beta',
  players: [{ steamId: '1001', name: 'A', team: 'CT' }, { steamId: '1002', name: 'B', team: 'T' }],
  rounds: [{ roundNumber: 1, startTick: 0, endTick: 64, winnerSide: 'CT', ticks: [] }],
};

// Minimal stored RAR4 fixture; no external RAR creator is needed by the tests.
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function rarFixture(entries: Record<string, string>): Buffer {
  const header = (body: Buffer) => {
    const crc = Buffer.alloc(2); crc.writeUInt16LE(crc32(body) & 0xffff);
    return Buffer.concat([crc, body]);
  };
  const main = Buffer.from('7300000d00000000000000', 'hex');
  const blocks = [Buffer.from('526172211a0700', 'hex'), header(main)];
  for (const [filename, content] of Object.entries(entries)) {
    const name = Buffer.from(filename); const data = Buffer.from(content);
    const body = Buffer.alloc(30 + name.length);
    body[0] = 0x74; body.writeUInt16LE(0x8000, 1); body.writeUInt16LE(body.length + 2, 3);
    body.writeUInt32LE(data.length, 5); body.writeUInt32LE(data.length, 9);
    body[13] = 2; body.writeUInt32LE(crc32(data), 14); body[22] = 20; body[23] = 0x30;
    body.writeUInt16LE(name.length, 24); body.writeUInt32LE(0x20, 26); name.copy(body, 30);
    blocks.push(header(body), data);
  }
  blocks.push(header(Buffer.from('7b00000700', 'hex')));
  return Buffer.concat(blocks);
}

describe('Destruição obrigatória das fontes de ingestão', () => {
  let dir: string;
  let options: Record<string, any>;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'cs2-source-'));
    options = { skipDb: true, skipAssets: true, demoparser: { parseHeader() { throw new Error('parser failed'); } }, tempBaseDir: path.join(dir, 'jobs'), replaysBaseDir: path.join(dir, 'replays'), logsDir: path.join(dir, 'logs') };
  });
  afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

  async function archive(extension: string, entries: Record<string, string>) {
    const source = path.join(dir, `source.${extension}`);
    if (extension === 'rar') await writeFile(source, rarFixture(entries));
    else {
      const input = path.join(dir, 'input'); await mkdir(input);
      for (const [name, data] of Object.entries(entries)) await writeFile(path.join(input, name), data);
      await execAsync(sevenZip.path7za, ['a', '-tzip', source, '.'], { cwd: input, windowsHide: true });
      await rm(input, { recursive: true, force: true });
    }
    return source;
  }

  it('remove a demo sem banco e ignora a antiga opção keepDemFile', async () => {
    const source = path.join(dir, 'match.dem'); await writeFile(source, JSON.stringify(raw));
    const result = await processDemoFile(source, { ...options, keepDemFile: true });
    expect(result.demDeleted).toBe(true);
    await expect(access(source)).rejects.toThrow();
    const files = await readdir(options.replaysBaseDir, { recursive: true });
    expect(files.some(file => file.endsWith('.dem'))).toBe(false);
  });

  it('remove a demo quando o parser lança erro', async () => {
    const source = path.join(dir, 'broken.dem'); await writeFile(source, 'PBDEMS2_BINARY_CONTENT');
    await expect(processDemoFile(source, { ...options, demoparser: { parseHeader() { throw new Error('parser failed'); } } })).rejects.toThrow('parser failed');
    await expect(access(source)).rejects.toThrow();
  });

  it('remove a demo quando a inserção no PostgreSQL falha e faz rollback', async () => {
    const source = path.join(dir, 'match.dem'); await writeFile(source, JSON.stringify(raw));
    const dbClient = { query: vi.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO matches')) throw new Error('database failed');
      return { rows: [] };
    }) };
    await expect(processDemoFile(source, { ...options, skipDb: false, dbClient })).rejects.toThrow('database failed');
    expect(dbClient.query).toHaveBeenCalledWith('ROLLBACK');
    await expect(access(source)).rejects.toThrow();
  });

  it.each(['zip', 'rar'])('processa todos os mapas de um %s e remove fonte e extração', async extension => {
    const source = await archive(extension, { 'series-m1-nuke.dem': JSON.stringify(raw), 'series-m2-mirage.dem': JSON.stringify({ ...raw, map: 'de_mirage' }), 'readme.txt': 'ignore' });
    const result = await processDemoFile(source, options);
    expect(result.results.map((map: any) => map.matchRecord.map_name)).toEqual(['de_nuke', 'de_mirage']);
    await expect(access(source)).rejects.toThrow();
    expect(await readdir(options.tempBaseDir)).toEqual([]);
  });

  it.each(['zip', 'rar'])('limpa o %s e todos os mapas se um mapa falhar', async extension => {
    const source = await archive(extension, { 'm1.dem': JSON.stringify(raw), 'm2.dem': 'broken' });
    await expect(processDemoFile(source, options)).rejects.toThrow();
    await expect(access(source)).rejects.toThrow();
    expect(await readdir(options.tempBaseDir)).toEqual([]);
  });

  it.each(['zip', 'rar'])('limpa um %s corrompido ou sem demos', async extension => {
    const source = await archive(extension, { 'readme.txt': 'no demos' });
    await expect(processDemoFile(source, options)).rejects.toThrow('não contém demos');
    await expect(access(source)).rejects.toThrow();
    await writeFile(source, 'invalid archive');
    await expect(processDemoFile(source, options)).rejects.toThrow();
    await expect(access(source)).rejects.toThrow();
    expect(await readdir(options.tempBaseDir)).toEqual([]);
  });

  it('ignora caminhos internos de RAR e extrai somente demos para caminhos gerados', async () => {
    const source = await archive('rar', { '../outside.dem': 'telemetry', 'readme.txt': 'ignored' });
    const destination = path.join(dir, 'extracted'); await mkdir(destination);
    const paths = await extractDemoArchive(source, destination);
    expect(paths).toHaveLength(1);
    expect(path.dirname(paths[0])).toBe(destination);
    expect(await readFile(paths[0], 'utf8')).toBe('telemetry');
    await expect(access(path.join(dir, 'outside.dem'))).rejects.toThrow();
  });
});
