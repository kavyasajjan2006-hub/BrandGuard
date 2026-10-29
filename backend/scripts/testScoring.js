const { calculateComplianceScore } = require("../src/utils/complianceScoring");

const tests = [
  {
    name: "No findings",
    findings: [],
    expectedScore: 100,
  },
  {
    name: "One unresolved medium finding",
    findings: [{ severity: "medium", status: "open" }],
    expectedScore: 92,
  },
  {
    name: "One resolved medium finding",
    findings: [{ severity: "medium", status: "resolved" }],
    expectedScore: 100,
  },
  {
    name: "One unresolved critical finding",
    findings: [{ severity: "critical", status: "open" }],
    expectedScore: 75,
  },
];

let failed = 0;

for (const test of tests) {
  const result = calculateComplianceScore(test.findings);
  const passed = result.score === test.expectedScore;

  console.log(
    `${passed ? "PASS" : "FAIL"}: ${test.name} | ` +
    `Score: ${result.score} | Risk: ${result.riskLevel}`
  );

  if (!passed) failed++;
}

console.log(`\n${tests.length - failed}/${tests.length} tests passed`);

if (failed > 0) process.exitCode = 1;