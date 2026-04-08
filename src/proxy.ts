// ✅ Correct for Next.js 16+
import { NextRequest, NextResponse } from 'next/server';

export default function proxy(request: NextRequest) {   // ← Changed to default export
  // your code...
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
