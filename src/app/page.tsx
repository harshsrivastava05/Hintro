import { getCurrentUser } from "@/actions/auth";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main>
      <AuthScreen />
    </main>
  );
}
