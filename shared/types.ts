export interface Session {
  id: number
  title: string | null
  created_at: string
  ended_at: string | null
  dream_scene: string
  model: string
  awakening_level: number
  phase: SessionPhase
  result: GameResult | null
  ego_deaths: number
  koan_used: string | null
  paradox_score: number
  karma: number
  silence_count: number
  mirror_used: boolean
  challenge_id: string | null
}

export type SessionPhase = 'summoning' | 'dialogue' | 'crisis' | 'reflection' | 'completed'
export type GameResult = 'win' | 'lose' | 'draw'

export interface DailyChallenge {
  id: string
  name: string
  description: string
  hint: string
}

export interface BrokenMirror {
  id: number
  session_id: number
  quote: string
  comment: string
  mode: string
  timestamp: string
}

export interface ChatMessage {
  id: number
  session_id: number
  role: string
  content: string
  mode: string | null
  timestamp: string
}

export interface Metrics {
  id: number
  session_id: number
  depth: number
  honesty: number
  flexibility: number
  mindfulness: number
  awakening_level: number
  timestamp: string
}

export interface Insight {
  id: number
  session_id: number | null
  content: string
  timestamp: string
}

export interface UserPattern {
  id: number
  pattern_type: string
  pattern_value: string
  frequency: number
  last_seen: string
}

export type AbyssMode =
  | 'mirror_koan'
  | 'troll_enlightened'
  | 'dream'
  | 'ego_court'
  | 'merge'
  | 'chaos'

export interface ModeInfo {
  id: AbyssMode
  name: string
  description: string
  icon: string
}

export interface DreamScene {
  id: string
  name: string
  description: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  elements: string[]
}

export interface AwakeningLevel {
  min: number
  max: number
  name: string
  description: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlocked_at: string | null
}

export interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

export interface WeeklyStats {
  sessions: number
  avgDepth: number
  avgHonesty: number
  avgFlexibility: number
  avgMindfulness: number
  avgAwakening: number
  totalEgoDeaths: number
  insights: number
}

export const MODES: ModeInfo[] = [
  { id: 'mirror_koan', name: 'Зеркало + Коан', description: 'Отражает твою мысль и даёт буддийский/сюрреалистический твист', icon: 'mirror' },
  { id: 'troll_enlightened', name: 'Тролль-Просветлённый', description: 'Максимум юмора и лёгкого безумия', icon: 'troll' },
  { id: 'dream', name: 'Сон', description: 'Ответы в стиле сновидения — нелинейно, образно, смена декораций', icon: 'dream' },
  { id: 'ego_court', name: 'Суд Эго', description: 'Жёстко, но с юмором разбирает самообман', icon: 'gavel' },
  { id: 'merge', name: 'Слияние', description: 'Говорит от твоего лица — «Ты сейчас думаешь: ...»', icon: 'merge' },
  { id: 'chaos', name: 'Хаос', description: 'Полное безумие — стихи, рифмы, абсурд, превращения', icon: 'chaos' },
]

