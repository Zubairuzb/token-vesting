import OwnerDashboard from "@/components/OwnerDashboard";

// This is the /owner route.
// It renders the OwnerDashboard component.
// Keeping pages thin and components fat is best practice —
// pages just import and render, components hold the logic
export default function OwnerPage() {
    return <OwnerDashboard />;
}