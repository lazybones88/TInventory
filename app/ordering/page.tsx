import { Header } from "@/components/Header";
import { InventorySheet } from "@/components/InventorySheet";

export default function OrderingPage() {
  return (
    <>
      <Header title="Manager ordering" subtitle="Par, on hand, and what to buy. Pars stay admin-only." />
      <InventorySheet
        type="ordering"
        title="order report"
        subtitle="Save the order sheet and come back later, or send it when buying is done."
      />
    </>
  );
}
