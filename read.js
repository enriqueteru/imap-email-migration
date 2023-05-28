const imaps = require("imap-simple");

// Lee el archivo JSON
let accounts = require("./emails.json");

// Función para procesar una cuenta
async function processAccount(account) {
  let imapConfig = {
    imap: {
      user: account.user,
      password: account.password,
      host: account.host,
      port: 993,
      tls: true,
      authTimeout: 3000,
    },
  };

  const connection = await imaps.connect(imapConfig);

  await connection.openBox("INBOX");

  const searchCriteria = ["ALL"];
  const fetchOptions = {
    bodies: ["HEADER"],
    markSeen: false,
  };

  const messages = await connection.search(searchCriteria, fetchOptions);

  for (let message of messages) {
    let header = message.parts.find((part) => part.which === "HEADER");
    let subject = header.body.subject[0];
    console.log(`Subject: ${subject}`);
  }

  console.log(`Total messages: ${messages.length}`)

  // Cierra la conexión IMAP
  await connection.end();
}

// Procesar todas las cuentas
async function processAllAccounts() {
  for (let account of accounts) {
    await processAccount(account);
  }
}

processAllAccounts();
