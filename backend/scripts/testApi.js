
const readline = require("readline");

const BASE_URL = "http://127.0.0.1:5000";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return { status: response.status, data };
}

async function main() {
  let passed = 0;
  let failed = 0;
  let token;

  async function test(name, callback) {
    try {
      const result = await callback();

      if (result === false) {
        failed++;
        console.log(`FAIL: ${name}`);
        return;
      }

      passed++;
      console.log(`PASS: ${name}`);
    } catch (error) {
      failed++;
      console.log(`FAIL: ${name} - ${error.message}`);
    }
  }

  try {
    const email = (await ask("Account email: ")).trim();
    const password = await ask("Account password: ");

    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (login.status !== 200 || !login.data.token) {
      throw new Error("Login failed. Check your credentials.");
    }

    token = login.data.token;
    console.log("\nLogin successful. Running API tests...\n");

    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    await test("GET authenticated user", async () => {
      const result = await request("/api/auth/me", {
        headers: authHeaders,
      });

      return result.status === 200 && result.data.success === true;
    });

    await test("GET dashboard statistics", async () => {
      const result = await request("/api/reviews/dashboard/stats", {
        headers: authHeaders,
      });

      return result.status === 200 && result.data.success === true;
    });

    let reviews = [];

    await test("GET compliance reviews", async () => {
      const result = await request("/api/reviews", {
        headers: authHeaders,
      });

      if (result.status !== 200 || !result.data.success) {
        return false;
      }

      reviews = result.data.reviews || [];
      return true;
    });

    if (reviews.length > 0) {
      const reviewId = reviews[0]._id;

      await test("GET compliance score", async () => {
        const result = await request(
          `/api/reviews/${reviewId}/score`,
          { headers: authHeaders }
        );

        return (
          result.status === 200 &&
          typeof result.data.score === "number"
        );
      });

      await test("GET PDF report", async () => {
        const response = await fetch(
          `${BASE_URL}/api/reviews/${reviewId}/report/pdf`,
          { headers: authHeaders }
        );

        const contentType =
          response.headers.get("content-type") || "";

        return (
          response.status === 200 &&
          contentType.includes("application/pdf")
        );
      });
    } else {
      console.log("SKIP: Score and PDF tests (no reviews found)");
    }

    console.log("\n--- Test Summary ---");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total:  ${passed + failed}`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("\nTest run failed:", error.message);
  process.exitCode = 1;
});
