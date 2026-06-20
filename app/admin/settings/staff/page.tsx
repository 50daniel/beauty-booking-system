import { requireManagerPageUser } from "@/lib/auth";
import { StaffSettings } from "./staff-settings";

export default async function StaffSettingsPage() {
  await requireManagerPageUser();
  return <StaffSettings />;
}
