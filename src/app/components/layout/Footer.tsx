import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Twitter, Github, MessageSquare, Mail } from "lucide-react";
import { useState } from "react";
import klineoLogoDark from "@/assets/klineo-logo-dark-bg.png";

interface FooterProps {
  onNavigate?: (view: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img
                src={klineoLogoDark}
                alt="KLINEO"
                className="h-8 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Professional copy trading terminal for centralized exchanges. Built for serious traders who 
              demand precision, control, and transparency.
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="https://twitter.com/klineo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="size-9 border border-border rounded flex items-center justify-center hover:bg-secondary/50 transition"
              >
                <Twitter className="size-4" />
              </a>
              <a 
                href="https://github.com/klineo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="size-9 border border-border rounded flex items-center justify-center hover:bg-secondary/50 transition"
              >
                <Github className="size-4" />
              </a>
              <a 
                href="https://discord.gg/klineo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="size-9 border border-border rounded flex items-center justify-center hover:bg-secondary/50 transition"
              >
                <MessageSquare className="size-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4 text-sm">Product</h3>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("how-it-works")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("pricing")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Pricing
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("marketplace")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Master Traders
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("blog")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Blog
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("changelog")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Changelog
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4 text-sm">Resources</h3>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("faq")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("support")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Support Center
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("about")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  About Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("contact")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Contact
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("master-trader-apply")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Become a Master Trader
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4 text-sm">Legal</h3>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("terms-of-service")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("privacy-policy")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate && onNavigate("risk-disclosure")}
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Risk Disclosure
                </button>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-border pt-8 mb-8">
          <div className="max-w-md">
            <h3 className="font-semibold mb-2">Stay Updated</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get the latest trading insights, platform updates, and exclusive offers.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <Mail className="size-4 mr-2" />
                Subscribe
              </Button>
            </form>
            {subscribed && (
              <p className="text-xs text-[#10B981] mt-2">✓ Successfully subscribed!</p>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 KLINEO. All rights reserved. Not financial advice.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">
              Status
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">
              API Docs
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">
              Affiliates
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition">
              Careers
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-secondary/20 border border-border rounded">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Risk Warning:</strong> Cryptocurrency trading and copy trading involve substantial risk of loss. 
            KLINEO is a technology platform and does not provide investment advice. Past performance is not indicative 
            of future results. Only invest funds you can afford to lose. See our Risk Disclosure for complete information.
          </p>
        </div>
      </div>
    </footer>
  );
}