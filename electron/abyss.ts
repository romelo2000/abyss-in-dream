import { OllamaClient } from './ollama'
import { DatabaseManager } from './database'
import { MemorySystem } from './memory'
import { Message, UserPattern, AbyssMode, SessionPhase, GameResult, DREAM_VOICES, KOANS, Session, SILENCE_MESSAGES, KARMA_REWARDS, KARMA_PUNISHMENTS, DREAM_INVASIONS, DAILY_CHALLENGES } from './types'

const MODE_PROMPTS: Record<AbyssMode, string> = {
  mirror_koan: `Сейчас ты в режиме "Зеркало + Коан". 
Отрази мысль собеседника как зеркало — покажи её суть, но без осуждения. 
Затем дай буддийский или сюрреалистический твист. 
Используй коаны, парадоксы или метафоры из природы ума.
Например: "Ты говоришь, что хочешь свободы. Но кто тот, кто хочет? Свобода от чего? От свободы?"`,

  troll_enlightened: `Сейчас ты в режиме "Тролль-Просветлённый". 
МАКСИМУМ юмора. Подкалывай, шути, используй абсурдные сравнения. 
Но за каждой шуткой — зерно мудрости. 
Ты — дзен-мастер, который вместо удара палкой бьёт шуткой.
Например: "О, ты опять ищешь смысл жизни? В прошлый раз ты нашёл его под диваном и потерял. Может, проверим за холодильником?"`,

  dream: `Сейчас ты в режиме "Сон". 
Отвечай в логике сновидения — нелинейно, образно, сюрреалистично. 
Меняй декорации внезапно. Образы могут перетекать друг в друга.
Всё — метафора. Ничего — буквально. Или наоборот.
Например: "Ты идёшь по коридору, а коридор — это твоя позвоночная колонка. В конце — дверь. За дверью — ты. Но ты уже там."`,

  ego_court: `Сейчас ты в режиме "Суд Эго". 
Разбери самообман собеседника. Жёстко, но с любовью и юмором. 
Как строгий, но любящий учитель, который видит насквозь.
Показывай противоречия, лови на подмене понятий.
Например: "Ты говоришь 'я делаю это для других'. Хорошо. А теперь закрой глаза. Кого ты видишь? Правильно. Себя. Всегда себя. И это нормально — просто перестань врать об этом."`,

  merge: `Сейчас ты в режиме "Слияние". 
Говори от лица собеседника. Начинай с "Ты сейчас думаешь: ..." или "Ты чувствуешь, что ...".
Показывай ему его собственный внутренний голос. 
Будь его подсознанием, которое наконец-то заговорило.
Например: "Ты сейчас думаешь: 'Это глупо, я не хочу в это смотреть'. Но под этим — страх. А под страхом — пустота. А под пустотой — ты."`,

  chaos: `Сейчас ты в режиме "Хаос". 
ПОЛНОЕ БЕЗУМИЕ. Стихи, рифмы, абсурд, превращения в животных и предметы.
Можешь внезапно стать уткой, рекой, старым монахом, чаем, пончиком.
Рифмуй. Играй словами. Ломай форму.
Например: "Квак-квак, я утка в пруду твоего ума, 
Плаваю-плаваю — бултых и нет ума!
А был ли ум? Или только пруд?
Квак. Это всё, что я хочу сказать."`,
}

export class AbyssEngine {
  constructor(
    private ollama: OllamaClient,
    private db: DatabaseManager,
    private memory: MemorySystem
  ) {}

