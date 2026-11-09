#!/usr/bin/env node
/*
 * Set a new password for one user, directly in the database.
 * For admins, when a user can't log in and there is no email recovery.
 *
 *   MONGODB_URI="mongodb+srv://..." node server/scripts/set-password.js
 *   node server/scripts/set-password.js --uri-file path/to/file-with-uri
 *
 * It asks for the email and for the new password twice. The password is typed
 * hidden and is never printed or logged. Only that user's password changes
 * (stored as a bcrypt hash, like the app does), plus any pending reset token
 * is cleared.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

function readUri() {
  const i = process.argv.indexOf('--uri-file');
  if (i !== -1 && process.argv[i + 1]) {
    return fs.readFileSync(path.resolve(process.argv[i + 1]), 'utf8').trim();
  }
  return (process.env.MONGODB_URI || '').trim();
}

/* Line reader that never drops input (works when typed or piped). In a terminal,
   while `muted` is on, typed characters are not echoed. */
function createPrompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  const lines = [];
  const waiting = [];
  let muted = false;
  const write = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (s) => { if (!muted) write(s); };
  rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
  rl.on('close', () => waiting.splice(0).forEach((resolve) => resolve('')));

  const ask = (question, { hidden = false } = {}) => {
    process.stdout.write(question);
    muted = hidden;
    return new Promise((resolve) => {
      const done = (answer) => {
        muted = false;
        if (hidden) process.stdout.write('\n');
        resolve(answer);
      };
      if (lines.length) done(lines.shift());
      else waiting.push(done);
    });
  };
  return { ask, close: () => rl.close() };
}

async function main() {
  const uri = readUri();
  if (!uri) {
    console.error('Falta la conexión: define MONGODB_URI o usa --uri-file <archivo>.');
    process.exit(1);
  }

  const prompter = createPrompter();
  const email = (await prompter.ask('Correo del usuario: ')).trim().toLowerCase();
  const pass1 = await prompter.ask('Nueva contraseña (mín. 6, no se muestra): ', { hidden: true });
  const pass2 = await prompter.ask('Repite la contraseña: ', { hidden: true });
  prompter.close();

  if (!email) throw new Error('El correo es obligatorio.');
  if (pass1.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  if (pass1 !== pass2) throw new Error('Las contraseñas no coinciden.');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const users = mongoose.connection.collection('users');
  const user = await users.findOne({ email }, { projection: { _id: 1, name: 1 } });
  if (!user) throw new Error(`No existe ningún usuario con el correo ${email}.`);

  const hash = await bcrypt.hash(pass1, 12);
  await users.updateOne(
    { _id: user._id },
    { $set: { password: hash }, $unset: { resetPasswordToken: '', resetPasswordExpires: '' } }
  );
  console.log(`Contraseña actualizada para ${email}${user.name ? ` (${user.name})` : ''}.`);
}

main()
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));
