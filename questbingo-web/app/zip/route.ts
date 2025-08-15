import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  const cwd = process.cwd();
  const parent = path.dirname(cwd);
  const archiveName = 'questbingo-project.zip';

  return new Response(new ReadableStream({
    start(controller) {
      const proc = spawn('bash', ['-lc', `cd ${parent} && zip -r -q - ${path.basename(cwd)} -x "**/node_modules/*" "**/.next/*" "**/.git/*"`]);
      proc.stdout.on('data', (chunk) => controller.enqueue(chunk));
      proc.stderr.on('data', () => {});
      proc.on('close', () => controller.close());
    }
  }), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${archiveName}"`,
      'Cache-Control': 'no-store',
    }
  });
}