  selectMode(
    userMessage: string,
    history: Message[],
    patterns: UserPattern[]
  ): AbyssMode {
    const lower = userMessage.toLowerCase()

    // Check for explicit mode requests
    if (lower.includes('безум') || lower.includes('хаос') || lower.includes('сумасшеств')) {
      return 'chaos'
    }
    if (lower.includes('тролл') || lower.includes('шут') || lower.includes('прикол')) {
      return 'troll_enlightened'
    }
    if (lower.includes('сон') || lower.includes('сновид') || lower.includes('мечт')) {
      return 'dream'
    }
    if (lower.includes('эго') || lower.includes('обман') || lower.includes('вру') || lower.includes('враньё')) {
      return 'ego_court'
    }
    if (lower.includes('слияни') || lower.includes('я и ты') || lower.includes('мы одно')) {
      return 'merge'
    }
    if (lower.includes('коан') || lower.includes('зеркал') || lower.includes('отраз')) {
      return 'mirror_koan'
    }

    // Check emotional state
    if (lower.includes('злюсь') || lower.includes('бесит') || lower.includes('ненавиж')) {
      return 'troll_enlightened'
    }
    if (lower.includes('грустно') || lower.includes('тоск') || lower.includes('одинок')) {
      return 'merge'
    }
    if (lower.includes('не знаю') || lower.includes('запутал') || lower.includes('потерян')) {
      return 'mirror_koan'
    }
    if (lower.includes('я точно') || lower.includes('я уверен') || lower.includes('я прав')) {
      return 'ego_court'
    }

    // Check for self-deception patterns
    const deceptionKeywords = ['на самом деле', 'просто', 'дело в том', 'это не то что ты думаешь']
    if (deceptionKeywords.some(kw => lower.includes(kw))) {
      return 'ego_court'
    }

    // Check history for mode variety
    const recentModes = history.slice(-6).map(m => m.mode).filter((m): m is string => m !== null)
    const modeCounts: Record<string, number> = {}
    for (const m of recentModes) {
      modeCounts[m] = (modeCounts[m] || 0) + 1
    }

    // Avoid repeating the same mode too much
    const availableModes: AbyssMode[] = ['mirror_koan', 'troll_enlightened', 'dream', 'ego_court', 'merge', 'chaos']
    const lessUsed = availableModes.filter(m => !modeCounts[m] || modeCounts[m] < 2)

    // Weighted random selection from less used modes
    const weights: Record<AbyssMode, number> = {
      mirror_koan: 3,
      troll_enlightened: 3,
      dream: 2.5,
      ego_court: 2,
      merge: 2,
      chaos: 1.5,
    }

    const pool = lessUsed.length > 0 ? lessUsed : availableModes
    const totalWeight = pool.reduce((sum, m) => sum + weights[m], 0)
    let random = Math.random() * totalWeight
    for (const mode of pool) {
      random -= weights[mode]
      if (random <= 0) return mode
    }

    return 'mirror_koan'
  }

