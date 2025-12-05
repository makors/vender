"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BEARER_TOKEN_COOKIE_NAME, SELECTED_EVENT_COOKIE_NAME } from "../../lib/auth";

export async function signOut() {
  const cookieStore = cookies();
  
  // Clear both cookies
  cookieStore.set({
    name: BEARER_TOKEN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 0,
  });
  
  cookieStore.set({
    name: SELECTED_EVENT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 0,
  });

  redirect("/login");
}

export async function changeEvent() {
  const cookieStore = cookies();
  
  // Clear the event selection cookie
  cookieStore.set({
    name: SELECTED_EVENT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: 0,
  });

  redirect("/events");
}
