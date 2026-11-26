export const clerkAppearance = {
  variables: {
    colorPrimary: "#3C1280",
    colorText: "#24124A",
    colorTextSecondary: "#5C5470",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#24124A",
    colorDanger: "#8C2F16",
    borderRadius: "0.9rem",
    fontFamily: "var(--font-sans), 'Segoe UI', sans-serif",
  },
  elements: {
    card: {
      boxShadow: "0 16px 40px rgba(36, 18, 74, 0.08)",
      border: "1px solid #e4dcf2",
    },
    formButtonPrimary: {
      backgroundColor: "#3C1280",
      color: "#ffffff",
      minHeight: "46px",
    },
    socialButtonsBlockButton: {
      border: "1px solid #e4dcf2",
      color: "#24124A",
    },
    footerActionLink: {
      color: "#3C1280",
    },
  },
};

export function clerkPublishableConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return key.startsWith("pk_test_") || key.startsWith("pk_live_");
}

export const PROFILE_ROLES = ["student", "university", "agent", "admin"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export function explicitRole(metadata: unknown): ProfileRole | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = "role" in metadata ? (metadata as { role?: unknown }).role : null;
  if (value === "student" || value === "university" || value === "agent" || value === "admin") return value;
  return null;
}

export function roleFromPublicMetadata(metadata: unknown): ProfileRole {
  return explicitRole(metadata) ?? "student";
}

export function displayName(user: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}): string {
  const joined = [user.first_name, user.last_name].filter((part) => part && part.trim()).join(" ").trim();
  return joined || user.username?.trim() || "";
}

export function primaryEmail(user: {
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id: string; email_address: string }>;
}): string | null {
  const addresses = user.email_addresses ?? [];
  const primary = addresses.find((item) => item.id === user.primary_email_address_id);
  return primary?.email_address ?? addresses[0]?.email_address ?? null;
}

export function profileFields(
  user: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    primary_email_address_id?: string | null;
    email_addresses?: Array<{ id: string; email_address: string }>;
    public_metadata?: unknown;
  },
  event: "created" | "updated",
): { id: string; email: string | null; full_name: string | null; role?: ProfileRole } {
  const fields: { id: string; email: string | null; full_name: string | null; role?: ProfileRole } = {
    id: user.id,
    email: primaryEmail(user),
    full_name: displayName(user) || null,
  };
  const role = explicitRole(user.public_metadata);
  if (event === "created") fields.role = role ?? "student";
  else if (role) fields.role = role;
  return fields;
}
