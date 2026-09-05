import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Reference } from '@/lib/server/models';
import { verifyAuth } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    await connectDB();

    const references = await Reference.find({ userId: authUser.id }).sort({ createdAt: -1 });

    return NextResponse.json(references);
  } catch (error: any) {
    const status = error.message.includes('Not authorized') ? 401 : 500;
    return NextResponse.json(
      { message: error.message || 'Error fetching references' },
      { status }
    );
  }
}
