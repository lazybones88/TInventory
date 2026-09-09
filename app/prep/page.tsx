import { Header } from "@/components/Header";
import { InventorySheet } from "@/components/InventorySheet";

export default function PrepPage() {
  return (
    <>
      <Header title="Prep inventory" subtitle="No login needed. Pars are locked unless you are admin." />
      <InventorySheet
        type="prep"
        title="prep report"
        subtitle="Save anytime to come back later. Send when the board is done — counts stay stored."
      />
    </>
  );
}
