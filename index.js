const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const express = require('express');

// --- Web Server (For Render & UptimeRobot) ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is active!');
});

app.listen(port, () => {
  console.log(`Web server is running on port ${port}.`);
});

// --- IDs and Configuration ---
const MAIN_GUILD_ID = '1420370540899864631';     // Main Server ID
const DEPT_GUILD_ID = '1511021349034786999';     // Department Server ID
const PROMO_CHANNEL_ID = '1420459904602341426';  // Promote logs channel ID
const INFRACTION_CHANNEL_ID = '1420460148194939093'; // Infraction logs channel ID
const CASE_CHANNEL_ID = '1535617388689756301';   // Case logs channel ID (Department Server)
const CLIENT_ID = '153559291485854106';          // Bot Client ID

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- Command Definitions ---
const mainGuildCommands = [
  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promotes a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to promote').setRequired(true))
    .addStringOption(option => option.setName('rank').setDescription('The new rank').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for promotion').setRequired(false)),
  new SlashCommandBuilder()
    .setName('infraction')
    .setDescription('Issues an infraction to a user.')
    .addUserOption(option => option.setName('user').setDescription('The user to penalize').setRequired(true))
    .addStringOption(option => option.setName('type').setDescription('Type or level of punishment').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('The reason for infraction').setRequired(true)),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Broadcasts a message.')
    .addStringOption(option => option.setName('message').setDescription('The message to send').setRequired(true))
].map(command => command.toJSON());

const deptGuildCommands = [
  new SlashCommandBuilder()
    .setName('case')
    .setDescription('Manages case files.')
    .addStringOption(option => option.setName('detail').setDescription('Case details').setRequired(true)),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Broadcasts a message.')
    .addStringOption(option => option.setName('message').setDescription('The message to send').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  try {
    console.log('Registering commands to servers...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, MAIN_GUILD_ID),
      { body: mainGuildCommands },
    );

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, DEPT_GUILD_ID),
      { body: deptGuildCommands },
    );

    console.log('Commands successfully distributed to servers!');
  } catch (error) {
    console.error(error);
  }
});

// --- Interaction Handler ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // 1. SAY COMMAND
  if (commandName === 'say') {
    const messageContent = interaction.options.getString('message');
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setDescription(messageContent)
      .setTimestamp()
      .setFooter({ text: `Sent by ${interaction.user.tag}` });

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: 'Message sent successfully as an embed!', ephemeral: true });
  } 

  // 2. PROMOTE COMMAND (Main Server Only)
  else if (commandName === 'promote' && interaction.guildId === MAIN_GUILD_ID) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user');
    const newRank = interaction.options.getString('rank');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const promoChannel = interaction.guild.channels.cache.get(PROMO_CHANNEL_ID);

    if (promoChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00) // Yeşil tema
        .setTitle('❌🎉 Western Plains Promotion')
        .setDescription(`Dear ${targetUser},\n\nCongratulations, the Management Team has decided to promote you! Your dedication, professionalism, and commitment to excellence have truly set you apart—keep up the outstanding work as you take on this new role.\n\n`)
        .addFields(
          { name: '👤 User Promoted', value: `${targetUser}`, inline: true },
          { name: '⭐ New Role', value: newRank, inline: true },
          { name: 'ℹ️ Reason(s)', value: reason, inline: false },
          { name: '🪐 Staff Issuer', value: `${interaction.user}`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Western Plains Management System' });

      // Embed dışında kullanıcıyı pinglemek için content kısmına kullanıcı yazıyoruz
      await promoChannel.send({ content: `${targetUser}`, embeds: [embed] });
      await interaction.editReply({ content: 'Promotion logged successfully.' });
    } else {
      await interaction.editReply({ content: 'Error: Promotion channel not found!' });
    }
  } 

  // 3. INFRACTION COMMAND (Main Server Only)
  else if (commandName === 'infraction' && interaction.guildId === MAIN_GUILD_ID) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user');
    const infractionType = interaction.options.getString('type');
    const reason = interaction.options.getString('reason');
    const infractionChannel = interaction.guild.channels.cache.get(INFRACTION_CHANNEL_ID);

    if (infractionChannel) {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000) // Kırmızı tema
        .setTitle('❌ Western Plains Infraction')
        .setDescription(`Dear ${targetUser},\n\nThe Internal Affairs team has carefully reviewed your recent actions and decided to issue a **${infractionType}**. This decision was made based on the provided evidence of your recent actions.\n\n`)
        .addFields(
          { name: '👤 User Infracted', value: `${targetUser}`, inline: true },
          { name: '⚡ Punishment', value: infractionType, inline: true },
          { name: 'ℹ️ Reason(s)', value: reason, inline: false },
          { name: '🪐 Staff Issuer', value: `${interaction.user}`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Western Plains Management System' });

      // Embed dışında kullanıcıyı pingleyerek gönderiyoruz
      const sentMessage = await infractionChannel.send({ content: `${targetUser}`, embeds: [embed] });

      // Alt başlık (Thread) açma
      await sentMessage.startThread({
        name: `Western Plains Infraction Discussion - ${targetUser.username}`,
        autoArchiveDuration: 1440,
        reason: 'Infraction discussion thread created automatically.'
      });

      await interaction.editReply({ content: 'Infraction logged and discussion thread opened successfully.' });
    } else {
      await interaction.editReply({ content: 'Error: Infraction channel not found!' });
    }
  } 

  // 4. CASE COMMAND (Department Server Only)
  else if (commandName === 'case' && interaction.guildId === DEPT_GUILD_ID) {
    await interaction.deferReply({ ephemeral: true });

    const detail = interaction.options.getString('detail');
    const caseChannel = interaction.guild.channels.cache.get(CASE_CHANNEL_ID);

    if (caseChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Department Case File')
        .setDescription('A new case file has been opened.')
        .addFields(
          { name: '📂 Case Details', value: detail, inline: false },
          { name: '👤 Opened By', value: `${interaction.user}`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Western Plains Department System' });

      await caseChannel.send({ embeds: [embed] });
      await interaction.editReply({ content: 'Case file created and logged successfully.' });
    } else {
      await interaction.editReply({ content: 'Error: Case channel not found in this server!' });
    }
  }
});

client.login(process.env.TOKEN);
