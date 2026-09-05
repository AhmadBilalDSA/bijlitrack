import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import {
  COMPLAINT_HEADERS,
  parseComplaintTable,
} from '@/lib/server/services/complaint.parser';

export async function GET(req: NextRequest) {
  try {
    verifyAuth(req);

    const { searchParams } = new URL(req.url);
    const referenceNo = searchParams.get('referenceNo');

    if (!referenceNo || referenceNo.length !== 14 || !/^\d+$/.test(referenceNo)) {
      return NextResponse.json(
        { message: 'Invalid 14-digit reference number' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://ccms.pitc.com.pk/complainthistory?reference=${referenceNo}`,
      { headers: COMPLAINT_HEADERS }
    );
    const html = await response.text();
    const complaints = parseComplaintTable(html);

    return NextResponse.json({ success: true, referenceNo, complaints });
  } catch (error: any) {
    const status = error.message.includes('Not authorized') ? 401 : 500;
    return NextResponse.json(
      { message: error.message || 'Failed to fetch complaint history' },
      { status }
    );
  }
}
