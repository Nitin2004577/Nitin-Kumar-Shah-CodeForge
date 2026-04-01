import { currentUser } from "../../../../features/auth/actions";
import { redirect } from "next/navigation";
import { SettingsClient } from "../../../../features/settings/components/settings-client";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/auth/sign-in");

  return (
    <SettingsClient
      user={{
        id: (user as any).id ?? "",
        name: user.name ?? "",
        email: user.email ?? "",
        image: user.image ?? "",
        role: (user as any).role ?? "USER",
        provider: (user as any).provider ?? "",
      }}
    />
  );
}
