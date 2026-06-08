"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Pricing constants (match backend billing.js)
const PRICING = {
  cpu_per_core_hour: 5,
  ram_per_gb_hour: 2,
  storage_per_gb_hour: 0.5,
};

function calculateCost(cpu: number, ramMB: number, diskGB: number = 10) {
  const ramGB = ramMB / 1024;
  const hourly = cpu * PRICING.cpu_per_core_hour + ramGB * PRICING.ram_per_gb_hour + diskGB * PRICING.storage_per_gb_hour;
  return {
    hourly,
    perSecond: hourly / 3600,
    monthly: hourly * 24 * 30,
  };
}

// Load Razorpay checkout script
declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("instances");
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState({ inr: 0, xdc: 0 });
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [csVMs, setCsVMs] = useState<any[]>([]);
  const [csVolumes, setCsVolumes] = useState<any[]>([]);
  const [csDBs, setCsDBs] = useState<any[]>([]);
  const [csNetworks, setCsNetworks] = useState<any[]>([]);
  const [csFirewallRules, setCsFirewallRules] = useState<any[]>([]);
  const [csPublicIPs, setCsPublicIPs] = useState<any[]>([]);
  const [csKeys, setCsKeys] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showCreateVolumeModal, setShowCreateVolumeModal] = useState(false);
  const [volumeName, setVolumeName] = useState("");
  const [volumeSize, setVolumeSize] = useState(10);
  const [volumeZone, setVolumeZone] = useState("");
  const [volumeDiskOffering, setVolumeDiskOffering] = useState("");
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [volumeDiskOfferings, setVolumeDiskOfferings] = useState<any[]>([]);
  const [deployName, setDeployName] = useState("");
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployPlans, setDeployPlans] = useState<any[]>([]);
  const [deployTemplates, setDeployTemplates] = useState<any[]>([]);
  const [deployZones, setDeployZones] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [deployNetworks, setDeployNetworks] = useState<any[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedVM, setSelectedVM] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // DB deploy modal state
  const [showDBModal, setShowDBModal] = useState(false);
  const [dbName, setDbName] = useState("");
  const [dbPlan, setDbPlan] = useState("");
  const [dbZone, setDbZone] = useState("");
  const [dbNetwork, setDbNetwork] = useState("");
  const [dbLoading, setDbLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("promptcloud_token");
    if (!t) { 
      setLoading(false);
      router.push("/login"); 
      return; 
    }
    setToken(t);
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, walletRes, txRes, keysRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/profile`, { headers }),
        fetch(`${API_BASE}/api/wallet`, { headers }),
        fetch(`${API_BASE}/api/wallet/transactions`, { headers }),
        fetch(`${API_BASE}/api/user/cloudstack-keys`, { headers }),
      ]);
      const profile = await profileRes.json();
      const wallet = await walletRes.json();
      const txs = await txRes.json();
      const keys = await keysRes.json();
      setUser(profile);
      setBalance(wallet);
      setTxHistory(Array.isArray(txs) ? txs : []);
      setCsKeys(keys);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CloudStack data loading
  const loadCloudStackData = useCallback(async () => {
    if (!csKeys.apiKey || !csKeys.secretKey || !token) {
      console.log("Cannot refresh: missing keys or token", { apiKey: !!csKeys.apiKey, secretKey: !!csKeys.secretKey, token: !!token });
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch VMs
      const vmParams = new URLSearchParams({
        apiKey: csKeys.apiKey,
        secretKey: csKeys.secretKey,
        command: "listVirtualMachines",
        response: "json",
      });
      console.log("Fetching CloudStack VMs...");
      const vmRes = await fetch(`${API_BASE}/api/cloudstack-proxy?${vmParams.toString()}`, { headers });
      const vmData = await vmRes.json();
      console.log("CloudStack VM response:", vmData);
      if (vmData.listvirtualmachinesresponse?.virtualmachine) {
        setCsVMs(vmData.listvirtualmachinesresponse.virtualmachine);
        console.log(`Loaded ${vmData.listvirtualmachinesresponse.virtualmachine.length} VMs`);
      } else {
        console.log("No VMs in response");
      }

      // Fetch Volumes
      const volParams = new URLSearchParams({
        apiKey: csKeys.apiKey,
        secretKey: csKeys.secretKey,
        command: "listVolumes",
        response: "json",
      });
      console.log("Fetching CloudStack Volumes...");
      const volRes = await fetch(`${API_BASE}/api/cloudstack-proxy?${volParams.toString()}`, { headers });
      const volData = await volRes.json();
      console.log("CloudStack Volume response:", volData);
      if (volData.listvolumesresponse?.volume) {
        setCsVolumes(volData.listvolumesresponse.volume);
        console.log(`Loaded ${volData.listvolumesresponse.volume.length} volumes`);
      }

      // Fetch DBaaS / Kubernetes clusters as Managed DB
      const k8sParams = new URLSearchParams({
        apiKey: csKeys.apiKey,
        secretKey: csKeys.secretKey,
        command: "listKubernetesClusters",
        response: "json",
      });
      console.log("Fetching Kubernetes clusters...");
      const k8sRes = await fetch(`${API_BASE}/api/cloudstack-proxy?${k8sParams.toString()}`, { headers });
      const k8sData = await k8sRes.json();
      console.log("Kubernetes response:", k8sData);
      if (k8sData.listkubernetesclustersresponse?.kubernetescluster) {
        setCsDBs(k8sData.listkubernetesclustersresponse.kubernetescluster);
        console.log(`Loaded ${k8sData.listkubernetesclustersresponse.kubernetescluster.length} clusters`);
      }
    } catch (e) {
      console.error("CloudStack error:", e);
    }
  }, [csKeys, token]);

  useEffect(() => {
    if (csKeys.apiKey) loadCloudStackData();
  }, [csKeys, loadCloudStackData]);

  const handleSignOut = () => {
    localStorage.removeItem("promptcloud_token");
    localStorage.removeItem("promptcloud_user");
    router.push("/");
  };

  const handleTopUp = async (method: string) => {
    if (!token) return;
    const amt = prompt("Enter amount (INR):");
    if (!amt) return;
    const amount = parseFloat(amt);
    if (isNaN(amount) || amount < 1) {
      alert("Invalid amount. Minimum is ₹1.");
      return;
    }

    try {
      if (method === "razorpay") {
        // Load Razorpay script
        await loadRazorpayScript();

        // Create order
        const orderRes = await fetch(`${API_BASE}/api/payments/razorpay/order`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || 'Order creation failed');

        // Open Razorpay checkout
        const options = {
          key: orderData.keyId,
          amount: Math.round(amount * 100),
          currency: "INR",
          name: "PromptCloud",
          description: `Wallet Top-up ₹${amount}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            // Verify payment
            const verifyRes = await fetch(`${API_BASE}/api/payments/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.ok) {
              alert(`✅ Payment successful! ₹${amount} credited to your wallet.`);
              fetchData();
            } else {
              alert("❌ Payment verification failed. Contact support.");
            }
          },
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
          },
          theme: {
            color: "#7c3aed",
          },
          modal: {
            ondismiss: () => {
              console.log("Payment modal closed");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (method === "upi") {
        const res = await fetch(`${API_BASE}/api/payments/upi/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount }),
        });
        const data = await res.json();
        alert(`UPI ID: ${data.upiId}\nLink: ${data.upiLink}\nRef: ${data.txnRef}`);
      } else {
        const coin = prompt("Enter coin (usdt_trc20, btc, eth, xdc):") || "usdt_trc20";
        const res = await fetch(`${API_BASE}/api/payments/crypto/address?coin=${coin}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        alert(`Send ${amount} INR equivalent to:\n${data.address}\nNetwork: ${data.network}`);
      }
    } catch (e: any) {
      alert("Top-up failed: " + (e.message || "Unknown error"));
    }
  };

  const handleDeploy = async () => {
    if (!deployName || !selectedPlan || !selectedTemplate || !selectedZone || !selectedNetwork || !token) {
      alert("Please fill in all fields including network");
      return;
    }
    setDeployLoading(true);
    try {
      const params = new URLSearchParams({
        apiKey: csKeys.apiKey,
        secretKey: csKeys.secretKey,
        command: "deployVirtualMachine",
        response: "json",
        serviceofferingid: selectedPlan,
        templateid: selectedTemplate,
        zoneid: selectedZone,
        networkids: selectedNetwork,
        name: deployName,
        displayname: deployName,
      });
      const res = await fetch(`${API_BASE}/api/cloudstack-proxy?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.deployvirtualmachineresponse?.id) {
        alert(`VM "${deployName}" deployed successfully!`);
        setShowDeployModal(false);
        setDeployName("");
        loadCloudStackData();
      } else {
        alert("Deploy failed: " + JSON.stringify(data));
      }
    } catch (e) {
      alert("Deploy error: " + (e as Error).message);
    } finally {
      setDeployLoading(false);
    }
  };

  const handleCreateVolume = async () => {
    if (!volumeName || !volumeSize || !volumeZone || !token) {
      alert("Please fill in all fields");
      return;
    }
    setVolumeLoading(true);
    try {
      const params = new URLSearchParams({
        apiKey: csKeys.apiKey,
        secretKey: csKeys.secretKey,
        command: "createVolume",
        response: "json",
        name: volumeName,
        size: volumeSize.toString(),
        zoneid: volumeZone,
      });
      if (volumeDiskOffering) {
        params.append("diskofferingid", volumeDiskOffering);
      }
      const res = await fetch(`${API_BASE}/api/cloudstack-proxy?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.createvolumeresponse?.id || data.createvolumeresponse?.volume?.id) {
        alert(`Volume "${volumeName}" created successfully!`);
        setShowCreateVolumeModal(false);
        setVolumeName("");
        setVolumeSize(10);
        loadCloudStackData();
      } else {
        alert("Create volume failed: " + JSON.stringify(data));
      }
    } catch (e) {
      alert("Create volume error: " + (e as Error).message);
    } finally {
      setVolumeLoading(false);
    }
  };

  const handleDeployDB = async () => {
    if (!dbName || !dbPlan || !dbZone || !dbNetwork || !token) {
      alert("Please fill in all fields");
      return;
    }
    setDbLoading(true);
    try {
      // Use deployVirtualMachine with DB template (PostgreSQL/Ubuntu)
      const dbTemplate = deployTemplates.find((t: any) => t.name?.toLowerCase().includes("postgres") || t.ostypename?.toLowerCase().includes("ubuntu"));
      const params = new URLSearchParams({
        apiKey: csKeys.apiKey,
        secretKey: csKeys.secretKey,
        command: "deployVirtualMachine",
        response: "json",
        serviceofferingid: dbPlan,
        templateid: dbTemplate?.id || selectedTemplate,
        zoneid: dbZone,
        networkids: dbNetwork,
        name: dbName,
        displayname: dbName,
      });
      const res = await fetch(`${API_BASE}/api/cloudstack-proxy?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.deployvirtualmachineresponse?.id) {
        alert(`DB "${dbName}" deployed successfully!`);
        setShowDBModal(false);
        setDbName("");
        loadCloudStackData();
      } else {
        alert("DB deploy failed: " + JSON.stringify(data));
      }
    } catch (e) {
      alert("DB deploy error: " + (e as Error).message);
    } finally {
      setDbLoading(false);
    }
  };

  const switchSection = (name: string) => {
    setActiveSection(name);
  };

  // Fetch deploy options when modal opens
  useEffect(() => {
    if (!showDeployModal || !csKeys.apiKey || !token) return;
    const fetchOptions = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [plansRes, templatesRes, zonesRes, networksRes] = await Promise.all([
          fetch(`${API_BASE}/api/cloudstack-proxy?${new URLSearchParams({ apiKey: csKeys.apiKey, secretKey: csKeys.secretKey, command: "listServiceOfferings", response: "json" })}`, { headers }),
          fetch(`${API_BASE}/api/cloudstack-proxy?${new URLSearchParams({ apiKey: csKeys.apiKey, secretKey: csKeys.secretKey, command: "listTemplates", templatefilter: "featured", response: "json" })}`, { headers }),
          fetch(`${API_BASE}/api/cloudstack-proxy?${new URLSearchParams({ apiKey: csKeys.apiKey, secretKey: csKeys.secretKey, command: "listZones", response: "json" })}`, { headers }),
          fetch(`${API_BASE}/api/cloudstack-proxy?${new URLSearchParams({ apiKey: csKeys.apiKey, secretKey: csKeys.secretKey, command: "listNetworks", response: "json" })}`, { headers }),
        ]);
        const plans = await plansRes.json();
        const templates = await templatesRes.json();
        const zones = await zonesRes.json();
        const networks = await networksRes.json();
        if (plans.listserviceofferingsresponse?.serviceoffering) {
          setDeployPlans(plans.listserviceofferingsresponse.serviceoffering);
          setSelectedPlan(plans.listserviceofferingsresponse.serviceoffering[0]?.id || "");
        }
        if (templates.listtemplatesresponse?.template) {
          setDeployTemplates(templates.listtemplatesresponse.template);
          setSelectedTemplate(templates.listtemplatesresponse.template[0]?.id || "");
        }
        if (zones.listzonesresponse?.zone) {
          setDeployZones(zones.listzonesresponse.zone);
          setSelectedZone(zones.listzonesresponse.zone[0]?.id || "");
        }
        if (networks.listnetworksresponse?.network) {
          const usableNetworks = networks.listnetworksresponse.network.filter((n: any) => n.canusefordeploy === true);
          setDeployNetworks(usableNetworks);
          setSelectedNetwork(usableNetworks[0]?.id || "");
        }
      } catch (e) {
        console.error("Failed to fetch deploy options:", e);
      }
    };
    fetchOptions();
  }, [showDeployModal, csKeys, token]);
  const [vmFilter, setVmFilter] = useState("all");
  const filteredVMs = vmFilter === "all" ? csVMs : csVMs.filter((v: any) => v.state.toLowerCase() === vmFilter);
  const kpiTotal = csVMs.length;
  const kpiRunning = csVMs.filter((v: any) => v.state === "Running").length;
  const kpiStopped = csVMs.filter((v: any) => v.state === "Stopped").length;
  const kpiError = csVMs.filter((v: any) => v.state === "Error").length;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#07040f", color: "#e0e0ff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <div style={{ color: "#a78bfa" }}>Loading…</div>
        <button 
          onClick={() => setLoading(false)} 
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", color: "#e0aaff", cursor: "pointer" }}
        >
          Force Load Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07040f", color: "#e0e0ff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" }}>
      {/* Dot grid */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.5, backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

      {/* Sidebar */}
      <aside style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: "240px",
        background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.06)",
        zIndex: 40, display: "flex", flexDirection: "column",
        transform: sidebarOpen ? "translateX(0)" : undefined,
      }} className="sidebar">
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => router.push("/")}>
          <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#fff" }}>P</span>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>PromptCloud</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 8px 6px" }}>Compute</div>
          <NavItem label="Instances" code="MON" active={activeSection === "instances"} onClick={() => switchSection("instances")} />
          <NavItem label="Deploy VM" code="RKT" onClick={() => setShowDeployModal(true)} />
          <NavItem label="Managed DB" code="DB" active={activeSection === "db"} onClick={() => switchSection("db")} />
          <NavItem label="Storage" code="HD" active={activeSection === "storage"} onClick={() => switchSection("storage")} />

          <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 8px 6px" }}>Networking</div>
          <NavItem label="Networks" code="NET" active={activeSection === "networks"} onClick={() => switchSection("networks")} />
          <NavItem label="Firewall" code="SHD" active={activeSection === "firewall"} onClick={() => switchSection("firewall")} />

          <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 8px 6px" }}>Platform</div>
          <NavItem label="Marketplace" code="SHOP" active={activeSection === "marketplace"} onClick={() => switchSection("marketplace")} wip />
          <NavItem label="Subscriptions" code="PKG" active={activeSection === "subscriptions"} onClick={() => switchSection("subscriptions")} />

          <div style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 8px 6px" }}>Account</div>
          <NavItem label="Wallet" code="PAY" active={activeSection === "wallet"} onClick={() => switchSection("wallet")} />
          <NavItem label="KYC Verify" code="ID" active={activeSection === "kyc"} onClick={() => switchSection("kyc")} />
          <NavItem label="Billing" code="REC" active={activeSection === "billing"} onClick={() => switchSection("billing")} />
          <NavItem label="Referrals" code="GFT" active={activeSection === "referrals"} onClick={() => switchSection("referrals")} />
          <NavItem label="Analytics" code="BAR" active={activeSection === "analytics"} onClick={() => switchSection("analytics")} />
          <NavItem label="Support" code="MSG" active={activeSection === "support"} onClick={() => switchSection("support")} badge="3" />
          <NavItem label="Settings" code="SET" active={activeSection === "settings"} onClick={() => switchSection("settings")} />
          <NavItem label="Telegram Bot" code="TG" active={activeSection === "telegram"} onClick={() => switchSection("telegram")} />
        </div>

        <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#fff" }}>
            {user?.name?.[0] || "U"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#f0f0ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name || "User"}</div>
            <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ""}</div>
          </div>
          <button onClick={handleSignOut} style={{ background: "none", border: "none", color: "rgba(160,160,192,0.4)", fontSize: "11px", cursor: "pointer" }}>Sign out</button>
        </div>
      </aside>

      {/* Mobile sidebar toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: "fixed", top: "16px", left: "16px", zIndex: 50, display: "none" }} className="mobile-only">
        ☰
      </button>

      {/* Main area */}
      <div style={{ marginLeft: "240px", minHeight: "100vh", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header style={{ padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>
              {activeSection === "instances" && "Instances"}
              {activeSection === "storage" && "Storage"}
              {activeSection === "wallet" && "Wallet"}
              {activeSection === "analytics" && "Analytics"}
              {activeSection === "billing" && "Billing"}
              {activeSection === "settings" && "Settings"}
              {activeSection === "support" && "Support"}
              {activeSection === "kyc" && "KYC Verification"}
              {activeSection === "referrals" && "Referrals"}
              {activeSection === "telegram" && "Telegram Bot"}
              {activeSection === "marketplace" && "Marketplace"}
              {activeSection === "subscriptions" && "Subscriptions"}
              {activeSection === "db" && "Managed DB"}
              {activeSection === "networks" && "Networks"}
              {activeSection === "firewall" && "Firewall"}
            </h2>
            <p style={{ fontSize: "12px", color: "rgba(160,160,192,0.4)", margin: "4px 0 0" }}>
              {activeSection === "instances" && "Compute · live resources"}
              {activeSection === "wallet" && "Payments & transaction history"}
              {activeSection === "analytics" && "Usage & activity overview"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", color: "rgba(160,160,192,0.6)", cursor: "pointer" }}>Home</button>
            <button onClick={() => switchSection("settings")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", color: "rgba(160,160,192,0.6)", cursor: "pointer" }}>Settings</button>
          </div>
        </header>

        {/* Content */}
        <main style={{ padding: "24px 28px" }}>
          {activeSection === "instances" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                <KpiCard label="Total VMs" value={kpiTotal} />
                <KpiCard label="Running" value={kpiRunning} />
                <KpiCard label="Stopped" value={kpiStopped} color="white" />
                <KpiCard label="Live cost rate" value="₹0.00" />
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {[
                  { key: "all", label: "All", count: kpiTotal },
                  { key: "running", label: "Running", count: kpiRunning },
                  { key: "stopped", label: "Stopped", count: kpiStopped },
                  { key: "error", label: "Error", count: kpiError },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setVmFilter(f.key)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: vmFilter === f.key ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.03)",
                      color: vmFilter === f.key ? "#e0aaff" : "rgba(160,160,192,0.5)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden", marginBottom: "24px" }}>
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>Virtual Machines</h3>
                  <button onClick={loadCloudStackData} style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, color: "#e0aaff", cursor: "pointer" }}>↻ Refresh</button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Status</th>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Zone</th>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Spec</th>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>IP</th>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVMs.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "rgba(160,160,192,0.4)" }}>No VMs found. Click Deploy VM to create one.</td></tr>
                    ) : (
                      filteredVMs.map((vm: any) => (
                        <tr key={vm.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "12px 20px", fontSize: "13px", color: "#f0f0ff" }}>{vm.name || vm.displayname || "—"}</td>
                          <td style={{ padding: "12px 20px" }}>
                            <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: vm.state === "Running" ? "rgba(46,213,115,0.1)" : "rgba(255,71,87,0.1)", color: vm.state === "Running" ? "#2ed573" : "#ff4757", border: `1px solid ${vm.state === "Running" ? "rgba(46,213,115,0.2)" : "rgba(255,71,87,0.2)"}` }}>
                              {vm.state}
                            </span>
                          </td>
                          <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{vm.zonename || "—"}</td>
                          <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{vm.cpunumber} vCPU · {vm.memory / 1024}GB</td>
                          <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{vm.nic?.[0]?.ipaddress || "—"}</td>
                          <td style={{ padding: "12px 20px" }}>
                            <button onClick={() => setSelectedVM(vm)} style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", color: "#e0aaff", cursor: "pointer", marginRight: "4px" }}>Details</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: "16px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 4px" }}>Manage via Telegram</h4>
                  <p style={{ fontSize: "12px", color: "rgba(160,160,192,0.4)", margin: 0 }}>Deploy, stop, and monitor VMs from @PromptCloudBot.</p>
                </div>
                <button style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "12px", fontWeight: 600, color: "#fff", cursor: "pointer" }}>Open Bot</button>
              </div>
            </>
          )}

          {activeSection === "wallet" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 500, color: "rgba(160,160,192,0.5)", margin: "0 0 12px" }}>Wallet Balance</h3>
                  <div style={{ fontSize: "36px", fontWeight: 700, color: "#f0f0ff", marginBottom: "8px" }}>₹{balance.inr?.toFixed(2) || "0.00"}</div>
                  <div style={{ fontSize: "12px", color: "rgba(160,160,192,0.4)", marginBottom: "16px" }}>Top up to start deploying VMs</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleTopUp("razorpay")} style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "10px", padding: "10px 18px", fontSize: "12px", fontWeight: 600, color: "#fff", cursor: "pointer" }}>+ Top Up (Razorpay)</button>
                    <button onClick={() => handleTopUp("crypto")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 18px", fontSize: "12px", fontWeight: 600, color: "rgba(160,160,192,0.6)", cursor: "pointer" }}>Crypto</button>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "24px" }}>
                  <h3 style={{ fontSize: "13px", fontWeight: 500, color: "rgba(160,160,192,0.5)", margin: "0 0 12px" }}>This Month&apos;s Usage</h3>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "#f0f0ff", marginBottom: "8px" }}>₹0.00</div>
                  <div style={{ fontSize: "12px", color: "rgba(160,160,192,0.4)", marginBottom: "12px" }}>No usage yet</div>
                  <p style={{ fontSize: "12px", color: "rgba(160,160,192,0.4)", margin: 0 }}>Billing is per-second. Auto-stops if balance hits ₹0.</p>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>Transaction History</h3>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Date</th>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Description</th>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Method</th>
                      <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txHistory.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: "center", padding: "24px", color: "rgba(160,160,192,0.4)" }}>No transactions yet.</td></tr>
                    ) : (
                      txHistory.map((tx: any) => (
                        <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: "12px 20px", fontSize: "12px", color: "#f0f0ff" }}>{tx.description || "—"}</td>
                          <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{tx.method || "—"}</td>
                          <td style={{ padding: "12px 20px", fontSize: "12px", color: tx.type === "credit" || tx.type === "deposit" ? "#2ed573" : "#ff4757" }}>
                            {tx.type === "credit" || tx.type === "deposit" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeSection === "storage" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>Volumes</h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setShowCreateVolumeModal(true)} style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, color: "#fff", cursor: "pointer" }}>+ Create Volume</button>
                  <button onClick={loadCloudStackData} style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, color: "#e0aaff", cursor: "pointer" }}>↻ Refresh</button>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Volume</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Attached To</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Size</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {csVolumes.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "rgba(160,160,192,0.4)" }}>No volumes found.</td></tr>
                  ) : (
                    csVolumes.map((vol: any) => (
                      <tr key={vol.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "12px 20px", fontSize: "13px", color: "#f0f0ff" }}>{vol.name || "—"}</td>
                        <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{vol.vmname || "Detached"}</td>
                        <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{(vol.size / (1024**3)).toFixed(1)} GB</td>
                        <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{vol.type || "—"}</td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: vol.state === "Ready" ? "rgba(46,213,115,0.1)" : "rgba(255,165,0,0.1)", color: vol.state === "Ready" ? "#2ed573" : "#ffa500", border: `1px solid ${vol.state === "Ready" ? "rgba(46,213,115,0.2)" : "rgba(255,165,0,0.2)"}` }}>
                            {vol.state}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "analytics" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
                <KpiCard label="Running VMs" value={kpiRunning} />
                <KpiCard label="Stopped VMs" value={kpiStopped} color="white" />
                <KpiCard label="Total Volumes" value={csVolumes.length} />
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "28px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 20px" }}>VM Activity</h3>
                {csVMs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px", color: "rgba(160,160,192,0.4)" }}>No activity yet.</div>
                ) : (
                  csVMs.map((vm: any) => (
                    <div key={vm.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: vm.state === "Running" ? "#2ed573" : "#ff4757" }} />
                      <span style={{ fontSize: "13px", color: "#f0f0ff" }}>VM <strong>{vm.name}</strong> — {vm.state} in {vm.zonename || "unknown zone"}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeSection === "billing" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>Invoices</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Period</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>VMs</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Total</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "12px 20px", fontSize: "12px", color: "#f0f0ff" }}>Jun 2026 (current)</td>
                    <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>1</td>
                    <td style={{ padding: "12px 20px", fontSize: "12px", color: "#f0f0ff" }}>₹83.20</td>
                    <td style={{ padding: "12px 20px" }}><span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: "rgba(255,165,0,0.1)", color: "#ffa500", border: "1px solid rgba(255,165,0,0.2)" }}>In Progress</span></td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "12px 20px", fontSize: "12px", color: "#f0f0ff" }}>May 2026</td>
                    <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>1</td>
                    <td style={{ padding: "12px 20px", fontSize: "12px", color: "#f0f0ff" }}>₹142.80</td>
                    <td style={{ padding: "12px 20px" }}><span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: "rgba(46,213,115,0.1)", color: "#2ed573", border: "1px solid rgba(46,213,115,0.2)" }}>Paid</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "settings" && (
            <>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "28px", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 20px" }}>Profile</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "6px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Full Name</label>
                    <input type="text" defaultValue={user?.name || ""} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "6px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Email</label>
                    <input type="email" defaultValue={user?.email || ""} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
                  </div>
                </div>
                <button style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 22px", fontSize: "13px", color: "#f0f0ff", cursor: "pointer" }}>Save Changes</button>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "28px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 20px" }}>Change Password</h3>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "6px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Current Password</label>
                  <input type="password" placeholder="••••••••" style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "6px", letterSpacing: "0.07em", textTransform: "uppercase" }}>New Password</label>
                    <input type="password" placeholder="••••••••" style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "6px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Confirm New</label>
                    <input type="password" placeholder="••••••••" style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
                  </div>
                </div>
                <button style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 22px", fontSize: "13px", color: "#f0f0ff", cursor: "pointer" }}>Update Password</button>
              </div>
            </>
          )}

          {activeSection === "support" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "28px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 8px" }}>Support <span style={{ background: "#a855f7", color: "#fff", fontSize: "11px", padding: "2px 8px", borderRadius: "8px", marginLeft: "8px" }}>3 open</span></h3>
              <p style={{ fontSize: "13px", color: "rgba(160,160,192,0.4)", marginBottom: "24px" }}>Our team typically responds within 2 hours.</p>
              {[
                { title: "VM boot stuck on pending", id: "#1042", time: "2h ago" },
                { title: "UPI top-up not reflected", id: "#1039", time: "1d ago" },
              ].map((ticket) => (
                <div key={ticket.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", marginBottom: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>{ticket.title}</div>
                    <div style={{ fontSize: "11px", color: "rgba(160,160,192,0.4)", marginTop: "2px" }}>Ticket {ticket.id} · {ticket.time}</div>
                  </div>
                  <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: "rgba(255,165,0,0.1)", color: "#ffa500", border: "1px solid rgba(255,165,0,0.2)" }}>Open</span>
                </div>
              ))}
            </div>
          )}

          {activeSection === "kyc" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "32px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 8px" }}>KYC Verification</h3>
              <p style={{ fontSize: "13px", color: "rgba(160,160,192,0.4)", marginBottom: "24px" }}>Complete KYC to increase your wallet limits and unlock higher VM tiers.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ background: "rgba(46,213,115,0.06)", border: "1px solid rgba(46,213,115,0.2)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: "#2ed573", fontSize: "18px" }}>✓</span>
                  <span style={{ fontSize: "13px", color: "#f0f0ff" }}>Email verified</span>
                </div>
                <div style={{ background: "rgba(46,213,115,0.06)", border: "1px solid rgba(46,213,115,0.2)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: "#2ed573", fontSize: "18px" }}>✓</span>
                  <span style={{ fontSize: "13px", color: "#f0f0ff" }}>Phone verified</span>
                </div>
                <div style={{ background: "rgba(255,165,0,0.06)", border: "1px solid rgba(255,165,0,0.2)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#f0f0ff" }}>Government ID (Aadhaar / PAN)</span>
                  <button style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "8px", padding: "7px 16px", fontSize: "12px", color: "#fff", cursor: "pointer" }}>Upload</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "referrals" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "32px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 8px" }}>Referrals</h3>
              <p style={{ fontSize: "13px", color: "rgba(160,160,192,0.4)", marginBottom: "24px" }}>Invite friends and earn ₹50 wallet credit for each signup.</p>
              <div style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "20px" }}>
                <span style={{ fontFamily: "monospace", fontSize: "14px", color: "#00e5ff" }}>https://promptcloud.in/ref/{user?.name?.toLowerCase().replace(/\s/g, "") || "user"}</span>
                <button style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "8px", padding: "7px 16px", fontSize: "12px", color: "#fff", cursor: "pointer" }}>Copy</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <KpiCard label="Referrals made" value="0" />
                <KpiCard label="Credits earned" value="₹0" color="white" />
              </div>
            </div>
          )}

          {activeSection === "telegram" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "32px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 8px" }}>Telegram Bot Integration</h3>
              <p style={{ fontSize: "14px", color: "rgba(160,160,192,0.5)", marginBottom: "24px", maxWidth: "500px" }}>Deploy, stop, and monitor VMs by messaging @PromptCloudBot. Commands include /deploy, /list, /stop, /ssh, and /balance.</p>
              <div style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: "12px", padding: "20px", fontFamily: "monospace", fontSize: "13px", color: "#00e5ff", marginBottom: "24px" }}>
                <div style={{ marginBottom: "8px", color: "rgba(160,160,192,0.3)" }}># Example commands</div>
                <div>/deploy pro mumbai</div>
                <div>/list</div>
                <div>/stop {user?.name?.toLowerCase().replace(/\s/g, "")}-vm-01</div>
                <div>/balance</div>
                <div>/ssh {user?.name?.toLowerCase().replace(/\s/g, "")}-vm-01</div>
              </div>
              <button style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "12px", fontWeight: 600, color: "#fff", cursor: "pointer" }}>Open @PromptCloudBot</button>
            </div>
          )}

          {activeSection === "db" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>Managed Kubernetes Clusters</h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setShowDBModal(true)} style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "8px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, color: "#fff", cursor: "pointer" }}>+ Deploy DB VM</button>
                  <button onClick={loadCloudStackData} style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, color: "#e0aaff", cursor: "pointer" }}>↻ Refresh</button>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Cluster</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>State</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Nodes</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Version</th>
                    <th style={{ textAlign: "left", padding: "10px 20px", fontSize: "11px", fontWeight: 600, color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Endpoint</th>
                  </tr>
                </thead>
                <tbody>
                  {csDBs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "rgba(160,160,192,0.4)" }}>No clusters found. Deploy a VM and install your database.</td></tr>
                  ) : (
                    csDBs.map((db: any) => (
                      <tr key={db.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "12px 20px", fontSize: "13px", color: "#f0f0ff" }}>{db.name || "—"}</td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: db.state === "Running" ? "rgba(46,213,115,0.1)" : "rgba(255,71,87,0.1)", color: db.state === "Running" ? "#2ed573" : "#ff4757", border: `1px solid ${db.state === "Running" ? "rgba(46,213,115,0.2)" : "rgba(255,71,87,0.2)"}` }}>
                            {db.state}
                          </span>
                        </td>
                        <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{db.noderootdisksize || "—"} GB root</td>
                        <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{db.kubernetesversionname || "—"}</td>
                        <td style={{ padding: "12px 20px", fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{db.endpoint || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "networks" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "48px", textAlign: "center" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 8px" }}>Networks</h3>
              <p style={{ fontSize: "14px", color: "rgba(160,160,192,0.4)" }}>Network management coming soon.</p>
            </div>
          )}

          {activeSection === "firewall" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "48px", textAlign: "center" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 8px" }}>Firewall Rules</h3>
              <p style={{ fontSize: "14px", color: "rgba(160,160,192,0.4)" }}>Firewall management coming soon.</p>
            </div>
          )}

          {activeSection === "marketplace" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "48px", textAlign: "center" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 8px" }}>Marketplace <span style={{ background: "rgba(255,165,0,0.2)", color: "#ffa500", fontSize: "11px", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px" }}>WIP</span></h3>
              <p style={{ fontSize: "14px", color: "rgba(160,160,192,0.4)" }}>One-click app deployments coming soon.</p>
            </div>
          )}

          {activeSection === "subscriptions" && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "48px", textAlign: "center" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: "0 0 8px" }}>Subscriptions</h3>
              <p style={{ fontSize: "14px", color: "rgba(160,160,192,0.4)" }}>Manage your active plans and subscriptions.</p>
            </div>
          )}
        </main>
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => setShowDeployModal(false)}>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", maxWidth: "800px", width: "90%", maxHeight: "90vh", overflowY: "auto", display: "flex" }} onClick={(e) => e.stopPropagation()}>
            {/* Left: Form */}
            <div style={{ flex: 1, padding: "28px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>Deploy a New VM</h3>
                <button onClick={() => setShowDeployModal(false)} style={{ background: "none", border: "none", color: "rgba(160,160,192,0.5)", fontSize: "20px", cursor: "pointer" }}>×</button>
              </div>
              <p style={{ fontSize: "13px", color: "rgba(160,160,192,0.4)", marginBottom: "20px" }}>Fetches live plans and regions from CloudStack.</p>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>VM Name</label>
                <input type="text" placeholder="e.g. my-server" value={deployName} onChange={(e) => setDeployName(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Plan</label>
                <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }}>
                  {deployPlans.map((p: any, i: number) => <option key={p.id + '-' + i} value={p.id}>{p.name} ({p.cpunumber} vCPU · {p.memory / 1024}GB)</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>OS Template</label>
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }}>
                  {deployTemplates.map((t: any, i: number) => <option key={t.id + '-' + i} value={t.id}>{t.name} ({t.ostypename || t.hypervisor})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Zone</label>
                <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }}>
                  {deployZones.map((z: any, i: number) => <option key={z.id + '-' + i} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Network</label>
                <select value={selectedNetwork} onChange={(e) => setSelectedNetwork(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }}>
                  {deployNetworks.map((n: any, i: number) => <option key={n.id + '-' + i} value={n.id}>{n.name} ({n.type})</option>)}
                </select>
              </div>
              <button onClick={handleDeploy} disabled={deployLoading || balance.inr < (() => {
                const plan = deployPlans.find((p: any) => p.id === selectedPlan);
                return plan ? calculateCost(plan.cpunumber || 1, plan.memory || 1024, plan.rootdisksize || 10).hourly : 0;
              })()} style={{ width: "100%", height: "48px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, color: "#fff", cursor: "pointer", opacity: deployLoading ? 0.6 : 1 }}>
                {deployLoading ? "Deploying..." : "🚀 Deploy Now"}
              </button>
              {(() => {
                const plan = deployPlans.find((p: any) => p.id === selectedPlan);
                const cost = plan ? calculateCost(plan.cpunumber || 1, plan.memory || 1024, plan.rootdisksize || 10).hourly : 0;
                if (balance.inr < cost) {
                  return (
                    <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: "10px", fontSize: "12px", color: "#ff4757" }}>
                      ⚠️ Insufficient funds. Need ₹{cost.toFixed(2)}. Your balance: ₹{balance.inr.toFixed(2)}.
                      <a href="/wallet" style={{ color: "#a78bfa", textDecoration: "underline" }}>Top up →</a>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Right: Pricing Summary */}
            {(() => {
              const plan = deployPlans.find((p: any) => p.id === selectedPlan);
              const zone = deployZones.find((z: any) => z.id === selectedZone);
              const tpl = deployTemplates.find((t: any) => t.id === selectedTemplate);
              const cost = plan ? calculateCost(plan.cpunumber || 1, plan.memory || 1024, plan.rootdisksize || 10) : null;
              return (
                <div style={{ width: "260px", padding: "28px", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "rgba(160,160,192,0.5)", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Summary</h4>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Region</div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>{zone?.name || '—'}</div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Size</div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>{plan ? `${plan.name} · ${plan.cpunumber}vCPU` : '—'}</div>
                    <div style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{plan ? `${(plan.memory / 1024).toFixed(1)}GB RAM · ${plan.rootdisksize || 10}GB Disk` : ''}</div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>OS</div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>{tpl?.name || tpl?.displaytext || '—'}</div>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px", marginTop: "auto" }}>
                    {cost && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Per second</span>
                          <span style={{ fontSize: "12px", color: "#f0f0ff" }}>₹{cost.perSecond.toFixed(4)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Per hour</span>
                          <span style={{ fontSize: "12px", color: "#f0f0ff", fontWeight: 600 }}>₹{cost.hourly.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                          <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Est. monthly</span>
                          <span style={{ fontSize: "14px", color: "#a78bfa", fontWeight: 700 }}>₹{Math.round(cost.monthly).toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(160,160,192,0.35)", lineHeight: 1.5 }}>
                          Pay only for what you use. Billing stops on destroy.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VM Details Modal */}
      {selectedVM && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => setSelectedVM(null)}>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "28px", maxWidth: "520px", width: "90%", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>{selectedVM.name || selectedVM.displayname || "VM Details"}</h3>
              <button onClick={() => setSelectedVM(null)} style={{ background: "none", border: "none", color: "rgba(160,160,192,0.5)", fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <DetailItem label="ID" value={selectedVM.id} />
              <DetailItem label="Status" value={selectedVM.state} />
              <DetailItem label="Zone" value={selectedVM.zonename} />
              <DetailItem label="Template" value={selectedVM.templatename || selectedVM.templateid} />
              <DetailItem label="vCPUs" value={selectedVM.cpunumber} />
              <DetailItem label="Memory" value={`${selectedVM.memory / 1024} GB`} />
              <DetailItem label="Hypervisor" value={selectedVM.hypervisor} />
              <DetailItem label="Created" value={new Date(selectedVM.created).toLocaleString()} />
            </div>

            <h4 style={{ fontSize: "13px", fontWeight: 600, color: "rgba(160,160,192,0.5)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Network Interfaces</h4>
            {selectedVM.nic?.map((nic: any, i: number) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px", marginBottom: "8px" }}>
                <div style={{ fontSize: "12px", color: "#f0f0ff", marginBottom: "4px" }}>{nic.ipaddress || "No IP"} <span style={{ color: "rgba(160,160,192,0.4)" }}>({nic.type || "NIC"})</span></div>
                <div style={{ fontSize: "11px", color: "rgba(160,160,192,0.4)" }}>MAC: {nic.macaddress || "—"} · Gateway: {nic.gateway || "—"} · Netmask: {nic.netmask || "—"}</div>
              </div>
            )) || <div style={{ fontSize: "12px", color: "rgba(160,160,192,0.4)", padding: "8px 0" }}>No network interfaces.</div>}
          </div>
        </div>
      )}

      {/* Create Volume Modal */}
      {showCreateVolumeModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => setShowCreateVolumeModal(false)}>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", maxWidth: "800px", width: "90%", maxHeight: "90vh", overflowY: "auto", display: "flex" }} onClick={(e) => e.stopPropagation()}>
            {/* Left: Form */}
            <div style={{ flex: 1, padding: "28px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>Create Volume</h3>
                <button onClick={() => setShowCreateVolumeModal(false)} style={{ background: "none", border: "none", color: "rgba(160,160,192,0.5)", fontSize: "20px", cursor: "pointer" }}>×</button>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Volume Name</label>
                <input type="text" placeholder="e.g. data-disk" value={volumeName} onChange={(e) => setVolumeName(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Size (GB)</label>
                <input type="number" min="1" max="1024" value={volumeSize} onChange={(e) => setVolumeSize(parseInt(e.target.value) || 10)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Zone</label>
                <select value={volumeZone} onChange={(e) => setVolumeZone(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }}>
                  <option value="">Select zone</option>
                  {deployZones.map((z: any, i: number) => <option key={z.id + '-' + i} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <button onClick={handleCreateVolume} disabled={volumeLoading || balance.inr < (volumeSize * PRICING.storage_per_gb_hour * 24)} style={{ width: "100%", height: "48px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, color: "#fff", cursor: "pointer", opacity: volumeLoading ? 0.6 : 1 }}>
                {volumeLoading ? "Creating..." : "Create Volume"}
              </button>
              {balance.inr < (volumeSize * PRICING.storage_per_gb_hour * 24) && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: "10px", fontSize: "12px", color: "#ff4757" }}>
                  ⚠️ Insufficient funds. Need ₹{(volumeSize * PRICING.storage_per_gb_hour * 24).toFixed(2)}. Your balance: ₹{balance.inr.toFixed(2)}.
                  <a href="/wallet" style={{ color: "#a78bfa", textDecoration: "underline" }}>Top up →</a>
                </div>
              )}
            </div>

            {/* Right: Pricing Summary */}
            {(() => {
              const zone = deployZones.find((z: any) => z.id === volumeZone);
              const cost = calculateCost(0, 0, volumeSize);
              return (
                <div style={{ width: "260px", padding: "28px", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "rgba(160,160,192,0.5)", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Summary</h4>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Region</div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>{zone?.name || '—'}</div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Volume</div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>{volumeName || '—'}</div>
                    <div style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{volumeSize}GB Block Storage</div>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px", marginTop: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Per second</span>
                      <span style={{ fontSize: "12px", color: "#f0f0ff" }}>₹{cost.perSecond.toFixed(4)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Per hour</span>
                      <span style={{ fontSize: "12px", color: "#f0f0ff", fontWeight: 600 }}>₹{cost.hourly.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Est. monthly</span>
                      <span style={{ fontSize: "14px", color: "#a78bfa", fontWeight: 700 }}>₹{Math.round(cost.monthly).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "rgba(160,160,192,0.35)", lineHeight: 1.5 }}>
                      Pay only for what you use. Billing stops on destroy.
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* DB Deploy Modal */}
      {showDBModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => setShowDBModal(false)}>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", maxWidth: "800px", width: "90%", maxHeight: "90vh", overflowY: "auto", display: "flex" }} onClick={(e) => e.stopPropagation()}>
            {/* Left: Form */}
            <div style={{ flex: 1, padding: "28px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#f0f0ff", margin: 0 }}>Deploy Managed DB</h3>
                <button onClick={() => setShowDBModal(false)} style={{ background: "none", border: "none", color: "rgba(160,160,192,0.5)", fontSize: "20px", cursor: "pointer" }}>×</button>
              </div>
              <p style={{ fontSize: "13px", color: "rgba(160,160,192,0.4)", marginBottom: "20px" }}>Deploy a PostgreSQL database VM with managed backups.</p>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>DB Name</label>
                <input type="text" placeholder="e.g. my-db" value={dbName} onChange={(e) => setDbName(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Plan</label>
                <select value={dbPlan} onChange={(e) => setDbPlan(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }}>
                  {deployPlans.map((p: any, i: number) => <option key={p.id + '-' + i} value={p.id}>{p.name} ({p.cpunumber} vCPU · {p.memory / 1024}GB)</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Zone</label>
                <select value={dbZone} onChange={(e) => setDbZone(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }}>
                  {deployZones.map((z: any, i: number) => <option key={z.id + '-' + i} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: "8px", letterSpacing: "0.07em", textTransform: "uppercase" }}>Network</label>
                <select value={dbNetwork} onChange={(e) => setDbNetwork(e.target.value)} style={{ width: "100%", height: "46px", padding: "0 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "13px", color: "#fff", outline: "none" }}>
                  {deployNetworks.map((n: any, i: number) => <option key={n.id + '-' + i} value={n.id}>{n.name} ({n.type})</option>)}
                </select>
              </div>
              <button onClick={handleDeployDB} disabled={dbLoading || balance.inr < (() => {
                const plan = deployPlans.find((p: any) => p.id === dbPlan);
                return plan ? calculateCost(plan.cpunumber || 1, plan.memory || 1024, plan.rootdisksize || 10).hourly * 1.5 : 0;
              })()} style={{ width: "100%", height: "48px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, color: "#fff", cursor: "pointer", opacity: dbLoading ? 0.6 : 1 }}>
                {dbLoading ? "Deploying..." : "Deploy DB"}
              </button>
              {(() => {
                const plan = deployPlans.find((p: any) => p.id === dbPlan);
                const cost = plan ? calculateCost(plan.cpunumber || 1, plan.memory || 1024, plan.rootdisksize || 10).hourly * 1.5 : 0;
                if (balance.inr < cost) {
                  return (
                    <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: "10px", fontSize: "12px", color: "#ff4757" }}>
                      ⚠️ Insufficient funds. Need ₹{cost.toFixed(2)}. Your balance: ₹{balance.inr.toFixed(2)}.
                      <a href="/wallet" style={{ color: "#a78bfa", textDecoration: "underline" }}>Top up →</a>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Right: Pricing Summary */}
            {(() => {
              const plan = deployPlans.find((p: any) => p.id === dbPlan);
              const zone = deployZones.find((z: any) => z.id === dbZone);
              const baseCost = plan ? calculateCost(plan.cpunumber || 1, plan.memory || 1024, plan.rootdisksize || 10) : null;
              const cost = baseCost ? { ...baseCost, hourly: baseCost.hourly * 1.5, perSecond: baseCost.perSecond * 1.5, monthly: baseCost.monthly * 1.5 } : null;
              return (
                <div style={{ width: "260px", padding: "28px", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column" }}>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "rgba(160,160,192,0.5)", margin: "0 0 20px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Summary</h4>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Region</div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>{zone?.name || '—'}</div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Plan</div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>{plan ? `${plan.name} · ${plan.cpunumber}vCPU` : '—'}</div>
                    <div style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>{plan ? `${(plan.memory / 1024).toFixed(1)}GB RAM · ${plan.rootdisksize || 10}GB Disk` : ''}</div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>Database</div>
                    <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500 }}>PostgreSQL 15</div>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px", marginTop: "auto" }}>
                    {cost && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Per second</span>
                          <span style={{ fontSize: "12px", color: "#f0f0ff" }}>₹{cost.perSecond.toFixed(4)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Per hour</span>
                          <span style={{ fontSize: "12px", color: "#f0f0ff", fontWeight: 600 }}>₹{cost.hourly.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                          <span style={{ fontSize: "12px", color: "rgba(160,160,192,0.5)" }}>Est. monthly</span>
                          <span style={{ fontSize: "14px", color: "#a78bfa", fontWeight: 700 }}>₹{Math.round(cost.monthly).toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(160,160,192,0.35)", lineHeight: 1.5 }}>
                          DB premium applied (1.5x). Billing stops on destroy.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: any) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px 14px" }}>
      <div style={{ fontSize: "10px", color: "rgba(160,160,192,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#f0f0ff", fontWeight: 500, wordBreak: "break-all" }}>{value || "—"}</div>
    </div>
  );
}

function NavItem({ label, code, active, onClick, wip, badge }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px",
        borderRadius: "10px", border: "none", background: active ? "rgba(124,58,237,0.2)" : "transparent",
        color: active ? "#e0aaff" : "rgba(160,160,192,0.6)", fontSize: "12px", fontWeight: 500,
        cursor: "pointer", marginBottom: "2px", textAlign: "left",
      }}
    >
      <span style={{ fontSize: "10px", fontWeight: 700, color: active ? "#a855f7" : "rgba(160,160,192,0.3)", minWidth: "28px" }}>{code}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {wip && <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,165,0,0.15)", color: "#ffa500" }}>WIP</span>}
      {badge && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "8px", background: "#ff4757", color: "#fff" }}>{badge}</span>}
    </button>
  );
}

function KpiCard({ label, value, color }: any) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px 20px" }}>
      <div style={{ fontSize: "20px", fontWeight: 700, color: color === "white" ? "#f0f0ff" : "#a78bfa", marginBottom: "8px" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "rgba(160,160,192,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
    </div>
  );
}