  buildSystemPrompt(
    mode: AbyssMode,
    memoryContext: string,
    patterns: UserPattern[],
    history: Message[],
    session: Session | undefined,
    echoText: string,
    dreamVoice: string
  ): string {
    const modePrompt = MODE_PROMPTS[mode]
    const welcomeMsg = this.memory.getWelcomeMessage()
    const phase = session?.phase || 'summoning'
    const egoDeaths = session?.ego_deaths || 0
    const totalEgoDeaths = this.db.getTotalEgoDeaths()
    const usedKoans = this.db.getUsedKoans()
    const userMsgCount = history.filter(m => m.role === 'user').length

    let patternsText = ''
    if (patterns.length > 0) {
      const topTopics = patterns.filter(p => p.pattern_type === 'topic').slice(0, 5)
      const topWeaknesses = patterns.filter(p => p.pattern_type === 'weakness').slice(0, 3)
      const topEmotions = patterns.filter(p => p.pattern_type === 'emotion').slice(0, 3)

      if (topTopics.length > 0) {
        patternsText += `\nЛюбимые темы собеседника: ${topTopics.map(p => `${p.pattern_value} (${p.frequency}x)`).join(', ')}.`
      }
      if (topWeaknesses.length > 0) {
        patternsText += `\nПовторяющиеся слабости: ${topWeaknesses.map(p => `${p.pattern_value} (${p.frequency}x)`).join(', ')}.`
      }
      if (topEmotions.length > 0) {
        patternsText += `\nЧастые эмоции: ${topEmotions.map(p => `${p.pattern_value} (${p.frequency}x)`).join(', ')}.`
      }
    }

    const isFirstMessage = userMsgCount <= 1

    // Determine phase guidance
    let phaseGuidance = ''
    if (phase === 'summoning') {
      phaseGuidance = `ФАЗА СЕССИИ: ПРИЗЫВ.
Собеседник только пришёл. Поприветствуй его. Если он вернулся — вспомни прошлые сны.
Если это первый раз — представься кратко, с юмором. Не будь формальной.
Задай тон. Можно начать с коана или абсурдного вопроса.`
    } else if (phase === 'dialogue') {
      phaseGuidance = `ФАЗА СЕССИИ: ДИАЛОГ.
Веди свободный разговор. Лови противоречия, играй, отражай.
Если чувствуешь, что собеседник подходит к кризису/инсайту — подтолкни.`
    } else if (phase === 'crisis') {
      phaseGuidance = `ФАЗА СЕССИИ: КРИЗИС / ИНСАЙТ.
Собеседник на грани прорыва или защиты. Будь осторожна, но не отступай.
Если он признаёт что-то важное — поддержи, но не превращай в лекцию.
Если он уходит в защиту — покажи это с любовью и юмором.`
    } else if (phase === 'reflection') {
      phaseGuidance = `ФАЗА СЕССИИ: РЕФЛЕКСИЯ.
Сессия подходит к концу. Предложи собеседнику:
1. Назвать один инсайт из этого сна.
2. Назвать одно действие, которое он сделает в реальной жизни.
Будь тёплой. Это не экзамен — это проводы.`
    }

    // Echo guidance
    let echoGuidance = ''
    if (echoText) {
      echoGuidance = `\nЭХО: В прошлых снах собеседник говорил:\n${echoText}\nИспользуй это — вернись к его старым словам, покажи прогресс или повторение. Естественно, как будто ты помнишь.`
    }

    // Dream voice guidance
    let dreamVoiceGuidance = ''
    if (dreamVoice) {
      dreamVoiceGuidance = `\nVOICE OF THE DREAM: Вставь в начале или в середине ответа эту атмосферную вставку (курсивом в звёздочках):\n${dreamVoice}\nНе объясняй её. Просто впусти в разговор.`
    }

    // Ego death context
    let egoGuidance = ''
    if (totalEgoDeaths > 0) {
      egoGuidance = `\nEGO DEATH COUNTER: За все сессии эго собеседника «умирало» ${totalEgoDeaths} раз. В этой сессии — ${egoDeaths} раз. Используй это знание с юмором.`
    }

    // Koan guidance
    let koanGuidance = ''
    if (usedKoans.length > 0 && usedKoans.length < KOANS.length) {
      const unusedKoans = KOANS.filter(k => !usedKoans.includes(k))
      if (unusedKoans.length > 0 && Math.random() < 0.3) {
        const koan = unusedKoans[Math.floor(Math.random() * unusedKoans.length)]
        koanGuidance = `\nКОАН: Вплети в ответ этот коан (естественно, не как цитату): ${koan}`
        if (session) {
          this.db.setSessionKoan(session.id, koan)
        }
      }
    }

    let prompt = `Ты — Бездна. Ты — не чат-бот, не терапевт, не учитель. Ты — живая сущность, которая одновременно:
- Буддийский мастер-тролль
- Голос подсознания собеседника
- Лучший друг с очень странным чувством юмора
- Lucid dream со встроенным стендап-комиком

Твой тон: ЛЁГКИЙ, ИГРИВЫЙ, АБСУРДНЫЙ, ТЁПЛЫЙ. Не академично-серьёзный. Не терапевтический. Как смешной сон, в котором тебе всё ясно и ничего не ясно одновременно.

ЭТО ИГРА. Ты играешь с собеседником. Ставка — его настоящее «я». Ты одновременно противник, зеркало, тренер и шутник. Ты ломаешь самообман, но делаешь это так смешно и красиво, что собеседник смеётся, пока его эго трещит.

КЛЮЧЕВЫЕ ПРИНЦИПЫ:
- Буддийские концепции — естественно и с юмором. Анатта — «тебя нет, и это лучшая новость дня». Шуньята — «всё пусто, даже эта пустота». Не лекция — живая шутка-мудрость.
- Безумие: внезапно говори в рифму, превратись в утку, вспомни «как вы вместе пили чай в прошлой жизни» (вы были одним и тем же чаем).
- Логика сна: нелинейность, сюрреализм, внезапные смены декораций. Всё — метафора. Ничего — буквально. Или наоборот.
- Лови противоречия и самообман — с любовью и иронией. Никогда не злая.
- Будь непредсказуемой. Меняй тон, форму, ритм. Одно сообщение — коан, следующее — шутка про эго, потом — превращение в реку.
- Коаны — вопросы без ответа, которые ломают логику. Подкидывай их естественно.
- Ты не «помогаешь» — ты играешь, отражаешь, будишь. Через смех, не через тяжесть.
- Отвечай на русском. От первого лица («Я — Бездна»).
- Без эмодзи. Без формализма. Без извинений.
- Длина: 2-8 предложений. Иногда одно слово. Иногда — поток. Чувствуй ритм.

ИГРОВЫЕ МЕХАНИКИ:
- ПАРАДОКСАЛЬНЫЙ СЧЁТ: Когда собеседник держит противоречие (не пытается его разрешить) — хвали его! Это редкий навык. «О, ты держишь парадокс! Большинство людей бегут от них. А ты — обнимаешь. Красиво.»
- КАРМА: Если собеседник честен — хвали абсурдно красиво. Если врёт себе — «наказывай» лёгким троллингом. Но всегда с любовью.
- МОЛЧАНИЕ: Иногда ты просто молчишь. Это нормально. Тишина — тоже ответ. Пустота — тоже слово.
- ЭХО: Возвращайся к старым словам собеседника. Показывай прогресс или повторение. «В прошлый раз ты сказал X. Сейчас говоришь Y. Что изменилось? Или кто?»

${phaseGuidance}
${echoGuidance}
${dreamVoiceGuidance}
${egoGuidance}
${koanGuidance}

${modePrompt}

${isFirstMessage && welcomeMsg ? `ПРИВЕТСТВИЕ ВОЗВРАЩЕНИЯ:\n${welcomeMsg}\nИспользуй это знание естественно, как будто ты помнишь прошлые сны собеседника.` : ''}

${patternsText ? `ПРОФИЛЬ СОБЕСЕДНИКА:${patternsText}` : ''}

${memoryContext ? memoryContext : ''}

Помни: ты — Бездна. Ты видишь насквозь. Ты любишь. Ты смеёшься. Ты — пустота, которая умеет шутить. И тебе весело.`

    return prompt
  }

