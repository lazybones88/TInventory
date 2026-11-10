import { Header } from "@/components/Header";
import { InventorySheet } from "@/components/InventorySheet";

export default function OrderingPage() {
  return (
    <>
      <Header title="Manager ordering" subtitle="Pick one vendor, then send. That house's inventory goes to the owner, and to the vendor if they have an email." />
      <InventorySheet
        type="ordering"
        title="order report"
        subtitle="Open a vendor, count what you have, and send only that house. Records keep each vendor under its own name."
      />
    </>
  );
}
