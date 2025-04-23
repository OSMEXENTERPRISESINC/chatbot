import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { User } from "@/utils/types"

// Path to the users.json file
const usersFilePath = path.join(process.cwd(), "api/users.json")

// GET handler to read users from the JSON file
export async function GET() {
  try {
    // Check if the file exists
    if (!fs.existsSync(usersFilePath)) {
      // Create the file with an empty array if it doesn't exist
      fs.writeFileSync(usersFilePath, JSON.stringify([]))
      return NextResponse.json([])
    }

    // Read the file
    const fileContent = fs.readFileSync(usersFilePath, "utf-8")
    const users = JSON.parse(fileContent)

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error reading users file:", error)
    return NextResponse.json({ error: "Failed to read users" }, { status: 500 })
  }
}

// POST handler to write users to the JSON file
export async function POST(request: NextRequest) {
  try {
    const users: User[] = await request.json()

    // Ensure the directory exists
    const dir = path.dirname(usersFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Write the users to the file
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error writing users file:", error)
    return NextResponse.json({ error: "Failed to save users" }, { status: 500 })
  }
}

