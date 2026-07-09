/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  FIRM_ADMIN = "firm_admin",
  USER = "user",
}

export interface Firm {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  plan: "free_trial" | "basic" | "pro" | "enterprise";
  status: "pending_verification" | "active" | "disabled";
  verificationToken?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  firmId?: string; // null for Super Admin
  isVerified?: boolean;
  verificationToken?: string;
  mobile?: string;
  designation?: string;
  isActive?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  firmId?: string;
}

export type InputType =
  | "text"
  | "textarea"
  | "number"
  | "decimal"
  | "date"
  | "time"
  | "email"
  | "phone"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "file"
  | "signature"
  | "color"
  | "password";

export interface PlaceholderConfig {
  placeholder: string; // e.g. "client_name" (without braces)
  label: string; // e.g. "Client Name"
  inputType: InputType;
  required: boolean;
  defaultValue: string;
  helpText: string;
  validationRegex: string;
  placeholderText: string;
  grouping: string; // e.g. "Personal Info", "Company Info"
  displayOrder: number;
  hideField: boolean;
  readOnly: boolean;
  linkedDropdownId?: string; // If inputType is "dropdown" or "radio"
}

export interface Template {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  filePath: string; // path to the uploaded .docx file
  placeholders: PlaceholderConfig[];
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  brandingMode?: "built-in" | "plain"; // Optional template branding mode
  firmId?: string;
}

export interface DropdownMaster {
  id: string;
  name: string; // e.g. "State"
  options: string[]; // e.g. ["California", "Texas", "New York"]
  createdAt: string;
  firmId?: string;
}

export interface GeneratedDocument {
  id: string;
  documentNumber: string; // e.g. "DOC-2026-000001"
  templateId: string;
  templateName: string;
  categoryId: string;
  categoryName: string;
  generatedBy: {
    userId: string;
    name: string;
    email: string;
  };
  createdAt: string;
  values: Record<string, string>;
  docxPath: string; // file path to replaced .docx
  htmlPath: string; // file path to converted Mammoth preview HTML
  pdfPath?: string; // file path to converted PDF
  firmId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  action: string; // e.g. "LOGIN", "UPLOAD_TEMPLATE", "GENERATE_DOCUMENT"
  details: string; // e.g. "Generated invoice DOC-2026-000001"
  timestamp: string;
  ipAddress?: string;
  firmId?: string;
}

export interface OrganizationSettings {
  organizationName: string;
  address: string;
  logo: string; // base64 or path
  digitalSignature: string; // base64 or path
  footer: string;
  defaultMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  defaultPaperSize: "A4" | "Letter" | "Legal";
  documentNumberPattern: string; // e.g. "DOC-[YYYY]-[COUNT]"
  timezone: string;
  language: "en" | "hi" | "mr"; // English, Hindi, Marathi
  placeholderSyntax?: string; // all, double_brace, angle_bracket, double_bracket, dollar_brace
  firmId?: string;
}

export interface OrganizationProfile {
  id: string;
  name: string; // Internal name of the profile (e.g. "Apex Pune", "Subsidiary")
  organizationName: string;
  logo?: string; // base64 image data
  address: string;
  contactNumber: string;
  email: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  footerText: string;
  authorizedSignatory: string;
  digitalSignature?: string; // base64 image data
  headerDesign: "minimal" | "standard" | "modern";
  footerDesign: "minimal" | "standard" | "modern";
  letterheadBackground?: string; // base64 image data
  createdAt: string;
  firmId?: string;
}

export interface TemplateUserAccess {
  id: string;
  firmId: string;
  templateId: string;
  userId: string;
  assignedBy?: string;
  createdAt: string;
}


