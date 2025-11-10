// lib/auth-helper.js
import { JwtUtils } from "@/lib/jwt"
import { User } from "@/lib/models/User"
import { Permission, User as UserType } from "@/lib/types"
import { NextRequest } from "next/server"

export async function verifyAuth(request:NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return { error: "No token provided", status: 401 }
    }

    const decoded = JwtUtils.verify(token)
    if (!decoded) {
      return { error: "Invalid token", status: 401 }
    }

    // Optional: Verify user still exists and is active
    const user = await User.findById(decoded.userId)
    if (!user || !user.isActive) {
      return { error: "User not found or inactive", status: 401 }
    }

    return { user: decoded, status: 200 }
  } catch (error) {
    return { error: "Authentication failed", status: 401 }
  }
}

export function checkPermission(permissions:Permission[]|undefined, requiredPermission:Permission) {
  if (!permissions) {
    return false
  }
  
  return permissions.includes(requiredPermission)
}