"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  time: string;
}

const initialMessages: Message[] = [
  { id: 1, text: "Hey PromptCloud, what's my balance?", sender: "user", time: "10:42 AM" },
  { id: 2, text: "💰 Your wallet balance:\n\n• INR: ₹1,250.00\n• XDC: 500.00\n\nYou have 2 active instances running.\n\nNeed to book more? Just say 'book' or visit the dashboard.", sender: "bot", time: "10:42 AM" },
  { id: 3, text: "Deploy Ubuntu VM with 4 cores", sender: "user", time: "10:43 AM" },
  { id: 4, text: "⚡ Deploying Ubuntu VM...\n\n• Type: VM\n• ID: 105\n• CPU: 4 cores\n• RAM: 4GB\n• Storage: 20GB SSD\n• OS: Ubuntu 22.04\n• Node: pve-01\n• Cost: ₹0.18/hour\n\n✅ Deployment complete!\nIP: 192.168.1.45\nPassword: [Check Telegram]\n\nSSH: ssh root@192.168.1.45", sender: "bot", time: "10:43 AM" },
];

export default function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: inputText,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages([...messages, newMessage]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const responses: Record<string, string> = {
        "balance": "💰 Your wallet balance:\n\n• INR: ₹1,250.00\n• XDC: 500.00\n\nYou have 2 active instances running.",
        "deploy": "⚡ Deploying...\n\n• Type: LXC\n• ID: 202\n• OS: Ubuntu 22.04\n• Node: pve-02\n• Cost: ₹0.12/hour\n\n✅ Done! Access details sent to your Telegram.",
        "status": "🟢 All systems operational\n\n• pve-01: 99.99% uptime\n• pve-02: 99.98% uptime\n• Storage: Ceph healthy\n• Network: Stable",
        "help": "🤖 Available commands:\n\n• balance - Check wallet\n• deploy - Deploy VM/LXC\n• status - System status\n• delete - Remove instance\n• deposit - Add funds\n• Or just chat naturally!",
      };

      const botResponse = responses[inputText.toLowerCase()] || 
        "✅ Got it! I'll process that for you. Check your dashboard for updates.";

      const botMessage: Message = {
        id: messages.length + 2,
        text: botResponse,
        sender: "bot",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <section id="demo" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#7b2cbf]/5 to-transparent" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-[#f0f0ff]">Chat via </span>
            <span className="gradient-text">Telegram</span>
          </h2>
          <p className="text-lg text-[#a0a0c0] max-w-2xl mx-auto">
            No WhatsApp needed. Use Telegram to deploy, manage, and get OTP notifications.
          </p>
        </div>

        {/* Chat Interface */}
        <div className="glass-card rounded-2xl overflow-hidden max-w-2xl mx-auto">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(224,170,255,0.1)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7b2cbf] to-[#3c096c] flex items-center justify-center text-white font-bold">
                PC
              </div>
              <div>
                <div className="text-sm font-medium text-[#f0f0ff]">PromptCloud Bot</div>
                <div className="flex items-center gap-1 text-xs text-[#2ed573]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2ed573] animate-pulse" />
                  Online
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#606080]">
              <span className="px-2 py-1 rounded-md bg-[#2ed573]/10 text-[#2ed573]">AI Active</span>
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4 bg-[rgba(10,10,15,0.3)]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 chat-bubble ${
                    msg.sender === "user"
                      ? "bg-[#7b2cbf] text-white rounded-br-md"
                      : "bg-[rgba(224,170,255,0.1)] text-[#e0e0ff] border border-[rgba(224,170,255,0.15)] rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                  <span className="text-xs opacity-50 mt-1 block">{msg.time}</span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[rgba(224,170,255,0.1)] border border-[rgba(224,170,255,0.15)] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#e0aaff] typing-dot" />
                    <span className="w-2 h-2 rounded-full bg-[#e0aaff] typing-dot" />
                    <span className="w-2 h-2 rounded-full bg-[#e0aaff] typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[rgba(224,170,255,0.1)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Try: 'balance', 'deploy', 'status'..."
                className="input-glass flex-1 text-sm"
              />
              <button
                onClick={handleSend}
                className="btn-primary px-4"
                disabled={!inputText.trim()}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Commands */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl mx-auto">
          {["Check balance", "Deploy Ubuntu VM", "Delete instance", "Show status", "Add funds"].map((cmd) => (
            <button
              key={cmd}
              onClick={() => {
                setInputText(cmd);
                setTimeout(handleSend, 100);
              }}
              className="px-3 py-1.5 rounded-full text-xs bg-[rgba(224,170,255,0.08)] text-[#a0a0c0] hover:bg-[rgba(224,170,255,0.15)] hover:text-[#e0aaff] transition-colors border border-[rgba(224,170,255,0.1)]"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