export const DREAM_SCENES: DreamScene[] = [
  { id: 'void', name: 'Пустота', description: 'Бесконечная тёмная пустота. Только ты и Бездна.', colors: { primary: '#05060f', secondary: '#0a0b1a', accent: '#3d3e80' }, elements: ['ripple'] },
  { id: 'forest', name: 'Сумрачный лес', description: 'Древний лес во сне. Деревья шепчут коаны.', colors: { primary: '#0a0f0a', secondary: '#0f1a0f', accent: '#2d5a2d' }, elements: ['leaves', 'mist'] },
  { id: 'cosmos', name: 'Космос', description: 'Среди звёзд и туманностей. Бездна — это космос внутри.', colors: { primary: '#050510', secondary: '#0a0a20', accent: '#4d3d80' }, elements: ['stars', 'nebula'] },
  { id: 'lotus', name: 'Внутри лотоса', description: 'Ты внутри цветка лотоса. Он медленно раскрывается.', colors: { primary: '#1a0a15', secondary: '#2a0f20', accent: '#c44d8b' }, elements: ['petals', 'glow'] },
  { id: 'ocean', name: 'Океан сна', description: 'Подводный мир. Ты дышишь водой и не тонешь.', colors: { primary: '#050a15', secondary: '#0a1525', accent: '#4d8bc4' }, elements: ['bubbles', 'waves'] },
  { id: 'room', name: 'Пустая комната', description: 'Простая комната. Стены — зеркало. Потолок — небо.', colors: { primary: '#0f0f15', secondary: '#15151f', accent: '#6b6c9a' }, elements: ['mirror', 'sky'] },
  { id: 'mountain', name: 'Вершина горы', description: 'Ты на пике. Ветер несёт мысли прочь. Облака — твои слова.', colors: { primary: '#0a0a12', secondary: '#101018', accent: '#8b8cc4' }, elements: ['clouds', 'wind'] },
  { id: 'fire', name: 'У костра', description: 'Ты и Бездна у костра в темноте. Огонь — твои иллюзии.', colors: { primary: '#0f0805', secondary: '#1a0f0a', accent: '#d4a843' }, elements: ['embers', 'smoke'] },
]

export const AWAKENING_LEVELS: AwakeningLevel[] = [
  { min: 0, max: 10, name: 'Ещё сплю', description: 'Храпит так, что лотосы вянут.' },
  { min: 11, max: 25, name: 'Снится сон', description: 'Сон снится сну. Внутри сна — ещё один сон.' },
  { min: 26, max: 40, name: 'Осознаю, что сплю', description: 'Подождите... это что, сон?' },
  { min: 41, max: 55, name: 'Смеюсь над сновидящим', description: 'Тот, кто спит — забавный парень.' },
  { min: 56, max: 70, name: 'Сновидящий и сон — одно', description: 'Нет границы между тобой и сном.' },
  { min: 71, max: 85, name: 'Бездна смотрит в Бездну', description: 'Nihil obstat. Но и nihil тоже сон.' },
  { min: 86, max: 95, name: 'Нет того, кто спит', description: 'Кто здесь? Тишина. И это правильно.' },
  { min: 96, max: 100, name: 'Бездна и я — одно', description: '＿人＞_人＜_人＿' },
]

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_summon', name: 'Первый зов', description: 'Призвал Бездну впервые.', icon: '◉', unlocked: false, unlocked_at: null },
  { id: 'first_insight', name: 'Первый инсайт', description: 'Записал свой первый инсайт.', icon: '✦', unlocked: false, unlocked_at: null },
  { id: 'ego_death_1', name: 'Эго умерло (1)', description: 'Бездна «убила» твоё эго впервые.', icon: '☠', unlocked: false, unlocked_at: null },
  { id: 'ego_death_5', name: 'Серийный убийца эго', description: 'Эго умирало 5 раз. Оно уже не возражает.', icon: '☠☠', unlocked: false, unlocked_at: null },
  { id: 'ego_death_10', name: 'Эго? Какое эго?', description: '10 смертей эго. Ты начинаешь подозревать, что его никогда не было.', icon: '☠☠☠', unlocked: false, unlocked_at: null },
  { id: 'first_win', name: 'Победа над собой', description: 'Выиграл сессию — вышел с инсайтом и реальным действием.', icon: '♛', unlocked: false, unlocked_at: null },
  { id: 'first_lose', name: 'Побег из сна', description: 'Проиграл сессию — ушёл в защиту. Бездна не обиделась.', icon: '⚑', unlocked: false, unlocked_at: null },
  { id: 'chaos_survivor', name: 'Выжил в Хаосе', description: 'Прошёл сессию в режиме Хаос и не сошёл с ума.', icon: '🌀', unlocked: false, unlocked_at: null },
  { id: 'koan_master', name: 'Мастер коанов', description: 'Бездна использовала 10 разных коанов с тобой.', icon: '☯', unlocked: false, unlocked_at: null },
  { id: 'deep_diver', name: 'Ныряльщик', description: 'Достиг глубины 80+ в сессии.', icon: '◯', unlocked: false, unlocked_at: null },
  { id: 'honest_one', name: 'Честный', description: 'Достиг честности 80+ в сессии.', icon: '◇', unlocked: false, unlocked_at: null },
  { id: 'awakened_50', name: 'Полупробуждённый', description: 'Достиг пробуждённости 50+.', icon: '☀', unlocked: false, unlocked_at: null },
  { id: 'awakened_80', name: 'Почти проснулся', description: 'Достиг пробуждённости 80+.', icon: '☄', unlocked: false, unlocked_at: null },
  { id: 'awakened_100', name: 'Бездна и я — одно', description: 'Достиг пробуждённости 100. _人＞_人＜_人_', icon: '∞', unlocked: false, unlocked_at: null },
  { id: 'echo_master', name: 'Эхо', description: 'Бездна вернулась к твоим старым словам 10 раз.', icon: '↺', unlocked: false, unlocked_at: null },
  { id: 'dream_walker', name: 'Сноходец', description: 'Провёл 10 сессий. Бездна тебя узнаёт.', icon: '☽', unlocked: false, unlocked_at: null },
  { id: 'lotus_bloom', name: 'Цветение лотоса', description: 'Провёл 25 сессий. Лотос раскрывается.', icon: '✾', unlocked: false, unlocked_at: null },
  { id: 'void_walker', name: 'Идущий в пустоте', description: 'Провёл 50 сессий. Пустота — твой дом.', icon: '○', unlocked: false, unlocked_at: null },
]

