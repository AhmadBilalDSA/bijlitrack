import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/server/db';
import { User } from '@/lib/server/models';

const hashResetToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { token, password } = await req.json();

    if (!token) {
      return NextResponse.json({ message: 'Reset token is required' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const tokenHash = hashResetToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return NextResponse.json(
        { message: 'Password reset link is invalid or expired' },
        { status: 400 }
      );
    }

    user.passwordHash = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    return NextResponse.json({
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('[Auth Reset Password Error]', error);
    return NextResponse.json(
      { message: 'Error resetting password', error: error.message },
      { status: 500 }
    );
  }
}
