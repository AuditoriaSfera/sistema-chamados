import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  // recuperação de senha precisa funcionar justamente para quem não consegue entrar
  const isRecuperacao =
    req.nextUrl.pathname.startsWith("/esqueci-senha") ||
    req.nextUrl.pathname.startsWith("/redefinir-senha");
  const isPublica = isLoginPage || isRecuperacao;

  if (!isLoggedIn && !isPublica) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isPublica) {
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
