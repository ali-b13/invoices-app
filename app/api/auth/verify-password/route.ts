import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { type NextRequest, NextResponse } from "next/server"
import { PasswordUtils } from "@/lib/password-utils"

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { userId, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const user = await User.findById(userId)
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isValid = await PasswordUtils.comparePassword(password, user.password)

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error("[API] Verify password error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}