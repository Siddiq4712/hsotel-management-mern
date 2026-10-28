import { passwordFromDob, readStudentDob } from '../../shared/studentDob.js';

export function studentImportSettings(body) {
  const source = body.import_source ?? 'api';
  const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!['api', 'excel'].includes(source)) invalid('Choose a valid student import source.');
  if (source === 'excel') {
    const password = body.default_password;
    if (typeof password !== 'string' || password.trim().length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
      invalid('Enter a default password for Excel imports (at least 6 characters, at most 72 bytes).');
    }
    return { source, password };
  }
  return { source };
}

export function importedStudentPassword(student, settings) {
  return settings.source === 'excel' ? settings.password : passwordFromDob(readStudentDob(student));
}
