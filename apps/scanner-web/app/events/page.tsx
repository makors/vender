import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { BEARER_TOKEN_COOKIE_NAME, SELECTED_EVENT_COOKIE_NAME } from "../../lib/auth";
import { EventPicker } from "./event-picker";

export const metadata: Metadata = {
  title: "Select Event | Vender",
};

export default function EventsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get(BEARER_TOKEN_COOKIE_NAME)?.value;

  if (!token || token.length === 0) {
    redirect("/login");
  }

  // If an event is already selected, go to scanner
  const selectedEvent = cookieStore.get(SELECTED_EVENT_COOKIE_NAME)?.value;
  if (selectedEvent && selectedEvent.length > 0) {
    redirect("/scanner");
  }

  return <EventPicker />;
}

