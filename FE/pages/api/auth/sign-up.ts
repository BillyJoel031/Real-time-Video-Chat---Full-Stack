import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username, email, password } = req.body;

  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ message: "Username, email, and password are required" });
  }

  try {
    const endpoint = `${process.env.API_URL}/register`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (response.ok) {
      return res.status(200).json({ message: "Registration successful" });
    }

    return res.status(400).json({ message: "Registration failed" });
  } catch (error) {
    console.error("Failed to register:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
