"use client";

import { useState } from "react";

import { AdminCreatedHousesPanel } from "@/components/features/admin/admin-created-houses-panel";
import { LocationManagementPanel } from "@/components/features/location/location-management-panel";
import { CreateListingForm } from "@/components/features/listings/create-listing-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdminListingsWorkspace() {
  const [activeView, setActiveView] = useState<"create" | "created">("create");
  const [catalogRefreshToken, setCatalogRefreshToken] = useState(0);
  const [housesRefreshToken, setHousesRefreshToken] = useState(0);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">House administration</h1>
            <p className="text-xs text-muted-foreground">
              Create houses for specific landlords, then manage all created inventory from one admin workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeView === "create" ? "primary" : "outline"}
              type="button"
              onClick={() => setActiveView("create")}
            >
              Create house
            </Button>
            <Button
              variant={activeView === "created" ? "primary" : "outline"}
              type="button"
              onClick={() => setActiveView("created")}
            >
              Created houses
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeView === "create" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <CreateListingForm
            workspaceLabel="Admin"
            title="Create house"
            description="Choose the landlord first, then publish the house with the same service-driven pipeline used across the platform."
            catalogRefreshToken={catalogRefreshToken}
            redirectOnSuccess={false}
            onCreated={() => {
              setHousesRefreshToken((current) => current + 1);
              setActiveView("created");
            }}
          />

          <div className="space-y-3">
            <LocationManagementPanel onLocationCreated={() => setCatalogRefreshToken((current) => current + 1)} />
          </div>
        </div>
      ) : (
        <AdminCreatedHousesPanel
          refreshToken={housesRefreshToken}
          onCreateRequested={() => setActiveView("create")}
        />
      )}
    </div>
  );
}
