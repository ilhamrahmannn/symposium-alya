import type { User } from "firebase/auth";

export async function requestRegistrationEmail(user: User, registrationId: string, type: "received" | "confirmed") {
  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/registration-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ registrationId, type }),
    });
    if (!response.ok) return false;
    const result = await response.json() as { sent?: boolean };
    return result.sent === true;
  } catch {
    return false;
  }
}
