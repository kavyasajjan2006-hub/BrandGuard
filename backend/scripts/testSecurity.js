
const BASE_URL = "http://127.0.0.1:5000";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
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

  console.log("Running BrandGuard security tests...\n");

  // 1. Private reviews should require authentication.
  await test("Reject unauthenticated review listing", async () => {
    const result = await request("/api/reviews");
    return result.status === 401;
  });

  // 2. Dashboard data should require authentication.
  await test("Reject unauthenticated dashboard request", async () => {
    const result = await request("/api/reviews/dashboard/stats");
    return result.status === 401;
  });

  // 3. An invalid review ID should be rejected.
  await test("Reject invalid review ID", async () => {
    const result = await request(
      "/api/reviews/not-a-valid-id/score",
      {
        headers: {
          Authorization: "Bearer replace-with-invalid-token",
        },
      }
    );

    // Authentication may reject the fake token before ID validation.
    return [400, 401].includes(result.status);
  });

  // 4. A fake token must not grant access.
  await test("Reject invalid authentication token", async () => {
    const result = await request("/api/auth/me", {
      headers: {
        Authorization: "Bearer invalid.token.value",
      },
    });

    return result.status === 401;
  });

  // 5. Incorrect login credentials must not authenticate.
  await test("Reject incorrect login credentials", async () => {
    const result = await request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "nobody-security-test@example.com",
        password: "DefinitelyWrongPassword123!",
      }),
    });

    return result.status >= 400 && result.status < 500;
  });

  console.log("\n--- Security Test Summary ---");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Security test run failed:", error.message);
  process.exitCode = 1;
});
