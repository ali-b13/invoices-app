import bcrypt from "bcryptjs"

const SALT_ROUNDS = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || "10")
const BCRYPT_PEPPER =
  process.env.NEXT_PUBLIC_BCRYPT_PEPPER ||
  process.env.BCRYPT_PEPPER ||
  "DEFAULT_OFFLINE_PEPPER";

export class PasswordUtils {
  static async hashPassword(password: string): Promise<string> {
    // Add pepper if configured (optional extra security layer)
    const pepperedPassword = BCRYPT_PEPPER ? password + BCRYPT_PEPPER : password
    return bcrypt.hash(pepperedPassword, SALT_ROUNDS)
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    // Add pepper if configured
    // Check if pepper is available in client
    console.log(BCRYPT_PEPPER,'pepper')
    const pepperedPassword = BCRYPT_PEPPER ? password + BCRYPT_PEPPER : password
    return bcrypt.compare(pepperedPassword, hashedPassword)
  }

  static hashPasswordSync(password: string): string {
    const pepperedPassword = BCRYPT_PEPPER ? password + BCRYPT_PEPPER : password
    return bcrypt.hashSync(pepperedPassword, SALT_ROUNDS)
  }

  static isPasswordHashed(password: string): boolean {
    return password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")
  }
}
