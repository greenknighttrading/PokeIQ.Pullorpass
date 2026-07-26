export type TaskStatus = "not_started" | "in_progress" | "done";

export interface WeddingTask {
  id: string;
  title: string;
  month: "Done" | "August" | "September" | "October" | "November";
  dueDate?: string; // ISO
  priority?: boolean;
  status: TaskStatus;
  notes: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  vendor: string;
  estimated: number;
  actual: number;
  paid: number;
  notes: string;
}

const d = (m: number, day: number) => new Date(2026, m - 1, day).toISOString();

let i = 0;
const t = (
  title: string,
  month: WeddingTask["month"],
  dueDate?: string,
  status: TaskStatus = "not_started",
  priority = false,
  notes = ""
): WeddingTask => ({
  id: `seed-${++i}`,
  title,
  month,
  dueDate,
  status,
  priority,
  notes,
});

export const SEED_TASKS: WeddingTask[] = [
  // Already done
  t("Book ceremony & reception venue", "Done", undefined, "done", false, "Glenwoods — deposit paid"),
  t("Book DJ", "Done", undefined, "done", false, "Deposit of $1,000 paid"),
  t("Choose florist", "Done", undefined, "done", false, "TJ's Flowers — deposit paid"),
  t("Purchase wedding dress", "Done", undefined, "done"),
  t("Complete makeup trial", "Done", undefined, "done", false, "$360 spent"),

  // August
  t("Order groomsmen suits", "August", d(8, 3), "not_started", true, "Allow lead time for sizing/alterations"),
  t("Decide on rehearsal dinner location", "August", d(8, 10), "not_started", true, "Guest list already drafted (~28 people)"),
  t("Decide on after-party location", "August", d(8, 10), "not_started", true),
  t("Finalize photographer & videographer contract", "August", d(8, 15)),
  t("Buy/order wedding rings", "August", d(8, 17)),
  t("Book photobooth", "August", d(8, 17)),
  t("Order signage", "August", d(8, 29)),
  t("Order candles & centerpiece decor extras", "August", d(8, 29)),

  // September
  t("Send wedding invitations", "September", d(9, 7)),
  t("Book hotel room block for out-of-town guests", "September", d(9, 7)),
  t("Send rehearsal dinner invitations", "September", d(9, 7)),
  t("Confirm officiant & ceremony details", "September", d(9, 14), "not_started", false, "Pastor Kyu Kim"),
  t("Order welcome bag items", "September", d(9, 21), "not_started", false, "Hand warmers, blankets, cup noodles — cold weather Nov wedding"),
  t("First dress fitting / alterations appointment", "September", d(9, 21)),
  t("Assign day-of coordinator / point person", "September", d(9, 28)),

  // October
  t("Apply for marriage license", "October", d(10, 5), "not_started", false, "Check Maryland's validity window"),
  t("Write vows", "October", d(10, 10)),
  t("Confirm DJ song list & reception timeline", "October", d(10, 12)),
  t("Confirm final floral order (counts, delivery time)", "October", d(10, 17)),
  t("Finalize seating chart & table assignments", "October", d(10, 19)),
  t("Track RSVPs, follow up with non-responders", "October", d(10, 24)),
  t("Final dress fitting", "October", d(10, 26)),
  t("Suit fitting / pickup", "October", d(10, 26)),

  // November
  t("Prepare tip envelopes for vendors", "November", d(11, 2)),
  t("Confirm final headcount with venue/caterer", "November", d(11, 7)),
  t("Pay remaining vendor balances", "November", d(11, 9)),
  t("Create wedding day timeline for wedding party & vendors", "November", d(11, 9)),
  t("Confirm photographer/videographer shot list", "November", d(11, 12)),
  t("Pick up rings, attire, and any rentals", "November", d(11, 16)),
  t("Rehearsal & rehearsal dinner", "November", d(11, 20)),
  t("Wedding day", "November", d(11, 21), "not_started", true, "November 21, 2026 — Glenwoods"),
];

let bi = 0;
const b = (category: string, vendor = "", estimated = 0, paid = 0, notes = ""): BudgetItem => ({
  id: `bseed-${++bi}`,
  category,
  vendor,
  estimated,
  actual: estimated,
  paid,
  notes,
});

export const SEED_BUDGET: BudgetItem[] = [
  b("Venue (ceremony & reception)", "Glenwoods", 0, 0, "Deposit paid"),
  b("DJ", "", 0, 1000, "Deposit of $1,000 paid"),
  b("Florist", "TJ's Flowers", 0, 0, "Deposit paid"),
  b("Wedding dress", "", 0, 0, "Purchased"),
  b("Makeup trial", "", 360, 360),
  b("Photographer & videographer"),
  b("Groomsmen suits"),
  b("Wedding rings"),
  b("Photobooth"),
  b("Signage"),
  b("Candles & centerpiece decor"),
  b("Invitations & stationery"),
  b("Hotel room block"),
  b("Rehearsal dinner"),
  b("After-party"),
  b("Officiant", "Pastor Kyu Kim"),
  b("Welcome bags"),
  b("Alterations"),
  b("Marriage license"),
  b("Day-of coordinator"),
  b("Vendor tips"),
  b("Catering / bar (final balance)"),
];

const TASKS_KEY = "wedding-tasks-v1";
const BUDGET_KEY = "wedding-budget-v1";

export function loadTasks(): WeddingTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return SEED_TASKS;
}

export function saveTasks(tasks: WeddingTask[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadBudget(): BudgetItem[] {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return SEED_BUDGET;
}

export function saveBudget(items: BudgetItem[]) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(items));
}

export const WEDDING_DATE = new Date("2026-11-21T16:00:00-05:00");