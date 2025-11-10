import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { NextRequest, NextResponse } from "next/server"
import { PasswordUtils } from "@/lib/password-utils"
import { verifyAuth,checkPermission } from "../../auth/auth-helper"



// ✅ GET User by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ Auth check
  const auth = await verifyAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // ✅ Permission check
  if (!checkPermission(auth.user?.permissions, "manage_users")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { id } = await context.params;

  try {
    await connectDB();

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formatted = {
      ...user.toObject(),
      id: user._id.toString(),
    };

    delete formatted._id;
    delete formatted.password;

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("[API] Get user error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ UPDATE User by ID (PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ✅ Auth check
  const auth = await verifyAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // ✅ Permission required
  if (!checkPermission(auth.user?.permissions, "manage_users")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  try {
    await connectDB()
    const { id } = await params
    const body = await request.json()

    console.log(`[API] Update user ${id}:`, {
      hasPassword: !!body.password,
      passwordLength: body.password?.length,
      isPasswordHashed: body.password ? PasswordUtils.isPasswordHashed(body.password) : false,
    })

    const existing = await User.findById(id)
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (body.lastModified) {
      const incomingLastModified = new Date(body.lastModified).getTime()
      const existingLastModified = new Date(existing.lastModified).getTime()

      if (incomingLastModified <= existingLastModified) {
        console.log(`[API] User Conflict: Skipping older update for user ${id}`)
        const formatted = {
          ...existing.toObject(),
          id: existing._id.toString(),
        }
        delete formatted._id
        delete formatted.password
        return NextResponse.json(formatted)
      }
    }

    if (body.username) {
      const duplicateUsername = await User.findOne({
        username: body.username,
        _id: { $ne: id },
      })

      if (duplicateUsername) {
        return NextResponse.json({ error: "Username already exists" }, { status: 409 })
      }
    }

    const updateData = {
      ...body,
      lastModified: new Date(),
    }

    if (updateData.password && !PasswordUtils.isPasswordHashed(updateData.password)) {
      console.log(`[API] Hashing password for user ${id}`)
      updateData.password = PasswordUtils.hashPasswordSync(updateData.password)
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )

    const formatted = {
      ...updatedUser.toObject(),
      id: updatedUser._id.toString(),
    }

    delete formatted._id

    console.log(`[API] User ${id} updated successfully`)
    return NextResponse.json(formatted)
  } catch (error) {
    console.error("[API] Update user error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// ✅ DELETE User by ID
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ Auth check
  const auth = await verifyAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // ✅ Permission check
  if (!checkPermission(auth.user?.permissions, "manage_users")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { id } = await context.params;

  try {
    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await User.deleteOne({ _id: id });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[API] Delete user error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
