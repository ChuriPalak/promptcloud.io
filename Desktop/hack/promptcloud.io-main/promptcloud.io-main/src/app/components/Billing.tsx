"use client";

export default function Billing() {
  const billingMethods = [
    {
      name: "UPI",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
      description: "Instant payments via Google Pay, PhonePe, Paytm for Proxmox resources",
      status: "Live",
    },
    {
      name: "XDC Tokens",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      ),
      description: "Pay with XDC for Proxmox VMs, LXC containers, and storage",
      status: "Live",
    },
    {
      name: "Stablecoins",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.32 0 2.31-.82 2.31-1.86 0-.99-.77-1.54-2.62-1.96-2.33-.53-3.42-1.82-3.42-3.36 0-1.74 1.21-3.08 3.08-3.44V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.94-1.85-2.38-1.85-1.18 0-2.05.68-2.05 1.68 0 .88.65 1.39 2.67 1.91 2.42.59 3.38 1.77 3.38 3.41 0 1.87-1.31 3.24-3.51 3.59z" />
        </svg>
      ),
      description: "USDT, USDC, DAI across multiple chains",
      status: "Coming Soon",
    },
    {
      name: "Fiat Cards",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
        </svg>
      ),
      description: "Visa, Mastercard, RuPay for Indian users",
      status: "Coming Soon",
    },
  ];

  return (
    <section id="billing" className="py-24 relative">
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-[#f0f0ff]">Pay How </span>
            <span className="gradient-text">You Want</span>
          </h2>
          <p className="text-lg text-[#a0a0c0] max-w-2xl mx-auto">
            First cloud platform to accept UPI and XDC tokens for Proxmox resources. Metered billing means you pay per second for actual VM/LXC usage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {billingMethods.map((method) => (
            <div key={method.name} className="glass-card rounded-2xl p-6 text-center group">
              <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-[#7b2cbf]/20 to-[#3c096c]/20 flex items-center justify-center text-[#e0aaff] mb-4 group-hover:scale-110 transition-transform">
                {method.icon}
              </div>
              <h3 className="text-lg font-semibold text-[#f0f0ff] mb-1">{method.name}</h3>
              <p className="text-sm text-[#a0a0c0] mb-3">{method.description}</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  method.status === "Live"
                    ? "bg-[#2ed573]/10 text-[#2ed573]"
                    : "bg-[#ffa502]/10 text-[#ffa502]"
                }`}
              >
                {method.status}
              </span>
            </div>
          ))}
        </div>

        {/* Metered Billing Explainer */}
        <div className="mt-16 glass-card rounded-2xl p-8 max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-[#f0f0ff] mb-3">Proxmox Metered Billing</h3>
              <p className="text-[#a0a0c0] mb-4">
                Traditional cloud bills you hourly. We bill per second for Proxmox VMs, LXC containers, and storage.
                See your spend update in real-time as you chat with the AI.
              </p>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">$0.0003</div>
                  <div className="text-xs text-[#606080]">per second</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">~34%</div>
                  <div className="text-xs text-[#606080]">cheaper than AWS</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">0s</div>
                  <div className="text-xs text-[#606080]">billing delay</div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-48 h-32 rounded-xl bg-gradient-to-br from-[#7b2cbf]/30 to-[#3c096c]/30 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#e0aaff]">$12.47</div>
                <div className="text-xs text-[#606080]">Current Session</div>
                <div className="w-32 h-1 bg-[rgba(224,170,255,0.1)] rounded-full mt-2 overflow-hidden">
                  <div className="w-3/4 h-full bg-gradient-to-r from-[#7b2cbf] to-[#e0aaff] rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
