"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SELECTED_EVENT_COOKIE_NAME } from "../../lib/auth";

export async function selectEvent(eventId: string, eventName: string) {
  const cookieStore = cookies();
  
  cookieStore.set({
    name: SELECTED_EVENT_COOKIE_NAME,
    value: JSON.stringify({ id: eventId, name: eventName }),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  redirect("/scanner");
}

export async function clearEventSelection() {
  const cookieStore = cookies();
  cookieStore.delete(SELECTED_EVENT_COOKIE_NAME);
  redirect("/events");
}

