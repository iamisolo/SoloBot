import {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags,
    ComponentType,
    EmbedBuilder,
    AttachmentBuilder
} from 'discord.js';

import { getColor } from '../../../config/bot.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { successEmbed, errorEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../../utils/errorHandler.js';
import { getLevelingConfig, saveLevelingConfig, getUserLevelData } from '../../../services/leveling.js';
import { botHasPermission } from '../../../utils/permissionGuard.js';
import Canvas from 'canvas';

/* -------------------- UI BUILDERS -------------------- */

function buildDashboardEmbed(cfg, guild) {
    return new EmbedBuilder()
        .setTitle('📊 Leveling Dashboard')
        .setDescription(`Server: **${guild.name}**`)
        .setColor(getColor('info'))
        .addFields(
            { name: 'System', value: cfg.enabled ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Announcements', value: cfg.announceLevelUp ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Channel', value: cfg.levelUpChannel ? `<#${cfg.levelUpChannel}>` : 'Not set', inline: true },
            { name: 'XP Range', value: `${cfg.xpRange.min} - ${cfg.xpRange.max}`, inline: true },
            { name: 'Cooldown', value: `${cfg.xpCooldown}s`, inline: true },
            { name: 'Message', value: cfg.levelUpMessage || 'Default', inline: false }
        )
        .setTimestamp();
}

function buildMenu(guildId) {
    return new StringSelectMenuBuilder()
        .setCustomId(`menu_${guildId}`)
        .setPlaceholder('Select option')
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Channel').setValue('channel'),
            new StringSelectMenuOptionBuilder().setLabel('Message').setValue('message'),
            new StringSelectMenuOptionBuilder().setLabel('XP Range').setValue('xp'),
            new StringSelectMenuOptionBuilder().setLabel('Cooldown').setValue('cooldown'),
            new StringSelectMenuOptionBuilder().setLabel('Rank Card').setValue('rank')
        );
}

