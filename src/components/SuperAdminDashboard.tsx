import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Firm } from "../types";
import { 
  Building, 
  CheckCircle, 
  XCircle, 
  Award, 
  Layers, 
  TrendingUp, 
  AlertCircle, 
  Settings, 
  UserPlus, 
  FolderPlus,
  RefreshCw,
  Search,
  Filter,
  BarChart2,
  Trash2,
  Activity,
  User,
  ExternalLink,
  ShieldAlert,
  Sliders,
  DollarSign
} from "lucide-react";

export function SuperAdminDashboard() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [firmsList, systemStats] = await Promise.all([
        api.getSuperAdminFirms(),
        api.getSuperAdminStats()
      ]);
      setFirms(firmsList);
      setStats(systemStats);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to load superadmin data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (firmId: string, currentStatus: string) => {
    setActionLoading(firmId);
    setMessage(null);
    const newStatus = currentStatus === "disabled" ? "active" : "disabled";
    try {
      await api.updateSuperAdminFirm(firmId, { status: newStatus });
      setMessage({ text: `Firm status updated successfully to ${newStatus}.`, type: "success" });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update firm status.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePlan = async (firmId: string, newPlan: string) => {
    setActionLoading(`${firmId}-plan`);
    setMessage(null);
    try {
      await api.updateSuperAdminFirm(firmId, { plan: newPlan as any });
      setMessage({ text: `Firm subscription plan updated to ${newPlan}.`, type: "success" });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update firm plan.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredFirms = firms.filter(firm => {
    const matchesSearch = 
      firm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (firm.id && firm.id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || firm.status === statusFilter;
    const matchesPlan = planFilter === "all" || firm.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-900 text-white p-6 rounded-3xl shadow-xl shadow-indigo-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-indigo-800 rounded-full opacity-40 blur-3xl pointer-events-none"></div>
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-800/60 border border-indigo-700 rounded-full text-[10px] font-bold tracking-widest uppercase">
            🛡️ Super Administration Mode
          </div>
          <h2 className="text-3xl font-black tracking-tight">System Control Center</h2>
          <p className="text-xs text-indigo-200 font-medium">
            Global monitoring of all registered firms, tenant state verification, and infrastructure status.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="relative z-10 inline-flex items-center gap-2 px-4 py-2 bg-indigo-800 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
          message.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400" 
            : "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/50 text-red-800 dark:text-red-400"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
          <p className="text-xs font-semibold leading-relaxed">{message.text}</p>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Organizations</p>
            <h3 className="text-2xl font-black mt-0.5 text-gray-900 dark:text-white">
              {loading ? "..." : firms.length}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Tenants</p>
            <h3 className="text-2xl font-black mt-0.5 text-gray-900 dark:text-white">
              {loading ? "..." : firms.filter(f => f.status !== "disabled").length}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Disabled Tenants</p>
            <h3 className="text-2xl font-black mt-0.5 text-gray-900 dark:text-white">
              {loading ? "..." : firms.filter(f => f.status === "disabled").length}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Templates / Docs</p>
            <h3 className="text-2xl font-black mt-0.5 text-gray-900 dark:text-white">
              {loading || !stats ? "..." : `${stats.totalTemplates} / ${stats.totalDocuments}`}
            </h3>
          </div>
        </div>
      </div>

      {/* System Health Check Panel */}
      {stats && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">System Infrastructure Status</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">Node Environment</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-white mt-1 block">
                {stats.env}
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">Platform Database</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {stats.databaseType}
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">Server Memory</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-white mt-1 block">
                {stats.memoryUsage}
              </span>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
              <span className="text-[10px] font-bold text-gray-400 block uppercase">System Uptime</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-white mt-1 block">
                {stats.uptime}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Tenant Management Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
        {/* Header and Controls */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Tenant Registry Directory</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Verify, change plans, enable or disable multi-tenant firm workspaces.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search firm, email, id..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-950 dark:text-white focus:outline-none focus:border-indigo-500 w-56"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-gray-50 dark:bg-gray-950 px-2 py-1 rounded-xl border border-gray-200/50 dark:border-gray-800">
              <Filter className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none py-1 pr-4 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
                <option value="pending_verification">Pending Verify</option>
              </select>
            </div>

            {/* Plan Filter */}
            <div className="flex items-center bg-gray-50 dark:bg-gray-950 px-2 py-1 rounded-xl border border-gray-200/50 dark:border-gray-800">
              <Sliders className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none py-1 pr-4 font-semibold text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                <option value="all">All Plans</option>
                <option value="free_trial">Free Trial</option>
                <option value="basic">Basic Plan</option>
                <option value="pro">Pro Plan</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Firms Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-xs font-semibold">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Fetching tenant registrations...
            </div>
          ) : filteredFirms.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs font-semibold">
              🚫 No tenant organizations match the current filters.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Organization Name</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tenant ID</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Details</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan Level</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filteredFirms.map((firm) => (
                  <tr key={firm.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/10 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                          {firm.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white">{firm.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Registered {new Date(firm.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                      {firm.id}
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-gray-700 dark:text-gray-300 font-semibold">{firm.email}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{firm.mobile || "No Mobile"}</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={firm.plan}
                        onChange={(e) => handleChangePlan(firm.id, e.target.value)}
                        disabled={actionLoading === `${firm.id}-plan`}
                        className="text-[11px] font-bold bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer text-gray-800 dark:text-gray-200"
                      >
                        <option value="free_trial">🎨 Free Trial</option>
                        <option value="basic">⚙️ Basic</option>
                        <option value="pro">🚀 Pro</option>
                        <option value="enterprise">🏢 Enterprise</option>
                      </select>
                    </td>
                    <td className="p-4">
                      {firm.status === "disabled" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-full">
                          <XCircle className="w-3 h-3" /> Disabled
                        </span>
                      ) : firm.status === "pending_verification" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">
                          <AlertCircle className="w-3 h-3" /> Pending Verify
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(firm.id, firm.status)}
                        disabled={actionLoading === firm.id}
                        className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-[10px] font-bold transition cursor-pointer disabled:opacity-50 ${
                          firm.status === "disabled"
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                            : "bg-red-500 hover:bg-red-600 text-white shadow-sm"
                        }`}
                      >
                        {actionLoading === firm.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : firm.status === "disabled" ? (
                          <>Enable Firm</>
                        ) : (
                          <>Disable Firm</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
