var token = "NzI1MzU2NDQ0ODQ0Njg3NDEw.XvNi1A.09XZovI2pFZY7vDdVF7KJpOQwQ0";
var prefix = "!";
var yt_key = "AIzaSyBoA19TREX0I5cgBc71KNI0nO-FpuQegjI";

const yt = require('ytdl-core-discord');
const searchYoutube = require('youtube-api-v3-search');

const Discord = require("discord.js");
const client = new Discord.Client({disableMentions: "everyone"});

client.login(token);

client.on('ready', () => {
    console.log(`Bot ${client.user.tag} ready!`);
    client.user.setActivity(`${prefix}help`);
});

client.on("message",  async (msg)=> {
    if(!msg.content.startsWith(prefix)) return;
    if(!msg.guild) return;
    if(msg.author.bot) return;
    //вызов
    if (commands.hasOwnProperty(msg.content.toLowerCase().slice(prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(prefix.length).split(' ')[0]](msg);
});

//плэйлист
var queue = {};

const commands = {
    'join': (msg) => {
        return new Promise((resolve, reject) => {
            const voiceChannel = msg.member.voice.channel;
            if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply(`Ошибка подключения к ${voiceChannel.name}`);
            voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
        });
    },
    'leave': (msg) => {
        return new Promise((resolve, reject) => {
            const voiceChannel = msg.member.voice.channel;
            voiceChannel.leave();
        });
    },
    'add': (msg) => {
        var url = msg.content.split(' ')[1];
        if (url == '' || url === undefined) return msg.reply(`Необходимо добавить ссылку на YouTube видео или ID после ${prefix}add`);
        yt.getInfo(url, (err, info) => {
            if (err) {
                let args = msg.content.slice(prefix.length).trim().split(" ");
                args.splice(0, 2);
                let cont = args.join(" ");
                var options = {
                    q: cont,
                    part: 'snippet',
                    type: 'video'
                };
                searchYoutube(yt_key, options, function (err, result) {
                    if (err) {
                        console.log(err + " |-------|-------| " + JSON.stringify(info));
                    } else {
                        url = result.items[0].id.videoId;
                        yt.getInfo(url, (err, info) => {
                            if (!err) {
                                if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
                                queue[msg.guild.id].songs.push({
                                    url: url,
                                    title: info.title,
                                    requester: msg.author.username
                                });
                                msg.channel.send(msg.author.username + " добавил в очередь: ```" + info.title + "```");
                            }
                        });
                    }
                });
            } else {
                if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
                queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
                msg.channel.send("Добавлено в очередь: ```" + info.title + "```");
            }
        });
    },
    'playlist': (msg) => {
        if (queue[msg.guild.id] === undefined) return msg.channel.send(`Очередь пуста. Для добавления трека воспользуйся командой !add`);
        let sendmsg = [];
        queue[msg.guild.id].songs.forEach((song, i) => {
            sendmsg.push(`${i + 1}. ${song.title} - Заказал: ${song.requester}`);
        });
        msg.channel.send(`__**Муз. Очередь:**__ В данный момент **${sendmsg.length}** треков в очереди. ${(sendmsg.length > 10 ? '*[Показаны первые 10]*' : '')}\n\`\`\`${sendmsg.slice(0, 10).join('\n')}\`\`\``);
    },
    'play': (msg) => {
        {
            if (queue[msg.guild.id] === undefined) return msg.channel.send(`Очередь пуста. Для добавления трека воспользуйся командой !add`);
            if (msg.guild.voice == undefined || msg.guild.voice.channel == undefined || msg.guild.voice.connection == null) return commands.join(msg).then(() => commands.play(msg));
            if (queue[msg.guild.id].playing) return msg.channel.send('Уже играет');

            var dispatcher;
            queue[msg.guild.id].playing = true;

            (async function play(song) {
                if (song === undefined) return msg.channel.send('Очередь пуста').then(() => {
                    queue[msg.guild.id].playing = false;
                    msg.member.voice.channel.leave();
                });

                msg.channel.send(`Играет: **${song.title}** по запросу от **${song.requester}**`);
                dispatcher = msg.guild.voice.connection.play(await yt(song.url), { type: 'opus' });

                const collector = msg.channel.createMessageCollector(m => m);
                    collector.on('collect', m => {
                    if (m.content.startsWith(prefix +"pause")) {
                        m.channel.send('На паузе').then(() => {
                            dispatcher.pause();
                        });
                    }
                    else if (m.content.startsWith(prefix + 'resume')) {
                        m.channel.send('Проигрывание продолжается').then(() => {
                            dispatcher.resume();
                        });
                    }
                    else if (m.content.startsWith(prefix + 'skip')) {
                        m.channel.send('Трек пропущен').then(() => {
                            if(!queue[msg.guild.id].songs.length > 0 ){
                                dispatcher.end();
                        }
                            else{
                                play(queue[msg.guild.id].songs.shift    ());
                                collector.stop();
                            }
                        });
                    }
                });

                dispatcher.on("end", end => {
                    collector.stop();
                    dispatcher.end();
                    msg.member.voice.channel.leave();
                });


                dispatcher.on('finish', () => {
                    collector.stop();
                    dispatcher.end();
                    play(queue[msg.guild.id].songs.shift());
                });

                dispatcher.on('error', (err) => {
                    return msg.channel.send('Ошибка: ' + err).then(() => {
                        play(queue[msg.guild.id].songs.shift());
                        collector.stop();
                    });
                });
            })(queue[msg.guild.id].songs.shift());
        }
    },
    'help': (msg) => {
        msg.channel.send("```"+`
!join - Приглашение бота в голосовой канал
!leave - Отключить бота из голосового канала
!add yt.link  - добавляет в очередь музыкальную дорожку ютуба
!playlist - Выводит плейлист из ближайших 10 записей                                                  
!pause - Пауза
!resume - Возобновить проигрывание
!skip - Пропустить текущий трек` + "```");
    }
};