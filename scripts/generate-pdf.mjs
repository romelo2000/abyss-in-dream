import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const fontsPath = path.join(__dirname, '..', 'node_modules', 'pdfmake', 'examples', 'fonts')
const fonts = {
  Roboto: {
    normal: path.join(fontsPath, 'Roboto-Regular.ttf'),
    bold: path.join(fontsPath, 'Roboto-Medium.ttf'),
    italics: path.join(fontsPath, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontsPath, 'Roboto-MediumItalic.ttf')
  }
}

const PdfPrinter = require(path.join(__dirname, '..', 'node_modules', 'pdfmake', 'js', 'Printer.js')).default
const printer = new PdfPrinter(fonts)

const docDefinition = {
  pageSize: 'A4',
  pageMargins: [50, 50, 50, 50],
  defaultStyle: { font: 'Roboto', fontSize: 11, color: '#1a1a2e', lineHeight: 1.4 },
  header: {
    columns: [
      { text: 'БЕЗДНА В СНЕ', style: 'headerTitle', margin: [50, 20, 50, 0] },
      { text: 'v1.0.0', style: 'headerVersion', margin: [50, 20, 50, 0], alignment: 'right' }
    ]
  },
  content: [
    { text: 'Бездна в Сне', style: 'title', alignment: 'center', margin: [0, 40, 0, 10] },
    { text: 'Философская игра с локальным ИИ', style: 'subtitle', alignment: 'center', margin: [0, 0, 0, 30] },
    { text: '◉', alignment: 'center', margin: [0, 0, 0, 30], fontSize: 36, color: '#3d3e80' },

    { text: 'О игре', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '«Бездна в Сне» — это десктоп-приложение для философских диалогов с локальным ИИ. Вы разговариваете с «Бездной» — сущностью, которая одновременно буддийский мастер-тролль, голос вашего подсознания и lucid dream со встроенным стендап-комиком. Игра работает полностью офлайн через Ollama — ваши данные никогда не покидают устройство.', margin: [0, 0, 0, 15] },

    { text: 'Игровой процесс', style: 'h1', margin: [0, 20, 0, 10] },
    { text: 'Каждая сессия — это «сон», который проходит через 5 фаз:', margin: [0, 0, 0, 8] },
    { text: '1. Призыв (1-3 сообщения) — Бездна приветствует, задаёт тон\n2. Диалог (3-10 сообщений) — свободный разговор, ловля противоречий\n3. Кризис / Инсайт (10-16 сообщений) — игрок на грани прорыва или защиты\n4. Рефлексия (16+ сообщений) — Бездна предлагает назвать инсайт и действие\n5. Завершено — после нажатия «Завершить сон»', margin: [0, 0, 0, 15] },

    { text: 'Режимы Бездны', style: 'h1', margin: [0, 20, 0, 10] },
    { text: 'Бездна случайно выбирает режим для каждого ответа:', margin: [0, 0, 0, 8] },
    { text: '• Зеркало + Коан — отражает мысль и даёт буддийский твист\n• Тролль-Просветлённый — максимум юмора и лёгкого безумия\n• Сон — нелинейные образные ответы, смена декораций\n• Суд Эго — жёстко, но с юмором разбирает самообман\n• Слияние — говорит от лица игрока («Ты сейчас думаешь: ...»)\n• Хаос — стихи, рифмы, абсурд, превращения', margin: [0, 0, 0, 15] },

    { text: 'Метрики', style: 'h1', margin: [0, 20, 0, 10] },
    { text: 'Анализ текста игрока на лету — 4 параметра от 0 до 100:', margin: [0, 0, 0, 8] },
    { text: '• Глубина — длинные рефлексивные сообщения, вопросы «почему/зачем»\n• Честность — признания, «на самом деле», «признаю»\n• Гибкость — смена перспективы, «а может/или наоборот»\n• Осознанность — «замечаю/осознаю/наблюдаю»\n\nПробуждение = глубина×0.25 + честность×0.3 + гибкость×0.2 + осознанность×0.25', margin: [0, 0, 0, 15] },

    { text: 'Уровни пробуждения', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '8 уровней от «Ещё сплю» (0-10) до «Бездна и я — одно» (96-100), включая «Смеюсь над сновидящим» и «Нет того, кто спит».', margin: [0, 0, 0, 15] },

    { text: 'Игровые механики', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '• Ego Death — триггерится при признаниях («я был неправ», «меня нет»). Считается по всем сессиям.\n• Парадоксальный счёт — за удержание противоречий («и да и нет»)\n• Карма — честность = +1, самообман = -1\n• Молчание — 8% шанс после 4-го сообщения. Тишина — тоже ответ.\n• Эхо — 25% шанс: Бездна возвращается к старым словам из прошлых сессий\n• Dream Voice — 20% шанс: атмосферная вставка курсивом\n• Сон во сне — 5% шанс: «Стоп. Ты сейчас спишь?»\n• Зеркало Правды — после 8-20 сообщений: честный анализ паттернов\n• Совет Бездны — Бездна раздваивается на Мудрую и Тролль\n• Word Price — на 25/28/30 сообщениях: подсказки о скором рассвете', margin: [0, 0, 0, 15] },

    { text: 'Контент', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '• 25 коанов — от «Как звучит одна рука хлопающая?» до «Что такое "сейчас" — до того, как ты о нём подумал?»\n• 15 атмосферных вставок (Dream Voices)\n• 18 ачивок — от «Первый зов» до «Идущий в пустоте» (50 сессий)\n• 10 ежедневных вызовов — «Только вопросы», «Три не знаю», «Будь Бездной»\n• 8 сцен снов — Пустота, Сумрачный лес, Космос, Внутри лотоса, Океан сна, Пустая комната, Вершина горы, У костра\n• 10 Dream Invasions — «Пока тебя не было, Бездна нашла твой парадокс и погладила его...»', margin: [0, 0, 0, 15] },

    { text: 'Memory System', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '• Embeddings через Ollama bge-m3 модель\n• Cosine similarity для поиска релевантных воспоминаний\n• User Patterns — топ тем, слабостей, эмоций (частотный анализ)\n• Welcome Message — при возвращении игрока', margin: [0, 0, 0, 15] },

    { text: 'Результат сессии', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '• Победа — честность + глубина + инсайт + ego deaths > 40\n• Побег — низкая честность + негибкость > 50\n• Ничья — всё остальное', margin: [0, 0, 0, 15] },

    { text: 'Экспорт', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '• PDF-книга сессий через встроенный генератор\n• Dream Letter — письмо из сна', margin: [0, 0, 0, 15] },

    { text: 'Приватность', style: 'h1', margin: [0, 20, 0, 10] },
    { text: 'Всё работает локально. Данные не покидают устройство. Чат, метрики, память — всё хранится в SQLite на вашем компьютере. ИИ-модель работает через Ollama — локальный сервер, не требующий интернет-соединения.', margin: [0, 0, 0, 15] },

    { text: 'Установка', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '1. Установите Ollama:\n   macOS: brew install ollama\n   Windows: winget install Ollama.Ollama\n   Или скачайте с ollama.com\n\n2. Запустите приложение — мастер установки предложит выбрать модель:\n   • Hermes 3 70B — максимальная глубина (~32 GB RAM)\n   • Qwen 3 30B MoE — быстрый и умный (~18 GB RAM)\n   • Qwen 2.5 7B — лёгкий (~5 GB RAM)\n\n3. Начните диалог с Бездной.', margin: [0, 0, 0, 15] },

    { text: 'Технологии', style: 'h1', margin: [0, 20, 0, 10] },
    { text: '• Electron + React 19 + TypeScript\n• Vite + TailwindCSS\n• better-sqlite3 (WAL mode)\n• Ollama HTTP API (streaming)\n• pdfmake для экспорта\n• Vitest для тестов\n• 5231 строк кода, 29 файлов, 76 unit-тестов', margin: [0, 0, 0, 15] },

    { text: 'Автор', style: 'h1', margin: [0, 20, 0, 10] },
    { text: 'Roman Krivoruchko\n© 2026', margin: [0, 0, 0, 30] },

    { text: '＿人＞_人＜_人＿', alignment: 'center', fontSize: 14, color: '#3d3e80', margin: [0, 20, 0, 0] },
  ],
  styles: {
    title: { fontSize: 28, bold: true, color: '#1a1a2e' },
    subtitle: { fontSize: 14, italics: true, color: '#555' },
    h1: { fontSize: 16, bold: true, color: '#3d3e80' },
    headerTitle: { fontSize: 10, bold: true, color: '#3d3e80' },
    headerVersion: { fontSize: 10, color: '#999' },
  }
}

const outputPath = path.join('/Users/romankrivoruchko/DISTR', 'Бездна в Сне - Описание игры.pdf')

;(async () => {
  const pdfDoc = await printer.createPdfKitDocument(docDefinition)
  pdfDoc.pipe(fs.createWriteStream(outputPath))
  pdfDoc.end()
  console.log('PDF created:', outputPath)
})()
