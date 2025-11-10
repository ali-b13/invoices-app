import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { type NextRequest, NextResponse } from "next/server"
import { verifyAuth ,checkPermission} from "@/app/api/auth/auth-helper"




export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ Require authentication
  const auth = await verifyAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // ✅ Require permission to manage permissions
  if (!checkPermission(auth.user?.permissions, "manage_permissions")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  try {
    await connectDB()
    const { id } = await context.params;

    const { permissions } = await request.json()

    const user = await User.findById(id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        permissions,
        lastModified: new Date(),
      },
      { new: true }
    )

    const formatted = {
      ...updatedUser.toObject(),
      id: updatedUser._id.toString(),
    }

    delete formatted._id
    delete formatted.password

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("[API] Update user permissions error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
