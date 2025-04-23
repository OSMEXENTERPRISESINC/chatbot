import { NextResponse } from 'next/server'

// In-memory storage for demo purposes
let users: any[] = []

// GET /api/users
export async function GET() {
  return NextResponse.json(users)
}

// POST /api/users
export async function POST(request: Request) {
  try {
    const newUsers = await request.json()
    if (!Array.isArray(newUsers)) {
      return NextResponse.json({ error: 'Expected an array of users' }, { status: 400 })
    }
    users = newUsers
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}
