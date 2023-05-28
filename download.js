const imaps = require("imap-simple");
const fs = require("fs");
const path = require("path");

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

  // Crear una carpeta para la cuenta de correo si no existe
  if (!fs.existsSync(`backups/${account.user}`)) {
    fs.mkdirSync(`backups/${account.user}`, { recursive: true });
  }

  // Abrir y procesar la bandeja de entrada y la bandeja de salida (Sent)
  for (let box of ["INBOX", "Sent"]) {
    // Crear una carpeta para la bandeja si no existe
    if (!fs.existsSync(`backups/${account.user}/${box}`)) {
      fs.mkdirSync(`backups/${account.user}/${box}`, { recursive: true });
    }

    await connection.openBox(box);

    const searchCriteria = ["ALL"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (let message of messages) {
      let header = message.parts.find((part) => part.which === "HEADER");
      let text = message.parts.find((part) => part.which === "TEXT");
      let subject = header.body.subject[0];
      let safeSubject = subject.replace(/[<>:"/\\|?*]+/g, "_");

      // Convertir la fecha en un formato que sea válido como nombre de archivo
      let date = new Date(header.body.date[0]);
      let formattedDate = date
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\./g, "-");

      // Crear un archivo para cada correo
      let mailFileName = path.join(
        "backups",
        account.user,
        box,
        `${formattedDate}_${safeSubject.trim()}.txt`
      );
      fs.writeFileSync(mailFileName, text.body);

      // Guardar los archivos adjuntos
      let attachments = imaps
        .getParts(message.attributes.struct)
        .filter(
          (part) =>
            part.disposition &&
            part.disposition.type.toUpperCase() === "ATTACHMENT"
        );
      for (let attachment of attachments) {
        const partData = await connection.getPartData(message, attachment);
        let attachmentFileName = path.join(
          "backups",
          account.user,
          box,
          `${formattedDate}_${attachment.disposition.params.filename}`
        );
        fs.writeFileSync(attachmentFileName, partData);
      }
    }
  }

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
