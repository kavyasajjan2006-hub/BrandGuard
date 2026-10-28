
const API = "http://localhost:5000/api";

async function check(name, url, options = {}) {
  try {
    const response = await fetch(url, options);
    const body = await response.text();

    console.log(`\n${name}`);
    console.log("HTTP status:", response.status);
    console.log("Response:", body.slice(0, 300));
  } catch (error) {
    console.log(`\n${name}`);
    console.log("Request failed:", error.message);
  }
}

async function runSecurityChecks() {
  console.log("=== BrandGuard Security Checks ===");

  // 1. Protected brands endpoint without a token
  await check(
    "1. Brands without authentication",
    `${API}/brands`
  );

  // 2. Protected reviews endpoint without a token
  await check(
    "2. Reviews without authentication",
    `${API}/reviews`
  );

  // 3. Invalid login token
  await check(
    "3. Brands with an invalid token",
    `${API}/brands`,
    {
      headers: {
        Authorization: "Bearer invalid-test-token"
      }
    }
  );

  // 4. Unknown API route
  await check(
    "4. Unknown API route",
    `${API}/security-test-route`
  );
}

runSecurityChecks();
