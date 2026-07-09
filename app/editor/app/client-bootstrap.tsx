"use client";

// Importing this module runs lib/bootstrap's side effect (registers the built-in
// node kinds) on the client before the editor tree renders. Mounted from layout.
import "../lib/bootstrap";

export function ClientBootstrap({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