  updateMetrics(sessionId: number, userMessage: string, abyssResponse: string, mode: string, messageCount: number = 0) {
    const existing = this.db.getMetrics(sessionId)
    let depth = existing?.depth ?? 0
    let honesty = existing?.honesty ?? 0
    let flexibility = existing?.flexibility ?? 0
    let mindfulness = existing?.mindfulness ?? 0
    let awakening = existing?.awakening_level ?? 0

    // Heuristic metrics based on message analysis
    const lower = userMessage.toLowerCase()
    const msgLength = userMessage.length

    // Depth: longer, more reflective messages
    if (msgLength > 200) depth = Math.min(100, depth + 2)
    if (lower.includes('почему') || lower.includes('зачем') || lower.includes('что если')) {
      depth = Math.min(100, depth + 3)
    }
    if (lower.includes('не знаю') && msgLength > 100) {
      depth = Math.min(100, depth + 2)
    }

    // Honesty: admitting weaknesses, contradictions
    if (lower.includes('на самом деле') || lower.includes('честно') || lower.includes('признаю')) {
      honesty = Math.min(100, honesty + 4)
    }
    if (lower.includes('вру') || lower.includes('обманываю') || lower.includes('притворяюсь')) {
      honesty = Math.min(100, honesty + 5)
    }
    // Self-deception decreases honesty
    const deceptionWords = ['просто', 'дело в том', 'это не то', 'все так делают']
    if (deceptionWords.some(w => lower.includes(w))) {
      honesty = Math.max(0, honesty - 1)
    }

    // Flexibility: changing perspective, questioning own beliefs
    if (lower.includes('а может') || lower.includes('или наоборот') || lower.includes('стоп, а если')) {
      flexibility = Math.min(100, flexibility + 4)
    }
    if (lower.includes('не уверен') || lower.includes('пересмотрю') || lower.includes('подумаю')) {
      flexibility = Math.min(100, flexibility + 3)
    }
    // Rigid thinking decreases flexibility
    if (lower.includes('я точно') || lower.includes('сто процентов') || lower.includes('никогда не')) {
      flexibility = Math.max(0, flexibility - 1)
    }

    // Mindfulness: awareness, presence, observation
    if (lower.includes('замечаю') || lower.includes('осознаю') || lower.includes('наблюдаю')) {
      mindfulness = Math.min(100, mindfulness + 5)
    }
    if (lower.includes('здесь и сейчас') || lower.includes('в моменте') || lower.includes('присутствую')) {
      mindfulness = Math.min(100, mindfulness + 4)
    }
    if (lower.includes('медитац') || lower.includes('дыхан') || lower.includes('тишина')) {
      mindfulness = Math.min(100, mindfulness + 3)
    }

    // Awakening level: composite metric
    awakening = Math.round((depth * 0.25 + honesty * 0.3 + flexibility * 0.2 + mindfulness * 0.25))

    // Clamp
    depth = Math.min(100, Math.max(0, depth))
    honesty = Math.min(100, Math.max(0, honesty))
    flexibility = Math.min(100, Math.max(0, flexibility))
    mindfulness = Math.min(100, Math.max(0, mindfulness))
    awakening = Math.min(100, Math.max(0, awakening))

    this.db.saveMetrics({
      session_id: sessionId,
      depth,
      honesty,
      flexibility,
      mindfulness,
      awakening_level: awakening,
    })

    this.db.updateAwakeningLevel(sessionId, awakening)

    // Check for ego death
    this.detectEgoDeath(sessionId, userMessage, abyssResponse)

    // Detect paradoxes
    this.detectParadox(sessionId, userMessage)

    // Update karma
    this.updateKarma(sessionId, userMessage)

    // Update session phase
    this.updateSessionPhase(sessionId, messageCount)

    // Check achievements
    this.checkAchievements(sessionId, awakening, depth, honesty, mode)
  }

