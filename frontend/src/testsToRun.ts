/**
 * Formats test code for execution in BaseLayer sandbox.
 * Selects a preliminary subset (20%) for fast feedback, or runs all tests on submit.
 * Avoids duplicate execution, crashes on parameterized tests, and supports class-based tests.
 */
export function testsToRun(testCode: string, language: string, isSubmit: boolean): string {
  const tests = testCode || '';
  if (!tests.trim() || (language && language !== 'python')) return tests;

  // 1. Check whether testCode already contains an explicit execution trigger
  const hasMainTrigger = /if\s+__name__\s*==\s*['"]__main__['"]\s*:/m.test(tests);
  const hasUnittestTrigger = /unittest\.main\s*\(/m.test(tests);
  const hasPytestTrigger = /pytest\.main\s*\(/m.test(tests);

  if (hasMainTrigger || hasUnittestTrigger || hasPytestTrigger) {
    return tests;
  }

  // Helper to check if a function call is already invoked outside its def line
  const isAlreadyInvoked = (fnName: string): boolean => {
    const callPattern = new RegExp(`(?<!def\\s+)${fnName}\\s*\\(`, 'm');
    return callPattern.test(tests);
  };

  // 2. Discover top-level zero-argument test functions (e.g., `def test_something():`)
  // Parameterized tests like `def test_case(val, expected):` are excluded to avoid TypeError
  const topLevelZeroArg = [...tests.matchAll(/^def\s+(test_[a-zA-Z0-9_]+)\s*\(\s*\)\s*:/gm)].map(
    (m) => m[1]
  );

  const pendingFunctions = topLevelZeroArg.filter((fn) => !isAlreadyInvoked(fn));
  const invocations: string[] = pendingFunctions.map((fn) => `${fn}()`);

  // 3. If unittest.TestCase is subclassed but unittest.main was not written, invoke unittest
  const hasUnittestSubclass = /class\s+[a-zA-Z0-9_]+\s*\([^)]*unittest\.TestCase[^)]*\)\s*:/m.test(
    tests
  );
  if (hasUnittestSubclass) {
    return `${tests}\n\nif __name__ == '__main__':\n    import unittest\n    unittest.main()`;
  }

  // 4. Support plain class-based tests (e.g. `class TestMath: def test_add(self):`)
  if (invocations.length === 0 && topLevelZeroArg.length === 0) {
    const classBlocks = [...tests.matchAll(/^class\s+([A-Za-z0-9_]+)(?:\([^)]*\))?\s*:/gm)];
    for (const classMatch of classBlocks) {
      const className = classMatch[1];
      // Find zero-arg (only self) methods in test classes
      const classStartIndex = classMatch.index ?? 0;
      const classSlice = tests.slice(classStartIndex);
      const methodMatches = [
        ...classSlice.matchAll(/^\s+def\s+(test_[a-zA-Z0-9_]+)\s*\(\s*self\s*\)\s*:/gm),
      ];
      for (const m of methodMatches) {
        invocations.push(`${className}().${m[1]}()`);
      }
    }
  }

  if (invocations.length === 0) return tests;

  // Execute subset on preliminary run (at least 1), or all on submit
  const count = isSubmit ? invocations.length : Math.max(1, Math.ceil(invocations.length * 0.2));
  return `${tests}\n\n${invocations.slice(0, count).join('\n')}`;
}
