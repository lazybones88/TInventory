import { Header } from "@/components/Header";
import { InventorySheet } from "@/components/InventorySheet";

export default function OrderingPage() {
  return (
    <>
      <Header title="Manager ordering" subtitle="Par, on hand, and what to buy. Pars stay admin-only." />
      <InventorySheet
        type="ordering"
        title="order report"
        subtitle="On-hand fills a suggested order quantity. Change it if the truck needs more or less."
      />
    </>
  );
}
