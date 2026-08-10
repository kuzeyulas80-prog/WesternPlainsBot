const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

// --- Mini Web Server ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is active!');
});

app.listen(port, () => {
  console.log(`Web server is running on port ${port}.`);
});

// --- IDs and Configuration (Main Server Only) ---
const MAIN_GUILD_ID = '1420370540899864631';     // Main Server ID
const PROMO_CHANNEL_ID = '1420459904602341426';  // Promote logs channel ID
const INFRACTION_CHANNEL_ID = '1420460148194939093'; // Infraction logs channel ID
const SESSION_CHANNEL_ID = '1511508334040191046';// Manage session target channel ID
const CLIENT_ID = '1535592914858541066';         // Doğru Bot Client ID

// Rol İsimleri
const PROMO_ROLE_NAME = 'Promotion Permission';
const INFRACTION_ROLE_NAME = 'Infractions Permission';
const SESSION_ROLE_NAME = 'WP | Session Ping';

// Oturum Oylaması İçin Banner Görseli
const BANNER_IMAGE_URL = 'https://media.discordapp.net/attachments/1420459904602341426/1536126498749026364/image_29.png';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const activeSessions = new Map();

// --- Command Definitions (Main Server Only) ---
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
    .setName('manage-session')
    .setDescription('Manages a session voting process.')
    .addIntegerOption(option => option.setName('votes-needed').setDescription('Number of votes needed to start').setRequired(true)),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Broadcasts a message.')
    .addStringOption(option => option.setName('message').setDescription('The message to send').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  try {
    console.log('Registering commands to main server...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, MAIN_GUILD_ID),
      { body: mainGuildCommands },
    );
    console.log('Commands successfully registered!');
  } catch (error) {
    console.error(error);
  }
});

