/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash,
  Edit3,
  Check,
  Copy,
  Eye,
  EyeOff,
  Search,
  Key,
  Shield,
  Mail,
  User,
  AlertCircle,
  Clock,
} from "lucide-react";
import { api } from "../lib/api";
import { UserRole } from "../types";

export default function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create/Edit state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    role: UserRole.USER,
    passwordHash: "", // Plain text for password view/mod
    mobile: "",
    designation: "",
    isActive: true,
  });

  // Highlight/reveal created user's first password
  const [newlyCreatedUser, setNewlyCreatedUser] = useState<any | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  const currentUser = api.getCurrentUser();

  const fetchUsers = () => {
    setLoading(true);
    api.getUsers()
      .then((data) => {
        setUsers(data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load directory of users.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
    setSuccess("Password copied to clipboard!");
  };

  const handleOpenCreateForm = () => {
    setEditingUser(null);
    setNewlyCreatedUser(null);
    setFormData({
      username: "",
      name: "",
      email: "",
      role: UserRole.USER,
      passwordHash: "",
      mobile: "",
      designation: "",
      isActive: true,
    });
    setError("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (user: any) => {
    setEditingUser(user);
    setNewlyCreatedUser(null);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: user.passwordHash || "",
      mobile: user.mobile || "",
      designation: user.designation || "",
      isActive: user.isActive !== undefined ? !!user.isActive : true,
    });
    setError("");
    setIsFormOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.username || !formData.name || !formData.email || !formData.role) {
      setError("Please fill out all required fields.");
      return;
    }

    if (editingUser) {
      // Edit mode
      api.updateUser(editingUser.id, formData)
        .then(() => {
          setSuccess(`User "${formData.name}" updated successfully.`);
          setIsFormOpen(false);
          fetchUsers();
        })
        .catch((err) => {
          const detail = err.message || err;
          setError(`User update failed because: ${detail}`);
        });
    } else {
      // Create mode
      api.createUser(formData)
        .then((newUser) => {
          setSuccess(`User "${newUser.name}" created successfully.`);
          setNewlyCreatedUser(newUser); // Show password modal/panel
          setIsFormOpen(false);
          fetchUsers();
        })
        .catch((err) => {
          const detail = err.message || err;
          setError(`User creation failed because: ${detail}`);
        });
    }
  };

  const handleDeleteUser = (userId: string, name: string) => {
    setError("");
    setSuccess("");
    if (userId === currentUser?.id) {
      setError("You cannot delete your own logged-in account.");
      return;
    }
    if (userId === "user-admin") {
      setError("The primary administrator account cannot be deleted.");
      return;
    }
    const user = users.find((u) => u.id === userId);
    if (user) {
      setUserToDelete(user);
    }
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    const { id, name } = userToDelete;
    setUserToDelete(null);

    setError("");
    setSuccess("");
    api.deleteUser(id)
      .then(() => {
        setSuccess(`User "${name}" has been deleted.`);
        fetchUsers();
      })
      .catch((err) => {
        setError(err.message || "Failed to delete user.");
      });
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading directory accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            User Account Control
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Create, modify, and delete organizational user accounts. New users are assigned an autogenerated password.
          </p>
        </div>

        <button
          onClick={handleOpenCreateForm}
          className="self-start px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New User
        </button>
      </div>

      {/* FEEDBACK ALERTS */}
      {(error || success) && (
        <div className="max-w-4xl">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex gap-2 items-center">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* NEWLY CREATED USER POPUP BANNER */}
      {newlyCreatedUser && (
        <div className="max-w-4xl p-6 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl text-white shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-100 animate-bounce" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider">First Password Autogenerated Successfully!</h3>
          </div>
          <p className="text-xs text-indigo-100 leading-relaxed">
            A secure account has been provisioned. The password shown below is permanently stored in the admin directory panel. Share this password with the user for their first login.
          </p>

          <div className="bg-white/10 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-[10px] text-indigo-200 font-extrabold uppercase">Account Credentials</p>
              <div className="mt-1 flex flex-wrap gap-4 text-xs">
                <p><strong>Username:</strong> <code className="bg-black/30 px-2 py-0.5 rounded">{newlyCreatedUser.username}</code></p>
                <p><strong>Temporary Password:</strong> <code className="bg-black/30 px-2 py-0.5 rounded font-mono text-emerald-300 font-bold">{newlyCreatedUser.passwordHash}</code></p>
              </div>
            </div>
            <button
              onClick={() => handleCopyPassword(newlyCreatedUser.passwordHash)}
              className="px-3.5 py-1.5 bg-white text-indigo-600 hover:bg-indigo-50 font-extrabold rounded-lg text-xs flex items-center gap-1.5 transition shadow"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Password
            </button>
          </div>
        </div>
      )}

      {/* FILTER & ACCOUNT LIST */}
      <div className="space-y-4">
        <div className="max-w-md relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search accounts by name, email, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-500">No accounts match search filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const isPasswordVisible = !!visiblePasswords[user.id];

              return (
                <div
                  key={user.id}
                  className="p-5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-gray-800 dark:text-white">{user.name}</h4>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 text-[9px] font-black uppercase rounded-md">
                              Self
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-gray-400">@{user.username}</p>
                        {user.designation && (
                          <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{user.designation}</p>
                        )}
                        <div className="mt-1 flex items-center">
                          <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded uppercase ${user.isActive !== false ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"}`}>
                            {user.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenEditForm(user)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg"
                        title="Edit account credentials"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={isSelf || user.id === "user-admin"}
                        className={`p-1.5 text-gray-400 rounded-lg ${
                          isSelf || user.id === "user-admin"
                            ? "opacity-30 cursor-not-allowed"
                            : "hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        }`}
                        title="Delete account"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-50 dark:border-gray-900 pt-3.5 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Contact Address</p>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.mobile && (
                        <p className="text-[10px] text-gray-400 mt-1">Phone: <span className="font-semibold text-gray-600 dark:text-gray-300">{user.mobile}</span></p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">System Permission</p>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Shield className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-semibold">
                          {user.role === UserRole.SUPER_ADMIN ? "Super Admin" : user.role === UserRole.FIRM_ADMIN ? "Firm Admin" : "Employee"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PASSWORD DIRECTORY STORAGE CARD */}
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl flex justify-between items-center text-xs border border-gray-100/50 dark:border-gray-800/30">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Permanent Admin View Password</p>
                      <div className="mt-1 flex items-center gap-2 font-mono">
                        <Key className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {isPasswordVisible ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold select-all">
                            {user.passwordHash || "No password"}
                          </span>
                        ) : (
                          <span className="text-gray-400">••••••••••</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition shadow-xs"
                        title={isPasswordVisible ? "Hide password" : "Reveal stored password"}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopyPassword(user.passwordHash)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-gray-800 transition shadow-xs"
                        title="Copy password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 pt-1.5 border-t border-gray-50 dark:border-gray-900">
                    <Clock className="w-3.5 h-3.5 text-gray-300" />
                    <span>Registered: {(() => {
                      const d = new Date(user.createdAt);
                      if (isNaN(d.getTime())) return "Invalid Date";
                      const day = String(d.getDate()).padStart(2, "0");
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const year = d.getFullYear();
                      return `${day}-${month}-${year}`;
                    })()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setUserToDelete(null)}
          ></div>

          <div className="relative bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150 p-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl">
                <Trash className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Permanently Delete User Account?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Are you absolutely sure you want to delete <strong className="text-gray-900 dark:text-white">@{userToDelete.username}</strong> ({userToDelete.name})? This operation is permanent and irreversible.
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl cursor-pointer"
              >
                No, Keep Account
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/10 cursor-pointer"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG BACKDROP / USER FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsFormOpen(false)}
          ></div>

          <div className="relative bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-gray-50 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/30">
              <h3 className="font-extrabold text-base text-gray-800 dark:text-white">
                {editingUser ? `Edit Account - ${editingUser.name}` : "Create New User Account"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {editingUser ? "Modify access role, contact email, and active credentials." : "Complete basic credentials. Password will be autogenerated instantly."}
              </p>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mayur.d"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jane@apex.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Workspace Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  disabled={editingUser?.id === "user-admin"}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value={UserRole.USER}>Regular User (Generate & History Access)</option>
                  <option value={UserRole.FIRM_ADMIN}>Administrator (Full System Configuration Rights)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  {editingUser ? "Reset Security Password" : "Security Password"}
                </label>
                <input
                  type="text"
                  placeholder={editingUser ? "Enter new password (optional)" : "Leave blank to autogenerate"}
                  value={formData.passwordHash}
                  onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +1234567890"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Designation / Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Finance Head"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Account Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.isActive ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/30 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="true">Active (Account is fully functional)</option>
                  <option value="false">Inactive (Revoke workspace access)</option>
                </select>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-gray-50 dark:border-gray-900 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/10 cursor-pointer"
                >
                  {editingUser ? "Apply Modification" : "Create & Autogenerate Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
