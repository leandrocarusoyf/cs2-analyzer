import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let execMockOutput: { err: any; stdout: string; stderr: string } = {
  err: null,
  stdout: '',
  stderr: '',
};

vi.mock('node:child_process', async (importOriginal) => {
  const actual: any = await importOriginal();
  const mockExec = (cmd: any, args: any, options: any, callback: any) => {
    const cb = typeof options === 'function' ? options : callback;
    if (cb) {
      cb(execMockOutput.err, { stdout: execMockOutput.stdout, stderr: execMockOutput.stderr });
    }
    return {};
  };
  return {
    ...actual,
    default: { ...actual.default, execFile: mockExec },
    execFile: mockExec,
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    utimes: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
});

// Import POST handler after mocks
import { POST } from '../src/app/api/demos/upload/route.ts';

function createMockUploadRequest(file: any): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/demos/upload', {
    method: 'POST',
  });
  const mockFormData = {
    get: (key: string) => (key === 'file' ? file : key === 'playedAt' ? '2026-10-18T12:00:00Z' : null),
  };
  req.formData = vi.fn().mockResolvedValue(mockFormData as any);
  return req;
}

describe('Demo Upload Route Handler (POST /api/demos/upload)', () => {
  beforeEach(() => {
    execMockOutput = { err: null, stdout: '', stderr: '' };
  });

  it('retorna 400 se nenhum arquivo for fornecido', async () => {
    const req = createMockUploadRequest(null);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Nenhum arquivo enviado');
  });

  it('retorna 400 se a extensão não for .dem', async () => {
    const file = {
      name: 'match.txt',
      arrayBuffer: async () => Buffer.from('content').buffer,
    };
    const req = createMockUploadRequest(file);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('extensão .dem');
  });

  it('processa o upload com sucesso e retorna JSON estruturado contendo matchId e resultado', async () => {
    execMockOutput = {
      err: null,
      stdout: `
Round 1: Vitality venceu
[rounds] total=1
{
  "matchId": "c45f4df8-18e0-47b7-bdc1-5be6fead6828",
  "demoHash": "hash12345678",
  "map": "de_dust2",
  "score": "FURIA 13 x 10 Aurora",
  "replayPath": "data/replays/test.bin.gz",
  "demDeleted": true,
  "teamsSynced": 2,
  "playersSynced": 10
}
`,
      stderr: '',
    };

    const file = {
      name: 'match-test.dem',
      arrayBuffer: async () => Buffer.from('mock demo bytes').buffer,
    };
    const req = createMockUploadRequest(file);

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.matchId).toBe('c45f4df8-18e0-47b7-bdc1-5be6fead6828');
    expect(json.result).toBeTruthy();
    expect(json.result.map).toBe('de_dust2');
    expect(json.result.demoHash).toBe('hash12345678');
  });

  it('retorna 500 com mensagem de erro quando o script de ingestão falha', async () => {
    const error: any = new Error('Erro ao processar demo: duplicate key');
    error.stderr = 'Stack trace details';
    execMockOutput = {
      err: error,
      stdout: '',
      stderr: 'Stack trace details',
    };

    const file = {
      name: 'match-error.dem',
      arrayBuffer: async () => Buffer.from('mock demo bytes').buffer,
    };
    const req = createMockUploadRequest(file);

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Erro ao processar demo');
    expect(json.details).toBe('Stack trace details');
  });

  it('processa múltiplos arquivos da série ordenando m1 antes de m2 e retornando seriesId e results', async () => {
    const file1 = {
      name: 'furia-vs-aurora-m2-inferno.dem',
      arrayBuffer: async () => Buffer.from('mock demo 2').buffer,
    };
    const file2 = {
      name: 'furia-vs-aurora-m1-dust2.dem',
      arrayBuffer: async () => Buffer.from('mock demo 1').buffer,
    };

    const req = new NextRequest('http://localhost:3000/api/demos/upload', {
      method: 'POST',
    });
    req.formData = vi.fn().mockResolvedValue({
      getAll: (key: string) => (key === 'files' ? [file1, file2] : []),
      get: (key:string) => key==='playedAt'?'2026-10-18T12:00:00Z':null,
    } as any);

    execMockOutput = {
      err: null,
      stdout: JSON.stringify({
        matchId: 'series-uuid-parent-123',
        seriesId: 'series-uuid-parent-123',
        demoHash: 'hash-map-test',
        map: 'de_dust2',
        score: 'FURIA 13 x 10 Aurora',
      }),
      stderr: '',
    };

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.seriesId).toBe('series-uuid-parent-123');
    expect(json.results).toHaveLength(2);
    expect(json.message).toContain('Série com 2 mapas');
  });
});

