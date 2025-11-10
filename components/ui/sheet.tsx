"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | undefined>(undefined);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within a Sheet");
  }
  return context;
}

interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open: controlledOpen, defaultOpen = false, onOpenChange, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [controlledOpen, onOpenChange]
  );

  return <SheetContext.Provider value={{ open, onOpenChange: handleOpenChange }}>{children}</SheetContext.Provider>;
}

interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function SheetTrigger({ asChild = false, onClick, children, ...props }: SheetTriggerProps) {
  const { onOpenChange } = useSheet();
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onOpenChange(true);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, onClick: handleClick } as React.DOMAttributes<HTMLElement>);
  }

  return <button onClick={handleClick} {...props}>{children}</button>;
}

interface SheetPortalProps {
  children: React.ReactNode;
}

function SheetPortal({ children }: SheetPortalProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  return ReactDOM.createPortal(children, document.body);
}

export function SheetOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSheet();
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-all duration-300 ease-in-out",
        open ? "animate-in fade-in-0" : "animate-out fade-out-0",
        className
      )}
      {...props}
    />
  );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showClose?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  side?: "left" | "right";
}

export function SheetContent({ showClose = true, className, children, size = "md", side = "right", ...props }: SheetContentProps) {
  const { open, onOpenChange } = useSheet();
  const ref = React.useRef<HTMLDivElement>(null);

  // ESC key closes
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onOpenChange(false); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  // Click outside closes
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  const sizeClasses = {
    sm: "w-72",
    md: "w-2/3 max-w-md",
    lg: "w-1/2 max-w-lg",
    xl: "w-2/3 max-w-xl",
    full: "w-full",
  };

  const translateClass = side === "left" ? "left-0 -translate-x-full rtl:left-auto rtl:right-0 rtl:translate-x-full" : "right-0 translate-x-full rtl:right-auto rtl:left-0 rtl:-translate-x-full";

  return (
    <SheetPortal>
      <div
        ref={ref}
        className={cn(
          "fixed inset-y-0 h-full transform transition-transform duration-500 ease-in-out z-50 bg-white shadow-xl flex flex-col overflow-hidden",
          translateClass,
          open && "translate-x-0 rtl:translate-x-0",
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {showClose && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute ltr:right-4 rtl:left-4 top-4 rounded-full p-2 opacity-70 hover:opacity-100 hover:bg-gray-100 focus:outline-none"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {children}
      </div>
    </SheetPortal>
  );
}

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  withBorder?: boolean;
}
export function SheetHeader({ className, withBorder = true, ...props }: SheetHeaderProps) {
  return <div className={cn("flex flex-col space-y-2 px-6 py-4", withBorder && "border-b border-gray-200", className)} {...props} />;
}

interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  withBorder?: boolean;
}
export function SheetFooter({ className, withBorder = true, ...props }: SheetFooterProps) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 py-4 bg-gray-50/50", withBorder && "border-t border-gray-200", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-gray-900", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-gray-600", className)} {...props} />;
}

interface SheetBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean;
}
export function SheetBody({ className, scrollable = true, ...props }: SheetBodyProps) {
  return <div className={cn("flex-1 p-6", scrollable && "overflow-y-auto", className)} {...props} />;
}

interface SheetCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
export function SheetClose({ asChild = false, onClick, children, ...props }: SheetCloseProps) {
  const { onOpenChange } = useSheet();
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onOpenChange(false);
    onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, onClick: handleClick } as React.DOMAttributes<HTMLElement>);
  }

  return <button onClick={handleClick} {...props}>{children}</button>;
}
