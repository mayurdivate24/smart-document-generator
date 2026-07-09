/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Trash, FolderOpen, Tag, Info } from "lucide-react";
import { api } from "../lib/api";

export default function CategoriesManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null);

  const loadCategories = () => {
    setLoading(true);
    api.getCategories()
      .then(setCategories)
      .catch((err) => setError("Failed to load categories."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError("");
    setMessage("");

    api.createCategory(name, description)
      .then((cat) => {
        setMessage(`Category "${cat.name}" created successfully!`);
        setName("");
        setDescription("");
        loadCategories();
      })
      .catch((err) => setError(err.message || "Failed to create category."));
  };

  const handleDelete = (id: string, catName: string) => {
    setError("");
    setMessage("");

    api.deleteCategory(id)
      .then(() => {
        setMessage(`Category deleted successfully.`);
        loadCategories();
      })
      .catch((err) => setError(err.message || "Failed to delete category."));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600" />
          Template Categories
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Manage customizable folder categories for your enterprise Word templates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-fit">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Create Category
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Letters, Certificates, Invoices"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Description
              </label>
              <textarea
                placeholder="Brief description about what templates fall into this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
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
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition duration-150 shadow-md shadow-blue-500/10 cursor-pointer"
            >
              Add Category
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            Existing Categories ({categories.length})
          </h2>

          {loading ? (
            <div className="text-center py-12 text-sm text-gray-400">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
              <FolderOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400 mt-2">No categories found. Create your first category above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 dark:border-gray-700 text-xs font-bold text-gray-400 uppercase">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition">
                      <td className="py-4 px-4 font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                        {cat.name}
                      </td>
                      <td className="py-4 px-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {cat.description || <em className="text-gray-300 dark:text-gray-600">No description</em>}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setDeletingCategory({ id: cat.id, name: cat.name })}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition duration-150 cursor-pointer"
                          title="Delete category"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-950/10 rounded-xl flex gap-3 text-xs text-blue-600 dark:text-blue-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Note: Deleting a category does not delete existing templates of that category, but they will become uncategorized until assigned a new one.
            </p>
          </div>
        </div>
      </div>

      {/* Custom iFrame-safe Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="delete-category-modal">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full border border-gray-100 dark:border-gray-800 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                <Trash className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Delete Template Category</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-950/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
              Are you sure you want to delete category <strong className="text-gray-900 dark:text-white">"{deletingCategory.name}"</strong>?
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cat = deletingCategory;
                  setDeletingCategory(null);
                  handleDelete(cat.id, cat.name);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                id="confirm-delete-category-btn"
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
