import { connectDB } from "@/lib/mongodb"
import { Settings } from "@/lib/models/Settings"

import { type NextRequest, NextResponse } from "next/server"
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
    if (!checkPermission(auth.user?.permissions, "manage_permissions")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const cleanData = {
      ...data,
      _id: data.id,
      synced: true,
      pendingSync: false,
    }
    delete cleanData.id

    const existing = await Settings.findById(cleanData._id)

    // ✅ Detect conflict (do not overwrite newer settings)
    if (existing) {
      const incomingLastModified = new Date(cleanData.lastModified).getTime()
      const existingLastModified = new Date(existing.lastModified).getTime()

      if (incomingLastModified < existingLastModified) {
        return NextResponse.json(existing)
      }
    }

    if (type === "delete") {
      await Settings.deleteOne({ _id: cleanData._id })
      return NextResponse.json({ success: true, id: cleanData._id })
    }

    // ✅ Upsert (insert or update)
    const updated = await Settings.findOneAndUpdate(
      { _id: cleanData._id },
      cleanData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    )

    // ✅ Format output { id instead of _id }
    const formatted = {
      ...updated.toObject(),
      id: updated._id.toString(),
    }
    delete formatted._id
    delete formatted.__v

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error("[API] Settings sync error:", error)

    return NextResponse.json(
      { error: error.message || "Server error during sync" },
      { status: 500 }
    )
  }
}
