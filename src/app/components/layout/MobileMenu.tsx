import { Button } from "@/app/components/ui/button";
import { X, Menu, Home, DollarSign, BookOpen, Info, HelpCircle, Mail, FileText } from "lucide-react";
import { useState, useEffect } from "react";

interface MobileMenuProps {
  onNavigate: (view: string) => void;
  currentView?: string;
}

export function MobileMenu({ onNavigate, currentView }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setIsOpen(false);
  };

  const menuItems = [
    { id: "landing", label: "Home", icon: Home },
    { id: "how-it-works", label: "How It Works", icon: BookOpen },
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "about", label: "About", icon: Info },
    { id: "faq", label: "FAQ", icon: HelpCircle },
    { id: "contact", label: "Contact", icon: Mail },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 hover:bg-secondary/50 rounded transition"
        aria-label="Open menu"
      >
        <Menu className="size-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-80 bg-card border-l border-border z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-gradient-to-br from-primary to-amber-600 rounded flex items-center justify-center font-bold text-background shadow-lg">
                K
              </div>
              <span className="font-bold text-lg">KLINEO</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-secondary/50 rounded transition"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-6">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? 'bg-primary text-background font-medium'
                          : 'hover:bg-secondary/50 text-muted-foreground'
                      }`}
                    >
                      <Icon className="size-5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Divider */}
            <div className="my-6 border-t border-border" />

            {/* Auth Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleNavigate("login")}
              >
                Login
              </Button>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-background"
                onClick={() => handleNavigate("signup")}
              >
                Start Trading
              </Button>
            </div>

            {/* Footer Links */}
            <div className="mt-8 space-y-2">
              <button
                onClick={() => handleNavigate("terms-of-service")}
                className="text-xs text-muted-foreground hover:text-foreground transition block"
              >
                Terms of Service
              </button>
              <button
                onClick={() => handleNavigate("privacy-policy")}
                className="text-xs text-muted-foreground hover:text-foreground transition block"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => handleNavigate("risk-disclosure")}
                className="text-xs text-muted-foreground hover:text-foreground transition block"
              >
                Risk Disclosure
              </button>
            </div>
          </nav>

          {/* Bottom Info */}
          <div className="p-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              © 2026 KLINEO. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
