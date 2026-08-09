const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// --- IDs and Configuration (Main Server Only) ---
const MAIN_GUILD_ID = '1420370540899864631';     // Main Server ID
const PROMO_CHANNEL_ID = '1420459904602341426';  // Promote logs channel ID
const INFRACTION_CHANNEL_ID = '1420460148194939093'; // Infraction logs channel ID
const SESSION_CHANNEL_ID = '1511508334040191046';// Manage session target channel ID
const CLIENT_ID = '153559291485854106';          // Bot Client ID

// Rol İsimleri
const PROMO_ROLE_NAME = 'Promotion Permission';
const INFRACTION_ROLE_NAME = 'Infractions Permission';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Aktif oylamaları ve host bilgilerini hafızada tutmak için harita (Map)
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
  if (interaction.isChatInputCommand()) {
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

    // 2. PROMOTE COMMAND
    else if (commandName === 'promote' && interaction.guildId === MAIN_GUILD_ID) {
      await interaction.deferReply({ ephemeral: true });

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

    // 3. INFRACTION COMMAND
    else if (commandName === 'infraction' && interaction.guildId === MAIN_GUILD_ID) {
      await interaction.deferReply({ ephemeral: true });

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

    // 4. MANAGE-SESSION COMMAND
    else if (commandName === 'manage-session' && interaction.guildId === MAIN_GUILD_ID) {
      await interaction.deferReply({ ephemeral: true });

      const votesNeeded = interaction.options.getInteger('votes-needed');
      const sessionChannel = interaction.guild.channels.cache.get(SESSION_CHANNEL_ID);

      if (!sessionChannel) {
        return await interaction.editReply({ content: 'Error: Target session channel not found!' });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('📊 Western Plains Session Vote')
        .setDescription('A session is about to start! Click the button below to cast your vote.')
        .addFields(
          { name: '🎯 Votes Required', value: `${votesNeeded}`, inline: true },
          { name: '🗳️ Current Votes', value: `0 / ${votesNeeded}`, inline: true },
          { name: '🪐 Host By', value: `${interaction.user}`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Western Plains Management System' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('vote_session_btn')
          .setLabel('Vote')
          .setStyle(ButtonStyle.Success)
      );

      const sentMessage = await sessionChannel.send({ embeds: [embed], components: [row] });

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

  // BUTTON INTERACTIONS
  else if (interaction.isButton()) {
    // VOTE BUTTON
    if (interaction.customId === 'vote_session_btn') {
      const session = activeSessions.get(interaction.message.id);

      if (!session) {
        return await interaction.reply({ content: '❌ This voting session has expired or is invalid.', ephemeral: true });
      }

      if (session.voters.includes(interaction.user.id)) {
        return await interaction.reply({ content: '❌ You have already cast your vote!', ephemeral: true });
      }

      session.voters.push(interaction.user.id);
      const currentVotes = session.voters.length;

      await interaction.reply({ content: '✅ Your vote has been casted!', ephemeral: true });

      if (currentVotes >= session.votesNeeded) {
        const hostUser = session.host; // Host bilgisini saklıyoruz
        activeSessions.delete(interaction.message.id);

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('vote_session_btn')
            .setLabel('Voting Closed')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await interaction.message.edit({ components: [disabledRow] });

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
            .setCustomId(`start_session_btn_${hostUser.id}`) // Host ID'sini butona bağlıyoruz
            .setLabel('Start Session')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ content: pingContent, embeds: [startEmbed], components: [startRow] });
      } else {
        session.embed.fields[1].value = `${currentVotes} / ${session.votesNeeded}`;
        await interaction.message.edit({ embeds: [session.embed] });
      }
    } 
    
    // START SESSION BUTTON (Only Host Restricted)
    else if (interaction.customId.startsWith('start_session_btn_')) {
      const hostId = interaction.customId.split('_')[3];

      // Sadece komutu kullanan kişi (host) basabilir kontrolü
      if (interaction.user.id !== hostId) {
        return await interaction.reply({ content: '❌ Only the user who started this session can click this button!', ephemeral: true });
      }

      const disabledStartRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('start_session_btn_disabled')
          .setLabel('Session Started')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );

      await interaction.update({ components: [disabledStartRow] });
      await interaction.channel.send({ content: '@everyone 🚀 **The session is starting right now!**' });
    }
  }
});

client.login(process.env.TOKEN);
