import { CITY_PRODUCE, sortCityProduce } from "./catalog";

export const CITY_PRODUCE_TEST_PHONE = "2512232291";

const FAKE_ORDER = [
  { name: "Romaine", category: "Walk-in", unit: "cs", orderQty: "2" },
  { name: "Spring Mix", category: "Walk-in", unit: "cs", orderQty: "1" },
  { name: "Arugula", category: "Walk-in", unit: "cs", orderQty: "1" },
  { name: "Head Lettuce", category: "Walk-in", unit: "cs", orderQty: "1" },
  { name: "Fresh Spinach", category: "Walk-in", unit: "cs", orderQty: "1" },
  { name: "Heirloom Tomatoes", category: "Walk-in", unit: "lb", orderQty: "10" },
  { name: "Avocados", category: "Walk-in", unit: "cs", orderQty: "1" },
  { name: "Strawberries", category: "Brunch cooler", unit: "cs", orderQty: "1" },
  { name: "Blueberries", category: "Brunch cooler", unit: "cs", orderQty: "1" },
  { name: "Parmesan", category: "Brunch cooler", unit: "lb", orderQty: "2" },
  { name: "Lemons", category: "Bar cooler", unit: "cs", orderQty: "1" },
  { name: "Limes", category: "Bar cooler", unit: "cs", orderQty: "1" },
  { name: "Oranges", category: "Bar cooler", unit: "cs", orderQty: "1" },
  { name: "Mangoes", category: "Bar cooler", unit: "each", orderQty: "6" },
];

export function fakeCityProduceSms(phone = CITY_PRODUCE_TEST_PHONE) {
  const date = new Date().toLocaleDateString("en-CA");
  const sorted = sortCityProduce(FAKE_ORDER);
  const body = [
    "TEST — fake order, do not fill",
    `Tamara's Downtown ${CITY_PRODUCE} order ${date}`,
    ...sorted.map((line) => `${line.name}: ${line.orderQty} ${line.unit}`),
  ].join("\n");
  return { phone, body };
}
