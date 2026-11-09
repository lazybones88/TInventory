import type { Recipe } from "./types";

const now = "2026-01-01T00:00:00.000Z";

function recipe(
  id: string,
  name: string,
  category: string,
  yieldAmt: string,
  prepTime: string,
  description: string,
  ingredients: Recipe["ingredients"],
  instructions: string[],
  notes?: string
): Recipe {
  return {
    id,
    name,
    category,
    yield: yieldAmt,
    prepTime,
    description,
    ingredients,
    instructions,
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

export const RETIRED_RECIPE_IDS = [
  "lump-crab-cakes",
  "gumbo",
  "crawfish-joule",
  "hollandaise",
  "crab-meat-pie",
  "spinach-artichoke-dip",
  "smoked-tuna-dip",
  "remoulade",
  "meuniere",
  "bread-pudding",
  "gouda-grits",
  "fried-green-tomatoes",
  "chicken-tamara",
  "bbq-shrimp",
  "creme-brulee",
  "honey-pecan-brie",
  "pimento-cheese",
  "seafood-au-gratin",
  "tasso-cream",
  "chocolate-lava-cake",
];

export function seedRecipes(): Recipe[] {
  return [
    recipe(
      "house-waffle-mix",
      "Waffle Mix",
      "Breakfast",
      "1 bag mix",
      "10 minutes",
      "House waffle batter from the bag mix.",
      [
        { amount: "1 bag", item: "Waffle mix" },
        { amount: "1 capful", item: "Vanilla" },
        { amount: "as needed", item: "Water" },
        { amount: "3", item: "Eggs" },
      ],
      ["Add waffle mix, vanilla, eggs, and water as needed.", "Mix until smooth."]
    ),
    recipe(
      "house-omelette-mix",
      "Omelette Mix",
      "Breakfast",
      "Weekend service",
      "15 minutes",
      "Liquid-egg omelette mix. Make containers on Friday for Saturday and Sunday.",
      [
        { amount: "6 cartons", item: "Liquid eggs" },
        { amount: "8 oz", item: "Cream cheese" },
      ],
      [
        "Mix liquid eggs and cream cheese with a mixer until smooth.",
        "Make containers on Friday for Saturday and Sunday service.",
      ],
      "Walk-in pans for the omelette station: 1/2 tomato; full bacon; full fajita mix; full crab meat; full mushroom; full conecuh sausage. Saute sausage first and put a little water with it."
    ),
    recipe(
      "house-creme-brulee",
      "Creme Brulee",
      "Desserts",
      "1 batch",
      "40 minutes",
      "Baked custard in a water bath.",
      [
        { amount: "30", item: "Egg yolks" },
        { amount: "3", item: "Heavy cream" },
        { amount: "4 cups", item: "Sugar" },
        { amount: "1 capful", item: "Vanilla" },
      ],
      [
        "Add everything together and mix well.",
        "Spray creme brulee dishes first, then fill.",
        "Bake 30 minutes at 350°F in a water pan.",
      ]
    ),
    recipe(
      "house-bread-pudding",
      "Bread Pudding",
      "Desserts",
      "1 batch",
      "40 minutes",
      "Thawed bread pudding baked in bowls.",
      [
        { amount: "1 batch", item: "Thawed bread pudding" },
      ],
      [
        "Thaw bread pudding.",
        "Put in a bowl and mix all together.",
        "Pour into bread pudding bowls.",
        "Bake 30 minutes at 350°F.",
      ]
    ),
    recipe(
      "house-cocktail-sauce",
      "Cocktail Sauce",
      "Sauces",
      "1 bag ketchup batch",
      "10 minutes",
      "House cocktail sauce.",
      [
        { amount: "1 bag", item: "Ketchup" },
        { amount: "4 scoops", item: "Horseradish" },
        { amount: "2 squirts", item: "Lemon juice" },
        { amount: "2 squirts", item: "Worcestershire" },
      ],
      ["Mix ketchup, horseradish, lemon juice, and Worcestershire until even."]
    ),
    recipe(
      "house-spinach-dip",
      "Spinach Dip",
      "Dips",
      "1 batch",
      "20 minutes",
      "Spinach and artichoke dip.",
      [
        { amount: "3 cans", item: "Artichokes, drained and diced" },
        { amount: "3 bags", item: "Fresh spinach, chopped" },
        { amount: "6 scoops", item: "Mayonnaise" },
        { amount: "3 oz", item: "Red pepper" },
        { amount: "1 log", item: "Cream cheese, melted down" },
        { amount: "1 cup", item: "Shredded parmesan" },
        { amount: "2 oz", item: "Minced garlic" },
        { amount: "2 scoops", item: "Sour cream" },
        { amount: "2 oz", item: "Salt" },
      ],
      ["Mix all together until even."]
    ),
    recipe(
      "house-grits",
      "Grits",
      "Sides",
      "By the bag",
      "40 minutes",
      "Gouda cheese grits. Amount depends on how many bags.",
      [
        { amount: "as needed", item: "Grits bags" },
        { amount: "to taste", item: "Gouda cheese" },
        { amount: "to taste", item: "Salt" },
      ],
      ["Cook grits depending on how many bags.", "Finish with only gouda cheese and salt."]
    ),
    recipe(
      "house-honey-pecan-brie",
      "Honey Pecan Brie",
      "Appetizers",
      "1 wheel",
      "25 minutes",
      "Brie wrapped in puff pastry with pecans and honey.",
      [
        { amount: "1", item: "Puff pastry" },
        { amount: "14 oz", item: "Pecans" },
        { amount: "as needed", item: "Honey" },
        { amount: "1", item: "Brie" },
      ],
      ["Lay out puff pastry.", "Add pecans and top with honey.", "Wrap like a diaper and bake."]
    ),
    recipe(
      "house-fried-green-tomatoes",
      "Fried Green Tomatoes",
      "Appetizers",
      "1 batch",
      "25 minutes",
      "Breaded green tomatoes.",
      [
        { amount: "as needed", item: "Green tomatoes, sliced not too thin" },
        { amount: "as needed", item: "Flour" },
        { amount: "1 carton", item: "Liquid eggs, added to milk" },
        { amount: "as needed", item: "Milk" },
        { amount: "as needed", item: "Panko" },
      ],
      ["Slice green tomatoes, not too thin.", "Dredge flour, milk-egg, then panko."]
    ),
    recipe(
      "house-dill-aioli",
      "Dill Aioli",
      "Sauces",
      "1/2 gallon",
      "10 minutes",
      "Caper dill aioli.",
      [
        { amount: "1/2 gallon", item: "Mayonnaise" },
        { amount: "1 cup", item: "Capers" },
        { amount: "2 oz", item: "Dill" },
        { amount: "2 squirts", item: "Lemon juice" },
      ],
      ["Mix mayonnaise, capers, dill, and lemon juice."]
    ),
    recipe(
      "house-honey-butter",
      "Honey Butter",
      "Sauces",
      "1 bucket",
      "10 minutes",
      "Soft honey butter.",
      [
        { amount: "1 bucket", item: "Butter, room temperature" },
        { amount: "8 cups", item: "Honey" },
      ],
      ["Bring butter to room temperature.", "Mix with honey until smooth."]
    ),
    recipe(
      "house-baby-bakers",
      "Baby Bakers",
      "Sides",
      "4 bags",
      "15 minutes",
      "Roasted baby bakers.",
      [{ amount: "4 bags", item: "Baby bakers" }],
      ["Put 4 bags in the oven at 300°F for 15 minutes."]
    ),
    recipe(
      "house-caramelized-pecans",
      "Caramelized Pecans",
      "Sides",
      "1 box",
      "15 minutes",
      "Butter-brown-sugar pecans.",
      [
        { amount: "1 box", item: "Pecans" },
        { amount: "1/2 stick", item: "Butter" },
        { amount: "1/2 cup", item: "Brown sugar" },
      ],
      ["Melt butter with pecans.", "Add brown sugar and caramelize.", "Lay out on a sheet pan."]
    ),
    recipe(
      "house-french-onion",
      "French Onion",
      "Soups",
      "4 gallons",
      "1 hour",
      "House French onion soup.",
      [
        { amount: "4 gal", item: "Water" },
        { amount: "3 bags", item: "White onion" },
        { amount: "2 containers", item: "Beef base" },
        { amount: "1/2 cup", item: "Sherry" },
        { amount: "1/2 cup", item: "Bourbon" },
        { amount: "2 oz", item: "Parsley" },
        { amount: "1 oz", item: "Red pepper" },
        { amount: "3 oz", item: "Salt" },
        { amount: "2 oz", item: "Minced garlic" },
      ],
      ["Saute the onions first.", "Add water, beef base, sherry, bourbon, and seasonings.", "Simmer until the onions are soft and the soup tastes rich."]
    ),
    recipe(
      "house-vegetable-soup",
      "Chicken or Beef Vegetable",
      "Soups",
      "1 pot",
      "1 hour",
      "Same pot for chicken vegetable or beef vegetable.",
      [
        { amount: "10 pieces or 2 bags", item: "Chicken, cut up — or beef, cut up" },
        { amount: "1 bag", item: "Fajita mix, not chopped" },
        { amount: "1 can", item: "Diced tomatoes, drained" },
        { amount: "1/2 bag", item: "Prince Edward mixed vegetables, cut up" },
        { amount: "to taste", item: "Chicken base" },
        { amount: "as needed", item: "Water" },
      ],
      ["Saute the meat first.", "Add fajita mix, drained tomatoes, and Prince Edward vegetables.", "Add chicken base to taste and water.", "Cook until the vegetables are tender."]
    ),
    recipe(
      "house-boil-pasta",
      "Boil Pasta",
      "Pasta",
      "1/2 bag",
      "15 minutes",
      "Same boil for linguine or penne. Timing matters.",
      [
        { amount: "1/2 bag", item: "Linguine or penne" },
        { amount: "as needed", item: "Boiling water" },
        { amount: "as needed", item: "Ice" },
      ],
      [
        "Let the water boil.",
        "Add 1/2 bag linguine or penne.",
        "Boil 10 minutes, turn off the stove, and set 2 more minutes so it does not overcook.",
        "Take to the sink right away and cover with ice to stop the cooking.",
      ],
      "Very important on timing."
    ),
    recipe(
      "house-mango-salsa",
      "Mango Salsa",
      "Sauces",
      "1 bag mango",
      "15 minutes",
      "Fresh mango salsa.",
      [
        { amount: "1 bag", item: "Mango" },
        { amount: "1 bag", item: "Fajita mix, chopped" },
        { amount: "2 squirts", item: "Lemon juice" },
      ],
      ["Chop and mix mango, fajita mix, and lemon juice."]
    ),
    recipe(
      "house-chicken-tamara",
      "Chicken Tamara",
      "Entrees",
      "1 breast",
      "30 minutes",
      "Bacon-wrapped chicken with gouda and asparagus.",
      [
        { amount: "1", item: "Chicken breast, cut into 2 pieces and pounded" },
        { amount: "as needed", item: "Gouda" },
        { amount: "1 spear", item: "Asparagus, big, cut down the middle" },
        { amount: "as needed", item: "Bacon" },
      ],
      ["Cut the breast into 2 pieces and pound it.", "Fill with gouda and asparagus.", "Roll with bacon."]
    ),
    recipe(
      "house-tasso-cream",
      "Tasso Cream",
      "Sauces",
      "1 batch",
      "25 minutes",
      "Tasso cream for Chicken Tamara.",
      [
        { amount: "1 piece", item: "Tasso, cut up" },
        { amount: "a little", item: "Butter" },
        { amount: "5", item: "Shallots, chopped" },
        { amount: "1", item: "White onion, chopped" },
        { amount: "1 stick", item: "Celery, chopped" },
        { amount: "2 oz", item: "Rosemary" },
        { amount: "2 oz", item: "Thyme" },
        { amount: "2 oz", item: "Minced garlic" },
        { amount: "5 dashes", item: "Tabasco" },
        { amount: "1 oz", item: "Salt" },
        { amount: "as needed", item: "Heavy cream" },
      ],
      [
        "Saute tasso first with a little butter.",
        "In a mixing bowl add shallots, onion, celery, rosemary, thyme, garlic, Tabasco, and salt.",
        "After the tasso is sauteed, mix all together and blend.",
        "Add heavy cream. Do not boil — let it down a little.",
      ]
    ),
    recipe(
      "house-crab-cakes",
      "Crab Cakes",
      "Appetizers",
      "12-can batch",
      "30 minutes",
      "House crab cakes pressed in a perforated pan.",
      [
        { amount: "12 cans", item: "Crab meat" },
        { amount: "2 scoops", item: "Dijon mustard" },
        { amount: "4 scoops", item: "Mayonnaise" },
        { amount: "3 bags", item: "Fajita mix, chopped" },
        { amount: "8 squirts", item: "Lemon juice" },
        { amount: "8 squirts", item: "Worcestershire" },
        { amount: "12", item: "Eggs" },
        { amount: "2 oz", item: "Tony's" },
      ],
      [
        "Mix all together.",
        "Put in a 6-inch perforated pan and let drain.",
        "Set a pan on top to smash.",
      ]
    ),
    recipe(
      "house-brussels",
      "Brussels Sprouts",
      "Sides",
      "1 pot",
      "20 minutes",
      "Boiled brussels, shocked in ice.",
      [{ amount: "1 pot", item: "Brussels sprouts" }],
      [
        "Fill a big pot with brussels and cover with water.",
        "Boil — can take up to 15 minutes.",
        "When they are soft, take off and put in an ice bath.",
      ]
    ),
    recipe(
      "house-risotto",
      "Risotto",
      "Sides",
      "4 boxes",
      "30 minutes",
      "Steamed risotto spread to cool.",
      [
        { amount: "4 boxes", item: "Risotto" },
        { amount: "1/2 pitcher", item: "Water" },
      ],
      [
        "Put 4 boxes in a round pot with 1/2 pitcher of water.",
        "Watch closely, let it boil, and keep stirring.",
        "Cover with a big pan. When you see no white specks, turn off and let it steam.",
        "Spread on a sheet pan.",
      ]
    ),
    recipe(
      "house-gumbo",
      "Gumbo",
      "Soups",
      "1 pot",
      "45 minutes",
      "House gumbo. Expo adds shrimp.",
      [
        { amount: "4 bags", item: "Gumbo bags" },
        { amount: "8", item: "Bay leaves" },
        { amount: "1 bag", item: "Fajita mix, blended" },
        { amount: "1/6 pan", item: "Okra" },
        { amount: "1 oz", item: "Tony's" },
        { amount: "1 cup", item: "Water" },
        { amount: "1 can", item: "Crab meat" },
        { amount: "1 bag", item: "Crawfish tails" },
      ],
      ["Add all together and cook till warm.", "Expo will add shrimp."],
      "Do not add shrimp on the prep line."
    ),
    recipe(
      "house-clam-chowder",
      "Clam Chowder",
      "Soups",
      "1 pot",
      "45 minutes",
      "House clam chowder.",
      [
        { amount: "2 cans", item: "Clam juice" },
        { amount: "2 cans", item: "Clams" },
        { amount: "1 lb", item: "Butter" },
        { amount: "3 squirts", item: "Chicken base" },
        { amount: "1 bag", item: "Frozen corn" },
        { amount: "1 carton", item: "Heavy cream" },
        { amount: "1 gallon", item: "Milk" },
        { amount: "2 oz", item: "Salt" },
        { amount: "1 oz", item: "Red pepper" },
        { amount: "1 oz", item: "Parsley" },
        { amount: "1 bag", item: "Cubed potato" },
        { amount: "2 oz", item: "Minced garlic" },
      ],
      ["Add all together and cook until the potatoes are tender and the chowder is hot."]
    ),
    recipe(
      "house-blue-cheese-dressing",
      "Blue Cheese Dressing",
      "Dressings",
      "1 gallon",
      "10 minutes",
      "House blue cheese dressing.",
      [
        { amount: "1 gallon", item: "Blue cheese" },
        { amount: "1/2 bag", item: "Blue cheese crumbles" },
        { amount: "1 cup", item: "Honey" },
        { amount: "2 oz", item: "Minced garlic" },
        { amount: "1/4 cup", item: "Parsley" },
        { amount: "1 cup", item: "White wine (Moscato)" },
      ],
      ["Mix all together."]
    ),
    recipe(
      "house-ranch",
      "Ranch",
      "Dressings",
      "1 gallon",
      "5 minutes",
      "Ranch finished with Hidden Valley.",
      [
        { amount: "1 gallon", item: "Ranch dressing" },
        { amount: "1 packet", item: "Dry ranch (Hidden Valley)" },
      ],
      ["Mix the gallon of ranch with one packet of dry Hidden Valley ranch."]
    ),
    recipe(
      "house-mint-jelly",
      "Mint Jelly",
      "Sauces",
      "1 small jar",
      "10 minutes",
      "Mint jelly loosened with Moscato.",
      [
        { amount: "1 small jar", item: "Mint jelly" },
        { amount: "1/4 cup", item: "White wine (Moscato)" },
      ],
      ["Warm mint jelly with Moscato and boil until done."]
    ),
    recipe(
      "house-horseradish-cream",
      "Horseradish Cream",
      "Sauces",
      "1/2 gallon",
      "5 minutes",
      "Horsey cream.",
      [
        { amount: "4 cups", item: "Horseradish" },
        { amount: "1/2 gallon", item: "Mayonnaise" },
      ],
      ["Mix horseradish and mayonnaise."]
    ),
    recipe(
      "house-tuna-dip",
      "Tuna Dip",
      "Dips",
      "1 can batch",
      "15 minutes",
      "Smoked tuna dip.",
      [
        { amount: "1 can", item: "Tuna, drained" },
        { amount: "2/3", item: "Mayonnaise" },
        { amount: "3 handfuls", item: "Feta" },
        { amount: "1 handful", item: "Shallots" },
        { amount: "1 capful", item: "Smoke liquid" },
      ],
      ["Drain the tuna.", "Mix with mayonnaise, feta, shallots, and liquid smoke."]
    ),
    recipe(
      "house-avocado-fries",
      "Avocado Fries",
      "Appetizers",
      "1 batch",
      "30 minutes plus freeze",
      "Breaded avocado fries. Avocados should be ripe.",
      [
        { amount: "as needed", item: "Ripe avocados, cut" },
        { amount: "as needed", item: "Flour" },
        { amount: "as needed", item: "Milk-egg mix" },
        { amount: "as needed", item: "Panko" },
      ],
      [
        "Avocados should be ripe. Cut and put on a sheet pan, then freeze.",
        "Set up the wash: flour, milk-egg, panko. Take avocados out 1st so they do not thaw. Fill the pan.",
        "Refreeze.",
      ],
      "If you have to stop, put them back in the freezer until you can get back to them."
    ),
    recipe(
      "house-crab-meat-pie",
      "Crab Meat Pie",
      "Appetizers",
      "8 pastry shells",
      "45 minutes",
      "Crab meat pie in pastry shells.",
      [
        { amount: "8", item: "Pastry shells, thawed" },
        { amount: "2 oz", item: "Pecans, on the bottom" },
        { amount: "2 cans", item: "Crab meat" },
        { amount: "1", item: "Diced onion, sauteed first" },
        { amount: "8 oz", item: "Cream cheese, soft" },
        { amount: "1 scoop", item: "Mayonnaise" },
        { amount: "4 splashes", item: "Tabasco" },
        { amount: "a sprinkle", item: "Tony's" },
        { amount: "1/4 cup", item: "Mix cheese" },
        { amount: "1/4 cup", item: "Gouda" },
        { amount: "1/4 cup", item: "Parmesan" },
        { amount: "3", item: "Eggs" },
      ],
      [
        "Thaw 8 pastry shells. Spray a cheesecake ring and lay shells in it.",
        "Add 2 oz pecans on the bottom of the pastry.",
        "Saute the onion. Mix crab, onion, cream cheese, mayonnaise, Tabasco, Tony's, cheeses, and eggs.",
        "Put the mix in the ring, top with 2 pastry shells, and baste egg white on top.",
        "Bake 350°F for 30 minutes.",
      ]
    ),
    recipe(
      "house-house-dressing",
      "House Dressing",
      "Dressings",
      "About 2 gallons",
      "10 minutes",
      "House vinaigrette-style dressing.",
      [
        { amount: "2 (144 oz)", item: "Honey" },
        { amount: "1 gal", item: "Oil (canola / virgin olive blend)" },
        { amount: "1 gal", item: "Apple cider" },
        { amount: "1 liter", item: "Red wine (PW)" },
        { amount: "2 (9.6 oz)", item: "Dry ranch" },
      ],
      ["Mix honey, oil, apple cider, red wine, and dry ranch until even."]
    ),
  ];
}

export function syncRecipes(recipes: Recipe[]) {
  const seeded = seedRecipes();
  const seedIds = new Set(seeded.map((entry) => entry.id));
  const byId = new Map(recipes.map((entry) => [entry.id, entry]));
  let changed = false;
  const removed: string[] = [];
  for (const seed of seeded) {
    if (!byId.has(seed.id)) {
      recipes.push(seed);
      changed = true;
    }
  }
  for (let index = recipes.length - 1; index >= 0; index -= 1) {
    const id = recipes[index].id;
    if (RETIRED_RECIPE_IDS.includes(id) && !seedIds.has(id)) {
      removed.push(id);
      recipes.splice(index, 1);
      changed = true;
    }
  }
  return { changed, removed };
}
