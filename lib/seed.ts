import type { InventoryItem } from "./types";
export { seedRecipes, syncRecipes } from "./house-recipes";

const now = "2026-01-01T00:00:00.000Z";

function item(
  type: InventoryItem["type"],
  category: string,
  name: string,
  unit: string,
  par: number,
  vendor?: string
): InventoryItem {
  const slug = `${type}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return { id: slug, type, name, category, unit, par, vendor, createdAt: now };
}

export function seedItems(): InventoryItem[] {
  const prep: Array<[string, string, string, number]> = [
    ["Dressings", "Blue Cheese Dressing", "qt", 2],
    ["Dressings", "Ranch", "qt", 2],
    ["Pasta", "Linguine", "lb", 10],
    ["Pasta", "Penne", "lb", 10],
    ["Sauces & Condiments", "Horseradish Cream", "qt", 2],
    ["Dips", "Tuna Dip", "qt", 3],
    ["Sauces & Condiments", "Mint Jelly", "pt", 1],
    ["Sauces & Condiments", "Cocktail Sauce", "qt", 2],
    ["Sauces & Condiments", "Honey Butter", "qt", 2],
    ["Breakfast", "Waffle Mix", "gal", 2],
    ["Breakfast", "Omelette Mix", "gal", 2],
    ["Soups", "Gumbo", "gal", 4],
    ["Soups", "Clam Chowder", "gal", 3],
    ["Soups", "French Onion", "gal", 3],
    ["Soups", "She Crab", "gal", 3],
    ["Soups", "Beef Vegetable", "gal", 3],
    ["Soups", "Chicken Vegetable", "gal", 3],
    ["Soups", "Chili", "gal", 3],
    ["Desserts", "Creme Brulee", "each", 16],
    ["Desserts", "Bread Pudding", "pan", 2],
    ["Dips", "Spinach Dip", "qt", 3],
    ["Sides", "Grits", "gal", 3],
    ["Appetizers", "Honey Pecan Brie", "each", 8],
    ["Appetizers", "Fried Green Tomatoes", "each", 40],
    ["Sauces & Condiments", "Dill Aioli", "qt", 1],
    ["Sides", "Baby Bakers", "cs", 1],
    ["Sides", "Caramelized Pecans", "lb", 2],
    ["Sauces & Condiments", "Mango Salsa", "qt", 2],
    ["Entrees", "Chicken Tamara", "each", 8],
    ["Sauces & Condiments", "Tasso Cream", "qt", 2],
    ["Appetizers", "Crab Cakes", "each", 40],
    ["Sides", "Brussels Sprouts", "lb", 10],
    ["Sides", "Risotto", "gal", 2],
    ["Appetizers", "Avocado Fries", "portion", 12],
    ["Appetizers", "Crab Meat Pie", "each", 12],
    ["Dressings", "House Dressing", "gal", 2],
  ];

  const ordering: Array<[string, string, string, string, number]> = [
    ["Ben E. Keith", "Seafood", "Fresh Lump Crab Meat", "lb", 10],
    ["Fresh Seafood", "Seafood", "Gulf Shrimp 16/20", "lb", 20],
    ["Fresh Seafood", "Seafood", "Gulf Shrimp 21/25", "lb", 20],
    ["Fresh Seafood", "Seafood", "Crawfish Tails", "lb", 8],
    ["Fresh Seafood", "Seafood", "Fresh Oysters", "dz", 15],
    ["Fresh Seafood", "Seafood", "Blue Crab Claws", "lb", 8],
    ["Fresh Seafood", "Seafood", "Wild Alaskan Salmon", "lb", 10],
    ["Fresh Seafood", "Seafood", "Fresh Salmon Fillet", "lb", 10],
    ["Fresh Seafood", "Seafood", "Sushi Grade Ahi Tuna", "lb", 6],
    ["Fresh Seafood", "Seafood", "Mississippi Catfish", "lb", 10],
    ["Fresh Seafood", "Seafood", "Grouper", "lb", 6],
    ["Buckhead Meat", "Seafood", "Mahi Mahi", "lb", 6],
    ["Buckhead Meat", "Seafood", "Snapper", "lb", 5],
    ["Buckhead Meat", "Seafood", "Red Snapper Fillet", "lb", 5],
    ["Fresh Seafood", "Seafood", "Seabass", "lb", 4],
    ["Fresh Seafood", "Seafood", "Sea Scallops", "lb", 5],
    ["Fresh Seafood", "Seafood", "Soft Shell Crabs", "each", 18],
    ["Fresh Seafood", "Seafood", "Maine Lobster Meat", "lb", 3],
    ["Fresh Seafood", "Seafood", "Snow Crab Clusters", "each", 10],
    ["Fresh Seafood", "Seafood", "Tripletail 7-9 oz", "lb", 6],
    ["Buckhead Meat", "Beef & Pork", "Filet Mignon", "lb", 12],
    ["Buckhead Meat", "Beef & Pork", "USDA Prime Ribeye 12 oz", "each", 16],
    ["Buckhead Meat", "Beef & Pork", "Prime Rib Roast", "lb", 20],
    ["Buckhead Meat", "Beef & Pork", "NY Strip 12 oz", "each", 12],
    ["Buckhead Meat", "Beef & Pork", "Cowboy Ribeye 16 oz", "each", 6],
    ["Buckhead Meat", "Beef & Pork", "Tomahawk", "each", 2],
    ["Buckhead Meat", "Beef & Pork", "Ground Angus", "lb", 20],
    ["Buckhead Meat", "Beef & Pork", "Lamb Chops", "lb", 6],
    ["Buckhead Meat", "Beef & Pork", "French Cut Pork Chop 14 oz", "each", 10],
    ["Ben E. Keith", "Beef & Pork", "Applewood Bacon", "lb", 15],
    ["Ben E. Keith", "Beef & Pork", "Conecuh Sausage", "lb", 8],
    ["Ben E. Keith", "Beef & Pork", "Canadian Bacon", "lb", 4],
    ["Boar's Head", "Beef & Pork", "Boar's Head Black Forest Ham", "lb", 6],
    ["Boar's Head", "Beef & Pork", "Boar's Head Turkey", "lb", 6],
    ["Boar's Head", "Beef & Pork", "Maple Honey Ham", "lb", 6],
    ["Boar's Head", "Beef & Pork", "Oven Gold Turkey", "lb", 6],
    ["Boar's Head", "Beef & Pork", "Corned Beef", "lb", 4],
    ["Ben E. Keith", "Beef & Pork", "Tasso", "lb", 3],
    ["Ben E. Keith", "Poultry", "Chicken Breast", "lb", 20],
    ["Ben E. Keith", "Poultry", "Chicken Tenders", "lb", 10],
    ["Ben E. Keith", "Poultry", "Duck Breast", "each", 8],
    ["City Produce", "Walk-in", "Romaine", "cs", 2],
    ["City Produce", "Walk-in", "Spring Mix", "cs", 2],
    ["City Produce", "Walk-in", "Arugula", "cs", 1],
    ["City Produce", "Walk-in", "Head Lettuce", "cs", 1],
    ["City Produce", "Walk-in", "Fresh Spinach", "cs", 2],
    ["City Produce", "Walk-in", "Baby Spinach", "cs", 2],
    ["City Produce", "Walk-in", "Heirloom Tomatoes", "lb", 10],
    ["City Produce", "Walk-in", "Heirloom Baby Tomatoes", "pt", 2],
    ["City Produce", "Walk-in", "Grape Tomatoes", "cs", 2],
    ["City Produce", "Walk-in", "Green Tomatoes", "lb", 15],
    ["City Produce", "Walk-in", "Avocados", "cs", 1],
    ["City Produce", "Walk-in", "Brussels Sprouts", "lb", 10],
    ["City Produce", "Walk-in", "Asparagus", "lb", 8],
    ["City Produce", "Walk-in", "Broccoli / Broccolini", "lb", 8],
    ["City Produce", "Walk-in", "Crimini Mushrooms", "lb", 8],
    ["City Produce", "Walk-in", "Red Onions", "lb", 10],
    ["City Produce", "Walk-in", "Bananas", "cs", 1],
    ["City Produce", "Walk-in", "Celery", "cs", 1],
    ["City Produce", "Walk-in", "Fresh Mint", "cs", 1],
    ["City Produce", "Walk-in", "Shredded Slaw Cabbage", "lb", 5],
    ["City Produce", "Walk-in", "Shell Eggs", "cs", 3],
    ["City Produce", "Walk-in", "Liquid Eggs", "cs", 1],
    ["City Produce", "Walk-in", "Heavy Cream", "qt", 12],
    ["City Produce", "Brunch cooler", "Strawberries", "cs", 1],
    ["City Produce", "Brunch cooler", "Blueberries", "cs", 1],
    ["City Produce", "Brunch cooler", "Parmesan", "lb", 5],
    ["City Produce", "Bar cooler", "Lemons", "cs", 1],
    ["City Produce", "Bar cooler", "Limes", "cs", 1],
    ["City Produce", "Bar cooler", "Oranges", "cs", 1],
    ["City Produce", "Bar cooler", "Mangoes", "each", 12],
    ["Performance Foodservice", "Dairy & Eggs", "Butter", "lb", 20],
    ["Performance Foodservice", "Dairy & Eggs", "Whole Milk", "gal", 4],
    ["Performance Foodservice", "Dairy & Eggs", "Sour Cream", "qt", 4],
    ["Performance Foodservice", "Dairy & Eggs", "Smoked Gouda", "lb", 6],
    ["Performance Foodservice", "Dairy & Eggs", "Swiss", "lb", 4],
    ["Performance Foodservice", "Dairy & Eggs", "Cheddar", "lb", 8],
    ["Performance Foodservice", "Dairy & Eggs", "Monterey Jack", "lb", 6],
    ["Performance Foodservice", "Dairy & Eggs", "Feta", "lb", 3],
    ["Performance Foodservice", "Dairy & Eggs", "Brie", "each", 8],
    ["Performance Foodservice", "Dairy & Eggs", "Bleu Cheese", "lb", 3],
    ["Performance Foodservice", "Dairy & Eggs", "Shredded Mozzarella", "lb", 6],
    ["Performance Foodservice", "Dairy & Eggs", "Goat Cheese", "lb", 3],
    ["Performance Foodservice", "Dairy & Eggs", "American Cheese", "lb", 4],
    ["Performance Foodservice", "Dairy & Eggs", "Pimento Cheese", "lb", 4],
    ["Performance Foodservice", "Beef & Pork", "Bacon Topping", "lb", 8],
    ["Performance Foodservice", "Dry Goods", "Stone Ground Grits", "lb", 15],
    ["Performance Foodservice", "Dry Goods", "Penne", "lb", 10],
    ["Performance Foodservice", "Dry Goods", "Linguini", "lb", 10],
    ["Performance Foodservice", "Dry Goods", "All-Purpose Flour", "lb", 25],
    ["Performance Foodservice", "Dry Goods", "Panko", "lb", 8],
    ["Performance Foodservice", "Dry Goods", "Arborio Rice", "lb", 8],
    ["Performance Foodservice", "Dry Goods", "Puff Pastry Sheets", "cs", 1],
    ["Ben E. Keith", "Bread & Bakery", "Brioche Buns", "dz", 8],
    ["Ben E. Keith", "Bread & Bakery", "French Bread", "loaf", 12],
    ["Ben E. Keith", "Bread & Bakery", "Pita Bread", "dz", 6],
    ["Ben E. Keith", "Bread & Bakery", "Marble Rye", "loaf", 4],
    ["Ben E. Keith", "Bread & Bakery", "Sourdough", "loaf", 6],
    ["Ben E. Keith", "Bread & Bakery", "Wheat Bread", "loaf", 4],
    ["Imperial Dade", "Paper & Disposables", "Sandwich Wrap", "cs", 1],
    ["Imperial Dade", "Paper & Disposables", "Aluminum Foil", "cs", 1],
    ["Imperial Dade", "Paper & Disposables", "Foam Hinged Containers", "cs", 1],
    ["Imperial Dade", "Paper & Disposables", "Toilet Tissue", "cs", 2],
    ["Imperial Dade", "Paper & Disposables", "Paper Towels", "cs", 2],
    ["Imperial Dade", "Paper & Disposables", "Guest Checks", "cs", 1],
    ["Imperial Dade", "Paper & Disposables", "To-Go Bags", "cs", 1],
    ["Alabama Crown", "Wine & Spirits", "Bonanza Cabernet 750ml", "each", 2],
    ["Alabama Crown", "Wine & Spirits", "Cabernet Sauvignon 750ml", "each", 2],
    ["Alabama Crown", "Wine & Spirits", "Verdejo 750ml", "each", 2],
    ["Alabama Crown", "Beverages", "Island Blood Orange", "cs", 1],
    ["Alabama Crown", "Beverages", "Pensacola Bay Riptide", "cs", 1],
    ["Alabama Crown", "Beverages", "Boscoli Dirty Martini Olives", "jar", 2],
    ["Alabama Crown", "Beverages", "Draft Keg", "keg", 1],
  ];

  const pull: Array<[string, string, string, number]> = [
    ["Beef", "Ribeyes", "each", 16],
    ["Beef", "Cowboys", "each", 12],
    ["Beef", "New Yorks", "each", 12],
    ["Beef", "Short Rib", "each", 10],
    ["Beef", "Prime Rib", "each", 10],
    ["Seafood", "Shrimp", "lb", 20],
    ["Seafood", "Calamari", "lb", 8],
    ["Seafood", "Grouper", "lb", 8],
    ["Seafood", "Catfish", "lb", 10],
    ["Seafood", "Softshell", "each", 12],
    ["Seafood", "Crab Claws", "lb", 8],
    ["Seafood", "Tripletail", "lb", 6],
    ["Seafood", "Sea Bass", "lb", 6],
    ["Seafood", "Snapper", "lb", 6],
    ["Seafood", "Salmon", "lb", 10],
    ["Seafood", "Scallops", "lb", 6],
    ["Seafood", "Mahi", "lb", 6],
  ];

  const items = [
    ...prep.map(([c, n, u, p]) => item("prep", c, n, u, p)),
    ...ordering.map(([v, c, n, u, p]) => item("ordering", c, n, u, p, v)),
    ...pull.map(([c, n, u, p]) => item("pull", c, n, u, p)),
  ];
  const headLettuce = items.find((entry) => entry.name === "Head Lettuce");
  if (headLettuce) headLettuce.id = "ordering-iceberg-heads";
  return items;
}

export const RETIRED_ORDERING_IDS = [
  "ordering-bell-peppers",
  "ordering-jalape-os",
  "ordering-jalapenos",
  "ordering-minced-garlic",
  "ordering-mushrooms",
  "ordering-sweet-potatoes",
];

export function syncCatalog(items: InventoryItem[]) {
  const seeded = seedItems();
  const byId = new Map(items.map((entry) => [entry.id, entry]));
  let changed = false;
  const removed: string[] = [];
  for (const id of RETIRED_ORDERING_IDS) {
    const index = items.findIndex((entry) => entry.id === id);
    if (index >= 0) {
      items.splice(index, 1);
      byId.delete(id);
      removed.push(id);
      changed = true;
    }
  }
  for (const entry of [...items]) {
    if (
      entry.type === "ordering" &&
      /^(bell peppers|jalape.*os|minced garlic|mushrooms|sweet potatoes)$/i.test(entry.name)
    ) {
      const index = items.findIndex((item) => item.id === entry.id);
      if (index >= 0) {
        items.splice(index, 1);
        byId.delete(entry.id);
        if (!removed.includes(entry.id)) removed.push(entry.id);
        changed = true;
      }
    }
  }
  for (const seed of seeded) {
    const existing = byId.get(seed.id);
    if (!existing) {
      items.push(seed);
      byId.set(seed.id, seed);
      changed = true;
      continue;
    }
    if (seed.vendor && !existing.vendor) {
      existing.vendor = seed.vendor;
      changed = true;
    }
    if (seed.category && existing.category !== seed.category) {
      existing.category = seed.category;
      changed = true;
    }
    if (seed.name && existing.name !== seed.name) {
      existing.name = seed.name;
      changed = true;
    }
  }
  return { changed, removed };
}

export function syncVendorCatalog(items: InventoryItem[]) {
  return syncCatalog(items).changed;
}