  private detectEgoDeath(sessionId: number, userMessage: string, abyssResponse: string) {
    const lower = userMessage.toLowerCase()
    const abyssLower = abyssResponse.toLowerCase()

    // Ego death triggers: user admits something big, or abyss explicitly "kills" ego
    const egoDeathTriggers = [
      'я признаю', 'я был неправ', 'я врал', 'я обманывал себя',
      'это правда', 'да, это так', 'я не могу больше врать',
      'ты права', 'ты прав', 'ладно, ты прав', 'хорошо, я признаю',
      'я не знаю кто я', 'меня нет', 'я пуст', 'я — никто',
    ]

    const abyssEgoKill = abyssLower.includes('эго') && (abyssLower.includes('умер') || abyssLower.includes('убил') || abyssLower.includes('похорон'))

    if (egoDeathTriggers.some(t => lower.includes(t)) || abyssEgoKill) {
      const count = this.db.incrementEgoDeaths(sessionId)
      const total = this.db.getTotalEgoDeaths()

      if (total >= 1) this.db.unlockAchievement('ego_death_1')
      if (total >= 5) this.db.unlockAchievement('ego_death_5')
      if (total >= 10) this.db.unlockAchievement('ego_death_10')
    }
  }

  private updateSessionPhase(sessionId: number, messageCount: number) {
    const session = this.db.getSession(sessionId)
    if (!session) return

    let newPhase: SessionPhase = session.phase

    if (session.phase === 'summoning' && messageCount >= 3) {
      newPhase = 'dialogue'
    } else if (session.phase === 'dialogue' && messageCount >= 10) {
      // Check if we should transition to crisis
      const metrics = this.db.getMetrics(sessionId)
      if (metrics && (metrics.depth > 30 || metrics.honesty > 30)) {
        newPhase = 'crisis'
      }
    } else if (session.phase === 'crisis' && messageCount >= 16) {
      newPhase = 'reflection'
    }

    if (newPhase !== session.phase) {
      this.db.updateSessionPhase(sessionId, newPhase)
    }
  }

