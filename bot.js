const axios = require("axios");
const nodeCron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

var bot;
token = process.env.TELEGRAM_TOKEN;
if (process.env.NODE_ENV === "production") {
  bot = new TelegramBot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
  console.log("**** BOT initiated ***** ");
} else {
  // otherwise, we use polling
  // differences between webhooks and polling:
  // https://core.telegram.org/bots/webhooks
  // https://stackoverflow.com/questions/40033150/telegram-bot-getupdates-vs-setwebhook
  bot = new TelegramBot(token, { polling: true });
}

bot.setMyCommands([
  {
    command: "/start",
    description: "Выбрать город",
  },
  {
    command: "/stop",
    description: "Отписаться от сообщений",
  },
  {
    command: "/time",
    description:
      "Изменить время рассылки. Напиши когда тебе удобно получать сообщения после текста команды",
  },
]);

const cities = [
  { city: "Санкт-Петербург", id: 498817 },
  {
    city: "Мурманск",
    id: 524305,
  },
  { city: "Москва", id: 524901 },
];

const city = cities.map((e) => (e = e.city));

var messageTime = "* 8 * * *";
var displayedTime = "8:00";

const getWeather = async (id) => {
  const key = "ef521c687ed4317d5e11c41031b9c78a";
  const units = "metric";
  const language = "ru";
  const { data } = await axios.get(
    `http://api.openweathermap.org/data/2.5/weather?id=${id}&appid=${key}&units=${units}&lang=${language}`
  );
  return data;
};
const handleWeatherMessage = async (chatId, cityId) => {
  const now = new Date();
  const time = now.getHours();
  const data = await getWeather(cityId);
  const { temp, feels_like } = data.main;
  const nightMessages = [
    "Доброй ночи, сладкая булочка💖💖💖",
    "Чего не спишь, любимка?😮😮😮",
    "Способы борьбы с бессонницей\nhttps://probolezny.ru/bessonnica/",
  ];
  const dayMessages = [
    "Доброго дня тебе, булочка💖💖💖",
    "День это как ночь, но блин",
  ];
  const morningMessages = [
    "Доброго утра, булочка💖💖💖. Выпей кофе и вперед.",
    "Утречка, сладость🍬🍬🍬",
    "Удачи в твоей деятельности, любимка",
  ];
  let timeMessage;

  if (time >= 23 && time < 6) {
    timeMessage =
      nightMessages[Math.floor(Math.random() * nightMessages.length)];
  }
  if (time >= 12 && time < 23) {
    timeMessage = dayMessages[Math.floor(Math.random() * dayMessages.length)];
  }
  if (time >= 6 && time < 12) {
    timeMessage =
      morningMessages[Math.floor(Math.random() * dayMessages.length)];
  }

  if (data.weather[0].main === "Rain") {
    bot.sendSticker(
      chatId,
      "CAACAgIAAxkBAAEUY0Fij322yugW2VA_F71E87AeS6osSQACOwADFWCyAz-dFQNIOyV1JAQ"
    );
  } else if (data.weather[0].main === "Clear") {
    bot.sendSticker(
      chatId,
      "CAACAgIAAxkBAAEUY0Vij36Y8kWXXhwkdJ0ClA6znr5nLQACQQADFWCyA-kZKCHyTgzXJAQ"
    );
  } else if (data.weather[0].main === "Snow") {
    bot.sendSticker(
      chatId,
      "CAACAgIAAxkBAAEUY1Zij39ttQOg9c8vkSTTuNX70pJjqgACJwEAAhVgsgO_0_1LYeFoMiQE"
    );
  } else if (data.weather[0].main === "Clouds") {
    bot.sendSticker(
      chatId,
      "CAACAgIAAxkBAAEUY1lij3-astClMulviXcz7dWvg_U_kwACOQADFWCyAyEDxcRlDJ-BJAQ"
    );
  } else if (data.weather[0].main === "Fog") {
    bot.sendSticker(
      chatId,
      "CAACAgEAAxkBAAEUeVlikrEkpyh0Rzjho7xKJwsZpMO8zAACXQADfkyNB_zIuBrGa8gFJAQ"
    );
  }

  await bot.sendMessage(
    chatId,
    `${timeMessage}\nСегодня в твоем городе ${Math.round(
      temp
    )}°C\nОщущается как ${Math.round(feels_like)}°C`
  );
};

const scheduleWeatherMessage = async (chatId, cityId) => {
  nodeCron.schedule(messageTime, async () => {
    handleWeatherMessage(chatId, cityId);
  });
};

const stopTasks = () => {
  const tasks = nodeCron.getTasks();
  tasks.map((e) => e.stop);
};

bot.onText(/\/start/, (msg) => {
  const cityOpts = {
    reply_markup: JSON.stringify({
      keyboard: [
        city.map((e) => {
          return { text: e };
        }),
      ],
      resize_keyboard: true,
    }),
  };
  bot.sendMessage(msg.chat.id, "Выбери город", cityOpts);
});

bot.on("callback_query", async (msg) => {
  console.log(msg);
  const cityId = msg.data;
  await handleWeatherMessage(msg.message.chat.id, cityId);
});

bot.on("message", async ({ chat, text }) => {
  console.log(text);
  if (text === "пошел нахуй".toLowerCase()) {
    bot.sendMessage(chat.id, "сам пошел");
  }
  const getCity = () => {
    for (let i = 0; i < cities.length; i++) {
      if (cities[i].city == text) {
        return cities[i].id;
      }
    }
  };
  try {
    const cityId = getCity();
    if (cityId) {
      const cityOpts = {
        reply_markup: JSON.stringify({
          inline_keyboard: [[{ text: "Да", callback_data: `${cityId}` }]],
        }),
      };

      stopTasks();

      scheduleWeatherMessage(chat.id, cityId);

      bot.sendMessage(
        chat.id,
        `Ты подписался на рассылку о погоде. Теперь прогноз будет приходить каждый день в ${displayedTime}. Получить его сейчас?`,
        cityOpts
      );

      console.log(dick);
    }
  } catch (error) {}
});
bot.onText(/\/stop/, () => {
  stopTasks();
});

bot.onText(/\/time(.+)/, ({ chat }, match) => {
  const userTime = match[1].trim();
  const minutes = userTime.split(":")[1];
  const hours = userTime.split(":")[0];

  if (hours <= 23 && minutes <= 59) {
    messageTime = `${minutes} ${hours} * * *`;
    displayedTime = userTime;

    bot.sendMessage(
      chat.id,
      `Теперь ты будешь получать уведомления в ${displayedTime}. Чтобы изменения вступили в силу, переподпишись на обновление погоды`
    );
  } else bot.sendMessage(chat.id, "Введи правильное время, дурашка");
});

module.exports = bot;
