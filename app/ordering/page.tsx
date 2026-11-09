import { Header } from "@/components/Header";
import { InventorySheet } from "@/components/InventorySheet";

export default function OrderingPage() {
  return (
    <>
      <Header title="Manager ordering" subtitle="Order by vendor. Send emails the owner, and each vendor with an email gets only their own order." />
      <InventorySheet
        type="ordering"
        title="order report"
        subtitle="Pick a vendor, count what you have, and add anything new that vendor starts carrying."
      />
    </>
  );
}