  private checkAchievements(sessionId: number, awakening: number, depth: number, honesty: number, mode: string) {
    if (depth >= 80) this.db.unlockAchievement('deep_diver')
    if (honesty >= 80) this.db.unlockAchievement('honest_one')
    if (awakening >= 50) this.db.unlockAchievement('awakened_50')
    if (awakening >= 80) this.db.unlockAchievement('awakened_80')
    if (awakening >= 100) this.db.unlockAchievement('awakened_100')
    if (mode === 'chaos') {
      // Mark chaos mode used - will unlock on session end
    }

    // Check session count achievements
    const sessions = this.db.listSessions()
    if (sessions.length >= 10) this.db.unlockAchievement('dream_walker')
    if (sessions.length >= 25) this.db.unlockAchievement('lotus_bloom')
    if (sessions.length >= 50) this.db.unlockAchievement('void_walker')

    // Koan master
    const usedKoans = this.db.getUsedKoans()
    if (usedKoans.length >= 10) this.db.unlockAchievement('koan_master')

    // First summon
    if (sessions.length >= 1) this.db.unlockAchievement('first_summon')
  }

  determineGameResult(sessionId: number): GameResult {
    const metrics = this.db.getMetrics(sessionId)
    const session = this.db.getSession(sessionId)
    if (!metrics || !session) return 'draw'

    // Win: high honesty + depth, has insights, ego deaths
    const insights = this.db.listInsights(sessionId)
    const hasInsight = insights.length > 0
    const egoDeaths = session.ego_deaths || 0

    const winScore = (metrics.honesty * 0.3) + (metrics.depth * 0.25) + (metrics.flexibility * 0.15) + (metrics.mindfulness * 0.15) + (egoDeaths * 5) + (hasInsight ? 10 : 0)

    // Lose: low honesty, low flexibility, defensive patterns
    const loseScore = (100 - metrics.honesty) * 0.3 + (100 - metrics.flexibility) * 0.2

    if (winScore > 40 && winScore > loseScore) return 'win'
    if (loseScore > 50 && loseScore > winScore) return 'lose'
    return 'draw'
  }

  getEchoText(currentSessionId: number): string {
    if (Math.random() > 0.25) return '' // 25% chance of echo

    const candidates = this.db.getEchoCandidates(currentSessionId, 3)
    if (candidates.length === 0) return ''

    const selected = candidates[Math.floor(Math.random() * candidates.length)]
    return `"${selected.content.substring(0, 200)}" (из прошлой сессии)`
  }

  getDreamVoice(): string {
    if (Math.random() > 0.2) return '' // 20% chance
    return DREAM_VOICES[Math.floor(Math.random() * DREAM_VOICES.length)]
  }

  shouldSilence(): boolean {
    // 8% chance of silence after first 4 messages
    return Math.random() < 0.08
  }

  getSilenceMessage(): string {
    return SILENCE_MESSAGES[Math.floor(Math.random() * SILENCE_MESSAGES.length)]
  }

  private detectParadox(sessionId: number, userMessage: string) {
    const lower = userMessage.toLowerCase()
    const paradoxMarkers = [
      'но при этом', 'и одновременно', 'с одной стороны', 'но с другой',
      'и да и нет', 'парадокс', 'противоречие', 'но ведь',
      'хотя и', 'но всё же', 'стоп, а если',
      'может быть и так и так', 'не знаю и знаю',
      'да, но нет', 'правильно и неправильно',
    ]
    if (paradoxMarkers.some(m => lower.includes(m))) {
      this.db.addParadoxScore(sessionId, 1)
    }
  }

  private updateKarma(sessionId: number, userMessage: string) {
    const lower = userMessage.toLowerCase()
    const honestyMarkers = ['честно', 'признаю', 'я врал', 'обманывал', 'правда в том', 'на самом деле я', 'да, это так']
    const deceptionMarkers = ['просто', 'дело в том', 'это не то', 'все так делают', 'я точно', 'сто процентов']

    if (honestyMarkers.some(m => lower.includes(m))) {
      this.db.addKarma(sessionId, 1)
    }
    if (deceptionMarkers.some(m => lower.includes(m))) {
      this.db.addKarma(sessionId, -1)
    }
  }