function buildButtons(cfg, guildId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sys_${guildId}`)
            .setLabel('Toggle System')
            .setStyle(cfg.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`ann_${guildId}`)
            .setLabel('Toggle Announce')
            .setStyle(cfg.announceLevelUp ? ButtonStyle.Success : ButtonStyle.Danger)
    );
}

/* -------------------- RANK CARD -------------------- */

async function generateRankCard(user, data) {
    const level = data?.level ?? 0;
    const xp = data?.xp ?? 0;

    const canvas = Canvas.createCanvas(800, 250);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ffcc';
    ctx.font = '30px Arial';
    ctx.fillText(user.username, 200, 80);

    ctx.font = '20px Arial';
    ctx.fillText(`Level: ${level}`, 200, 130);
    ctx.fillText(`XP: ${xp}`, 200, 170);

    // Progress bar
    const progress = (xp % 100) / 100;
    ctx.fillStyle = '#333';
    ctx.fillRect(200, 200, 400, 20);

    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(200, 200, 400 * progress, 20);

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
}

/* -------------------- REFRESH -------------------- */

async function refresh(interaction, cfg, guildId) {
    await InteractionHelper.safeEditReply(interaction, {
        embeds: [buildDashboardEmbed(cfg, interaction.guild)],
        components: [
            buildButtons(cfg, guildId),
            new ActionRowBuilder().addComponents(buildMenu(guildId))
        ]
    }).catch(() => {});
}

/* -------------------- COMMAND -------------------- */

export default {
    data: new SlashCommandBuilder()
        .setName('levelconfig')
        .setDescription('Advanced leveling system')
        .setDMPermission(false),

    async execute(interaction, config, client) {
        try {
            const guildId = interaction.guild.id;
            const cfg = await getLevelingConfig(client, guildId);

            // defaults
            cfg.enabled ??= true;
            cfg.announceLevelUp ??= true;
            cfg.xpCooldown ??= 60;
            cfg.xpRange ??= { min: 15, max: 25 };

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [buildDashboardEmbed(cfg, interaction.guild)],
                components: [
                    buildButtons(cfg, guildId),
                    new ActionRowBuilder().addComponents(buildMenu(guildId))
                ]
            });

            const channel = interaction.channel;
            if (!channel) return;

            const collector = channel.createMessageComponentCollector({
                time: 600000,
                filter: i => i.user.id === interaction.user.id
            });

            collector.on('collect', async i => {
                try {
                    /* -------- SELECT MENU -------- */
                    if (i.isStringSelectMenu()) {
                        const val = i.values[0];

                        /* CHANNEL */
                        if (val === 'channel') {
                            await i.deferUpdate();

                            const menu = new ChannelSelectMenuBuilder()
                                .setCustomId('ch')
                                .addChannelTypes(ChannelType.GuildText);

                            await i.followUp({
                                components: [new ActionRowBuilder().addComponents(menu)],
                                flags: MessageFlags.Ephemeral
                            });

                            const c = channel.createMessageComponentCollector({
                                componentType: ComponentType.ChannelSelect,
                                time: 60000,
                                max: 1,
                                filter: x => x.user.id === interaction.user.id
                            });

                            c.on('collect', async x => {
                                const ch = x.channels.first();
                                if (!ch) return;

                                if (!botHasPermission(ch, ['SendMessages'])) {
                                    return x.reply({
                                        embeds: [errorEmbed('Error', 'Bot cannot send messages there')],
                                        flags: MessageFlags.Ephemeral
                                    });
                                }

                                cfg.levelUpChannel = ch.id;
                                await saveLevelingConfig(client, guildId, cfg);

                                await x.reply({
                                    embeds: [successEmbed('Updated', `${ch}`)],
                                    flags: MessageFlags.Ephemeral
                                });

                                await refresh(interaction, cfg, guildId);
                            });
                        }

                        /* MESSAGE */
                        if (val === 'message') {
                            const modal = new ModalBuilder()
                                .setCustomId('msg')
                                .setTitle('Set Message')
                                .addComponents(
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                            .setCustomId('m')
                                            .setStyle(TextInputStyle.Paragraph)
                                            .setRequired(true)
                                    )
                                );

                            await i.showModal(modal);

                            const sub = await i.awaitModalSubmit({ time: 120000 }).catch(() => null);
                            if (!sub) return;

                            const txt = sub.fields.getTextInputValue('m');
                            cfg.levelUpMessage = txt;

                            await saveLevelingConfig(client, guildId, cfg);

                            await sub.reply({
                                embeds: [successEmbed('Saved', txt)],
                                flags: MessageFlags.Ephemeral
                            });

                            await refresh(interaction, cfg, guildId);
                        }

                        /* XP */
                        if (val === 'xp') {
                            const modal = new ModalBuilder()
                                .setCustomId('xp')
                                .setTitle('XP Range')
                                .addComponents(
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder().setCustomId('min').setLabel('Min').setStyle(TextInputStyle.Short)
                                    ),
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder().setCustomId('max').setLabel('Max').setStyle(TextInputStyle.Short)
                                    )
                                );

                            await i.showModal(modal);

                            const sub = await i.awaitModalSubmit({ time: 120000 }).catch(() => null);
                            if (!sub) return;

                            const min = parseInt(sub.fields.getTextInputValue('min'));
                            const max = parseInt(sub.fields.getTextInputValue('max'));

                            if (isNaN(min) || isNaN(max) || min > max) {
                                return sub.reply({
                                    embeds: [errorEmbed('Invalid', 'Enter valid numbers')],
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            cfg.xpRange = { min, max };
                            await saveLevelingConfig(client, guildId, cfg);

                            await sub.reply({
                                embeds: [successEmbed('Updated', `${min}-${max}`)],
                                flags: MessageFlags.Ephemeral
                            });

                            await refresh(interaction, cfg, guildId);
                        }

                        /* COOLDOWN */
                        if (val === 'cooldown') {
                            const modal = new ModalBuilder()
                                .setCustomId('cd')
                                .setTitle('Cooldown')
                                .addComponents(
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder().setCustomId('c').setStyle(TextInputStyle.Short)
                                    )
                                );

                            await i.showModal(modal);

                            const sub = await i.awaitModalSubmit({ time: 120000 }).catch(() => null);
                            if (!sub) return;

                            const cd = parseInt(sub.fields.getTextInputValue('c'));

                            if (isNaN(cd)) {
                                return sub.reply({
                                    embeds: [errorEmbed('Invalid', 'Enter number')],
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            cfg.xpCooldown = cd;
                            await saveLevelingConfig(client, guildId, cfg);

                            await sub.reply({
                                embeds: [successEmbed('Updated', `${cd}s`)],
                                flags: MessageFlags.Ephemeral
                            });

                            await refresh(interaction, cfg, guildId);
                        }

                        /* RANK CARD */
                        if (val === 'rank') {
                            await i.deferReply({ flags: MessageFlags.Ephemeral });

                            const data = await getUserLevelData(client, guildId, i.user.id);
                            const card = await generateRankCard(i.user, data);

                            await i.editReply({ files: [card] });
                        }
                    }

                    /* -------- BUTTONS -------- */
                    if (i.isButton()) {
                        await i.deferUpdate();

                        if (i.customId.startsWith('sys')) cfg.enabled = !cfg.enabled;
                        if (i.customId.startsWith('ann')) cfg.announceLevelUp = !cfg.announceLevelUp;

                        await saveLevelingConfig(client, guildId, cfg);
                        await refresh(interaction, cfg, guildId);
                    }

                } catch (err) {
                    logger.error(err);
                }
            });

            collector.once('end', async () => {
                await InteractionHelper.safeEditReply(interaction, { components: [] }).catch(() => {});
                collector.stop();
            });

        } catch (err) {
            logger.error(err);
            throw new TitanBotError('Failed', ErrorTypes.UNKNOWN);
        }
    }
};
