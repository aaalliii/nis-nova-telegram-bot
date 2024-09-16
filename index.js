const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '7161446696:AAFsu90iOjpeI1MXuACxUoXFK1VJJ5ahWAo';
const bot = new TelegramBot(token, { polling: true });

let groupChats = {};
if (fs.existsSync('groupChats.json')) {
    groupChats = JSON.parse(fs.readFileSync('groupChats.json', 'utf8'));
}

let userSessions = {};

const subjects = ['/math', '/physics', '/biology', '/programming', '/chemistry'];

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, `Choose a subject:\n${subjects.join('\n')}`);
    } else if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        bot.sendMessage(chatId, `Please select the subject for this group:\n${subjects.join('\n')}`);
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.toLowerCase() : '';
    const senderUsername = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

    if (msg.chat.type === 'private' && subjects.includes(text)) {
        userSessions[chatId] = {
            subject: text,
            messages: []
        };
        bot.sendMessage(chatId, `You selected ${text}. Send your messages and use /send when done.`);
        return;
    }

    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        if (subjects.includes(text)) {
            for (let subject in groupChats) {
                if (groupChats[subject].includes(chatId)) {
                    groupChats[subject] = groupChats[subject].filter(id => id !== chatId);
                    bot.sendMessage(chatId, `This group is no longer linked to ${subject}.`);
                }
            }
            if (!groupChats[text]) {
                groupChats[text] = [];
            }

            if (!groupChats[text].includes(chatId)) {
                groupChats[text].push(chatId);
                fs.writeFileSync('groupChats.json', JSON.stringify(groupChats));
                bot.sendMessage(chatId, `${text} is now linked to this group.`);
            }
            return;
        }
    }

    if (msg.chat.type === 'private' && userSessions[chatId]) {
        if (text === '/send') {
            const userSession = userSessions[chatId];
            const subject = userSession.subject;
            const groupChatIds = groupChats[subject];

            if (groupChatIds && groupChatIds.length > 0) {
                groupChatIds.forEach((groupChatId) => {
                    bot.sendMessage(groupChatId, `Message from ${senderUsername}:`);

                    userSession.messages.forEach((message, index) => {
                        setTimeout(() => {
                            if (message.type === 'text') {
                                bot.sendMessage(groupChatId, message.content);
                            } else if (message.type === 'photo') {
                                bot.sendPhoto(groupChatId, message.content);
                            } else if (message.type === 'document') {
                                bot.sendDocument(groupChatId, message.content);
                            } else if (message.type === 'video') {
                                bot.sendVideo(groupChatId, message.content);
                            } else if (message.type === 'audio') {
                                bot.sendAudio(groupChatId, message.content);
                            } else if (message.type === 'voice') {
                                bot.sendVoice(groupChatId, message.content);
                            }
                        }, index * 500);
                    });
                });

                bot.sendMessage(chatId, 'Your messages have been sent!');
            } else {
                bot.sendMessage(chatId, `No groups found for ${subject}.`);
            }

            delete userSessions[chatId];
        } else {
            if (msg.text && !subjects.includes(msg.text.toLowerCase())) {
                userSessions[chatId].messages.push({
                    type: 'text',
                    content: msg.text
                });
            } else if (msg.photo) {
                const photo = msg.photo[msg.photo.length - 1].file_id;
                userSessions[chatId].messages.push({
                    type: 'photo',
                    content: photo
                });
            } else if (msg.document) {
                const document = msg.document.file_id;
                userSessions[chatId].messages.push({
                    type: 'document',
                    content: document
                });
            } else if (msg.video) {
                const video = msg.video.file_id;
                userSessions[chatId].messages.push({
                    type: 'video',
                    content: video
                });
            } else if (msg.audio) {
                const audio = msg.audio.file_id;
                userSessions[chatId].messages.push({
                    type: 'audio',
                    content: audio
                });
            } else if (msg.voice) {
                const voice = msg.voice.file_id;
                userSessions[chatId].messages.push({
                    type: 'voice',
                    content: voice
                });
            }
        }
    }
});
