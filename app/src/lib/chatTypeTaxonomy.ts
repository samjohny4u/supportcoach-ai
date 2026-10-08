// Canonical chat_type taxonomy (Task 33, Oct 2026). chat_type was an
// open-ended AI field steered only by "good examples", which drifted into
// synonyms ("Invoicing" vs "Invoices", "Timesheets" vs the product's actual
// "Time Cards" module). The canonical list below is Contractor Foreman's real
// module nav (owner-provided screenshot, Oct 8 2026) plus the standard
// support categories observed in production. Both worker routes interpolate
// CHAT_TYPE_PROMPT_SECTION into their prompts and pass the model's output
// through normalizeChatType() before storing, so drift is stopped at the
// source. The report-time normalizeTopicLabel() in product-issues-report
// stays as a display safety net.
//
// The one-time migration SQL that remapped pre-Task-33 rows is recorded in
// docs/codex-orchestration.md Task 33.

export const CANONICAL_CHAT_TYPES: string[] = [
  // Project Management
  "Projects",
  "Daily Logs",
  "Schedule",
  "To-Do's",
  "Work Orders",
  "Inspections",
  "Punchlists",
  "Service Tickets",
  "Permits",
  // Financials
  "Estimates",
  "Bid Manager",
  "Change Orders",
  "Invoices",
  "Payments",
  "Expenses",
  "Purchase Orders",
  "Subcontractors",
  "Bills",
  "Transaction Log",
  "Takeoffs",
  // People
  "Directory",
  "Opportunities",
  "Time Cards",
  "Leads",
  "Calendar",
  "Crew Schedules",
  "Incidents",
  "Safety Meetings",
  // Documents
  "Documents",
  "Files & Photos",
  "Reports",
  "Forms & Checklists",
  "RFIs",
  "Submittals",
  "Vehicle Logs",
  "Equipment Logs",
  "Notes",
  "Send Email",
  "Document Writer",
  // Settings & Support
  "Settings",
  "Cost Items Database",
  "Trainings",
  "Knowledge Base",
  // Support categories (not modules, but real contact drivers)
  "Billing",
  "Account Management",
  "User Access",
  "Client Portal",
  "Integrations",
  "QuickBooks",
  "Sync Issues",
  "Mobile App",
  "Data Import",
  "Notifications",
  "API",
  "Email",
  "Performance",
  "Contracts",
  "Feature Request",
];

// Known drift variants observed in production (lowercased) -> canonical.
const VARIANT_MAP: Record<string, string> = {
  invoicing: "Invoices",
  timesheets: "Time Cards",
  "time sheets": "Time Cards",
  scheduling: "Schedule",
  reporting: "Reports",
  permissions: "User Access",
  "user management": "User Access",
  "customer portal": "Client Portal",
  contacts: "Directory",
  bidding: "Bid Manager",
  bids: "Bid Manager",
  "rfi & notices": "RFIs",
  rfi: "RFIs",
  punchlist: "Punchlists",
  todos: "To-Do's",
  "to-dos": "To-Do's",
  "to dos": "To-Do's",
};

const CANONICAL_LOOKUP = new Map<string, string>(
  CANONICAL_CHAT_TYPES.map((value) => [value.toLowerCase(), value])
);

export const CHAT_TYPE_PROMPT_SECTION = `chat_type:
- Choose EXACTLY ONE value from this canonical list, using the exact spelling shown:
  ${CANONICAL_CHAT_TYPES.join(", ")}
- These are the product's module names plus standard support categories. Pick the closest match for the PRIMARY issue the customer contacted about.
- QuickBooks problems, INCLUDING QuickBooks sync problems, are always "QuickBooks" — never "Integrations" or "Sync Issues". "Integrations" is for other third-party integrations. "Sync Issues" is for non-QuickBooks sync problems (e.g. web/mobile data sync).
- "Billing" means the customer's subscription or charges for this product itself. "Payments" and "Invoices" are the in-product modules.
- Only if NOTHING on the list fits, coin a new short Title Case module-level category as a last resort. Never output vague values like "General Question" or "Help Needed".`;

// Write-time normalization: exact canonical match (any casing) keeps the
// canonical spelling; known variants are remapped; anything else is kept but
// title-cased so a genuinely new module name enters cleanly.
export function normalizeChatType(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const key = cleaned.toLowerCase();

  const canonical = CANONICAL_LOOKUP.get(key);
  if (canonical) return canonical;

  const variant = VARIANT_MAP[key];
  if (variant) return variant;

  return cleaned
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
