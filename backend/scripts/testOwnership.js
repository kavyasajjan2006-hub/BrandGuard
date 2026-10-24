const BASE_URL = "http://127.0.0.1:5000";

const REVIEW_ID = "6adc9a4c517f174ab1c229c6";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);

  let data = null;
  try {
    data = await response.json();
  } catch {
    // The response may be a PDF or another non-JSON response.
  }

  return {
    status: response.status,
    data,
    contentType: response.headers.get("content-type") || "",
  };
}

async function main() {
  let passed = 0;
  let failed = 0;

  async function test(name, callback) {
    try {
      const result = await callback();

      if (result) {
        passed++;
        console.log(`PASS: ${name}`);
      } else {
        failed++;
        console.log(`FAIL: ${name}`);
      }
    } catch (error) {
      failed++;
      console.log(`FAIL: ${name} — ${error.message}`);
    }
  }

  const email = `ownership-test-${Date.now()}@example.com`;
  const password = `TempTest#${Date.now()}Aa`;

  console.log("Creating a temporary second user...");

  // Register a separate test account.
  const signup = await request("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Ownership Test User",
      email,
      password,
    }),
  });

  if (signup.status < 200 || signup.status >= 300) {
    console.log("Could not create the second user.");
    console.log("Signup status:", signup.status);
    console.log("Response:", signup.data);
    console.log(
      "Check the signup route and required fields in your auth routes."
    );
    process.exitCode = 1;
    return;
  }

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const token = login.data?.token;

  if (!token) {
    console.log("The temporary account was created, but login failed.");
    console.log("Response:", login.data);
    process.exitCode = 1;
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  console.log("\nRunning ownership tests...\n");

  await test("Second user cannot see the first user's reviews", async () => {
    const result = await request("/api/reviews", { headers });

    return (
      result.status === 200 &&
      Array.isArray(result.data?.reviews) &&
      !result.data.reviews.some((review) => review._id === REVIEW_ID)
    );
  });

  await test("Second user cannot access the first user's score", async () => {
    const result = await request(
      `/api/reviews/${REVIEW_ID}/score`,
      { headers }
    );

    return [403, 404].includes(result.status);
  });

  await test("Second user cannot download the first user's PDF report", async () => {
    const result = await request(
      `/api/reviews/${REVIEW_ID}/report/pdf`,
      { headers }
    );

    return (
      [403, 404].includes(result.status) &&
      !result.contentType.includes("application/pdf")
    );
  });

  console.log("\n--- Ownership Test Summary ---");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }

  console.log(
    "\nThe temporary account remains in MongoDB. You can remove it after testing."
  );
}

main().catch((error) => {
  console.error("Ownership test failed:", error.message);
  process.exitCode = 1;
});
