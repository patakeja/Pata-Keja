import { CreateListingForm } from "@/components/features/listings/create-listing-form";

export default function AdminListingsPage() {
  return (
    <CreateListingForm
      workspaceLabel="Admin"
      title="House administration"
      description="Admins can publish, review, or seed house inventory here while keeping the same service-driven listing pipeline."
    />
  );
}
