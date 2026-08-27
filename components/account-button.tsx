"use client";

import Link from "next/link";
import { UserCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function AccountButton() {
  return (
    <Link href="/account">
      <Button type="button" variant="secondary">
        <UserCircle size={18} aria-hidden="true" />
        Mon compte
      </Button>
    </Link>
  );
}
