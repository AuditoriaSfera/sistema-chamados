"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export function SignOutButton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <Button
        variant="outline"
        size="icon-sm"
        title="Sair"
        onClick={() => signOut({ redirectTo: "/login" })}
      >
        <LogOut className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => signOut({ redirectTo: "/login" })}
    >
      Sair
    </Button>
  );
}
