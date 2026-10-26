import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DemoUploadCard } from '../src/components/home/DemoUploadCard';

describe('DemoUploadCard Refactor Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Deve suportar múltiplos arquivos no input com multiple e tipagem File[]', () => {
    const { container } = render(<DemoUploadCard />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    expect(input).toBeTruthy();
    expect(input.hasAttribute('multiple')).toBe(true);
  });

  it('2. Deve disparar upload automático no onChange sem botões extras e enviar FormData', async () => {
    let capturedUrl: string | null = null;
    let capturedBody: any = null;

    vi.spyOn(global, 'fetch').mockImplementation(async (url: any, init: any) => {
      capturedUrl = String(url);
      capturedBody = init?.body as FormData;
      return new Response(JSON.stringify({ success: true, message: 'Demos processadas com sucesso!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const { container } = render(<DemoUploadCard />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const file1 = new File(['dummy demo 1'], 'match-m1.dem', { type: 'application/octet-stream' });
    const file2 = new File(['dummy demo 2'], 'match-m2.dem', { type: 'application/octet-stream' });

    fireEvent.change(input, {
      target: { files: [file1, file2] },
    });

    await waitFor(() => {
      expect(capturedUrl).toMatch(/\/api\/(demos\/)?upload/);
      expect(capturedBody).toBeTruthy();
    });

    const filesInFormData = capturedBody?.getAll('files');
    expect(filesInFormData?.length).toBe(2);
  });

  it('3. Deve mudar texto para "ENVIANDO ARQUIVOS...", exibir spinner e ocultar botão "SUBSTITUIR ARQUIVO" durante o upload', async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(global, 'fetch').mockImplementation(() => pendingPromise as Promise<Response>);

    const { container } = render(<DemoUploadCard />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['demo content'], 'furia_vs_navi.dem', { type: 'application/octet-stream' });

    // Botão inicial
    expect(screen.getByText('SELECIONAR ARQUIVO')).toBeTruthy();

    // Dispara onChange
    fireEvent.change(input, {
      target: { files: [file] },
    });

    // Durante upload: texto muda e botão SUBSTITUIR ARQUIVO não deve existir
    expect(screen.getByText('ENVIANDO ARQUIVOS...')).toBeTruthy();
    expect(screen.queryByText('SUBSTITUIR ARQUIVO')).toBeNull();
    expect(screen.queryByText('SELECIONAR ARQUIVO')).toBeNull();

    // Spinner deve estar visível
    const spinner = screen.getByText('sync');
    expect(spinner.className).toContain('animate-spin');

    // Conclui o upload
    resolvePromise!(
      new Response(JSON.stringify({ success: true, message: 'Upload concluído!' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Após o sucesso da promise, spinner e texto de envio deixam de estar ativos
    await waitFor(() => {
      expect(screen.queryByText('ENVIANDO ARQUIVOS...')).toBeNull();
      expect(screen.getByText('ARQUIVO SELECIONADO')).toBeTruthy();
      expect(screen.getByText('SUBSTITUIR ARQUIVO')).toBeTruthy();
    });
  });
});
