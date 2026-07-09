/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import {
  FileText,
  FileSpreadsheet,
  Layers,
  Calendar,
  Sparkles,
  Upload,
  History,
  Settings,
  Database as DbIcon,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDashboardStats()
      .then((data) => {
        setStats(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard stats load failed:", err);
        // Only set error message if it's NOT a 401 (since 401 will automatically trigger session expiration redirect)
        if (err.message !== "Session expired. Please login again.") {
          setError("Unable to retrieve live statistics. Showing default values.");
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assembling your workspace dashboard...</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Templates",
      value: stats?.totalTemplates || 0,
      icon: FileSpreadsheet,
      desc: "Pre-configured smart forms",
      color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    },
    {
      title: "Generated Today",
      value: stats?.generatedToday || 0,
      icon: Sparkles,
      desc: "Replaced and downloaded today",
      color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    },
    {
      title: "Generated This Month",
      value: stats?.generatedThisMonth || 0,
      icon: FileText,
      desc: "Monthly total output",
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    },
  ];

  return (
    <div id="dashboard-root" className="space-y-8">
      {error && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 text-sm text-amber-800 dark:text-amber-300">
          <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <span className="font-bold text-xs font-mono">!</span>
          </div>
          <div>
            <p className="font-bold text-xs uppercase tracking-wider">Dashboard Sync Warning</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-blue-950/10"
      >
        <div className="relative z-10 max-w-2xl">
          <span className="bg-white/15 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 inline-block backdrop-blur-md">
            Smart Document Automation
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Simplify enterprise workflows.
          </h1>
          <p className="text-blue-100 text-sm md:text-base leading-relaxed">
            Upload custom Word templates, automatically map placeholders, and instantly compile flawless DOCX and PDF files with absolute design integrity.
          </p>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/3 bg-radial from-blue-400/20 to-transparent pointer-events-none rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-5"
            >
              <div className={`p-4 rounded-2xl ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {card.title}
                </p>
                <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight mt-1">
                  {card.value}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => onNavigate("generator")}
              className="group p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-200 dark:hover:border-blue-900 text-left transition duration-200 flex flex-col justify-between"
            >
              <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl w-fit">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Generate Document
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select a pre-defined template to load the smart form and replace fields.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mt-4 group-hover:translate-x-1 transition-transform">
                Start generator <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            <button
              onClick={() => onNavigate("templates")}
              className="group p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-emerald-200 dark:hover:border-emerald-900 text-left transition duration-200 flex flex-col justify-between"
            >
              <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl w-fit">
                <Upload className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="font-bold text-gray-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Upload Word Template
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload a standard .docx file. Our engine scans and registers placeholders.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-4 group-hover:translate-x-1 transition-transform">
                Upload template <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            <button
              onClick={() => onNavigate("history")}
              className="group p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-amber-200 dark:hover:border-amber-900 text-left transition duration-200 flex flex-col justify-between"
            >
              <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-xl w-fit">
                <History className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="font-bold text-gray-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Document History
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Access and search previous compiled documents, download Word or PDF.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-4 group-hover:translate-x-1 transition-transform">
                View logs <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            <button
              onClick={() => onNavigate("dropdowns")}
              className="group p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900 text-left transition duration-200 flex flex-col justify-between"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl w-fit">
                <DbIcon className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="font-bold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Dropdown Master Data
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Create reusable option groups (e.g. state list) to map into placeholders.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-4 group-hover:translate-x-1 transition-transform">
                Manage dropdowns <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity Sidebar */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-gray-800 dark:text-white text-lg flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Recent Documents
            </h3>
            <div className="space-y-4">
              {stats?.recentDocuments && stats.recentDocuments.length > 0 ? (
                stats.recentDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex justify-between items-start border-b border-gray-50 dark:border-gray-700/50 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {doc.documentNumber}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{doc.templateName}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                      {(() => {
                        const d = new Date(doc.createdAt);
                        if (isNaN(d.getTime())) return "Invalid Date";
                        const day = String(d.getDate()).padStart(2, "0");
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const year = d.getFullYear();
                        return `${day}-${month}-${year}`;
                      })()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-xs text-gray-400">
                  <p>No documents generated yet.</p>
                  <button
                    onClick={() => onNavigate("generator")}
                    className="text-blue-600 font-bold mt-2 hover:underline"
                  >
                    Generate your first document now
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 border-t pt-4 border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs">
            <span className="text-gray-400">Quick Settings</span>
            <button
              onClick={() => onNavigate("settings")}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition duration-150"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
