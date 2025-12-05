import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { BEARER_TOKEN_COOKIE_NAME, SELECTED_EVENT_COOKIE_NAME } from "../../lib/auth";

import { ScannerConsole } from "./scanner-console";

export const metadata: Metadata = {
  title: "Ticket scanner | Vender",
};

type SelectedEvent = {
  id: string;
  name: string;
};

export default function ScannerPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(BEARER_TOKEN_COOKIE_NAME)?.value;

  if (!token || token.length === 0) {
    redirect("/login");
  }

  // Check if an event is selected
  const selectedEventCookie = cookieStore.get(SELECTED_EVENT_COOKIE_NAME)?.value;
  if (!selectedEventCookie) {
    redirect("/events");
  }

  let selectedEvent: SelectedEvent;
  try {
    selectedEvent = JSON.parse(selectedEventCookie);
  } catch {
    redirect("/events");
  }

  // this is fine because no data can be accessed without the bearer token
  return <ScannerConsole selectedEvent={selectedEvent} />;
}
