const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '7161446696:AAFsu90iOjpeI1MXuACxUoXFK1VJJ5ahWAo';
const bot = new TelegramBot(token, { polling: true });

let groupChats = {};
if (fs.existsSync('groupChats.json')) {
    groupChats = JSON.parse(fs.readFileSync('groupChats.json', 'utf8'));
}

let userSessions = {};

const subjects = ['math', 'physics', 'biology', 'programming', 'chemistry'];

const phrases = {
    start: 'Привет, выбери предмет',
    selectSubject: 'Опиши свой запрос, нажми /send когда будешь готов',
    requestAccepted: 'Запрос принят! Жди ответа в личных сообщениях в ближайшее время',
    featureNotAvailable: 'Пока функционал ограничен, но мы работаем над этим!'
};

const createSubjectInlineKeyboard = () => {
    return {
        reply_markup: {
            inline_keyboard: subjects.map(subject => [{
                text: subject.charAt(0).toUpperCase() + subject.slice(1),
                callback_data: subject
            }])
        }
    };
};
const createSubjectReplyKeyboard = () => {
    const rows = [
        ['Math', 'Physics'],
        ['Biology', 'Programming'],
        ['Chemistry', 'Полезные материалы'],
        ['Обратная связь']
    ];

    return {
        reply_markup: {
            keyboard: rows.map(row => row.map(text => ({ text }))),
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, phrases.start, createSubjectReplyKeyboard());
    } else if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        bot.sendMessage(chatId, 'Пожалуйста, выберите предмет для этой группы:', createSubjectInlineKeyboard());
    }
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data.toLowerCase();

    if (subjects.includes(data)) {
        if (query.message.chat.type === 'private') {
            userSessions[chatId] = {
                subject: data,
                messages: []
            };
            bot.sendMessage(chatId, phrases.selectSubject);
        } else if (query.message.chat.type === 'group' || query.message.chat.type === 'supergroup') {
            for (let subject in groupChats) {
                if (groupChats[subject].includes(chatId)) {
                    groupChats[subject] = groupChats[subject].filter(id => id !== chatId);
                    bot.sendMessage(chatId, `Эта группа больше не связана с ${subject.charAt(0).toUpperCase() + subject.slice(1)}.`);
                }
            }

            if (!groupChats[data]) {
                groupChats[data] = [];
            }
            if (!groupChats[data].includes(chatId)) {
                groupChats[data].push(chatId);
                fs.writeFileSync('groupChats.json', JSON.stringify(groupChats));
                bot.sendMessage(chatId, `${data.charAt(0).toUpperCase() + data.slice(1)} теперь связана с этой группой.`);
            }
        }
        bot.answerCallbackQuery(query.id);
    } else if (data === 'useful_materials' || data === 'feedback') {
        bot.sendMessage(chatId, phrases.featureNotAvailable);
        bot.answerCallbackQuery(query.id);
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.toLowerCase() : '';
    const senderUsername = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

    if (msg.chat.type === 'private') {
        if (userSessions[chatId]) {
            if (text === '/send') {
                const userSession = userSessions[chatId];
                const subject = userSession.subject;
                const groupChatIds = groupChats[subject];

                if (groupChatIds && groupChatIds.length > 0) {
                    groupChatIds.forEach((groupChatId) => {
                        bot.sendMessage(groupChatId, `Сообщение от ${senderUsername}:`);
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
                            }, index * 100);
                        });
                    });

                    bot.sendMessage(chatId, phrases.requestAccepted);
                } else {
                    bot.sendMessage(chatId, `Группы для ${subject.charAt(0).toUpperCase() + subject.slice(1)} не найдены.`);
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
        } else if (subjects.includes(text)) {
            userSessions[chatId] = {
                subject: text,
                messages: []
            };
            bot.sendMessage(chatId, phrases.selectSubject);
        } else {
            bot.sendMessage(chatId, 'Пожалуйста, выберите предмет из предложенных или напишите свой запрос.');
        }
    } else if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        if (subjects.map(s => s.charAt(0).toUpperCase() + s.slice(1)).includes(text)) {
            for (let subject in groupChats) {
                if (groupChats[subject].includes(chatId)) {
                    groupChats[subject] = groupChats[subject].filter(id => id !== chatId);
                    bot.sendMessage(chatId, `Эта группа больше не связана с ${subject.charAt(0).toUpperCase() + subject.slice(1)}.`);
                }
            }

            const subject = text.toLowerCase();
            if (!groupChats[subject]) {
                groupChats[subject] = [];
            }
            if (!groupChats[subject].includes(chatId)) {
                groupChats[subject].push(chatId);
                fs.writeFileSync('groupChats.json', JSON.stringify(groupChats));
                bot.sendMessage(chatId, `${subject.charAt(0).toUpperCase() + subject.slice(1)} теперь связана с этой группой.`);
            }
        }
    }
});
