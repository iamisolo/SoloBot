import {
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
    EmbedBuilder
} from 'discord.js';

import { getColor } from '../../../config/bot.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { successEmbed, errorEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';
import { getLevelingConfig, saveLevelingConfig, getUserLevelData } from '../../../services/leveling.js';
import { botHasPermission } from '../../../utils/permissionGuard.js';

/* ---------- UI ---------- */

function embed(cfg, guild) {
    return new EmbedBuilder()
        .setTitle('📊 Level System')
        .setColor(getColor('info'))
        .addFields(
            { name: 'System', value: cfg.enabled ? 'ON' : 'OFF', inline: true },
            { name: 'Announce', value: cfg.announceLevelUp ? 'ON' : 'OFF', inline: true },
            { name: 'Channel', value: cfg.levelUpChannel ? `<#${cfg.levelUpChannel}>` : 'Not set', inline: true },
            { name: 'XP', value: `${cfg.xpRange.min}-${cfg.xpRange.max}`, inline: true },
            { name: 'Cooldown', value: `${cfg.xpCooldown}s`, inline: true }
        );
}

function menu(id) {
    return new StringSelectMenuBuilder()
        .setCustomId(`menu_${id}`)
        .setPlaceholder('Configure system')
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Channel').setValue('channel'),
            new StringSelectMenuOptionBuilder().setLabel('XP Range').setValue('xp'),
            new StringSelectMenuOptionBuilder().setLabel('Cooldown').setValue('cooldown'),
            new StringSelectMenuOptionBuilder().setLabel('Rank').setValue('rank')
        );
}

function buttons(cfg, id) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sys_${id}`)
            .setLabel('System')
            .setStyle(cfg.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`ann_${id}`)
            .setLabel('Announce')
            .setStyle(cfg.announceLevelUp ? ButtonStyle.Success : ButtonStyle.Danger)
    );
}

async function update(i, cfg, id) {
    await InteractionHelper.safeEditReply(i, {
        embeds: [embed(cfg, i.guild)],
        components: [
            buttons(cfg, id),
            new ActionRowBuilder().addComponents(menu(id))
        ]
    }).catch(() => {});
}

/* ---------- MAIN ---------- */

export default {
    async execute(interaction, client) {
        try {
            const id = interaction.guild.id;
            const cfg = await getLevelingConfig(client, id);

            // defaults (safe)
            cfg.enabled ??= true;
            cfg.announceLevelUp ??= true;
            cfg.xpCooldown ??= 60;
            cfg.xpRange ??= { min: 15, max: 25 };

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed(cfg, interaction.guild)],
                components: [
                    buttons(cfg, id),
                    new ActionRowBuilder().addComponents(menu(id))
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
                    /* ---------- BUTTONS ---------- */
                    if (i.isButton()) {
                        await i.deferUpdate();

                        if (i.customId.startsWith('sys')) cfg.enabled = !cfg.enabled;
                        if (i.customId.startsWith('ann')) cfg.announceLevelUp = !cfg.announceLevelUp;

                        await saveLevelingConfig(client, id, cfg);
                        return update(interaction, cfg, id);
                    }

                    /* ---------- MENU ---------- */
                    if (i.isStringSelectMenu()) {
                        const v = i.values[0];

                        /* RANK */
                        if (v === 'rank') {
                            await i.deferReply({ flags: MessageFlags.Ephemeral });

                            const d = await getUserLevelData(client, id, i.user.id);

                            const e = new EmbedBuilder()
                                .setTitle(`${i.user.username} Rank`)
                                .setColor(getColor('info'))
                                .addFields(
                                    { name: 'Level', value: `${d?.level ?? 0}`, inline: true },
                                    { name: 'XP', value: `${d?.xp ?? 0}`, inline: true }
                                );

                            return i.editReply({ embeds: [e] });
                        }

                        /* COOLDOWN */
                        if (v === 'cooldown') {
                            const modal = new ModalBuilder()
                                .setCustomId('cd')
                                .setTitle('Set Cooldown')
                                .addComponents(
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                            .setCustomId('c')
                                            .setStyle(TextInputStyle.Short)
                                            .setRequired(true)
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
                            await saveLevelingConfig(client, id, cfg);

                            await sub.reply({
                                embeds: [successEmbed('Updated', `${cd}s`)],
                                flags: MessageFlags.Ephemeral
                            });

                            return update(interaction, cfg, id);
                        }

                        /* XP */
                        if (v === 'xp') {
                            const modal = new ModalBuilder()
                                .setCustomId('xp')
                                .setTitle('XP Range')
                                .addComponents(
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder().setCustomId('min').setStyle(TextInputStyle.Short)
                                    ),
                                    new ActionRowBuilder().addComponents(
                                        new TextInputBuilder().setCustomId('max').setStyle(TextInputStyle.Short)
                                    )
                                );

                            await i.showModal(modal);

                            const sub = await i.awaitModalSubmit({ time: 120000 }).catch(() => null);
                            if (!sub) return;

                            const min = parseInt(sub.fields.getTextInputValue('min'));
                            const max = parseInt(sub.fields.getTextInputValue('max'));

                            if (isNaN(min) || isNaN(max) || min > max) {
                                return sub.reply({
                                    embeds: [errorEmbed('Invalid', 'Check values')],
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            cfg.xpRange = { min, max };
                            await saveLevelingConfig(client, id, cfg);

                            await sub.reply({
                                embeds: [successEmbed('Updated', `${min}-${max}`)],
                                flags: MessageFlags.Ephemeral
                            });

                            return update(interaction, cfg, id);
                        }

                        /* CHANNEL */
                        if (v === 'channel') {
                            await i.deferUpdate();

                            const m = new ChannelSelectMenuBuilder()
                                .setCustomId('ch')
                                .addChannelTypes(ChannelType.GuildText);

                            await i.followUp({
                                components: [new ActionRowBuilder().addComponents(m)],
                                flags: MessageFlags.Ephemeral
                            });

                            const c = channel.createMessageComponentCollector({
                                componentType: ComponentType.ChannelSelect,
                                max: 1,
                                time: 60000
                            });

                            c.on('collect', async x => {
                                const ch = x.channels.first();
                                if (!ch) return;

                                if (!botHasPermission(ch, ['SendMessages'])) {
                                    return x.reply({
                                        embeds: [errorEmbed('Error', 'No permission')],
                                        flags: MessageFlags.Ephemeral
                                    });
                                }

                                cfg.levelUpChannel = ch.id;
                                await saveLevelingConfig(client, id, cfg);

                                await x.reply({
                                    embeds: [successEmbed('Updated', `${ch}`)],
                                    flags: MessageFlags.Ephemeral
                                });

                                update(interaction, cfg, id);
                            });
                        }
                    }

                } catch (err) {
                    logger.error(err);
                }
            });

        } catch (err) {
            logger.error(err);
        }
    }
};
