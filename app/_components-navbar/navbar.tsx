import { createServerSupabaseClient } from "@/lib/server-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { headers } from "next/headers";

function getPathnameFromHeaders() {
  const h = headers();

  // Next can provide different headers depending on runtime.
  // This is the most reliable one in App Router for the active path.
  const nextUrl = h.get("next-url");
  if (nextUrl) return nextUrl;

  // Fallback (sometimes available depending on hosting/middleware)
  const referer = h.get("referer");
  if (referer) {
    try {
      return new URL(referer).pathname;
    } catch {
      // ignore
    }
  }

  return "/";
}

function navLinkClass(isActive: boolean) {
  return cn(
    "text-sm font-medium transition-colors hover:text-primary",
    isActive ? "text-primary" : "text-muted-foreground"
  );
}

export default async function Navbar({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  // Create supabase server component client and obtain user session from stored cookie
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = getPathnameFromHeaders();

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      <Link href="/" className={navLinkClass(pathname === "/")}>
        Home
      </Link>

      {user ? (
        <>
          <Link href="/species" className={navLinkClass(pathname === "/species")}>
            Species
          </Link>

          <Link
            href="/species/speed"
            className={navLinkClass(pathname === "/species/speed")}
          >
            Speed Graph
          </Link>
        </>
      ) : null}
    </nav>
  );
}

