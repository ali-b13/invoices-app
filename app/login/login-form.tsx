"use client"

import { useState, useEffect } from "react"
import type { FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { HybridStorage } from "@/lib/hybrid-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"

export  function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // ✅ Prevent hydration mismatch: default to null
  const [isOnline, setIsOnline] = useState<boolean | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  useEffect(() => {
    // ✅ Update online state only on client
    setIsOnline(HybridStorage.isOnline)

    // If already logged in, redirect to intended page
    const user = HybridStorage.getCurrentUser()
    if (user) router.replace(redirectTo)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [router, redirectTo])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const user = await HybridStorage.login(username, password)
      if (user) {
        toast.success("تم تسجيل الدخول بنجاح")
        router.replace(redirectTo)
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة")
        toast.error("فشل في تسجيل الدخول")
      }
    } catch (err: any) {
      const errorMessage = err?.message || "حدث خطأ أثناء محاولة تسجيل الدخول"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-primary/10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CardTitle className="text-2xl">نظام إدارة الفواتير</CardTitle>

            {/* ✅ Handle null before hydration */}
            {isOnline === null ? null : isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            {isOnline === null
              ? "جاري التحقق..."
              : isOnline
              ? "تسجيل الدخول - متصل"
              : "تسجيل الدخول - غير متصل"}
          </p>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-right">اسم المستخدم</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="text-right"
                disabled={isLoading}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-right">كلمة المرور</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="text-right"
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