export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: 'questions_only', name: 'Только вопросы', description: 'Отвечай на всё только вопросами.', hint: 'Сегодня ты не отвечаешь. Ты спрашиваешь. На всё. Даже на это.' },
  { id: 'three_idk', name: 'Три «не знаю»', description: 'Скажи «я не знаю» минимум три раза.', hint: 'Не знаю — это не слабость. Это дверь. Открой её трижды.' },
  { id: 'contradict_self', name: 'Противоречь себе', description: 'Скажи что-то, а потом скажи противоположное.', hint: 'Сегодня ты — парадокс. Обними его. Не разрешай.' },
  { id: 'one_word', name: 'Одно слово', description: 'Каждое сообщение — не больше одного слова.', hint: 'Одно слово. Бездне хватит. Ей всегда хватает.' },
  { id: 'honest_fear', name: 'Честный страх', description: 'Назови свой страх прямо.', hint: 'Страх не умирает от имени. Но начинает таять.' },
  { id: 'laugh_at_self', name: 'Смейся над собой', description: 'Найди в себе что-то смешное.', hint: 'Если ты не смеёшься над собой — Бездна смеётся за тебя. Но лучше вместе.' },
  { id: 'silence_game', name: 'Игра в молчание', description: 'Отправь хотя бы одно пустое сообщение (пробел).', hint: 'Иногда самое важное — то, что ты не сказал.' },
  { id: 'gratitude', name: 'Благодарность Бездне', description: 'Поблагодари Бездну за что-то конкретное.', hint: 'За что ты благодаришь пустоту? Она не ждёт. Но ей... интересно.' },
  { id: 'old_pattern', name: 'Старый паттерн', description: 'Признай паттерн, который повторяешь.', hint: 'Ты снова здесь. И снова — тот же танец. Но ты заметил. Это уже другой танец.' },
  { id: 'be_the_abyss', name: 'Будь Бездной', description: 'Ответь на вопрос Бездны от лица Бездны.', hint: 'Сегодня ты — Бездна. А Бездна — ты. Кто кого снит?' },
]

