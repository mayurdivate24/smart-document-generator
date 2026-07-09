/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Upload, FileText, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, FolderOpen, RefreshCw, HelpCircle } from "lucide-react";
import { api } from "../lib/api";

interface TemplateUploadProps {
  onUploadSuccess: (templateId: string) => void;
}

export default function TemplateUpload({ onUploadSuccess }: TemplateUploadProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [brandingMode, setBrandingMode] = useState<"built-in" | "plain">("built-in");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getCategories()
      .then((data) => {
        setCategories(data);
        if (data.length > 0) {
          setCategoryId(data[0].id);
        }
      })
      .catch(console.error);

    api.getUsers()
      .then((data) => {
        const filtered = (data || []).filter((u: any) => u.role !== "super_admin");
        setUsers(filtered);
      })
      .catch(console.error);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (ext === ".docx" || ext === ".xlsx" || ext === ".xls") {
        setSelectedFile(file);
        if (!name) {
          setName(file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " "));
        }
      } else {
        setError("Invalid file format. Only Word (.docx) and Excel (.xlsx, .xls) files are supported.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (ext === ".docx" || ext === ".xlsx" || ext === ".xls") {
        setSelectedFile(file);
        if (!name) {
          setName(file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " "));
        }
      } else {
        setError("Invalid file format. Only Word (.docx) and Excel (.xlsx, .xls) files are supported.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !name || !categoryId) {
      setError("Please fill out all required fields and select a file.");
      return;
    }

    setLoading(true);
    setError("");

    // Optional pre-upload health check
    try {
      const health = await api.checkHealth();
      if (!health.success) {
        setError(`Backend not reachable. Current API URL: ${api.getApiUrl()}`);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError(`Backend not reachable. Current API URL: ${api.getApiUrl()}`);
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", name);
    formData.append("categoryId", categoryId);
    formData.append("description", description);
    formData.append("brandingMode", brandingMode);
    formData.append("assignedUserIds", JSON.stringify(selectedUserIds));

    api.uploadTemplate(formData)
      .then((res) => {
        // Automatically open the Parse Placeholder/Configuration screen immediately
        onUploadSuccess(res.id);
      })
      .catch((err) => {
        const detail = err.message || err;
        setError(`Template upload failed because: ${detail}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleReset = () => {
    setName("");
    setDescription("");
    setBrandingMode("built-in");
    setSelectedFile(null);
    setSuccessData(null);
    setSelectedUserIds([]);
    setUserSearchTerm("");
    setError("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Upload className="w-6 h-6 text-blue-600" />
          Upload Word Template
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Upload a `.docx` or `.xlsx` file containing variable placeholders in either <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-extrabold text-blue-600 dark:text-blue-400">{"{{placeholder}}"}</code> or <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-extrabold text-blue-600 dark:text-blue-400">{"<<placeholder>>"}</code> format.
        </p>
      </div>

      {/* Template Creation & Formatting Guide */}
      <div className="p-5 bg-blue-50/50 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/60 rounded-2xl flex gap-3.5 items-start">
        <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">
            Guide for Making Templates & Variable Formatting
          </h4>
          <p className="text-xs text-blue-900/80 dark:text-blue-100/80 leading-relaxed">
            Our dynamic document parser scans uploaded templates and instantly registers your placeholders. For variable data, please format your placeholders inside the Word document (.docx) or Excel file (.xlsx) using either of these syntax styles:
          </p>
          <div className="flex flex-wrap gap-4 pt-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900 px-3 py-1.5 rounded-xl">
              <span className="font-semibold text-[11px] uppercase text-blue-500 tracking-wider">Style A:</span>
              <code className="font-mono text-xs bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded font-extrabold text-blue-600 dark:text-blue-400">{"{{placeholder_name}}"}</code>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900 px-3 py-1.5 rounded-xl">
              <span className="font-semibold text-[11px] uppercase text-blue-500 tracking-wider">Style B:</span>
              <code className="font-mono text-xs bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded font-extrabold text-blue-600 dark:text-blue-400">{"<<placeholder_name>>"}</code>
            </div>
          </div>
          <p className="text-[10px] text-blue-800/60 dark:text-blue-400/60 leading-relaxed pt-1">
            Avoid spaces, hyphens, or special characters inside placeholder names (e.g., use <code className="font-mono">{"{{client_email}}"}</code> instead of <code className="font-mono">{"{{client email}}"}</code>). You can customize field names and drop-down selections in the next step.
          </p>
        </div>
      </div>

      {!successData ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Metadata Columns */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 h-fit">
            <h2 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-blue-600" />
              Template Metadata
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Appointment Letter, Commercial Lease"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              >
                {categories.length === 0 ? (
                  <option value="">Please create a category first</option>
                ) : (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Description
              </label>
              <textarea
                placeholder="Optional explanation detailing when to generate this document template..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Template Branding Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={brandingMode}
                onChange={(e) => setBrandingMode(e.target.value as any)}
                required
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="built-in">Built-in Letterhead (Preserve layout)</option>
                <option value="plain">Plain Template (Allows Dynamic Branding)</option>
              </select>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                {brandingMode === "built-in"
                  ? "Choose this if the Word file already contains your logo/letterhead."
                  : "Choose this for plain templates to overlay beautiful, dynamic headers/footers."}
              </p>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Assign Template Access
              </label>
              
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedUserIds.length === users.length) {
                      setSelectedUserIds([]);
                    } else {
                      setSelectedUserIds(users.map((u) => u.id));
                    }
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                >
                  {selectedUserIds.length === users.length ? "Deselect All" : "Select All Users"}
                </button>
                <span className="text-[11px] text-gray-400">
                  {selectedUserIds.length} of {users.length} selected
                </span>
              </div>

              {users.length > 3 && (
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg mb-2 bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                />
              )}

              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-gray-100 dark:border-gray-700 p-2.5 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                {users.length === 0 ? (
                  <p className="text-[11px] text-gray-400">No active users in firm.</p>
                ) : (
                  users
                    .filter((u) => {
                      if (!userSearchTerm) return true;
                      return (
                        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                      );
                    })
                    .map((user) => {
                      const isChecked = selectedUserIds.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedUserIds(selectedUserIds.filter((id) => id !== user.id));
                              } else {
                                setSelectedUserIds([...selectedUserIds, user.id]);
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 truncate">
                            <span className="font-semibold">{user.name}</span>{" "}
                            <span className="text-gray-400 text-[10px]">({user.role})</span>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Firm Administrators always have access to all templates of their own firm.
              </p>
            </div>
          </div>

          {/* Drag & Drop File Upload Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-12 text-center flex flex-col justify-center items-center cursor-pointer min-h-64 transition duration-200 ${
                dragActive
                  ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10"
                  : selectedFile
                  ? "border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-gray-600"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-full w-fit mx-auto ${
                    selectedFile.name.endsWith(".docx")
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                  }`}>
                    {selectedFile.name.endsWith(".docx") ? (
                      <FileText className="w-8 h-8" />
                    ) : (
                      <FileSpreadsheet className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-800 dark:text-white truncate max-w-sm mx-auto">
                      {selectedFile.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.name.endsWith(".docx") ? "Word Document" : "Excel Spreadsheet"}
                    </p>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                    Change template file
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 text-gray-400 dark:bg-gray-900 rounded-full w-fit mx-auto">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">
                      Drag & Drop your Word or Excel template here
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      or click to browse local files (Word .docx or Excel .xlsx, .xls up to 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-xl flex gap-2.5 text-xs text-red-600 dark:text-red-400 font-semibold items-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-50 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition cursor-pointer"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className={`px-6 py-2 rounded-xl text-sm font-bold text-white shadow-md transition duration-150 flex items-center gap-2 cursor-pointer ${
                  loading || !selectedFile
                    ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10"
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Scanning template...
                  </>
                ) : (
                  <>
                    Parse Placeholders <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* SUCCESS SCREEN & DETECTED PLACEHOLDERS LIST */
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-2xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-800 dark:text-white">
                Template Successfully Uploaded & Scanned!
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The document was scanned and unique placeholders were successfully registered.
              </p>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-6 bg-gray-50/50 dark:bg-gray-900/30 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Scanned Unique Placeholders
              </span>
              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-0.5 rounded-full">
                {successData.placeholders?.length || 0} Found
              </span>
            </div>

            {successData.placeholders && successData.placeholders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {successData.placeholders.map((p: any) => (
                  <div
                    key={p.placeholder}
                    className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <code className="text-xs font-bold text-gray-800 dark:text-white">
                        {"{{"}
                        {p.placeholder}
                        {"}}"}
                      </code>
                      <p className="text-[10px] text-gray-400 mt-0.5">Label: {p.label}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-md">
                      {p.inputType}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                Warning: No placeholders matching {"{{placeholder_name}}"} were detected.
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700 pt-6">
            <button
              onClick={handleReset}
              className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              Upload another template
            </button>
            <button
              onClick={() => onUploadSuccess(successData.id)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/15 flex items-center gap-2 cursor-pointer"
            >
              Configure Fields & Custom Form <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
