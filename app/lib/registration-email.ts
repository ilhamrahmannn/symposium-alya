import type { User } from "firebase/auth";

export async function requestRegistrationEmail(user: User, registrationId: string, type: "received" | "confirmed") {
  const delays = [0, 700, 1800];
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    try {
      if (delays[attempt]) await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      const token = await user.getIdToken(attempt > 0);
      const response = await fetch("/api/registration-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ registrationId, type }),
      });
      const result = await response.json().catch(() => ({})) as { sent?: boolean; configured?: boolean };
      if (response.ok && result.sent === true) return true;
      if (result.configured === false || (response.status >= 400 && response.status < 500)) return false;
    } catch {
      // Retry temporary network failures without interrupting registration creation.
    }
  }
  return false;
}
