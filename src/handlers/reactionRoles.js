import { Events, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getReactionRoleMessage, addReactionRole, removeReactionRole } from '../services/reactionRoleService.js';
import { errorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

/* =========================
   REACTION ADD
========================= */
async function handleReactionAdd(client, reaction, user) {
    try {
        if (user.bot) return;

        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        const { message } = reaction;
        if (!message.guild) return;

        const emoji = reaction.emoji.id || reaction.emoji.name;

        const data = await getReactionRoleMessage(client, message.guild.id, message.id);
        if (!data) return;

        const roleId = data.roles[emoji];
        if (!roleId) return;

        const member = await message.guild.members.fetch(user.id);
        await member.roles.add(roleId).catch(() => {});

    } catch (err) {
        logger.error("Reaction Add Error:", err);
    }
}

/* =========================
   REACTION REMOVE
========================= */
async function handleReactionRemove(client, reaction, user) {
    try {
        if (user.bot) return;

        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();

        const { message } = reaction;
        if (!message.guild) return;

        const emoji = reaction.emoji.id || reaction.emoji.name;

        const data = await getReactionRoleMessage(client, message.guild.id, message.id);
        if (!data) return;

        const roleId = data.roles[emoji];
        if (!roleId) return;

        const member = await message.guild.members.fetch(user.id);
        await member.roles.remove(roleId).catch(() => {});

    } catch (err) {
        logger.error("Reaction Remove Error:", err);
    }
}

/* =========================
   COMMAND HANDLER
========================= */
export async function handleReactionRoles(interaction) {
    try {
        if (!interaction.isChatInputCommand()) return false;

        if (interaction.commandName !== "reactionrole") return false;

        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const member = interaction.member;

        if (!guild) return false;

        if (sub === "create") {

            if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await interaction.reply({
                    embeds: [errorEmbed("You need **Manage Roles** permission.")],
                    flags: MessageFlags.Ephemeral
                });
                return true;
            }

            const messageId = interaction.options.getString("message_id");
            const emojiInput = interaction.options.getString("emoji");
            const role = interaction.options.getRole("role");

            if (!messageId || !emojiInput || !role) {
                await interaction.reply({
                    embeds: [errorEmbed("Missing required fields.")],
                    flags: MessageFlags.Ephemeral
                });
                return true;
            }

            // normalize emoji
            let emoji = emojiInput;
            const match = emojiInput.match(/<a?:\w+:(\d+)>/);
            if (match) emoji = match[1];

            // save to DB
            await addReactionRole(
                interaction.client,
                guild.id,
                messageId,
                emoji,
                role.id
            );

            // react on message
            try {
                const msg = await interaction.channel.messages.fetch(messageId);
                await msg.react(emojiInput);
            } catch (err) {
                logger.error("React failed:", err);
            }

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Green")
                        .setDescription(`✅ ${emojiInput} → <@&${role.id}> added`)
                ],
                flags: MessageFlags.Ephemeral
            });

            return true;
        }

        return false;

    } catch (err) {
        logger.error("Command Error:", err);

        if (!interaction.replied) {
            await interaction.reply({
                embeds: [errorEmbed("Something went wrong.")],
                flags: MessageFlags.Ephemeral
            });
        }

        return true;
    }
}

/* =========================
   LISTENER SETUP (IMPORTANT)
========================= */
export function setupReactionRoleListeners(client) {

    client.on(Events.MessageReactionAdd, (reaction, user) => {
        handleReactionAdd(client, reaction, user);
    });

    client.on(Events.MessageReactionRemove, (reaction, user) => {
        handleReactionRemove(client, reaction, user);
    });

        }
