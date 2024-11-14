import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Loading state
  const router = useRouter();
  const { setUserEmail } = useUser();

  useEffect(() => {
    // Retrieve email and password from localStorage on component mount
    const savedEmail = localStorage.getItem("userEmail");
    const savedPassword = localStorage.getItem("password");

    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);

    // Clear email and password from localStorage after pre-filling
    localStorage.removeItem("email");
    localStorage.removeItem("password");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true); // Start loading

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();

        if (typeof window !== "undefined") {
          localStorage.setItem("userId", data.userId);
          localStorage.setItem("userEmail", email);
        }

        setUserEmail(email); // Set the user email in context
        router.push("/");
      } else {
        setError("Invalid username or password. Please try again.");
      }
    } catch (error) {
      console.error("An error occurred:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  // Check if user is already logged in, but only in the browser
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("userId")) {
      router.push("/");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
              required
            />
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-500"
            disabled={loading} // Disable button while loading
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center mt-4">
              <span className="text-gray-500">Processing your request...</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SignIn;
