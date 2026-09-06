/**
 * Keeps the lesson's automated tests (the answer key) away from students.
 *
 * The course payload still carries `test_code` so the sandbox can run the real
 * suite, but the editor must never render the raw assertions to a learner.
 * Authors/admins (role === 'admin') may still inspect the full tests.
 */
export const isAuthorRole = (role: string | undefined): boolean => role === 'admin';

export function studentTestsPlaceholder(language: string): string {
    const comment = language === 'rust' ? '//' : '#';
    return [
        `${comment} Tests are hidden to keep the challenge honest.`,
        `${comment} Use "Run Code" / "Submit Answer" to check your work`,
        `${comment} against the automated verification suite.`,
    ].join('\n');
}
