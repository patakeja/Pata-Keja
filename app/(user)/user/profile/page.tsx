import { PlaceholderPanel } from "@/components/ui/placeholder-panel";

export default function UserProfilePage() {
  return (
    <PlaceholderPanel
      title="Profile and preferences"
      description="Identity, saved preferences, and verification states should evolve independently from presentation components."
      hint="Auth-driven profile data will be sourced from Supabase through the auth and profile service layer."
    />
  );
}
