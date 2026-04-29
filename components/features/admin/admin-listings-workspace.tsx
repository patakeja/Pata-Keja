"use client";

import { useState } from "react";

import { LocationManagementPanel } from "@/components/features/location/location-management-panel";
import { CreateListingForm } from "@/components/features/listings/create-listing-form";

export function AdminListingsWorkspace() {
  const [catalogRefreshToken, setCatalogRefreshToken] = useState(0);

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <CreateListingForm
        workspaceLabel="Admin"
        title="House administration"
        description="Publish and manage inventory using the same service-driven pipeline as the rest of the platform."
        catalogRefreshToken={catalogRefreshToken}
      />

      <div className="space-y-3">
        <LocationManagementPanel onLocationCreated={() => setCatalogRefreshToken((current) => current + 1)} />
      </div>
    </div>
  );
}
