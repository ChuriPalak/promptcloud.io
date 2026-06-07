"use client";

import { useState } from "react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "Perfect for personal Proxmox projects and learning",
    features: [
      "1 Proxmox VM",
      "2 LXC Containers",
      "1 Proxmox Node",
      "WhatsApp Support",
      "Community Support",
      "Basic Analytics",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For professional developers and small teams",
    features: [
      "8 Proxmox VMs",
      "20 LXC Containers",
      "3 Proxmox Nodes",
      "WhatsApp + Telegram + Slack",
      "Priority AI Support",
      "Advanced Analytics",
      "Auto-scaling",
      "UPI + XDC Billing",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams with advanced Proxmox infrastructure needs",
    features: [
      "Unlimited Proxmox VMs",
      "Unlimited LXC Containers",
      "Unlimited Proxmox Nodes",
      "All Channels + API",
      "Dedicated AI Agent",
      "Custom Integrations",
      "SLA 99.99%",
      "Ceph Storage",
      "SOC2 Compliance",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#7b2cbf]/5 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-[#f0f0ff]">Simple </span>
            <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-lg text-[#a0a0c0] max-w-2xl mx-auto mb-8">
            Pay only for Proxmox resources you use. No hidden fees. Cancel anytime.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-[rgba(224,170,255,0.1)] border border-[rgba(224,170,255,0.15)]">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !isAnnual
                  ? "bg-[#7b2cbf] text-white shadow-lg"
                  : "text-[#a0a0c0] hover:text-[#e0aaff]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                isAnnual
                  ? "bg-[#7b2cbf] text-white shadow-lg"
                  : "text-[#a0a0c0] hover:text-[#e0aaff]"
              }`}
            >
              Annual
              <span className="text-xs bg-[#2ed573]/20 text-[#2ed573] px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 transition-all ${
                plan.popular
                  ? "glass-card border-[#7b2cbf] scale-105 z-10"
                  : "glass-card opacity-90 hover:opacity-100"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#7b2cbf] to-[#e0aaff] text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <h3 className="text-xl font-semibold text-[#f0f0ff] mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                <span className="text-[#a0a0c0] text-sm ml-1">{isAnnual && plan.period === "/month" ? "/year" : plan.period}</span>
              </div>
              <p className="text-sm text-[#a0a0c0] mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#e0e0ff]">
                    <svg className="w-5 h-5 text-[#2ed573] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 rounded-xl font-semibold transition-all ${
                plan.popular
                  ? "btn-primary"
                  : "btn-secondary"
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
