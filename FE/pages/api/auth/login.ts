import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const endpoint = `${process.env.API_URL}/login`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(401).json({ message: "Invalid credentials" });
  } catch (error) {
    console.error("Failed to login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
