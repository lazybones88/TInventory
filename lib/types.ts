export type ItemType = "prep" | "ordering";

export interface InventoryItem {
  id: string;
  type: ItemType;
  name: string;
  category: string;
  unit: string;
  par: number;
  createdAt: string;
  lastOnHand?: number;
  lastMadeToday?: number;
  lastOrderQty?: number;
  lastSavedAt?: string;
}

export interface ReportLine {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  par: number;
  onHand: number;
  madeToday?: number;
  orderQty?: number;
  overParReason?: string;
}

export interface Report {
  id: string;
  type: ItemType;
  date: string;
  submittedAt: string;
  submittedBy: string;
  emailed: boolean;
  emailError?: string;
  status?: "sent";
  lines: ReportLine[];
}

export interface DraftSheet {
  id: string;
  type: ItemType;
  date: string;
  updatedAt: string;
  submittedBy: string;
  status: "draft";
  lines: ReportLine[];
}

export interface RecipeIngredient {
  amount: string;
  item: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  yield: string;
  prepTime: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  items: InventoryItem[];
  reports: Report[];
  drafts: DraftSheet[];
  recipes: Recipe[];
}
