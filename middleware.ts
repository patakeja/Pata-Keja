import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_ROLE_COOKIE_NAME, AUTH_STATE_COOKIE_NAME } from "@/config/auth-session";

type AppRole = "tenant" | "landlord" | "admin";

function getRoleHomePath(role: AppRole) {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "landlord") {
    return "/landlord/dashboard";
  }

  return "/user/dashboard";
}

function getAuthenticatedRole(request: NextRequest): AppRole | null {
  const isAuthenticated = request.cookies.get(AUTH_STATE_COOKIE_NAME)?.value === "1";

  if (!isAuthenticated) {
    return null;
  }

  const role = request.cookies.get(AUTH_ROLE_COOKIE_NAME)?.value;

  if (role === "tenant" || role === "landlord" || role === "admin") {
    return role;
  }

  return "tenant";
}

function createLoginRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("redirectTo", nextPath);

  return NextResponse.redirect(loginUrl);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const role = getAuthenticatedRole(request);

  if (pathname === "/login" || pathname === "/signup") {
    if (role) {
      return NextResponse.redirect(new URL(role === "admin" ? "/admin/verify" : getRoleHomePath(role), request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return createLoginRedirect(request);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/landlord")) {
    if (role !== "landlord" && role !== "admin") {
      return createLoginRedirect(request);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/user")) {
    if (!role) {
      return createLoginRedirect(request);
    }

    return NextResponse.next();
  }

  if (pathname === "/" && role) {
    return NextResponse.redirect(new URL(getRoleHomePath(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
