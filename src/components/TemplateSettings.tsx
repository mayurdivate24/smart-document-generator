/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Settings, Save, Trash, ArrowLeft, RefreshCw, Layers, Sliders, Database } from "lucide-react";
import { api } from "../lib/api";
import { InputType, PlaceholderConfig } from "../types";

interface TemplateSettingsProps {
  templateId: string;
  onBack: () => void;
}

export default function TemplateSettings({ templateId, onBack }: TemplateSettingsProps) {
  const [template, setTemplate] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [dropdowns, setDropdowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Template metadata state
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [isArchived, setIsArchived] = useState(false);

  // Placeholders configuration state
  const [placeholders, setPlaceholders] = useState<PlaceholderConfig[]>([]);
  const [activePlaceholderIdx, setActivePlaceholderIdx] = useState<number | null>(null);

  // Template User Access state
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getTemplate(templateId),
      api.getCategories(),
      api.getDropdowns(),
      api.getUsers(),
      api.getTemplateAccess(templateId),
    ])
      .then(([tpl, cats, dds, allUsers, accessList]) => {
        setTemplate(tpl);
        setCategories(cats);
        setDropdowns(dds);

        const filteredUsers = (allUsers || []).filter((u: any) => u.role !== "super_admin");
        setUsers(filteredUsers);
        setSelectedUserIds((accessList || []).map((a: any) => a.userId));

        setName(tpl.name);
        setCategoryId(tpl.categoryId);
        setDescription(tpl.description || "");
        setIsArchived(tpl.isArchived || false);
        setPlaceholders(tpl.placeholders || []);

        if (tpl.placeholders && tpl.placeholders.length > 0) {
          setActivePlaceholderIdx(0);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load template configuration.");
      })
      .finally(() => setLoading(false));
  }, [templateId]);

  const handleSave = () => {
    setError("");
    setSuccess("");
    setSaving(true);

    const payload = {
      name,
      categoryId,
      description,
      isArchived,
      placeholders,
      assignedUserIds: selectedUserIds,
    };

    Promise.all([
      api.updateTemplate(templateId, payload),
      api.setTemplateAccess(templateId, selectedUserIds),
    ])
      .then(([updated]) => {
        // Save success message in localStorage to be displayed on returning to the Template Vault
        localStorage.setItem("sdg_vault_success", `Template "${updated.name}" configurations and access saved successfully!`);
        onBack();
      })
      .catch((err) => setError(err.message || "Failed to save template edits."))
      .finally(() => setSaving(false));
  };

  const handlePlaceholderFieldChange = (idx: number, field: keyof PlaceholderConfig, value: any) => {
    const copy = [...placeholders];
    copy[idx] = { ...copy[idx], [field]: value };
    setPlaceholders(copy);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading form builder configuration...</p>
      </div>
    );
  }

  const activePlaceholder = activePlaceholderIdx !== null ? placeholders[activePlaceholderIdx] : null;

  const inputTypesList: { value: InputType; label: string }[] = [
    { value: "text", label: "Text Input" },
    { value: "textarea", label: "Text Area" },
    { value: "number", label: "Whole Number" },
    { value: "decimal", label: "Decimal Number" },
    { value: "date", label: "Date Picker" },
    { value: "time", label: "Time Picker" },
    { value: "email", label: "Email Input" },
    { value: "phone", label: "Phone Input" },
    { value: "dropdown", label: "Master Dropdown List" },
    { value: "radio", label: "Radio Selection" },
    { value: "checkbox", label: "Toggle Checkbox" },
    { value: "file", label: "File Attachment" },
    { value: "signature", label: "Digital Signature Block" },
    { value: "color", label: "Color Picker" },
    { value: "password", label: "Password input" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" />
              Configure Custom Form: <span className="text-indigo-600">{template?.name}</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Customize automatic form generation, map inputs, default values, and structure fields.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-500/10 cursor-pointer"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Saving changes...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Form Blueprint
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-semibold">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Template metadata & Placeholder navigation lists */}
        <div className="space-y-6">
          {/* Template Info block */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Template Metadata
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Display Title
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="archived"
                checked={isArchived}
                onChange={(e) => setIsArchived(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="archived" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Archive Template (Hide from non-admins)
              </label>
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
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
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
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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

          {/* Placeholders list */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Scanned Placeholders ({placeholders.length})
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {placeholders.map((p, idx) => (
                <button
                  key={p.placeholder}
                  type="button"
                  onClick={() => setActivePlaceholderIdx(idx)}
                  className={`w-full p-3 text-left border rounded-xl transition flex justify-between items-center cursor-pointer ${
                    activePlaceholderIdx === idx
                      ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                      : "border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  }`}
                >
                  <div>
                    <code className="text-xs font-extrabold text-gray-800 dark:text-white">
                      {"{{"}
                      {p.placeholder}
                      {"}}"}
                    </code>
                    <p className="text-[10px] text-gray-400 mt-1 truncate max-w-40">
                      {p.label || p.placeholder}
                    </p>
                  </div>
                  <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-md">
                    {p.inputType || "text"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed field settings panel */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
          {activePlaceholder && activePlaceholderIdx !== null ? (
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100 dark:border-gray-700">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Active Placeholder Field Settings
                </span>
                <h3 className="text-xl font-extrabold text-gray-800 dark:text-white mt-1">
                  {"{{"}
                  {activePlaceholder.placeholder}
                  {"}}"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Field Label (User Facing)
                  </label>
                  <input
                    type="text"
                    value={activePlaceholder.label}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "label", e.target.value)
                    }
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Input Field Type
                  </label>
                  <select
                    value={activePlaceholder.inputType}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "inputType", e.target.value)
                    }
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    {inputTypesList.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional Dropdown list selector */}
                {(activePlaceholder.inputType === "dropdown" || activePlaceholder.inputType === "radio") && (
                  <div className="md:col-span-2 p-4 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/30 space-y-3">
                    <label className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase flex items-center gap-1">
                      <Database className="w-4 h-4" /> Link to Master Dropdown List
                    </label>
                    <select
                      value={activePlaceholder.linkedDropdownId || ""}
                      onChange={(e) =>
                        handlePlaceholderFieldChange(
                          activePlaceholderIdx,
                          "linkedDropdownId",
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-xl bg-white dark:bg-gray-900 dark:text-white focus:outline-none"
                    >
                      <option value="">-- Choose Master Dataset --</option>
                      {dropdowns.map((dd) => (
                        <option key={dd.id} value={dd.id}>
                          {dd.name} ({dd.options.length} items)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-500">
                      Users filling the form will select from the preconfigured values of the linked dataset.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={activePlaceholder.defaultValue || ""}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "defaultValue", e.target.value)
                    }
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Placeholder (Grey Text)
                  </label>
                  <input
                    type="text"
                    value={activePlaceholder.placeholderText || ""}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "placeholderText", e.target.value)
                    }
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Help Text (Tooltip)
                  </label>
                  <input
                    type="text"
                    value={activePlaceholder.helpText || ""}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "helpText", e.target.value)
                    }
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Grouping (Section Name)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Primary Info, Finance details"
                    value={activePlaceholder.grouping || ""}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "grouping", e.target.value)
                    }
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Display Order (Sorting weight)
                  </label>
                  <input
                    type="number"
                    value={activePlaceholder.displayOrder || 1}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "displayOrder", parseInt(e.target.value) || 1)
                    }
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Custom Regex Validation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ^[0-9]{10}$"
                    value={activePlaceholder.validationRegex || ""}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "validationRegex", e.target.value)
                    }
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 dark:text-white focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>

              {/* Checkbox settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="field_required"
                    checked={activePlaceholder.required}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "required", e.target.checked)
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="field_required" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Required Field
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="field_readonly"
                    checked={activePlaceholder.readOnly || false}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "readOnly", e.target.checked)
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="field_readonly" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Read-Only Field
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="field_hide"
                    checked={activePlaceholder.hideField || false}
                    onChange={(e) =>
                      handlePlaceholderFieldChange(activePlaceholderIdx, "hideField", e.target.checked)
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <label htmlFor="field_hide" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Hide Field on Form
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              Please select a placeholder from the left list to customize its form parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
