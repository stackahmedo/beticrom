import type { Context, Next } from "hono";

export function requirePermission(...requiredPermissions: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("authUser");
    if (!user) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
    }

    if (user.roles.includes("super_admin")) {
      await next();
      return;
    }

    const hasAny = requiredPermissions.some((perm) => user.permissions.includes(perm));
    if (!hasAny) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: `Missing required permission: ${requiredPermissions.join(" or ")}`,
          },
        },
        403
      );
    }

    await next();
  };
}

export function isVendorScoped(c: Context): boolean {
  const user = c.get("authUser");
  if (!user) return false;
  return Boolean(user.vendorId && !user.roles.includes("super_admin") && !user.roles.includes("store_manager"));
}
