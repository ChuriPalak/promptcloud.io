"use client";

import { useEffect, useRef, useState } from "react";

export default function Architecture() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % 4);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const steps = [
    {
      title: "1. You Chat",
      description: "Send a message on WhatsApp: 'Deploy Ubuntu VM with 4GB RAM'",
      icon: "💬",
      color: "#7b2cbf",
    },
    {
      title: "2. PromptCloud Processes",
      description: "Our AI understands your request, checks your balance, and holds funds in escrow",
      icon: "🧠",
      color: "#e0aaff",
    },
    {
      title: "3. Proxmox Deploys",
      description: "We call the Proxmox provider's API using their secure credentials (never exposed to you)",
      icon: "⚡",
      color: "#2ed573",
    },
    {
      title: "4. You Get Access",
      description: "Receive VM IP, credentials, and live monitoring — all via chat. Pay per second of actual usage",
      icon: "🎉",
      color: "#ffa502",
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#7b2cbf]/5 via-transparent to-[#3c096c]/5" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-[#f0f0ff]">The </span>
            <span className="gradient-text">Middleman</span>
            <span className="text-[#f0f0ff]"> Advantage</span>
          </h2>
          <p className="text-lg text-[#a0a0c0] max-w-2xl mx-auto">
            We sit between you and Proxmox providers. You chat with us, we manage the infrastructure, providers get paid, you get simplicity.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className={`glass-card rounded-2xl p-8 mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* User */}
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7b2cbf] to-[#3c096c] flex items-center justify-center text-3xl mb-4 animate-float">
                👤
              </div>
              <h3 className="text-lg font-semibold text-[#f0f0ff] mb-2">You (Tenant)</h3>
              <p className="text-sm text-[#a0a0c0]">WhatsApp, Telegram, Slack</p>
              <div className="mt-2 px-3 py-1 rounded-full bg-[#7b2cbf]/20 text-[#e0aaff] text-xs">
                UPI / XDC / Stablecoins
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex flex-col items-center">
              <div className="w-32 h-1 bg-gradient-to-r from-[#7b2cbf] to-[#e0aaff] rounded-full relative">
                <div className="absolute right-0 -top-1 w-3 h-3 bg-[#e0aaff] rounded-full animate-pulse" />
              </div>
              <span className="text-xs text-[#606080] mt-2">Message</span>
            </div>

            {/* PromptCloud */}
            <div className="flex flex-col items-center text-center flex-1 relative">
              <div className="absolute -inset-4 bg-[#7b2cbf]/20 rounded-2xl blur-xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#e0aaff] to-[#7b2cbf] flex items-center justify-center text-3xl mb-4 glow-violet">
                ☁️
              </div>
              <h3 className="text-lg font-semibold text-[#f0f0ff] mb-2">PromptCloud</h3>
              <p className="text-sm text-[#a0a0c0]">AI Middleman Platform</p>
              <div className="mt-2 flex gap-2">
                <span className="px-3 py-1 rounded-full bg-[#2ed573]/20 text-[#2ed573] text-xs">Escrow</span>
                <span className="px-3 py-1 rounded-full bg-[#ffa502]/20 text-[#ffa502] text-xs">Metered</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex flex-col items-center">
              <div className="w-32 h-1 bg-gradient-to-r from-[#e0aaff] to-[#2ed573] rounded-full relative">
                <div className="absolute right-0 -top-1 w-3 h-3 bg-[#2ed573] rounded-full animate-pulse" />
              </div>
              <span className="text-xs text-[#606080] mt-2">API Call</span>
            </div>

            {/* Proxmox Provider */}
            <div className="flex flex-col items-center text-center flex-1">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2ed573] to-[#1e8449] flex items-center justify-center text-3xl mb-4 animate-float" style={{ animationDelay: '1s' }}>
                🖥️
              </div>
              <h3 className="text-lg font-semibold text-[#f0f0ff] mb-2">Proxmox Provider</h3>
              <p className="text-sm text-[#a0a0c0]">VMs, LXC, Storage</p>
              <div className="mt-2 px-3 py-1 rounded-full bg-[#2ed573]/20 text-[#2ed573] text-xs">
                Gets Paid Per Hour
              </div>
            </div>
          </div>

          {/* Money Flow */}
          <div className="mt-8 pt-6 border-t border-[rgba(224,170,255,0.1)]">
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-[#a0a0c0]">Your Payment</span>
              <svg className="w-5 h-5 text-[#2ed573]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="text-[#e0aaff] font-semibold">PromptCloud Escrow</span>
              <svg className="w-5 h-5 text-[#2ed573]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="text-[#2ed573] font-semibold">Provider (minus 10% fee)</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`glass-card rounded-xl p-6 transition-all duration-500 ${
                activeStep === index ? 'border-[#e0aaff] scale-105' : 'border-transparent opacity-70'
              }`}
            >
              <div className="text-3xl mb-3">{step.icon}</div>
              <h3 className="text-lg font-semibold text-[#f0f0ff] mb-2">{step.title}</h3>
              <p className="text-sm text-[#a0a0c0]">{step.description}</p>
              {activeStep === index && (
                <div className="mt-3 w-full h-1 bg-gradient-to-r from-[#7b2cbf] to-[#e0aaff] rounded-full animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Key Benefits */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-[#f0f0ff] mb-2">Secure Escrow</h3>
            <p className="text-sm text-[#a0a0c0]">Funds held until VM is running. Refund if deployment fails.</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-lg font-semibold text-[#f0f0ff] mb-2">No Upfront Costs</h3>
            <p className="text-sm text-[#a0a0c0]">Pay per second of actual usage. No monthly commitments.</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="text-lg font-semibold text-[#f0f0ff] mb-2">Provider Marketplace</h3>
            <p className="text-sm text-[#a0a0c0]">Multiple Proxmox providers compete. Best price wins.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
