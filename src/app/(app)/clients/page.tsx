"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { ClientDirectory } from "@/components/clients/client-directory";
import { mapClient } from "@/lib/clients";
import { api } from "../../../../convex/_generated/api";

export default function ClientsPage() {
  const convexClients = useQuery(api.crm.listClients, {});
  const clients = useMemo(
    () => (convexClients ?? []).map(mapClient),
    [convexClients],
  );

  return (
    <ClientDirectory clients={clients} isLoading={convexClients === undefined} />
  );
}
