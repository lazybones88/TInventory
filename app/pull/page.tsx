import { Header } from "@/components/Header";
import { InventorySheet } from "@/components/InventorySheet";

export default function PullPage() {
  return (
    <>
      <Header title="Pull inventory" subtitle="Count steaks and seafood, then write what to pull. Add more anytime." />
      <InventorySheet
        type="pull"
        title="pull report"
        subtitle="Save anytime. Send when the pull is set — the owner gets the sheet."
      />
    </>
  );
}
