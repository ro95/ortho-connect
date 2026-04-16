import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/auth/signin",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        return isLoggedIn;
      }

      if (isLoggedIn && nextUrl.pathname.startsWith("/auth/signin")) {
        return Response.redirect(new URL("/admin", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
