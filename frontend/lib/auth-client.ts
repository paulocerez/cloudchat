import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.BACKEND_URL,
});

const signIn = async () => {
  const { data, error } = await authClient.signIn.social({
    provider: "google",
  });
};

