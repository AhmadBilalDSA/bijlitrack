import { NextRequest, NextResponse } from 'next/server';
import { isBillMediaType } from '@/lib/claude/billSchema';
import { parseUtilityBillWithClaude } from '@/lib/claude/visionParser';
import { auditBill } from '@/lib/claude/auditEngine';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Hard ceiling on the Base64 payload to stay inside serverless request limits. */
const MAX_PAYLOAD_BYTES = 4.5 * 1024 * 1024;
const BASE64_OVERHEAD = 4 / 3;

interface ParseRequestBody {
  fileBase64?: unknown;
  mediaType?: unknown;
}

export async function POST(req: NextRequest) {
  const declaredLength = req.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > MAX_PAYLOAD_BYTES * BASE64_OVERHEAD) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bill exceeds the 4.5MB upload limit. Please upload a smaller file.',
      },
      { status: 413 }
    );
  }

  let body: ParseRequestBody;
  try {
    body = (await req.json()) as ParseRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { fileBase64, mediaType } = body;

  if (typeof fileBase64 !== 'string' || fileBase64.length === 0) {
    return NextResponse.json(
      { success: false, error: 'fileBase64 is required.' },
      { status: 400 }
    );
  }

  if (!isBillMediaType(mediaType)) {
    return NextResponse.json(
      {
        success: false,
        error: 'mediaType must be application/pdf, image/jpeg, or image/png.',
      },
      { status: 400 }
    );
  }

  // Strip any data URL prefix before measuring.
  const base64 = fileBase64.includes(',')
    ? fileBase64.slice(fileBase64.indexOf(',') + 1)
    : fileBase64;

  const approxBytes = (base64.length * 3) / 4;
  if (approxBytes > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: `Bill exceeds the 4.5MB limit (received ~${(approxBytes / 1024 / 1024).toFixed(1)}MB).`,
      },
      { status: 413 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bill audit service is not configured. Set ANTHROPIC_API_KEY.',
      },
      { status: 503 }
    );
  }

  try {
    const billData = await parseUtilityBillWithClaude(base64, mediaType);
    const auditFindings = auditBill(billData);

    return NextResponse.json({ success: true, billData, auditFindings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Audit] Claude parse failed:', message);
    return NextResponse.json(
      {
        success: false,
        error: message.includes('ANTHROPIC_API_KEY')
          ? message
          : 'Failed to parse this bill. It may be too low-resolution to read.',
      },
      { status: 502 }
    );
  }
}