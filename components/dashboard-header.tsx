"use client";

import { Button } from "@/components/ui/button";
import {
  FileText,
  Settings,
  Plus,
  UserCircle,
  LogOut,
  Shield,
  Menu,
} from "lucide-react";
import type { User } from "@/lib/types";
import { formatCurrencyEN } from "@/lib/formatters";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DashboardHeaderProps {
  invoiceCount: number;
  totalAmount: number;
  onCreateNew: () => void;
  onSettings: () => void;
  onUserManagement?: () => void;
  currentPage:
    | "dashboard"
    | "create"
    | "preview"
    | "settings"
    | "user-management";
  currentUser?: User | null;
  onLogout?: () => void;
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
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* LOGO + TITLE */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-linear-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg md:text-xl font-bold text-right">
            نظام فواتير النقل
          </h1>
        </div>

        {/* DESKTOP ACTIONS */}
        <div className="hidden md:flex items-center gap-4">
          {currentPage === "dashboard" && (
            <>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    إجمالي الفواتير
                  </p>
                  <p className="font-semibold text-lg">{invoiceCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    المبلغ الإجمالي
                  </p>
                  <p className="font-semibold text-lg">
                    {formatCurrencyEN(totalAmount)}
                  </p>
                </div>
              </div>

              <Button onClick={onCreateNew} className="gap-2" size="sm">
                <Plus className="h-4 w-4" />
                فاتورة جديدة
              </Button>
            </>
          )}

          {currentUser && (
            <>
              {currentUser.role === "admin" && onUserManagement && (
                <Button
                  onClick={onUserManagement}
                  variant="ghost"
                  size="sm"
                  title="إدارة المستخدمين"
                >
                  <Shield className="h-5 w-5" />
                </Button>
              )}

              <div className="flex items-center gap-2">
                <UserCircle className="h-6 w-6 text-muted-foreground" />
                <div className="text-right">
                  <span className="text-xs">
                    {currentUser.role === "admin" ? "مسؤول" : "مستخدم"}
                  </span>
                  <p className="text-sm font-semibold">
                    {currentUser.username}
                  </p>
                </div>
              </div>

              <Button
                onClick={onLogout}
                variant="ghost"
                size="sm"
                title="تسجيل الخروج"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          )}

          <Button
            onClick={onSettings}
            variant="ghost"
            size="sm"
            title="الإعدادات"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* MOBILE MENU (Sheet) */}
        <Sheet>
          <SheetTrigger className="md:hidden">
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>القائمة</SheetTitle>
            </SheetHeader>

            <div className="mt-6 flex flex-col gap-6 text-xs p-6">
              {currentPage === "dashboard" && (
                <div className="flex flex-col gap-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      إجمالي الفواتير
                    </p>
                    <p className="font-semibold text-xl">{invoiceCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      المبلغ الإجمالي
                    </p>
                    <p className="font-semibold text-xl">
                      {formatCurrencyEN(totalAmount)}
                    </p>
                  </div>
                </div>
              )}

              {/* CREATE INVOICE */}
              <SheetClose
                onClick={onCreateNew}
                className="flex items-center gap-2 w-full justify-center bg-primary p-2 text-white rounded-xl hover:bg-primary/80"
              >
                <Plus className="h-5 w-5" />
                <span>فاتورة جديدة</span>
              </SheetClose>

              {/* SETTINGS */}
              <SheetClose
                onClick={onSettings}
                className="flex items-center gap-2 w-full justify-center bg-secondary p-2 rounded-xl hover:bg-secondary/70"
              >
                <Settings className="h-5 w-5" />
                <span>الإعدادات</span>
              </SheetClose>

              {/* USER MANAGEMENT (ADMIN ONLY) */}
              {currentUser?.role === "admin" && onUserManagement && (
                <SheetClose
                  onClick={onUserManagement}
                  className="flex items-center gap-2 w-full justify-center bg-muted p-2 rounded-xl hover:bg-muted/70"
                >
                  <Shield className="h-5 w-5" />
                  <span>إدارة المستخدمين</span>
                </SheetClose>
              )}

              {/* USER INFO */}
              {currentUser && (
                <>
                  <div className="text-center">
                    <UserCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="font-semibold mt-1">{currentUser.username}</p>
                  </div>

                  {/* LOGOUT */}
                  <SheetClose
                    onClick={onLogout}
                    className="flex items-center gap-2 w-full justify-center bg-red-600 text-white p-2 rounded-xl hover:bg-red-700"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>تسجيل الخروج</span>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
