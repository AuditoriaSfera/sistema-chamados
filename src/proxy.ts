import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/tickets", req.nextUrl.origin));
  }

  const isTrocaSenhaPage = req.nextUrl.pathname.startsWith("/conta/senha");
  if (isLoggedIn && req.auth?.user.senhaProvisoria && !isTrocaSenhaPage) {
    return NextResponse.redirect(new URL("/conta/senha", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
