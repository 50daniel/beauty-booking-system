import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage() {
  const user = await getCurrentAdminUser();
  if (user) redirect("/admin");

  return <LoginForm />;
}
