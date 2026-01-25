import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ArrowLeft, Mail, MessageSquare, Clock, MapPin } from "lucide-react";
import { useState } from "react";

interface ContactPageProps {
  onNavigate: (view: string) => void;
}

export function ContactPage({ onNavigate }: ContactPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "general",
    message: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to backend
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => onNavigate("home")}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                <Mail className="size-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Contact Us</h1>
                  <p className="text-xs text-muted-foreground">Get in touch with our team</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Get in Touch</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Have questions about KLINEO? Our support team is here to help. Fill out the form and we'll 
                get back to you as soon as possible.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="size-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold mb-1">Email</div>
                    <a href="mailto:support@klineo.xyz" className="text-sm text-primary hover:underline">
                      support@klineo.xyz
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MessageSquare className="size-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold mb-1">Live Chat</div>
                    <p className="text-sm text-muted-foreground">Available for Pro & Unlimited users</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold mb-1">Support Hours</div>
                    <p className="text-sm text-muted-foreground">Mon-Fri: 9 AM - 9 PM UTC</p>
                    <p className="text-sm text-muted-foreground">Sat-Sun: Limited coverage</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold mb-1">Location</div>
                    <p className="text-sm text-muted-foreground">Remote-first team</p>
                    <p className="text-sm text-muted-foreground">Global operations</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-secondary/20">
              <h3 className="text-base font-semibold mb-3">Quick Links</h3>
              <div className="space-y-2">
                <a href="/faq" className="block text-sm text-primary hover:underline">
                  → Frequently Asked Questions
                </a>
                <a href="/support" className="block text-sm text-primary hover:underline">
                  → Support Center
                </a>
                <a href="/how-it-works" className="block text-sm text-primary hover:underline">
                  → How KLINEO Works
                </a>
                <a href="/terms" className="block text-sm text-primary hover:underline">
                  → Terms of Service
                </a>
                <a href="/privacy" className="block text-sm text-primary hover:underline">
                  → Privacy Policy
                </a>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold mb-3">Business Inquiries</h3>
              <p className="text-sm text-muted-foreground mb-3">
                For partnerships, press, or business development:
              </p>
              <a href="mailto:business@klineo.xyz" className="text-sm text-primary hover:underline font-mono">
                business@klineo.xyz
              </a>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card className="p-8">
              <h2 className="text-xl font-semibold mb-6">Send Us a Message</h2>

              {submitted && (
                <div className="mb-6 p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded">
                  <p className="text-sm text-[#10B981] font-semibold">
                    ✓ Message sent successfully! We'll get back to you within 24 hours.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Email <span className="text-[#EF4444]">*</span>
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Category <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="account">Account Issues</option>
                    <option value="trader">Master Trader Application</option>
                    <option value="partnership">Partnership/Business</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Subject <span className="text-[#EF4444]">*</span>
                  </label>
                  <Input
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief description of your inquiry"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Message <span className="text-[#EF4444]">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Provide details about your inquiry..."
                    rows={8}
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Please include relevant details such as User ID, error messages, or screenshots if applicable.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-primary hover:bg-primary/90 flex-1"
                  >
                    Send Message
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setFormData({ name: "", email: "", subject: "", category: "general", message: "" })}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </Card>

            {/* Response Time Notice */}
            <div className="mt-6 p-4 bg-secondary/20 border border-border rounded">
              <p className="text-xs text-muted-foreground">
                <strong>Response Time:</strong> We typically respond within 24 hours during business days. 
                For urgent issues affecting active trades, please include "URGENT" in your subject line. 
                Pro and Unlimited subscribers receive priority support.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                <MessageSquare className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold">Community</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Join our Discord community to connect with other traders and get peer support.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Join Discord
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                <Mail className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold">Bug Reports</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Found a bug? Report it directly to our engineering team for faster resolution.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Report Bug
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 bg-primary/10 border border-primary/30 rounded flex items-center justify-center">
                <MessageSquare className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold">Feature Requests</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Have an idea for a new feature? We'd love to hear your suggestions.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Submit Idea
            </Button>
          </Card>
        </div>
      </div>

      {/* Alternative Contact Methods */}
      <div className="border-t border-border bg-secondary/10">
        <div className="container mx-auto px-6 py-12 max-w-4xl">
          <h2 className="text-xl font-bold mb-6 text-center">Other Ways to Reach Us</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-base font-semibold mb-3">For Technical Issues</h3>
              <p className="text-sm text-muted-foreground mb-3">
                If you're experiencing technical problems or urgent trading issues:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  <a href="mailto:technical@klineo.xyz" className="text-sm text-primary hover:underline font-mono">
                    technical@klineo.xyz
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  <span className="text-sm text-muted-foreground">Include your User ID and error details</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold mb-3">For Security Concerns</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Report security vulnerabilities or account compromise:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  <a href="mailto:security@klineo.xyz" className="text-sm text-primary hover:underline font-mono">
                    security@klineo.xyz
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  <span className="text-sm text-muted-foreground">Responsible disclosure appreciated</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}