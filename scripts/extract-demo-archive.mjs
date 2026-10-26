import { execFile, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import sevenZip from '7zip-bin';
import { createExtractorFromFile } from 'node-unrar-js';

const execAsync = promisify(execFile);

/** Extract only demo streams into paths we create, never paths supplied by an archive. */
export async function extractDemoArchive(sourcePath, tempDir) {
  if (path.extname(sourcePath).toLowerCase() === '.rar') {
    const demos = [];
    const extractor = await createExtractorFromFile({
      filepath: sourcePath,
      targetPath: tempDir,
      filenameTransform: filename => {
        const name = path.posix.basename(filename.replaceAll('\\', '/')).replace(/[^a-zA-Z0-9._-]/g, '_');
        const safeName = `${demos.length}-${name}`;
        demos.push(path.join(tempDir, safeName));
        return safeName;
      },
    });
    // Exhaust the lazy iterator so that the native archive handle is released.
    for (const _file of extractor.extract({ files: header => !header.flags.directory && /\.dem$/i.test(header.name) }).files) {
      // Extraction writes each selected demo to its transformed destination.
    }
    if (!demos.length) throw new Error('Arquivo compactado não contém demos .dem.');
    return demos.sort((a, b) => path.basename(a).replace(/^\d+-/, '').localeCompare(path.basename(b).replace(/^\d+-/, ''), undefined, { numeric: true }));
  }
  const { stdout } = await execAsync(sevenZip.path7za,
    ['l', '-slt', '-ba', '-sccUTF-8', '-p', '--', sourcePath],
    { maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  const entries = stdout.replace(/\r/g, '').split('\n\n')
    .map(block => Object.fromEntries(block.split('\n').flatMap(line => {
      const separator = line.indexOf(' = ');
      return separator < 0 ? [] : [[line.slice(0, separator), line.slice(separator + 3)]];
    })))
    .filter(entry => entry.Path && /\.dem$/i.test(entry.Path) && entry.Folder !== '+');
  if (!entries.length) throw new Error('Arquivo compactado não contém demos .dem.');
  entries.sort((a, b) => a.Path.localeCompare(b.Path, undefined, { numeric: true }));

  const demos = [];
  for (const [index, entry] of entries.entries()) {
    const dir = path.join(tempDir, String(index));
    await mkdir(dir);
    const name = path.posix.basename(entry.Path.replaceAll('\\', '/')).replace(/[^a-zA-Z0-9._-]/g, '_');
    const destination = path.join(dir, name);
    const child = spawn(sevenZip.path7za,
      ['x', '-so', '-spd', '-p', '--', sourcePath, entry.Path],
      { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    const completed = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve() : reject(new Error(`Falha ao extrair ${entry.Path} (7-Zip: ${code}).`)));
    });
    const streamed = pipeline(child.stdout, createWriteStream(destination, { flags: 'wx' }))
      .catch(error => { child.kill(); throw error; });
    // Wait for both handles to close before the caller removes the temporary tree.
    const outcomes = await Promise.allSettled([completed, streamed]);
    const failed = outcomes.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    demos.push(destination);
  }
  return demos;
}
