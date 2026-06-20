import { requireManagerPageUser } from "@/lib/auth";
import { ServiceSettings } from "./service-settings";

export default async function ServicesSettingsPage() {
  await requireManagerPageUser();
  return <ServiceSettings />;
}
