import jwt from "jsonwebtoken"
import { Permission } from "./types"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

export interface TokenPayload {
  userId: string
  username: string
  role?: string
  permissions:Permission[]
}

export const JwtUtils = {
  // Sign a token with user data
  sign(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn:"10d" })
  },

  // Verify and decode a token
  verify(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
      return decoded
    } catch (error) {
      console.error("[JWT] Token verification failed:", error)
      return null
    }
  },

  // Decode without verification (use cautiously)
  decode(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload
      return decoded
    } catch {
      return null
    }
  },
}
