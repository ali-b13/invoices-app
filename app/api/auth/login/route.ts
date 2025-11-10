import { connectDB } from "@/lib/mongodb"
import { initializeAdminUser } from "@/lib/admin-initializer"
import { User } from "@/lib/models/User"
import { type NextRequest, NextResponse } from "next/server"
import { PasswordUtils } from "@/lib/password-utils"
import { JwtUtils } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    await initializeAdminUser()
    const { username, password } = await request.json()

    console.log(`[API] Login attempt for user: ${username}`)

    const user = await User.findOne({ username, isActive: true })

    if (!user) {
      console.log(`[API] Login: User ${username} not found`)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValid = await PasswordUtils.comparePassword(password, user.password)

    if (!isValid) {
      console.log(`[API] Login failed for user: ${username}`)
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }


    // Format response
    const formatted = {
      ...user.toObject(),
      id: user._id.toString(),
    }
    delete formatted._id
    delete formatted.password

     const token = JwtUtils.sign({
      permissions:user.permissions,
      userId:user.id,
      username:user.username,
      role:user.role
    })

    // Create response and set HTTP-only cookie
    const response = NextResponse.json(formatted)
    
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 24 * 60 * 60 // 10 days
    })

    console.log(`[API] Login successful for user: ${username}`)
    return response
  } catch (error) {
    console.error("[API] Login error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}