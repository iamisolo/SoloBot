import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ================= GET ALL FILES ================= */

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = join(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );

  return files.flat();
}

/* ================= LOAD COMMANDS ================= */

export default async (client) => {
  console.log("📂 Loading commands...");

  try {
    const commandsPath = join(__dirname, '../commands');

    const commandFiles = (await getFiles(commandsPath))
      .filter(file =>
        file.endsWith('.js') &&
        !file.includes('/_') &&
        !file.includes('\\_')
      );

    let loadedCount = 0;

    for (const file of commandFiles) {
      try {
        const relativePath = file
          .replace(commandsPath, '')
          .replace(/^[\\/]/, '')
          .replace(/\\/g, '/');

        const commandModule = await import(`../commands/${relativePath}`);
        const command = commandModule.default;

        if (!command || !command.data || !command.execute) {
          console.log(`⚠️ Skipped invalid command: ${relativePath}`);
          continue;
        }

        if (!client.commands) {
          client.commands = new Map();
        }

        client.commands.set(command.data.name, command);
        loadedCount++;

        console.log(`✔ Loaded command: ${command.data.name}`);

      } catch (error) {
        console.error(`❌ Error loading file: ${file}`);
        console.error(error);
      }
    }

    console.log(`✅ Successfully loaded ${loadedCount} commands`);

  } catch (error) {
    console.error("❌ Command loader crashed:");
    console.error(error);
  }
};
