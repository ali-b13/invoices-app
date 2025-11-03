"use client"
import { Button } from "@/components/ui/button"
import { FileText, Settings, Plus, UserCircle, LogOut, Shield } from "lucide-react"
import type { User } from "@/lib/types"

interface DashboardHeaderProps {
  invoiceCount: number
  totalAmount: number
  onCreateNew: () => void
  onSettings: () => void
  onUserManagement?: () => void
  currentPage: "dashboard" | "create" | "preview" | "settings" | "user-management"
  currentUser?: User | null
  onLogout?: () => void
}

export function DashboardHeader({
  invoiceCount,
  totalAmount,
  onCreateNew,
  onSettings,
  onUserManagement,
  currentPage,
  currentUser,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-linear-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-right">نظام فواتير النقل</h1>
          </div>

          <div className="flex items-center gap-3">
            {currentPage === "dashboard" && (
              <>
                <div className="hidden md:flex gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">إجمالي الفواتير</div>
                    <div className="font-semibold text-lg">{invoiceCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">المبلغ الإجمالي</div>
                    <div className="font-semibold text-lg">{totalAmount.toLocaleString("ar-YE")}</div>
                  </div>
                </div>

                <Button onClick={onCreateNew} className="gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">فاتورة جديدة</span>
                </Button>
              </>
            )}

            {currentUser && (
              <div className="flex items-center gap-3 border-l border-border pl-3">
                {currentUser.role === "admin" && onUserManagement && (
                  <Button onClick={onUserManagement} variant="ghost" size="sm" title="إدارة المستخدمين">
                    <Shield className="h-5 w-5" />
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-muted-foreground">{currentUser.role === "admin" ? "مسؤول" : "مستخدم"}</p>
                    <p className="text-sm font-semibold">{currentUser.username}</p>
                  </div>
                </div>
                <Button onClick={onLogout} variant="ghost" size="sm" title="تسجيل الخروج">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            )}

            <Button onClick={onSettings} variant="ghost" size="sm" title="الإعدادات">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
