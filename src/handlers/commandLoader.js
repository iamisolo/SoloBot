import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= SUBCOMMAND PARSER ================= */

function getSubcommandInfo(commandData) {
  const subcommands = [];

  if (commandData.options) {
    for (const option of commandData.options) {
      if (option.type === 1) {
        subcommands.push(option.name);
      } else if (option.type === 2 && option.options) {
        for (const subOption of option.options) {
          if (subOption.type === 1) {
            subcommands.push(`${option.name}/${subOption.name}`);
          }
        }
      }
    }
  }

  return subcommands;
}

/* ================= GET ALL FILES ================= */

async function getAllFiles(directory, fileList = []) {
  const files = await fs.readdir(directory, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(directory, file.name);

    if (file.isDirectory()) {
      if (file.name.startsWith('_')) continue; // skip private folders
      await getAllFiles(filePath, fileList);
    } else if (file.name.endsWith('.js') && !file.name.startsWith('_')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/* ================= LOAD COMMANDS ================= */

export async function loadCommands(client) {
  console.log("📂 Starting command loader...");

  client.commands = new Collection();

  try {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = await getAllFiles(commandsPath);

    console.log(`📁 Found ${commandFiles.length} command files`);

    const uniqueNames = new Set();

    for (const filePath of commandFiles) {
      try {
        const commandDir = path.dirname(filePath);
        const category = path.basename(commandDir);

        const moduleUrl = pathToFileURL(filePath).href;
        const commandModule = await import(moduleUrl);

        const command = commandModule?.default;

        if (!command || !command.data || !command.execute) {
          console.log(`⚠️ Invalid command skipped: ${filePath}`);
          continue;
        }

        const name = command.data.name;

        if (!uniqueNames.has(name)) {
          uniqueNames.add(name);

          command.category = category;
          command.filePath = filePath;

          client.commands.set(name, command);
        }

        console.log(`✔ Loaded: ${name} (${category})`);

        let subs = [];
        if (typeof command.data.toJSON === "function") {
          subs = getSubcommandInfo(command.data.toJSON());
        }

        if (subs.length) {
          console.log(`   ↳ Subcommands: ${subs.join(', ')}`);
        }

      } catch (err) {
        console.error(`❌ Error loading file: ${filePath}`);
        console.error(err);
      }
    }

    console.log(`✅ Total commands loaded: ${client.commands.size}`);
    return client.commands;

  } catch (err) {
    console.error("❌ Command loader crashed:");
    console.error(err);
  }
}

/* ================= REGISTER COMMANDS ================= */

export async function registerCommands(client, guildId) {
  try {
    const commands = [];
    const seen = new Set();

    for (const cmd of client.commands.values()) {
      const name = cmd.data.name;

      if (!seen.has(name)) {
        seen.add(name);
        commands.push(cmd.data.toJSON());
      }
    }

    console.log(`🚀 Registering ${commands.length} commands...`);

    if (guildId) {
      const guild = await client.guilds.fetch(guildId);
      await guild.commands.set(commands);
      console.log("✅ Commands registered to guild");
    } else {
      await client.application.commands.set(commands);
      console.log("✅ Commands registered globally");
    }

  } catch (err) {
    console.error("❌ Register error:");
    console.error(err);
  }
}

/* ================= RELOAD COMMAND ================= */

export async function reloadCommand(client, commandName) {
  const command = client.commands.get(commandName);

  if (!command) {
    return { success: false, message: "Command not found" };
  }

  try {
    const moduleUrl = pathToFileURL(command.filePath);
    moduleUrl.searchParams.set('update', Date.now().toString());

    const updatedModule = await import(moduleUrl.href);
    const newCommand = updatedModule?.default;

    if (!newCommand || !newCommand.data || !newCommand.execute) {
      return { success: false, message: "Invalid updated command" };
    }

    client.commands.set(commandName, newCommand);

    console.log(`🔄 Reloaded command: ${commandName}`);

    return { success: true };

  } catch (err) {
    console.error(`❌ Reload failed: ${commandName}`);
    console.error(err);

    return {
      success: false,
      message: err.message
    };
  }
}
