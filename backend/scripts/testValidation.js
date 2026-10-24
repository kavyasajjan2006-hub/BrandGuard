
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const email = await ask("Login email: ");
  const password = await ask("Login password: ");
  rl.close();

  const baseUrl = "http://localhost:5000";
  let passed = 0;
  let failed = 0;

  try {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginResponse.json();
    const token =
      loginData.token ||
      loginData.data?.token ||
      loginData.accessToken;

    if (!loginResponse.ok || !token) {
      console.log("Login failed. Check your credentials and login response.");
      console.log(loginData);
      process.exitCode = 1;
      return;
    }

    console.log("\nTesting invalid review requests...\n");

    const cases = [
      {
        name: "Missing title",
        body: {
          brandId: "6adc993971e76a721adfa096",
          findings: [],
        },
      },
      {
        name: "Invalid brand ID",
        body: {
          title: "Validation Test",
          brandId: "not-a-valid-id",
          findings: [],
        },
      },
      {
        name: "Findings must be an array",
        body: {
          title: "Validation Test",
          brandId: "6adc993971e76a721adfa096",
          findings: "invalid",
        },
      },
    ];

    for (const test of cases) {
      const response = await fetch(`${baseUrl}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(test.body),
      });

      const result = await response.json();

      if (response.status === 400) {
        console.log(`PASS: ${test.name}`);
        passed++;
      } else {
        console.log(
          `FAIL: ${test.name} — expected HTTP 400, received ${response.status}`
        );
        console.log(result);
        failed++;
      }
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exitCode = 1;
  } catch (error) {
    console.error("Test error:", error.message);
    process.exitCode = 1;
  }
}

main();
