/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Trash, Database, Edit2, Check, X, Tag } from "lucide-react";
import { api } from "../lib/api";

export default function DropdownsManager() {
  const [dropdowns, setDropdowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingDropdown, setDeletingDropdown] = useState<{ id: string; name: string } | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [optionsStr, setOptionsStr] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingOptions, setEditingOptions] = useState("");

  const loadDropdowns = () => {
    setLoading(true);
    api.getDropdowns()
      .then(setDropdowns)
      .catch(() => setError("Failed to load master dropdown data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !optionsStr.trim()) return;

    setError("");
    setMessage("");

    // Split options by commas, newlines or semicolons and clean
    const options = optionsStr
      .split(/[,\n;]/)
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);

    api.createDropdown(name, options)
      .then((dd) => {
        setMessage(`Dropdown master list "${dd.name}" created!`);
        setName("");
        setOptionsStr("");
        loadDropdowns();
      })
      .catch((err) => setError(err.message || "Failed to create dropdown."));
  };

  const handleStartEdit = (dd: any) => {
    setEditingId(dd.id);
    setEditingName(dd.name);
    setEditingOptions(dd.options.join("\n"));
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim() || !editingOptions.trim()) return;

    setError("");
    setMessage("");

    const options = editingOptions
      .split(/[,\n;]/)
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0);

    api.updateDropdown(id, editingName, options)
      .then(() => {
        setMessage("Dropdown updated successfully!");
        setEditingId(null);
        loadDropdowns();
      })
      .catch((err) => setError(err.message || "Failed to save edits."));
  };

  const handleDelete = (id: string, ddName: string) => {
    setError("");
    setMessage("");

    api.deleteDropdown(id)
      .then(() => {
        setMessage(`Master list deleted.`);
        loadDropdowns();
      })
      .catch((err) => setError(err.message || "Failed to delete dropdown."));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-600" />
          Dropdown Master Data
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Configure centralized options collections. You can map these to any document placeholders inside Form Customization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-fit">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            New Master Dropdown
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Dropdown Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Designations, US States"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Options (comma or newline separated) <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                required
                rows={6}
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg font-medium">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition duration-150 shadow-md shadow-indigo-500/10 cursor-pointer"
            >
              Add Dropdown Group
            </button>
          </form>
        </div>

        {/* Existing Lists */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-800 dark:text-white mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            Configured Reusable Lists ({dropdowns.length})
          </h2>

          {loading ? (
            <div className="text-center py-12 text-sm text-gray-400">Loading master datasets...</div>
          ) : dropdowns.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
              <Database className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400 mt-2">No master lists found. Create your first list above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dropdowns.map((dd) => (
                <div
                  key={dd.id}
                  className="p-5 border border-gray-50 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/30 flex flex-col justify-between"
                >
                  {editingId === dd.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400">List Name</label>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-white mt-1 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400">Options (newline split)</label>
                        <textarea
                          value={editingOptions}
                          onChange={(e) => setEditingOptions(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-white mt-1 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSaveEdit(dd.id)}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between items-center">
                          <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">
                            {dd.name}
                          </h3>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleStartEdit(dd)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-400 hover:text-indigo-600 transition"
                              title="Edit options"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                             <button
                              onClick={() => setDeletingDropdown({ id: dd.id, name: dd.name })}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md text-gray-400 hover:text-red-500 transition"
                              title="Delete list"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Group ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-[9px]">{dd.id}</code>
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {dd.options.map((opt: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] font-bold text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-4 text-right">
                        {dd.options.length} options defined
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom iFrame-safe Confirmation Modal */}
      {deletingDropdown && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-dropdown-modal">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-gray-100 dark:border-gray-800 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                <Trash className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Delete Dropdown Master</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-950/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
              Are you sure you want to delete the master list <strong className="text-gray-900 dark:text-white">"{deletingDropdown.name}"</strong>?
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingDropdown(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const dd = deletingDropdown;
                  setDeletingDropdown(null);
                  handleDelete(dd.id, dd.name);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                id="confirm-delete-dropdown-btn"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
