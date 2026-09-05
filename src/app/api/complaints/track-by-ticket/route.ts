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
    const ticketNo = searchParams.get('ticketNo');

    if (!ticketNo || !ticketNo.trim()) {
      return NextResponse.json(
        { message: 'Ticket number is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://ccms.pitc.com.pk/tracking/ticket?ticket_no=${encodeURIComponent(ticketNo.trim())}`,
      { headers: COMPLAINT_HEADERS }
    );
    const html = await response.text();
    const complaints = parseComplaintTable(html);

    return NextResponse.json({ success: true, ticketNo, complaints });
  } catch (error: any) {
    const status = error.message.includes('Not authorized') ? 401 : 500;
    return NextResponse.json(
      { message: error.message || 'Failed to fetch ticket status' },
      { status }
    );
  }
}
