const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const token = process.env.TOKEN;

// CHANNEL IDS:
const PROMOTION_CHANNEL_ID = '1535611568589373550';
const INFRACTION_CHANNEL_ID = '1535611768229863525';
const CASE_LOG_CHANNEL_ID = '1535617388689756301';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

client.once('ready', async () => {
    console.log(`Bot is online: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('promote')
            .setDescription('Promotes a user.')
            .addUserOption(option => option.setName('user').setDescription('User to promote').setRequired(true))
            .addStringOption(option => option.setName('rank').setDescription('New rank name').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for promotion').setRequired(true)),

        new SlashCommandBuilder()
            .setName('infraction')
            .setDescription('Issues an infraction to a user.')
            .addUserOption(option => option.setName('user').setDescription('User to punish').setRequired(true))
            .addStringOption(option => 
                option.setName('type')
                    .setDescription('Type of infraction')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Warning', value: 'Warning' },
                        { name: 'Strike', value: 'Strike' },
                        { name: 'Demotion', value: 'Demotion' },
                        { name: 'Termination', value: 'Termination' },
                        { name: 'IU', value: 'IU' }
                    ))
            .addStringOption(option => option.setName('reason').setDescription('Reason for infraction').setRequired(true)),

        new SlashCommandBuilder()
            .setName('say')
            .setDescription('Sends a custom embed message to a channel.')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
            .addStringOption(option => option.setName('title').setDescription('Embed Title').setRequired(true))
            .addStringOption(option => option.setName('message').setDescription('Embed Message Content').setRequired(true))
            .addChannelOption(option => option.setName('channel').setDescription('Target channel').setRequired(false)),

        new SlashCommandBuilder()
            .setName('case')
            .setDescription('Logs a court or disciplinary case.')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
            .addStringOption(option => option.setName('casename').setDescription('Case name (e.g. Name vs Name or Dept vs Dept)').setRequired(true))
            .addUserOption(option => option.setName('filinguser').setDescription('User who has filed the case').setRequired(true))
            .addUserOption(option => option.setName('judge').setDescription('Judge or official handling the case').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason of the case').setRequired(true))
            .addStringOption(option => option.setName('result').setDescription('Result (e.g. Found Guilty)').setRequired(true))
            .addStringOption(option => option.setName('orders').setDescription('Orders from the judges').setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(token);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered application commands!');
    } catch (error) { console.error(error); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'promote') {
        const promoChannel = interaction.guild.channels.cache.get(PROMOTION_CHANNEL_ID);
        if (!promoChannel) return interaction.reply({ content: 'Promotion channel not found!', ephemeral: true });

        const user = interaction.options.getUser('user');
        const rank = interaction.options.getString('rank');
        const reason = interaction.options.getString('reason');
        const issuer = interaction.user;
        const caseId = Math.random().toString(36).substring(2, 8).toUpperCase();

        const embed = new EmbedBuilder()
            .setColor(0x00FF88)
            .setAuthor({ name: 'Western Plains Promotion', iconURL: client.user.displayAvatarURL() })
            .setDescription(`Dear ${user},\n\nCongratulations, the Ownership Team has decided to promote you! Your dedication, professionalism, and commitment to excellence have truly set you apart—keep up the outstanding work as you take on this new role.`)
            .addFields(
                { name: 'User Promoted', value: `${user}`, inline: true },
                { name: 'New Role', value: `\`${rank}\``, inline: true },
                { name: 'Reason(s)', value: reason, inline: false },
                { name: 'Staff Issuer', value: `${issuer}`, inline: false },
                { name: 'Case ID', value: `\`${caseId}\``, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Western Plains Management', iconURL: client.user.displayAvatarURL() });

        await promoChannel.send({ content: `${user}`, embeds: [embed] });
        await interaction.reply({ content: `Promotion successfully sent to ${promoChannel}!`, ephemeral: true });
    } 
    
    else if (interaction.commandName === 'infraction') {
        const infraChannel = interaction.guild.channels.cache.get(INFRACTION_CHANNEL_ID);
        if (!infraChannel) return interaction.reply({ content: 'Infraction channel not found!', ephemeral: true });

        const user = interaction.options.getUser('user');
        const infractionType = interaction.options.getString('type');
        const reason = interaction.options.getString('reason');
        const issuer = interaction.user;
        const caseId = Math.random().toString(36).substring(2, 8).toUpperCase();

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: `Western Plains Infraction - ${infractionType}`, iconURL: client.user.displayAvatarURL() })
            .setDescription(`⚠️ **Official Infraction Notice**\n\n${user}, an official **${infractionType}** has been issued against your record. Please review the details below.`)
            .addFields(
                { name: 'User Punished', value: `${user}`, inline: true },
                { name: 'Infraction Type', value: `\`${infractionType}\``, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Staff Issuer', value: `${issuer}`, inline: false },
                { name: 'Case ID', value: `\`${caseId}\``, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Western Plains Management', iconURL: client.user.displayAvatarURL() });

        await infraChannel.send({ content: `${user}`, embeds: [embed] });
        await interaction.reply({ content: `Infraction successfully sent to ${infraChannel}!`, ephemeral: true });
    }

    else if (interaction.commandName === 'say') {
        const title = interaction.options.getString('title');
        const message = interaction.options.getString('message');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setAuthor({ name: 'Western Plains Management', iconURL: client.user.displayAvatarURL() })
            .setTitle(title)
            .setDescription(message)
            .setTimestamp()
            .setFooter({ text: 'Western Plains Management', iconURL: client.user.displayAvatarURL() });

        await targetChannel.send({ embeds: [embed] });
        await interaction.reply({ content: `Embed message successfully sent to ${targetChannel}!`, ephemeral: true });
    }

    else if (interaction.commandName === 'case') {
        const caseLogChannel = interaction.guild.channels.cache.get(CASE_LOG_CHANNEL_ID);
        if (!caseLogChannel) return interaction.reply({ content: 'Case Log channel not found! Make sure the bot has access to this channel.', ephemeral: true });

        const caseName = interaction.options.getString('casename');
        const filingUser = interaction.options.getUser('filinguser');
        const judge = interaction.options.getUser('judge');
        const reason = interaction.options.getString('reason');
        const result = interaction.options.getString('result');
        const orders = interaction.options.getString('orders');
        const caseId = Math.random().toString(36).substring(2, 8).toUpperCase();

        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setAuthor({ name: `Court Case Log — ${caseName}`, iconURL: client.user.displayAvatarURL() })
            .setDescription(`⚖️ **Official Case Ruling & Record**\n\nDetailed breakdown of the judicial or departmental proceeding for **${caseName}**.`)
            .addFields(
                { name: '⚖️ Case Name', value: `\`${caseName}\``, inline: false },
                { name: '📁 Filed By', value: `${filingUser}`, inline: true },
                { name: '👨‍⚖️ Judge / Official', value: `${judge}`, inline: true },
                { name: '📄 Reason Of Case', value: reason, inline: false },
                { name: '🔍 Result', value: result, inline: false },
                { name: '📜 Orders From The Judges', value: orders, inline: false },
                { name: 'Case ID', value: `\`${caseId}\``, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Western Plains Judicial Department', iconURL: client.user.displayAvatarURL() });

        await caseLogChannel.send({ embeds: [embed] });
        await interaction.reply({ content: `Case log successfully sent to ${caseLogChannel}!`, ephemeral: true });
    }
});

client.login(token);

});
