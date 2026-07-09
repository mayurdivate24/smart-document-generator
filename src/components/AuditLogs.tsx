/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { ShieldCheck, Info, User, Shield, Search } from "lucide-react";
import { api } from "../lib/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api.getAuditLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((log) => {
    return (
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          Security Audit Trails
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Read-only, chronological transaction history records for compliance and access oversight.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search audit records by action, user or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs font-bold text-gray-400 shrink-0">
          Total Logs: {filteredLogs.length} entries
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">Querying security records...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-white dark:bg-gray-800">
          <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <p className="text-sm font-medium text-gray-500 mt-2">No audit logs found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 dark:bg-gray-900/30">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-4">Action</th>
                  <th className="py-4 px-4">User Details</th>
                  <th className="py-4 px-6">Activity Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition">
                    <td className="py-4 px-6 text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {(() => {
                        const d = new Date(log.timestamp);
                        if (isNaN(d.getTime())) return "Invalid Date";
                        const day = String(d.getDate()).padStart(2, "0");
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const year = d.getFullYear();
                        const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                        return `${day}-${month}-${year} ${time}`;
                      })()}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold">
                      <span
                        className={`px-2.5 py-0.5 rounded-md ${
                          log.action.includes("LOGIN")
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                            : log.action.includes("UPLOAD")
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : log.action.includes("DELETE")
                            ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-500">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{log.userName}</div>
                          <div className="text-[10px] text-gray-400">{log.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-2xl flex gap-3 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-100/10">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Security guidelines mandate that audit trail transaction records are completely read-only. Deleting or altering active audit files from the dashboard is strictly barred to ensure perfect compliance.
        </p>
      </div>
    </div>
  );
}
