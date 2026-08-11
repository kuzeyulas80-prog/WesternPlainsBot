const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

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
const REQUEST_CHANNEL_ID = '1536753884528246824';// Staff request logs target channel ID
const CLIENT_ID = '1535592914858541066';         // Bot Client ID

// Rol ID'leri ve İsimleri
const SESSION_ROLE_ID = '1536126498749026364'; // WP | Session Ping
const MANAGE_SESSION_ROLE_ID = '1517532669150363859'; // manage-session komutunu kullanabilecek rol

const PROMO_ROLE_NAME = 'Promotion Permission';
const INFRACTION_ROLE_NAME = 'Infractions Permission';
const SESSION_ROLE_NAME = 'WP | Session Ping';

// Oturum Banner Görseli
const BANNER_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1510413522033709137/1536312234060546148/Ekran_goruntusu_2026-08-10_105421.png?ex=6a7af1c3&is=6a79a043&hm=0ae48afd5f6e1008aeaf3fa1f4347c310bcd885f90b08334cd4f2304f365a4eb&';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const activeSessions = new Map();

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
    .setName('request')
    .setDescription('Submit a staff request.')
    .addStringOption(option => option.setName('roblox-username').setDescription('Your Roblox username').setRequired(true))
    .addStringOption(option => option.setName('request-text').setDescription('What are you requesting?').setRequired(true)),
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

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.guildId === MAIN_GUILD_ID) {
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
      else if (commandName === 'promote') {
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
      else if (commandName === 'infraction') {
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
      else if (commandName === 'request') {
        await interaction.deferReply({ flags: 64 });

        const robloxUsername = interaction.options.getString('roblox-username');
        const requestText = interaction.options.getString('request-text');
        const requestChannel = interaction.guild.channels.cache.get(REQUEST_CHANNEL_ID);

        if (!requestChannel) {
          return await interaction.editReply({ content: '❌ Error: Staff request channel not found!' });
        }

        const requestEmbed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('📋 Staff Request')
          .setDescription(
            `👤 **Discord:** <@${interaction.user.id}>\n` +
            `🎮 **Roblox:** \`${robloxUsername}\`\n\n` +
            `**What are they requesting?**\n\`\`\`${requestText}\`\`\`\n` +
            `**Staff Agreement**\n` +
            `> 🔒 I will not re-submit a request with-in 12 hours as HR & SHR may be busy.\n` +
            `> 📬 You will receive a direct-message if it is approved/denied.\n` +
            `> ⚖️ You will not argue if it is denied.`
          )
          .addFields(
            { name: 'Status', value: '⏳ **PENDING**' }
          )
          .setTimestamp()
          .setFooter({ text: `Western Plains Management | author_id:${interaction.user.id}` });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('approve_request')
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('deny_request')
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
        );

        await requestChannel.send({ embeds: [requestEmbed], components: [row] });
        await interaction.editReply({ content: '✅ Your staff request has been successfully submitted!' });
      }
      else if (commandName === 'manage-session') {
        await interaction.deferReply({ flags: 64 });

        if (!interaction.member.roles.cache.has(MANAGE_SESSION_ROLE_ID)) {
          return await interaction.editReply({ content: '❌ You do not have the required role to use the **manage-session** command.' });
        }

        const votesNeeded = interaction.options.getInteger('votes-needed');
        const sessionChannel = interaction.guild.channels.cache.get(SESSION_CHANNEL_ID);

        if (!sessionChannel) {
          return await interaction.editReply({ content: 'Error: Target session channel not found!' });
        }

        let rolePing = SESSION_ROLE_ID ? `<@&${SESSION_ROLE_ID}>` : '';

        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('📊 Western Plains Session Vote')
          .setDescription('A session is about to start! Click the button below to cast your vote.')
          .setImage(BANNER_IMAGE_URL)
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

        const sentMessage = await sessionChannel.send({ 
          content: rolePing, 
          embeds: [embed], 
          components: [row],
          allowedMentions: { roles: SESSION_ROLE_ID ? [SESSION_ROLE_ID] : [] }
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

          await interaction.message.edit({ components: [disabledRow] });

          const voterMentions = session.voters.map(id => `<@${id}>`).join(' ');
          const pingContent = `${hostUser} ${voterMentions}`;

          const startEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🚀 SESSION START POLL')
            .setImage(BANNER_IMAGE_URL)
            .setDescription(
              `The **Western Plains Management** team has decided to host a session! All voters are **required** to join, we hope you have fun at our session!\n\n` +
              `🌐 **Server Information**\n\n` +
              `• **Server Name:** Western Plains RP | Realistic\n` +
              `• **Server Code:** WPRPS\n` +
              `• **Hosted By:** ${hostUser}\n` +
              `• **Participants:** ${voterMentions || 'None'}`
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
          session.embed.data.fields[1].value = `${currentVotes} / ${session.votesNeeded}`;
          await interaction.message.edit({ embeds: [session.embed] });
        }
      } 
      else if (interaction.customId === 'approve_request' || interaction.customId === 'deny_request') {
        const originalEmbed = interaction.message.embeds[0];
        if (!originalEmbed) return;

        const isApproved = interaction.customId === 'approve_request';
        const statusText = isApproved ? `✅ **APPROVED** by ${interaction.user}` : `❌ **DENIED** by ${interaction.user}`;
        const embedColor = isApproved ? 0x2ECC71 : 0xE74C3C;

        // Embed'i güncellerken Status alanını değiştiriyoruz
        const updatedFields = originalEmbed.fields.map(field => {
          if (field.name === 'Status') {
            return { name: 'Status', value: statusText };
          }
          return field;
        });

        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(embedColor)
          .setFields(updatedFields);

        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('approve_request')
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('deny_request')
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

        // Talep sahibinin ID'sini footer veya description içerisinden güvenle bulma
        let targetUserId = null;
        const footerText = originalEmbed.footer?.text || '';
        const footerMatch = footerText.match(/author_id:(\d+)/);
        
        if (footerMatch) {
          targetUserId = footerMatch[1];
        } else {
          const match = originalEmbed.description.match(/<@!?(\d+)>/);
          if (match) targetUserId = match[1];
        }

        if (targetUserId) {
          try {
            const targetUser = await client.users.fetch(targetUserId);
            if (targetUser) {
              const dmEmbed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(isApproved ? '🎉 Request Approved!' : '❌ Request Denied')
                .setDescription(`Your request has been **${isApproved ? 'APPROVED' : 'DENIED'}** by ${interaction.user}.`)
                .setTimestamp()
                .setFooter({ text: 'Western Plains Management' });

              await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                console.log('Could not send DM to the user (DMs might be closed).');
              });
            }
          } catch (err) {
            console.error('Error fetching user for DM:', err);
          }
        }

        await interaction.update({ embeds: [updatedEmbed], components: [disabledRow] });
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
