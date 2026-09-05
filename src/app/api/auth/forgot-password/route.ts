import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/server/db';
import { User } from '@/lib/server/models';
import { isMailConfigured, sendPasswordResetEmail } from '@/lib/server/services/mail.service';

const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000;

const hashResetToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const getFrontendUrl = (req: NextRequest) => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
};

export async function POST(req: NextRequest) {
  const genericMessage = 'If an account exists for this email, a password reset link has been generated.';

  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+passwordResetTokenHash +passwordResetExpiresAt'
    );

    if (!user) {
      return NextResponse.json({ message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashResetToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
    await user.save();

    const baseUrl = getFrontendUrl(req);
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    let mailSent = false;
    if (isMailConfigured()) {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
      mailSent = true;
    }

    const shouldReturnLink =
      process.env.RETURN_PASSWORD_RESET_LINK === 'true' ||
      (process.env.NODE_ENV !== 'production' && !mailSent);

    return NextResponse.json({
      message: genericMessage,
      emailSent: mailSent,
      ...(shouldReturnLink ? { resetToken, resetUrl } : {}),
    });
  } catch (error: any) {
    console.error('[Auth Forgot Password Error]', error);
    return NextResponse.json(
      { message: 'Error creating password reset link', error: error.message },
      { status: 500 }
    );
  }
}
