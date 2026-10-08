"use client";

import { Home } from "@/components/home/Home";
import { useStore } from "@/lib/store";

export function HomeView() {
  const { state, respondToInvite } = useStore();
  return <Home state={state} onRespondInvite={(inviteId, status) => respondToInvite(inviteId, status)} />;
}
