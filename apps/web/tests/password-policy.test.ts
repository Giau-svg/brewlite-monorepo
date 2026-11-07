import { it, expect } from "vitest";
import { validPassword } from "../lib/password-policy";
it.each([
  ["a".repeat(14), false], ["a".repeat(15), true], ["a".repeat(72), true], ["a".repeat(73), false],
  ["😀".repeat(14), false], ["😀".repeat(15), true], ["😀".repeat(18), true], ["😀".repeat(19), false],
  ["ắ".repeat(24), true], ["ắ".repeat(25), false], [" ".repeat(15), true],
])("matches bcrypt boundary for %j", (password, expected) => { expect(validPassword(password as string)).toBe(expected); });