import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { User } from '@/lib/server/models';
import { signToken } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, email, password } = body;

    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail || !password || !name) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    const user = new User({
      name,
      email: normalizedEmail,
      passwordHash: password, // Mongoose pre-save hook hashes this with bcryptjs
    });

    await user.save();

    const token = signToken({ id: user._id.toString() });

    return NextResponse.json(
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Auth Signup Error]', error);
    return NextResponse.json(
      { message: error.message || 'Error creating user' },
      { status: 500 }
    );
  }
}
