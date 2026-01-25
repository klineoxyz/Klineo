import { useState } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { MessageCircle, X, Send, Minimize2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "user",
      content: "What are the key resistance levels for Ethereum right now? For beginners like right now?",
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: "2",
      type: "bot",
      content: "",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const sampleResistanceLevels = [
    { level: "$3,391.91 & $3,500", color: "text-green-500" },
    { level: "$2,615 & $2,960", color: "text-purple-400" },
  ];

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue("");

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "Thank you for your question. Our AI is processing your request...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 size-14 rounded-full bg-accent text-background hover:bg-accent/90 shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
        aria-label="Open chat"
      >
        <MessageCircle className="size-6" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all",
        isMinimized ? "w-80" : "w-96"
      )}
    >
      <Card className="flex flex-col shadow-2xl border-accent/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-accent/20 flex items-center justify-center">
              <MessageCircle className="size-4 text-accent" />
            </div>
            <div>
              <div className="font-semibold text-sm">Ask KLINEO</div>
              <div className="text-[10px] text-muted-foreground">AI Trading Assistant</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="size-8 p-0"
            >
              <Minimize2 className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="size-8 p-0"
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        {!isMinimized && (
          <>
            <div className="flex-1 p-4 space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.type === "user" ? (
                    <div className="max-w-[80%] rounded-lg bg-accent/10 border border-accent/20 px-3 py-2">
                      <p className="text-sm text-foreground italic">
                        {message.content}
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-[85%]">
                      {message.id === "2" ? (
                        // Special rendering for the resistance levels message
                        <div className="space-y-3">
                          <div className="text-sm font-medium text-accent mb-2">
                            Resistance Levels:
                          </div>
                          {sampleResistanceLevels.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 text-sm"
                            >
                              <CheckCircle2 className={cn("size-4 mt-0.5 shrink-0", item.color)} />
                              <span className={cn("font-mono font-semibold", item.color)}>
                                {item.level}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-secondary/50 border border-border px-3 py-2">
                          <p className="text-sm text-muted-foreground">
                            {message.content}
                          </p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  placeholder="Ask about markets, strategies..."
                  className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="bg-accent text-background hover:bg-accent/90"
                >
                  <Send className="size-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                AI responses are for informational purposes only
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
