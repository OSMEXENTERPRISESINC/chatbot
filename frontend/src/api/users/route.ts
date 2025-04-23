// frontend/src/app/users/route.ts
import { NextResponse } from 'next/server'

// Stub GET /users to return an empty array and avoid 404 errors
export async function GET() {
  return NextResponse.json([])
}
