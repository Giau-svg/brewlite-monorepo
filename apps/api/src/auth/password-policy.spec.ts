import { validPassword } from './password-policy';
import { validate } from 'class-validator';
import { RegisterDto } from './auth.dto';
describe('CR-SEC-01: exact Unicode/bcrypt boundaries', () => {
  const cases: [string, boolean][] = [
    ['a'.repeat(14), false],
    ['a'.repeat(15), true],
    ['a'.repeat(72), true],
    ['a'.repeat(73), false],
    ['😀'.repeat(14), false],
    ['😀'.repeat(15), true],
    ['😀'.repeat(18), true],
    ['😀'.repeat(19), false],
    ['ắ'.repeat(24), true],
    ['ắ'.repeat(25), false],
    [' '.repeat(15), true],
  ];
  it.each(cases)(
    'validates %j without truncation: %s',
    (password, expected) => {
      expect(validPassword(password)).toBe(expected);
    },
  );
  it.each(cases)(
    'applies the same policy through the registration DTO: %j',
    async (password, expected) => {
      const dto = Object.assign(new RegisterDto(), {
        fullName: 'Test',
        email: 'test@example.test',
        password,
      });
      const errors = await validate(dto);
      expect(!errors.some((error) => error.property === 'password')).toBe(
        expected,
      );
      expect(dto.password).toBe(password);
    },
  );
});
