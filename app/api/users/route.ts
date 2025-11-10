import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { type NextRequest, NextResponse } from "next/server"
import { PasswordUtils } from "@/lib/password-utils"
import { verifyAuth,checkPermission } from "../auth/auth-helper"



export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const users = await User.find({ isActive: true })

    const formattedUsers = users.map(user => {
      const userObj = user.toObject()
      return {
        ...userObj,
        id: userObj._id.toString(),
      }
    })

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error("[API] Get users error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Authentication required
    const auth = await verifyAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // ✅ Permission check (This endpoint manages users)
    if (!checkPermission(auth.user?.permissions, "manage_users")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    await connectDB()

    const body = await request.json()

    // 1. Require `id`
    if (!body.id) {
      return NextResponse.json({ error: "Missing required 'id' field" }, { status: 400 })
    }

    const cleanData = {
      ...body,
      _id: body.id,
      lastModified: body.lastModified ? new Date(body.lastModified) : new Date(),
    }
    delete cleanData.id

    const existing = await User.findById(cleanData._id)

    if (existing) {
      const incomingLastModified = new Date(cleanData.lastModified).getTime()
      const existingLastModified = new Date(existing.lastModified).getTime()

      if (incomingLastModified <= existingLastModified) {
        console.log(`[API] User Conflict: Skipping older update for user ${cleanData._id}`)

        const formatted = {
          ...existing.toObject(),
          id: existing._id.toString(),
        }

        delete formatted._id
        delete formatted.password

        return NextResponse.json(formatted)
      }
    }

    const duplicateUsername = await User.findOne({
      username: cleanData.username,
      _id: { $ne: cleanData._id }
    })

    if (duplicateUsername) {
      return NextResponse.json({ error: "Duplicate username detected." }, { status: 409 })
    }

    if (cleanData.password && !PasswordUtils.isPasswordHashed(cleanData.password)) {
      cleanData.password = PasswordUtils.hashPasswordSync(cleanData.password)
    }

    const newUser = await User.findByIdAndUpdate(
      cleanData._id,
      cleanData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    )

    const formatted = {
      ...newUser.toObject(),
      id: newUser._id.toString(),
    }

    delete formatted._id
    delete formatted.password

    return NextResponse.json(formatted, { status: 201 })
  } catch (error) {
    console.error("[API] Create user error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
