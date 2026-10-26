import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, mkdtemp, rm, utimes } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(execFile);

export const maxDuration = 300; // 5 minutos para processamento de demos grandes

function extractMapNumber(filename: string): number {
  const match = filename.match(/(?:^|[_\-.])m([1-9]\d*)(?:[_\-.]|$)/i);
  return match ? parseInt(match[1], 10) : 999;
}

export async function POST(req: NextRequest) {
  let tempDir: string | undefined;
  try {
    const formData = await req.formData();
    const playedAtInput = formData.get('playedAt');
    if (typeof playedAtInput !== 'string' || !Number.isFinite(Date.parse(playedAtInput))) return NextResponse.json({error:'Informe uma data válida para a partida.'},{status:400});

    // Suporte a arquivos múltiplos ('files') ou arquivo único ('file'), com fallback para get()
    const filesList: File[] = [];
    const getEntries = (key: string): any[] => {
      if (typeof formData.getAll === 'function') {
        return formData.getAll(key);
      }
      const single = formData.get(key);
      return single ? [single] : [];
    };

    for (const key of ['files', 'file']) {
      const entries = getEntries(key);
      for (const entry of entries) {
        if (entry && typeof entry === 'object' && 'name' in entry) {
          filesList.push(entry as File);
        }
      }
    }

    if (filesList.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado. Selecione um ou mais arquivos .dem válidos.' },
        { status: 400 },
      );
    }

    const invalid = filesList.find((f) => !/\.(dem|rar|zip)$/i.test(f.name));
    if (invalid) {
      return NextResponse.json(
        { error: `Formato inválido (${invalid.name}). Todos os arquivos devem possuir a extensão .dem, .rar ou .zip` },
        { status: 400 },
      );
    }

    // Ordena os arquivos para garantir que m1 seja processado antes de m2 e m3
    filesList.sort((a, b) => {
      const numA = extractMapNumber(a.name);
      const numB = extractMapNumber(b.name);
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });

    const tempRoot = path.resolve(process.cwd(), 'temp', 'demos');
    await mkdir(tempRoot, { recursive: true });
    tempDir = await mkdtemp(path.join(tempRoot, 'upload-'));

    const results: any[] = [];
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'process-demo.mjs');

    // Executa o script de ingestão sequencialmente para cada arquivo para respeitar constraints do DB
    for (const file of filesList) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const tempFilePath = path.join(tempDir, `upload_${Date.now()}_${safeName}`);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(tempFilePath, buffer);

      const playedAt = playedAtInput;
      await utimes(tempFilePath, new Date(playedAt), new Date(playedAt));
      const { stdout } = await execAsync(process.execPath, [scriptPath, tempFilePath], {
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, DEMO_TEMP_DIR: tempDir, DEMO_PLAYED_AT: playedAt, DEMO_FORMAT: String(formData.get('format') || (filesList.length > 3 ? 'BO5' : filesList.length > 1 ? 'BO3' : 'BO1')) },
      });

      let parsedResult: any = null;
      try {
        const lastBrace = stdout.lastIndexOf('}');
        const firstBrace = stdout.indexOf('{');
        if (firstBrace !== -1 && lastBrace !== -1) {
          parsedResult = JSON.parse(stdout.substring(firstBrace, lastBrace + 1));
        } else {
          parsedResult = JSON.parse(stdout.trim());
        }
      } catch {
        parsedResult = { stdout: stdout.slice(-500) };
      }

      results.push(...(parsedResult.results || [parsedResult]));
    }

    const mainResult = results[0] || null;
    const seriesId = mainResult?.seriesId || mainResult?.matchId || null;

    return NextResponse.json({
      success: true,
      message:
        results.length > 1
          ? `Série com ${results.length} mapas processada e agrupada com sucesso no PostgreSQL!`
          : 'Demo processada e persistida no PostgreSQL com sucesso!',
      seriesId,
      matchId: seriesId,
      results,
      result: mainResult,
    });
  } catch (error: any) {
    console.error('[API /api/demos/upload] Erro ao processar demo:', error);
    return NextResponse.json(
      {
        error: error.message || 'Falha ao processar demo localmente.',
        details: error.stderr || error.stdout || null,
      },
      { status: 500 },
    );
  } finally {
    if (tempDir) {
      console.log(`[STORAGE] Removendo demo processada do disco: ${path.basename(tempDir)}`);
      await rm(tempDir, { recursive: true, force: true, maxRetries: 3 });
      console.log('[STORAGE] Espaço em disco liberado com sucesso.');
    }
  }
}
