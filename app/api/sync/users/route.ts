import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { type NextRequest, NextResponse } from "next/server"
import { PasswordUtils } from "@/lib/password-utils"
import { verifyAuth,checkPermission } from "../../auth/auth-helper"



export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // ✅ Auth check
    const auth = await verifyAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { type, data } = await request.json()

    if (!data?.id) {
      return NextResponse.json(
        { error: "Missing required 'id' field for sync" },
        { status: 400 }
      )
    }

    // ✅ Permission check
    if (type === "create" && !checkPermission(auth.user?.permissions, "manage_users")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }
    if (type === "update" && !checkPermission(auth.user?.permissions, "manage_users")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }
    if (type === "delete" && !checkPermission(auth.user?.permissions, "manage_users")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // ✅ Prepare data
    const cleanData = {
      ...data,
      _id: data.id,
      synced: true,
      pendingSync: false,
    }
    delete cleanData.id

    // Hash password if not already hashed
    if (cleanData.password && !PasswordUtils.isPasswordHashed(cleanData.password)) {
      cleanData.password = PasswordUtils.hashPasswordSync(cleanData.password)
    }

    const existing = await User.findById(cleanData._id)

    // ✅ Conflict detection
    if (existing) {
      const incomingLastModified = new Date(cleanData.lastModified).getTime()
      const existingLastModified = new Date(existing.lastModified).getTime()
      if (incomingLastModified < existingLastModified) {
        return NextResponse.json(existing)
      }
    }

    // ✅ Check duplicate username on create/update
    if (type === "create" || type === "update") {
      const duplicateUsername = await User.findOne({
        username: cleanData.username,
        _id: { $ne: cleanData._id }
      })
      if (duplicateUsername) {
        return NextResponse.json(
          { error: "Duplicate username detected on server." },
          { status: 409 }
        )
      }
    }

    if (type === "delete") {
      await User.deleteOne({ _id: cleanData._id })
      return NextResponse.json({ success: true, id: cleanData._id })
    }

    // ✅ Upsert user
    const updatedUser = await User.findByIdAndUpdate(
      cleanData._id,
      cleanData,
      { new: true, upsert: true, runValidators: true }
    )

    // Format response
    const formatted = {
      ...updatedUser.toObject(),
      id: updatedUser._id.toString(),
    }
    delete formatted._id
    delete formatted.password

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("[API] User sync error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown server error"
    return NextResponse.json(
      { error: `Server error during sync: ${errorMessage}` },
      { status: 500 }
    )
  }
}