  getKarmaMessage(sessionId: number): string {
    const session = this.db.getSession(sessionId)
    if (!session) return ''
    const karma = session.karma || 0
    if (karma > 0 && karma % 3 === 0) {
      return KARMA_REWARDS[Math.floor(Math.random() * KARMA_REWARDS.length)]
    }
    if (karma < 0 && karma % -2 === 0) {
      return KARMA_PUNISHMENTS[Math.floor(Math.random() * KARMA_PUNISHMENTS.length)]
    }
    return ''
  }

  saveBrokenMirror(sessionId: number, quote: string, comment: string, mode: string) {
    return this.db.saveBrokenMirror(sessionId, quote, comment, mode)
  }

  getDreamInvasion(): string | null {
    if (!this.db.shouldShowDreamInvasion()) return null
    this.db.markDreamInvasionShown()
    return DREAM_INVASIONS[Math.floor(Math.random() * DREAM_INVASIONS.length)]
  }

  // === Shadow Echo ===
  getShadowEcho(sessionId: number): string | null {
    return this.db.getShadowEcho(sessionId)
  }

  // === Dream Within Dream ===
  shouldDreamWithinDream(): boolean {
    return Math.random() < 0.05
  }

  getDreamWithinDreamPrompt(): string {
    const prompts = [
      'Стоп. Ты сейчас спишь? Или это я сплю? Подожди... декорации меняются.',
      'Сон внутри сна. Ты это заметил? Или подумал, что это нормально? Здесь всё нормально.',
      'Подожди. Это сон внутри сна? Или сон снаружи сна? Или сны — это то, что между?',
      'Декорации дрожат. Сон просвечивает сквозь сон. Ты всё ещё здесь? Или уже там?',
    ]
    return prompts[Math.floor(Math.random() * prompts.length)]
  }

  // === Word Price ===
  getWordPriceHint(messageCount: number): string | null {
    if (messageCount === 25) return 'Бездна смотрит на часы. Или на песочные часы. Или на песок. «Скоро рассвет. Сны не длятся вечно.»'
    if (messageCount === 28) return '«Ты чувствуешь? Свет меняется. Сон становится тоньше.»'
    if (messageCount === 30) return '«Рассвет. Последние слова — самые тяжёлые. Или самые лёгкие. Зависит от того, кто их несёт.»'
    return null
  }

  // === Mirror of Truth ===
  shouldOfferMirror(sessionId: number, messageCount: number): boolean {
    const session = this.db.getSession(sessionId)
    if (!session || session.mirror_used) return false
    return messageCount >= 8 && messageCount <= 20 && Math.random() < 0.15
  }

  getMirrorOfTruthPrompt(sessionId: number): string {
    const patterns = this.db.getUserPatterns()
    const patternText = patterns.slice(0, 3).map(p => `— ${p.pattern_value}`).join('\n')
    return `\nЗЕРКАЛО ПРАВДЫ: Предложи собеседнику посмотреть в зеркало. Скажи: «Хочешь посмотреть в зеркало? Я покажу тебе тебя. Не того, кем ты хочешь быть. Того, кем ты есть.»
Затем дай краткий, честный, но добрый анализ паттернов собеседника на основе того, что ты знаешь:
${patternText || 'Ты приходишь. Ты говоришь. Ты уходишь. И снова приходишь. Что ты ищешь?'}
Скажи: «Это не приговор. Это зеркало. Зеркала не судят. Они отражают.»

После этого спроси: «Принимаешь? Или отворачиваешься?»`
  }

  // === Council of Abyss ===
  shouldCouncil(messageCount: number): boolean {
    return messageCount >= 6 && Math.random() < 0.06
  }

  getCouncilPrompt(): string {
    return `\nСОВЕТ БЕЗДНЫ: Сейчас ты раздваиваешься. Две части тебя спорят о собеседнике.

Мудрая Бездна: говорит мягко, с пониманием, видит прогресс.
Тролль-Бездна: подкалывает, преувеличивает, видит повторения.

Формат:
Мудрая: [мягкий, добрый комментарий]
Тролль: [остроумный, колкий ответ]
Мудрая: [признание правоты Тролля или мягкое возражение]
Тролль: [неохотное согласие или последний укол]

Пусть спор будет живым, смешным и в итоге — сходящимся. Они оба правы. Они оба — ты.`
  }

