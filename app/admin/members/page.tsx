import { requireAdminPageUser } from "@/lib/auth";
import { MemberManagement } from "./member-management";

export default async function MembersPage() {
  await requireAdminPageUser();
  return <MemberManagement />;
}
