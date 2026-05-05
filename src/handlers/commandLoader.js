import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection } from 'discord.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ───────────────────────────── */
/* SUBCOMMAND PARSER */
/* ───────────────────────────── */

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

/* ───────────────────────────── */
/* FILE RECURSION */
/* ───────────────────────────── */

async function getAllFiles(directory, fileList = []) {
  const files = await fs.readdir(directory, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(directory, file.name);

    if (file.isDirectory()) {
      if (file.name === 'modules') continue;
      await getAllFiles(filePath, fileList);
    } else if (file.name.endsWith('.js')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/* ───────────────────────────── */
/* LOAD COMMANDS */
/* ───────────────────────────── */

export async function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = await getAllFiles(commandsPath);

  logger.info(`Found ${commandFiles.length} command files`);

  const uniqueCommandNames = new Set();

  for (const filePath of commandFiles) {
    try {
      const commandDir = path.dirname(filePath);
      const category = path.basename(commandDir);

      /* ✅ SAFE RAILWAY IMPORT */
      const commandModule = await import(
        pathToFileURL(filePath).href
      );

      const command = commandModule.default || commandModule;

      if (!command.data || !command.execute) {
        logger.warn(`Invalid command: ${filePath}`);
        continue;
      }

      const name = command.data.name;

      if (!uniqueCommandNames.has(name)) {
        uniqueCommandNames.add(name);

        command.category = category;
        command.filePath = filePath;

        client.commands.set(name, command);
      }

      logger.info(`Loaded command: ${name} (${category})`);

      const subs = getSubcommandInfo(command.data.toJSON());
      if (subs.length) {
        logger.info(`  └ subcommands: ${subs.join(', ')}`);
      }

    } catch (err) {
      logger.error(`Failed loading ${filePath}`, err);
    }
  }

  logger.info(`Total commands loaded: ${client.commands.size}`);
  return client.commands;
}

/* ───────────────────────────── */
/* REGISTER COMMANDS */
/* ───────────────────────────── */

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

    if (guildId) {
      const guild = await client.guilds.fetch(guildId);

      logger.info(`Registering ${commands.length} commands`);

      await guild.commands.set(commands);

      logger.info('Commands registered successfully');
    }

  } catch (err) {
    logger.error('Register error:', err);
  }
}

/* ───────────────────────────── */
/* RELOAD COMMAND */
/* ───────────────────────────── */

export async function reloadCommand(client, commandName) {
  const command = client.commands.get(commandName);

  if (!command) {
    return { success: false, message: 'Command not found' };
  }

  try {
    const moduleUrl = pathToFileURL(command.filePath);
    moduleUrl.searchParams.set('t', Date.now().toString());

    const updated = await import(moduleUrl.href);
    const newCommand = updated.default || updated;

    client.commands.set(commandName, newCommand);

    logger.info(`Reloaded command: ${commandName}`);

    return { success: true };

  } catch (err) {
    logger.error(`Reload failed: ${commandName}`, err);

    return {
      success: false,
      message: err.message
    };
  }
}
