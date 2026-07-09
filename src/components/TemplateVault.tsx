/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  FileSpreadsheet,
  Search,
  Download,
  Settings2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Folder,
  SlidersHorizontal,
  Plus,
  Archive
} from "lucide-react";
import { api } from "../lib/api";

interface TemplateVaultProps {
  onEditTemplate: (templateId: string) => void;
  onNavigateToUpload: () => void;
}

export default function TemplateVault({ onEditTemplate, onNavigateToUpload }: TemplateVaultProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  // Template to delete confirmation state
  const [templateToDelete, setTemplateToDelete] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
    const flash = localStorage.getItem("sdg_vault_success");
    if (flash) {
      setSuccess(flash);
      localStorage.removeItem("sdg_vault_success");
    }
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.getTemplates(), api.getCategories()])
      .then(([tpls, cats]) => {
        setTemplates(tpls);
        setCategories(cats);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to retrieve templates from vault.");
      })
      .finally(() => setLoading(false));
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : "Uncategorized";
  };

  const getFileType = (filePath: string) => {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") return "excel";
    return "word";
  };

  const handleDeleteTemplate = () => {
    if (!templateToDelete) return;
    const { id, name } = templateToDelete;
    setTemplateToDelete(null);
    setError("");
    setSuccess("");

    api.deleteTemplate(id)
      .then(() => {
        setSuccess(`Template "${name}" has been permanently deleted.`);
        fetchData();
      })
      .catch((err) => {
        setError(err.message || "Failed to delete template.");
      });
  };

  // Filter logic
  const filteredTemplates = templates.filter((tpl) => {
    // Search query matching name/description
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.description && tpl.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter matching
    const matchesCategory = selectedCategory === "all" || tpl.categoryId === selectedCategory;

    // File type filter matching
    const fileType = getFileType(tpl.filePath);
    const matchesFileType = selectedFileType === "all" || fileType === selectedFileType;

    // Archive state matching
    const matchesArchive = showArchived ? tpl.isArchived : !tpl.isArchived;

    return matchesSearch && matchesCategory && matchesFileType && matchesArchive;
  });

  // Count metrics
  const totalCount = templates.length;
  const wordCount = templates.filter((t) => getFileType(t.filePath) === "word").length;
  const excelCount = templates.filter((t) => getFileType(t.filePath) === "excel").length;
  const archivedCount = templates.filter((t) => t.isArchived).length;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            Template Vault
          </h1>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
            Manage your master Word and Excel files, customize active input forms, and archive outdated templates.
          </p>
        </div>
        <button
          onClick={onNavigateToUpload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/15 cursor-pointer transition duration-150 shrink-0"
        >
          <Plus className="w-4 h-4" /> Upload New Template
        </button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Templates</p>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Word Templates</p>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-1.5">
            <span className="text-blue-500">📄</span> {wordCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Excel Templates</p>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-1.5">
            <span className="text-emerald-500">📊</span> {excelCount}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Archived</p>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-1.5">
            <span className="text-purple-500">📦</span> {archivedCount}
          </p>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold items-center">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-800/30 flex gap-2.5 text-xs text-red-600 dark:text-red-400 font-semibold items-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto gap-2">
          {/* CATEGORY FILTER */}
          <div className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <Folder className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-transparent dark:text-white border-none focus:outline-none focus:ring-0 pr-6 pl-1 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* FILE TYPE FILTER */}
          <div className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              className="text-xs bg-transparent dark:text-white border-none focus:outline-none focus:ring-0 pr-6 pl-1 cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="word">Word Templates (.docx)</option>
              <option value="excel">Excel Templates (.xlsx, .xls)</option>
            </select>
          </div>

          {/* TOGGLE ARCHIVED BUTTON */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-xl transition cursor-pointer ${
              showArchived
                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900"
                : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700 hover:text-gray-700 dark:hover:text-white"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? "Viewing Archived" : "Show Archived"}
          </button>
        </div>
      </div>

      {/* TEMPLATE LIST CARDS */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Retrieving Vault Assets...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 rounded-full w-fit mx-auto">
            <Folder className="w-10 h-10" />
          </div>
          <div className="max-w-xs mx-auto space-y-1">
            <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">No Templates Found</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              We couldn't find any templates matching your filters in this vault view.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedFileType("all");
              setShowArchived(false);
            }}
            className="text-xs text-blue-600 dark:text-blue-400 font-extrabold hover:underline"
          >
            Reset Vault Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((tpl) => {
            const fileType = getFileType(tpl.filePath);
            const isTplExcel = fileType === "excel";
            return (
              <div
                key={tpl.id}
                className={`relative flex flex-col justify-between bg-white dark:bg-gray-800 border rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 p-5 ${
                  tpl.isArchived
                    ? "border-purple-100 dark:border-purple-950/40 opacity-75"
                    : "border-gray-100 dark:border-gray-700"
                }`}
              >
                {/* CARD BODY */}
                <div className="space-y-4">
                  {/* ICON & CATEGORY BADGE */}
                  <div className="flex justify-between items-start gap-2">
                    <div className={`p-2.5 rounded-xl ${
                      isTplExcel
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400"
                    }`}>
                      {isTplExcel ? (
                        <FileSpreadsheet className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>

                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg">
                      {getCategoryName(tpl.categoryId)}
                    </span>
                  </div>

                  {/* DETAILS */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 min-h-8">
                      {tpl.description || "No description provided for this template."}
                    </p>
                  </div>

                  {/* STATS FOOTER */}
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-50 dark:border-gray-700/50 pt-3 text-[10px] font-semibold text-gray-400">
                    <div>
                      <p className="text-gray-300 dark:text-gray-600 uppercase font-bold">Placeholders</p>
                      <p className="text-xs font-black text-gray-700 dark:text-gray-300 mt-0.5">
                        {tpl.placeholders?.length || 0} fields
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-300 dark:text-gray-600 uppercase font-bold">Access</p>
                      <p className="text-xs font-black text-gray-700 dark:text-gray-300 mt-0.5">
                        {tpl.assignedUserCount !== undefined ? `${tpl.assignedUserCount} users` : "All users"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-300 dark:text-gray-600 uppercase font-bold">Created</p>
                      <p className="text-xs font-black text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                        {(() => {
                          const d = new Date(tpl.createdAt);
                          if (isNaN(d.getTime())) return "Invalid Date";
                          const day = String(d.getDate()).padStart(2, "0");
                          const month = String(d.getMonth() + 1).padStart(2, "0");
                          const year = d.getFullYear();
                          return `${day}-${month}-${year}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CARD ACTIONS */}
                <div className="flex gap-1.5 mt-5 border-t border-gray-50 dark:border-gray-700/50 pt-4">
                  {/* EDIT BUTTON */}
                  <button
                    onClick={() => onEditTemplate(tpl.id)}
                    className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900/60 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Configure
                  </button>

                  {/* DOWNLOAD BUTTON */}
                  <a
                    href={api.getTemplateDownloadUrl(tpl.id)}
                    className="flex justify-center items-center p-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900/60 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-xl transition cursor-pointer"
                    title="Download original file"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  {/* DELETE BUTTON */}
                  <button
                    onClick={() => setTemplateToDelete(tpl)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 rounded-xl transition cursor-pointer"
                    title="Permanently Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-0 md:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setTemplateToDelete(null)}
          ></div>

          <div className="relative bg-white dark:bg-gray-950 rounded-t-3xl md:rounded-2xl border-t md:border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-200 p-6 space-y-6 pb-8 md:pb-6">
            {/* Drawer Drag Handle - Mobile Only */}
            <div className="w-12 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-2 block md:hidden" />

            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Permanently Delete Template?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Are you absolutely sure you want to permanently delete the template <strong className="text-gray-900 dark:text-white">"{templateToDelete.name}"</strong>?
                </p>
                <p className="text-[10px] text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/10 p-2.5 rounded-lg mt-1">
                  Warning: All generated document records built with this template will lose their original parent configuration mapping.
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl cursor-pointer text-center h-12 sm:h-auto flex items-center justify-center"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplate}
                className="w-full sm:w-auto px-5 py-3 sm:py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/10 cursor-pointer text-center h-12 sm:h-auto flex items-center justify-center"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