// --- Interaction Handler ---
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'say') {
        const messageContent = interaction.options.getString('message');
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setDescription(messageContent)
          .setTimestamp()
          .setFooter({ text: `Sent by ${interaction.user.tag}` });

        await interaction.channel.send({ embeds: [embed] });
        await interaction.reply({ content: 'Message sent successfully as an embed!', flags: 64 });
      } 
      else if (commandName === 'promote' && interaction.guildId === MAIN_GUILD_ID) {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.member.roles.cache.some(role => role.name.toLowerCase() === PROMO_ROLE_NAME.toLowerCase())) {
          return await interaction.editReply({ content: '❌ You do not have the required **Promotion Permission** role to use this command.' });
        }

        const targetUser = interaction.options.getUser('user');
        const newRank = interaction.options.getString('rank');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const promoChannel = interaction.guild.channels.cache.get(PROMO_CHANNEL_ID);

        if (promoChannel) {
          const embed = new EmbedBuilder()
            .setColor(0x00FF00)
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

          await promoChannel.send({ content: `${targetUser}`, embeds: [embed] });
          await interaction.editReply({ content: 'Promotion logged successfully.' });
        } else {
          await interaction.editReply({ content: 'Error: Promotion channel not found!' });
        }
      } 
      else if (commandName === 'infraction' && interaction.guildId === MAIN_GUILD_ID) {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.member.roles.cache.some(role => role.name.toLowerCase() === INFRACTION_ROLE_NAME.toLowerCase())) {
          return await interaction.editReply({ content: '❌ You do not have the required **Infractions Permission** role to use this command.' });
        }

        const targetUser = interaction.options.getUser('user');
        const infractionType = interaction.options.getString('type');
        const reason = interaction.options.getString('reason');
        const infractionChannel = interaction.guild.channels.cache.get(INFRACTION_CHANNEL_ID);

        if (infractionChannel) {
          const embed = new EmbedBuilder()
            .setColor(0xFF0000)
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

          const sentMessage = await infractionChannel.send({ content: `${targetUser}`, embeds: [embed] });
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
      else if (commandName === 'manage-session' && interaction.guildId === MAIN_GUILD_ID) {
        await interaction.deferReply({ flags: 64 });

        const votesNeeded = interaction.options.getInteger('votes-needed');
        const sessionChannel = interaction.guild.channels.cache.get(SESSION_CHANNEL_ID);

        if (!sessionChannel) {
          return await interaction.editReply({ content: 'Error: Target session channel not found!' });
        }

        const sessionRole = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === SESSION_ROLE_NAME.toLowerCase());
        const rolePing = sessionRole ? `<@&${sessionRole.id}>` : '';

        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('📊 Western Plains Session Vote')
          .addFields(
            { name: '🎯 Votes Required', value: `${votesNeeded}`, inline: true },
            { name: '🗳️ Current Votes', value: `0 / ${votesNeeded}`, inline: true },
            { name: '🪐 Host By', value: `${interaction.user}`, inline: false }
          )
          .setImage(BANNER_IMAGE_URL)
          .setTimestamp()
          .setFooter({ text: 'Western Plains Management System' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('vote_session_btn')
            .setLabel('Vote')
            .setStyle(ButtonStyle.Success)
        );

        const sentMessage = await sessionChannel.send({ 
          content: rolePing, 
          embeds: [embed], 
          components: [row],
          allowedMentions: { roles: sessionRole ? [sessionRole.id] : [] }
        });

        activeSessions.set(sentMessage.id, {
          host: interaction.user,
          votesNeeded: votesNeeded,
          voters: [],
          embed: embed,
          row: row
        });

        await interaction.editReply({ content: 'Session voting has been successfully created in the designated channel.' });
      }
    } 
    else if (interaction.isButton()) {
      if (interaction.customId === 'vote_session_btn') {
        const session = activeSessions.get(interaction.message.id);

        if (!session) {
          return await interaction.reply({ content: '❌ This voting session has expired or is invalid.', flags: 64 });
        }

        if (session.voters.includes(interaction.user.id)) {
          return await interaction.reply({ content: '❌ You have already cast your vote!', flags: 64 });
        }

        session.voters.push(interaction.user.id);
        const currentVotes = session.voters.length;

        await interaction.reply({ content: '✅ Your vote has been casted!', flags: 64 });

        if (currentVotes >= session.votesNeeded) {
          const hostUser = session.host;
          activeSessions.delete(interaction.message.id);

          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('vote_session_btn')
              .setLabel('Voting Closed')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          const updatedEmbed = EmbedBuilder.from(session.embed)
            .setFields(
              { name: '🎯 Votes Required', value: `${session.votesNeeded}`, inline: true },
              { name: '🗳️ Current Votes', value: `${currentVotes} / ${session.votesNeeded}`, inline: true },
              { name: '🪐 Host By', value: `${session.host}`, inline: false }
            );

          await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

          const voterMentions = session.voters.map(id => `<@${id}>`).join(' ');
          const pingContent = `${hostUser} ${voterMentions}`;

          const startEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🚀 SESSION START POLL')
            .setDescription('The required number of votes has been reached! Click the button below to start the session.')
            .addFields(
              { name: '🪐 Hosted By', value: `${hostUser}`, inline: false },
              { name: '👥 Participants', value: voterMentions || 'None', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Western Plains Management System' });

          const startRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`start_session_btn_${hostUser.id}`)
              .setLabel('Start Session')
              .setStyle(ButtonStyle.Primary)
          );

          await interaction.channel.send({ content: pingContent, embeds: [startEmbed], components: [startRow] });
        } else {
          const updatedEmbed = EmbedBuilder.from(session.embed)
            .setFields(
              { name: '🎯 Votes Required', value: `${session.votesNeeded}`, inline: true },
              { name: '🗳️ Current Votes', value: `${currentVotes} / ${session.votesNeeded}`, inline: true },
              { name: '🪐 Host By', value: `${session.host}`, inline: false }
            );
          await interaction.message.edit({ embeds: [updatedEmbed] });
        }
      } 
      else if (interaction.customId.startsWith('start_session_btn_')) {
        const hostId = interaction.customId.split('_')[3];

        if (interaction.user.id !== hostId) {
          return await interaction.reply({ content: '❌ Only the user who started this session can click this button!', flags: 64 });
        }

        const disabledStartRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('start_session_btn_disabled')
            .setLabel('Session Started')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );

        await interaction.update({ components: [disabledStartRow] });
        await interaction.channel.send({ content: `🚀 **The session hosted by <@${hostId}> is starting right now!**` });
      }
    }
  } catch (error) {
    console.error('Interaction Error:', error);
  }
});

client.login(process.env.TOKEN);