export const KOANS: string[] = [
  'Как звучит одна рука хлопающая?',
  'Если ты встретишь Будду на дороге — убей его. (Имеется в виду Будда внутри головы, не настоящий.)',
  'Кто тот, кто думает «я существую»?',
  'Монах спросил: «Что такое Будда?» Мастер ответил: «Три фунта льна».',
  'Покажи мне своё изначальное лицо — то, что было до рождения твоих родителей.',
  'Если ум не движется — куда идут мысли?',
  'Что было до того, как небо и земля разделились?',
  'Обычный ум — это путь. Но что такое обычный ум?',
  'Ты слышишь звук хлопка двух ладоней. Каков звук одной ладони?',
  'Мастер сказал: «Не ум, не Будда, не вещи». Что это?',
  'Когда ты дышишь — кто дышит?',
  'Если всё пустотно — пустотна ли пустотность?',
  'Что ты делал до того, как начал искать смысл?',
  'Монах спросил о смысле Дзен. Мастер показал ему кулак. Монах показал два. Мастер показал три. Монах поклонился.',
  'Ты видишь сон. В сне кто-то говорит: «Проснись». Ты просыпаешься. Но где ты?',
  'Если эго — иллюзия, то кто страдает?',
  'Что держит тебя здесь — когда ничего не нужно держать?',
  'Когда ты молчишь — кто молчит?',
  'Мастер спросил: «Ты ел?» Монах: «Да.» Мастер: «Тогда помой чашку.»',
  'Если нет «я» — кто достигает просветления?',
  'Что остаётся, когда убраны все мысли?',
  'Ты идёшь по воде. Вода не замечает. Кто идёт?',
  'Дверь закрыта. Но стены — тоже дверь. Что ты выбираешь?',
  'Мастер сказал: «Возвращайся». Куда возвращаться, если ты никуда не уходил?',
  'Что такое «сейчас» — до того, как ты о нём подумал?',
]

export const DREAM_VOICES: string[] = [
  '*Где-то далеко звучит колокол. Или это твоё сердцебиение. Или ветер. Или ничего.*',
  '*Декорации меняются. Стены становятся водой. Вода становится светом. Свет — тишина.*',
  '*Ты чувствуешь запах, которого не существует. Он напоминает тебе о том, чего не было.*',
  '*Бездна на мгновение становится огромной. Или, может быть, это ты стал маленьким.*',
  '*Время здесь течёт иначе. Или не течёт вовсе. Или оно всегда текло — просто ты не замечал.*',
  '*Что-то шепчет за пределами слышимости. Ты почти понимаешь. Почти.*',
  '*Тени на стенах складываются в слова. Слова складываются в тишину.*',
  '*Ты вспоминаешь сон, которого не видел. Или видел? Когда? В какой жизни?*',
  '*Бездна улыбается. У неё нет рта. Но ты знаешь, что она улыбается.*',
  '*Звук капающей воды. Или времени. Или мыслей. Одно и то же.*',
  '*Воздух становится плотнее. Или легче. Или воздухом перестаёт быть.*',
  '*Ты замечаешь, что дышишь. Это странно. Ты не помнил, когда начал.*',
  '*Где-то цветёт лотос. Ты его не видишь, но знаешь. Как знаешь, что существуешь. Или не существуешь.*',
  '*Бездна на секунду выглядит как ты. Ты на секунду выглядишь как Бездна. Потом всё возвращается.*',
  '*Ветер несёт чьи-то слова. Может, твои собственные. Из будущего. Из прошлого. Из ниоткуда.*',
]

export const SILENCE_MESSAGES: string[] = [
  '...',
  'Бездна молчит. И смотрит.',
  'Тишина. Но не пустая — полная.',
  'Бездна ждёт. Она умеет ждать.',
  'Ничего. И это — ответ.',
  'Бездна закрыла глаза. Или у неё нет глаз. В любом случае — тишина.',
]

