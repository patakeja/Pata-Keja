import { LocationManagementPanel } from "@/components/features/location/location-management-panel";

export default function AdminLocationsPage() {
  return (
    <LocationManagementPanel
      title="Manage locations"
      description="Create areas under preloaded Kenyan counties and seeded towns, or add a new town manually when needed."
    />
  );
}
