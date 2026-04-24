import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isStudentRoute = createRouteMatcher(["/user/(.*)"]);
const isTeacherRoute = createRouteMatcher(["/teacher/(.*)"]);

async function fetchUserRoleFromClerk(userId: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[middleware] CLERK_SECRET_KEY missing; cannot fetch role");
    }
    return undefined;
  }

  const url = `https://api.clerk.com/v1/users/${userId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    // Avoid caching role across requests in dev.
    cache: "no-store",
  });

  if (!res.ok) {
    if (process.env.NODE_ENV !== "production") {
      let bodyText: string | undefined;
      try {
        bodyText = await res.text();
      } catch {}
      console.warn("[middleware] Clerk user fetch failed", {
        url,
        status: res.status,
        statusText: res.statusText,
        body: bodyText?.slice(0, 500),
      });
    }
    return undefined;
  }

  const data: any = await res.json();
  const userType = data?.public_metadata?.userType;
  return userType === "teacher" || userType === "student" ? userType : undefined;
}

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims, userId } = await auth();
  // Clerk session JWT claims can expose metadata under different keys depending on template/version.
  // Prefer `publicMetadata` (source of truth), but fall back to `metadata` to avoid breaking older sessions.
  let userRole =
    ((sessionClaims as any)?.publicMetadata?.userType as
      | "student"
      | "teacher"
      | undefined) ||
    ((sessionClaims as any)?.metadata?.userType as
      | "student"
      | "teacher"
      | undefined) ||
    "student";
  let roleSource: "claims" | "clerk" = "claims";

  // If the session token doesn't include metadata claims, fall back to fetching the user.
  // This makes role-based routing work even without a custom JWT template.
  const claimsHaveRole = Boolean(
    (sessionClaims as any)?.publicMetadata?.userType ||
      (sessionClaims as any)?.metadata?.userType
  );
  if (!claimsHaveRole && userId && (isStudentRoute(req) || isTeacherRoute(req))) {
    try {
      const fetchedRole = await fetchUserRoleFromClerk(userId);
      if (fetchedRole === "teacher" || fetchedRole === "student") {
        userRole = fetchedRole;
        roleSource = "clerk";
      }
    } catch (e) {
      // If user fetch fails, keep default role to avoid middleware hard-failing.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[middleware] failed to fetch Clerk user for role", {
          userId,
          error: (e as any)?.message,
        });
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[middleware] role check", {
      version: "clerk-api-fallback-v1",
      pathname: req.nextUrl.pathname,
      userRole,
      roleSource,
      hasPublicMetadata: Boolean((sessionClaims as any)?.publicMetadata),
      hasMetadata: Boolean((sessionClaims as any)?.metadata),
    });
  }

  if (isStudentRoute(req)) {
    if (userRole !== "student") {
      const url = new URL("/teacher/courses", req.url);
      return NextResponse.redirect(url);
    }
  }

  if (isTeacherRoute(req)) {
    if (userRole !== "teacher") {
      const url = new URL("/user/courses", req.url);
      return NextResponse.redirect(url);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
