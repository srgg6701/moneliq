import { NextResponse } from 'next/server';

// Mock user data
const users = [
  {
    email: 'member@valid.email',
    password: 'Member123!',
    otp: '151588',
    type: 'member',
  },
  {
    email: 'partner@valid.email',
    password: 'Partner123!',
    otp: '262699',
    type: 'partner',
  },
];

export async function POST(req: Request) {
  try {
    const { email, password, otp } = await req.json();

    // Simulate server processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const user = users.find((u) => u.email === email && u.password === password && u.otp === otp);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email, password, or OTP.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      type: user.type,
      email: user.email,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error. Please try again later.' }, { status: 500 });
  }
}
