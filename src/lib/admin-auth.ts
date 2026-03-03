import { auth } from "@/lib/auth";

/**
 * Admin role hierarchy (higher = more access):
 * ADMIN (superadmin) > EDITOR > VIEWER
 * CUSTOMER has no admin access
 */

export type AdminRole = "ADMIN" | "EDITOR" | "VIEWER";

export type Resource =
  | "products"
  | "orders"
  | "dealers"
  | "invoices"
  | "settings"
  | "users"
  | "sliders"
  | "banners"
  | "coupons"
  | "reports";

export type Action = "r" | "w" | "d"; // read, write, delete

// Default permissions per role (fallback if user.permissions is null)
const DEFAULT_PERMISSIONS: Record<AdminRole, Record<Resource, string>> = {
  ADMIN: {
    products: "rwd",
    orders: "rwd",
    dealers: "rwd",
    invoices: "rwd",
    settings: "rw",
    users: "rwd",
    sliders: "rwd",
    banners: "rwd",
    coupons: "rwd",
    reports: "r",
  },
  EDITOR: {
    products: "rw",
    orders: "rw",
    dealers: "r",
    invoices: "r",
    settings: "r",
    users: "",
    sliders: "rw",
    banners: "rw",
    coupons: "r",
    reports: "r",
  },
  VIEWER: {
    products: "r",
    orders: "r",
    dealers: "r",
    invoices: "r",
    settings: "",
    users: "",
    sliders: "r",
    banners: "r",
    coupons: "r",
    reports: "r",
  },
};

export interface AdminSession {
  userId: string;
  email: string;
  name: string | null;
  role: AdminRole;
  permissions: Record<string, string> | null;
}

/**
 * Get admin session. Returns null if not an admin user.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user) return null;

  const role = (session.user as unknown as { role: string }).role;

  // Only ADMIN, EDITOR, VIEWER can access admin panel
  if (!["ADMIN", "EDITOR", "VIEWER"].includes(role)) return null;

  return {
    userId: session.user.id as string,
    email: session.user.email as string,
    name: (session.user.name as string) || null,
    role: role as AdminRole,
    permissions: null, // Will be loaded from DB if needed
  };
}

/**
 * Check if admin session has permission for a resource+action.
 * ADMIN role always has full access.
 */
export function hasPermission(
  role: AdminRole,
  userPermissions: Record<string, string> | null,
  resource: Resource,
  action: Action
): boolean {
  // ADMIN always has full access
  if (role === "ADMIN") return true;

  // Use user-specific permissions if set, otherwise use role defaults
  const perms = userPermissions || DEFAULT_PERMISSIONS[role];
  const resourcePerms = perms[resource] || "";

  return resourcePerms.includes(action);
}

/**
 * Require admin access. Returns admin session or throws 403 response.
 * Use in API routes.
 */
export async function requireAdmin(): Promise<AdminSession | false> {
  const session = await getAdminSession();
  if (!session) return false;
  return session;
}

/**
 * Require specific permission. Returns admin session or false.
 * For granular permission checks in API routes.
 *
 * Usage:
 *   const admin = await requirePermission("products", "w");
 *   if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
 */
export async function requirePermission(
  resource: Resource,
  action: Action
): Promise<AdminSession | false> {
  const session = await getAdminSession();
  if (!session) return false;

  // Load user permissions from DB if needed for non-ADMIN roles
  if (session.role !== "ADMIN") {
    const { db } = await import("@/lib/db");
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { permissions: true },
    });
    session.permissions = (user?.permissions as Record<string, string>) || null;
  }

  if (!hasPermission(session.role, session.permissions, resource, action)) {
    return false;
  }

  return session;
}

/**
 * Get role display name in Turkish
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Süper Admin";
    case "EDITOR":
      return "Editör";
    case "VIEWER":
      return "Görüntüleyici";
    case "CUSTOMER":
      return "Müşteri";
    default:
      return role;
  }
}

/**
 * List of all admin roles (for dropdowns)
 */
export const ADMIN_ROLES: { value: AdminRole; label: string }[] = [
  { value: "ADMIN", label: "Süper Admin" },
  { value: "EDITOR", label: "Editör" },
  { value: "VIEWER", label: "Görüntüleyici" },
];

/**
 * All resources with labels (for permission UI)
 */
export const RESOURCES: { value: Resource; label: string }[] = [
  { value: "products", label: "Ürünler" },
  { value: "orders", label: "Siparişler" },
  { value: "dealers", label: "Bayiler" },
  { value: "invoices", label: "Faturalar" },
  { value: "settings", label: "Ayarlar" },
  { value: "users", label: "Kullanıcılar" },
  { value: "sliders", label: "Slider" },
  { value: "banners", label: "Bannerlar" },
  { value: "coupons", label: "Kuponlar" },
  { value: "reports", label: "Raporlar" },
];