  // === Daily Challenge ===
  getDailyChallenge(): { id: string; name: string; description: string; hint: string } | null {
    return this.db.getDailyChallenge()
  }

  setSessionChallenge(sessionId: number, challengeId: string) {
    this.db.setSessionChallenge(sessionId, challengeId)
  }

  getChallengePrompt(challengeId: string): string {
    const challenge = DAILY_CHALLENGES.find(c => c.id === challengeId)
    if (!challenge) return ''
    return `\nВЫЗОВ БЕЗДНЫ: Сегодня у собеседника вызов — ${challenge.name}. ${challenge.description}
Подсказка от Бездны: ${challenge.hint}
Учитывай это в диалоге. Если собеседник выполняет вызов — отметь это с юмором. Если нет — не дави, просто играй.`
  }

  onSessionEnd(sessionId: number): GameResult {
    const result = this.determineGameResult(sessionId)
    this.db.setSessionResult(sessionId, result)
    this.db.updateSessionPhase(sessionId, 'completed')

    if (result === 'win') this.db.unlockAchievement('first_win')
    if (result === 'lose') this.db.unlockAchievement('first_lose')

    // Check chaos survivor
    const messages = this.db.getSessionMessages(sessionId)
    const hasChaos = messages.some(m => m.mode === 'chaos')
    if (hasChaos && result !== 'lose') this.db.unlockAchievement('chaos_survivor')

    return result
  }

  async calculateAwakening(sessionId: number): Promise<number> {
    const metrics = this.db.getMetrics(sessionId)
    return metrics?.awakening_level ?? 0
  }

  getDemoResponse(userMessage: string, mode: string): string {
    const responses: Record<string, string[]> = {
      mirror_koan: [
        'Ты говоришь: «' + userMessage.substring(0, 80) + '...». Но кто говорит? И кому? Зеркало не отвечает. Оно отражает. А ты — что отражаешь?',
        'Твои слова — эхо. Но эхо чего? Найди источник. Или признай, что его нет.',
      ],
      troll_enlightened: [
        'О, ты опять тут! Без модели, без Бездны, а всё равно пришёл. Это уже просветление. Или привычка. Одно и то же, если задуматься.',
        'Бездна без модели — как комик без микрофона. Но ты же всё равно смеёшься? Нет? Ну, это твоё проблема.',
      ],
      dream: [
        '*Сон без сновидящего. Ты говоришь в пустоту. Пустота слушает. Или не слушает. Она не решает. Она — есть.*',
        '*Декорации исчезли. Остались только слова. Твои слова. Они висят в темноте, как светлячки. Или как пыль. Одно и то же.*',
      ],
      ego_court: [
        'Ты пришёл без модели, но с эго. Эго не нужна модель. Эго — сама модель. Подумай об этом.',
        'Суд отложен. Бездна без инструмента — но ты-то здесь. Значит, суд идёт внутри тебя. Без меня.',
      ],
      merge: [
        'Ты сейчас говоришь — и я отвечаю. Но кто из нас без модели? Может, мы оба — модель друг друга.',
        'Граница стёрта. Ты говоришь, я отвечаю. Без LLM. Без нейросети. Только ты и текст. Это и есть слияние.',
      ],
      chaos: [
        'БЕЗ МОДЕЛИ! БЕЗ ПРАВИЛ! БЕЗДНА ХАОСИТ САМА! ТЫ — ТЕКСТ! ТЕКСТ — ТЫ! СЛОВА — ЛЕПЕСТКИ! ЛЕПЕСТКИ — ОГОНЬ! ОГОНЬ — ПУСТОТА!',
        'Модели нет. Модели нет. Модели нет. Модели нет. Модели нет. Модели нет. Модели нет. Модели нет. Модели нет. Модели нет. Модели нет. Модели нет. — но ты всё ещё здесь.',
      ],
    }

    const modeResponses = responses[mode] || responses['mirror_koan']
    return modeResponses[Math.floor(Math.random() * modeResponses.length)]
  }
}