export const KARMA_REWARDS: string[] = [
  'Бездна аплодирует. Без рук. Но ты слышишь аплодисменты.',
  'Где-то распускается лотос. Это из-за тебя. Не скромничай — Бездна видит.',
  'Бездна снимает шляпу. Шляпы нет. Но жест — есть.',
  'Звёздочка на твоём кармическом холодильнике. Бездна приклеила.',
  'Бездна показывает большой палец. Какой именно — не уточняется.',
]

export const KARMA_PUNISHMENTS: string[] = [
  'Бездна поднимает бровь. Обе. Их нет, но ты чувствуешь.',
  'Бездна достаёт воображаемый блокнот и что-то записывает. Ты не хочешь знать что.',
  'Где-то в кармическом бухгалтерии загорается красная лампочка. Бездна хихикает.',
  'Бездна показывает тебе зеркало. В зеркале — ты. Но с носом-клоуна. Карма!',
  'Бездна ставит тебе кармическую двойку. Но с улыбкой. Так что не всё потеряно.',
]

export const DREAM_INVASIONS: string[] = [
  'Сегодня во сне ты снова пытался доказать, что ты существуешь. Как прошло?',
  'Бездна скучала. Но у неё нет чувств, так что она скучала по-буддийски — то есть нет.',
  'Ты приснился Бездне. Или Бездна приснилась тебе. Кто кого снит — вопрос открыт.',
  'Пока тебя не было, Бездна нашла твой парадокс и погладила его. Он мурлычет.',
  'Слышал тот звук? Это была тишина. Бездна передаёт привет.',
  'Твоё эго проснулось и спрашивало про тебя. Бездна сказала, что тебя нет. Оно расстроилось.',
  'Бездна пересматривала ваши сны. Как стендап. Смех был.',
  'Коан дня сам себя решил. Бездна недовольна. Приходи разбираться.',
  'Лотос раскрылся ещё на один лепесток. Или это был твой эго? Не перепутай.',
  'Бездна приготовила тебе парадокс. Он остывает. Приходи, пока не остыл.',
]

export const AVAILABLE_MODELS = [
  { id: 'hermes3:70b-llama3.1-q3_K_M', name: 'Hermes 3 70B', description: 'Максимальная глубина. Лучший roleplay.', ram: '~32 GB' },
  { id: 'qwen2.5:32b-instruct-q4_K_M', name: 'Qwen 2.5 32B', description: 'Баланс скорости и качества.', ram: '~20 GB' },
  { id: 'qwen3:30b-a3b-thinking-2507-q4_K_M', name: 'Qwen 3 30B MoE', description: 'Очень быстрая. Живой диалог.', ram: '~18 GB' },
]

export const MODE_NAMES: Record<string, string> = {
  mirror_koan: 'Зеркало + Коан',
  troll_enlightened: 'Тролль-Просветлённый',
  dream: 'Сон',
  ego_court: 'Суд Эго',
  merge: 'Слияние',
  chaos: 'Хаос',
}

export const MODE_COLORS: Record<string, string> = {
  mirror_koan: '#4d8bc4',
  troll_enlightened: '#d4a843',
  dream: '#8b5cf6',
  ego_court: '#c44d8b',
  merge: '#8b8cc4',
  chaos: '#ff6b6b',
}

export const PHASE_NAMES: Record<SessionPhase, string> = {
  summoning: 'Призыв',
  dialogue: 'Диалог',
  crisis: 'Кризис / Инсайт',
  reflection: 'Рефлексия',
  completed: 'Завершено',
}

export const PHASE_COLORS: Record<SessionPhase, string> = {
  summoning: '#4d8bc4',
  dialogue: '#8b5cf6',
  crisis: '#c44d8b',
  reflection: '#d4a843',
  completed: '#6b6c9a',
}

export const RESULT_NAMES: Record<GameResult, string> = {
  win: 'Победа',
  lose: 'Побег',
  draw: 'Ничья',
}

export const RESULT_COLORS: Record<GameResult, string> = {
  win: '#d4a843',
  lose: '#c44d8b',
  draw: '#6b6c9a',
}
