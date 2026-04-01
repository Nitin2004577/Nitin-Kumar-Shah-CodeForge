"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  User,
  Palette,
  Shield,
  Trash2,
  LogOut,
  Github,
  Chrome,
  Moon,
  Sun,
  Monitor,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SettingsUser {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  provider: string;
}

interface SettingsClientProps {
  user: SettingsUser;
}

const NAV_ITEMS = [
  { id: "profile",    label: "Profile",    icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account",    label: "Account",    icon: Shield },
  { id: "danger",     label: "Danger Zone",icon: AlertTriangle },
];

export function SettingsClient({ user }: SettingsClientProps) {
  const [activeSection, setActiveSection] = useState("profile");
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Nav */}
      <aside className="w-56 shrink-0 border-r bg-muted/30 p-4 flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to Dashboard
        </Link>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
          Settings
        </p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors text-left",
              activeSection === id
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 max-w-2xl">
        {activeSection === "profile"    && <ProfileSection user={user} />}
        {activeSection === "appearance" && <AppearanceSection theme={theme} setTheme={setTheme} />}
        {activeSection === "account"    && <AccountSection user={user} />}
        {activeSection === "danger"     && <DangerSection />}
      </main>
    </div>
  );
}

/* ─── Profile ─────────────────────────────────────────────── */
function ProfileSection({ user }: { user: SettingsUser }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Your public identity on CodeForge.</p>
      </div>
      <Separator />

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-border">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name} className="object-cover w-full h-full" />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center text-2xl font-bold">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Badge variant="secondary" className="mt-1 text-xs capitalize">
            {user.role.toLowerCase().replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Read-only fields */}
      <div className="space-y-4">
        <Field label="Display Name" value={user.name} />
        <Field label="Email Address" value={user.email} />
        <Field label="User ID" value={user.id} mono />
      </div>

      <p className="text-xs text-muted-foreground">
        Profile details are managed by your OAuth provider ({user.provider || "unknown"}) and update automatically on each login.
      </p>
    </div>
  );
}

/* ─── Appearance ──────────────────────────────────────────── */
function AppearanceSection({
  theme,
  setTheme,
}: {
  theme: string | undefined;
  setTheme: (t: string) => void;
}) {
  const options = [
    { value: "light",  label: "Light",  icon: Sun },
    { value: "dark",   label: "Dark",   icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize how CodeForge looks.</p>
      </div>
      <Separator />

      <div>
        <p className="text-sm font-medium mb-3">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => { setTheme(value); toast.success(`Theme set to ${label}`); }}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-sm",
                theme === value
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Account ─────────────────────────────────────────────── */
function AccountSection({ user }: { user: SettingsUser }) {
  const ProviderIcon = user.provider === "github" ? Github : Chrome;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your connected accounts and session.</p>
      </div>
      <Separator />

      {/* Connected provider */}
      <div>
        <p className="text-sm font-medium mb-3">Connected Provider</p>
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
          <ProviderIcon className="h-5 w-5" />
          <div className="flex-1">
            <p className="text-sm font-medium capitalize">{user.provider || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="outline" className="text-xs text-green-600 border-green-600">
            Active
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Sign out */}
      <div>
        <p className="text-sm font-medium mb-1">Session</p>
        <p className="text-xs text-muted-foreground mb-3">
          Sign out of your current session on this device.
        </p>
        <Button
          variant="outline"
          onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

/* ─── Danger Zone ─────────────────────────────────────────── */
function DangerSection() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mt-1">Irreversible actions. Proceed with caution.</p>
      </div>
      <Separator />

      <div className="rounded-lg border border-destructive/40 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Trash2 className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete your account and all associated projects. This cannot be undone.
            </p>
          </div>
        </div>

        {!confirming ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            Delete My Account
          </Button>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <p className="text-xs text-destructive font-medium">Are you absolutely sure?</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => toast.error("Account deletion is not yet implemented.")}
            >
              Yes, delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Shared Field ────────────────────────────────────────── */
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="px-3 py-2 rounded-md border bg-muted/40 text-sm">
        <span className={cn(mono && "font-mono text-xs")}>{value}</span>
      </div>
    </div>
  );
}
