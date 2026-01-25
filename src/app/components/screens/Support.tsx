import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { MessageSquare, ExternalLink } from "lucide-react";

const tickets = [
  {
    id: "TKT-2024-001",
    subject: "Copy trading not syncing",
    status: "Open",
    priority: "High",
    created: "Jan 22, 2026",
  },
  {
    id: "TKT-2024-002",
    subject: "Question about platform fees",
    status: "Resolved",
    priority: "Low",
    created: "Jan 18, 2026",
  },
];

export function Support() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Support</h1>
        <p className="text-sm text-muted-foreground">Get help and submit support tickets</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* New Ticket Form */}
        <div className="col-span-2 space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Submit a Support Ticket</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input placeholder="Brief description of your issue" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select className="w-full p-2 bg-input border border-border rounded text-sm">
                  <option>Technical Issue</option>
                  <option>Account & Billing</option>
                  <option>Copy Trading</option>
                  <option>API Connection</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Provide detailed information about your issue..."
                  rows={6}
                />
              </div>
            </div>
            <Button className="w-full bg-primary text-primary-foreground">
              <MessageSquare className="size-4 mr-2" />
              Submit Ticket
            </Button>
          </Card>

          {/* Previous Tickets */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Your Tickets</h3>
            <div className="space-y-3">
              {tickets.map((ticket, i) => (
                <div key={i} className="p-4 bg-secondary/30 rounded border border-border flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm font-semibold">{ticket.id}</span>
                      <Badge variant={ticket.status === "Open" ? "default" : "secondary"}>
                        {ticket.status}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={
                          ticket.priority === "High" 
                            ? "border-[#EF4444]/50 text-[#EF4444]" 
                            : "border-muted-foreground/50 text-muted-foreground"
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </div>
                    <div className="font-medium mb-1">{ticket.subject}</div>
                    <div className="text-xs text-muted-foreground">Created: {ticket.created}</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                    <ExternalLink className="size-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Resources Sidebar */}
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                📚 Documentation
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                💬 Community Discord
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                📹 Video Tutorials
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                ❓ FAQ
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Contact Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Email</div>
                <div className="font-medium">support@klineo.xyz</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Response Time</div>
                <div className="font-medium text-[#10B981]">{"<"} 24 hours</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Support Hours</div>
                <div className="font-medium">24/7 for Pro & Unlimited</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-secondary/30">
            <div className="text-sm space-y-2 text-muted-foreground">
              <p><strong>Pro Plan Benefits:</strong></p>
              <ul className="space-y-1">
                <li>• Priority support queue</li>
                <li>• Direct email access</li>
                <li>• 24-hour response time</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
