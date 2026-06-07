"use client";

import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="relative border-t border-[rgba(224,170,255,0.1)]">
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Logo variant="footer" />
            </div>
            <p className="text-sm text-[#a0a0c0]">
              The first cloud platform built for the AI agent economy. Natural language cloud operations.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-[#f0f0ff] mb-4">Product</h4>
            <ul className="space-y-2">
              {["Features", "Pricing", "Security", "Changelog", "Status Page"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[#a0a0c0] hover:text-[#e0aaff] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-[#f0f0ff] mb-4">Resources</h4>
            <ul className="space-y-2">
              {["Documentation", "API Reference", "SDK", "Community", "Blog"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[#a0a0c0] hover:text-[#e0aaff] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-[#f0f0ff] mb-4">Company</h4>
            <ul className="space-y-2">
              {["About", "Careers", "Contact", "Privacy", "Terms"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[#a0a0c0] hover:text-[#e0aaff] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-[rgba(224,170,255,0.1)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#606080]">© 2026 PromptCloud. Built on XDC Network.</p>
          <div className="flex items-center gap-4">
            {["Twitter", "Discord", "GitHub", "Telegram"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-xs text-[#606080] hover:text-[#e0aaff] transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
