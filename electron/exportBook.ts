import path from 'path'
import os from 'os'
import fs from 'fs'
import { Session, BrokenMirror } from './types'

export function exportBook(
  sessions: Session[],
  mirrors: BrokenMirror[],
  awakening: number,
  egoDeaths: number,
  paradoxScore: number,
  karma: number
): string | null {
  try {
    const PdfPrinter = require('pdfmake')
    const isDev = process.env.NODE_ENV === 'development'
    const fontDir = isDev
      ? path.join(__dirname, '..', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto')
      : path.join((process as any).resourcesPath, 'app.asar', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto')

    const fonts = {
      Roboto: {
        normal: path.join(fontDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontDir, 'Roboto-MediumItalic.ttf'),
      }
    }
    const printer = new PdfPrinter(fonts)

    const content: any[] = [
      { text: 'Книга Бездны', style: 'title' },
      { text: 'Путь сновидящего', style: 'subtitle' },
      '\n\n',
    ]

    content.push({ text: 'Статистика', style: 'header' })
    content.push({
      ul: [
        `Сессий: ${sessions.length}`,
        `Среднее пробуждение: ${awakening.toFixed(1)}`,
        `Смертей эго: ${egoDeaths}`,
        `Парадоксальный счёт: ${paradoxScore}`,
        `Карма: ${karma}`,
        `Разбитых зеркал: ${mirrors.length}`,
      ],
    })
    content.push('\n\n')

    for (const session of sessions) {
      const date = new Date(session.created_at).toLocaleDateString('ru-RU')
      content.push({
        text: `Сессия #${session.id} — ${date}`,
        style: 'sessionHeader',
      })
      content.push({
        text: `Сцена: ${session.dream_scene} | Модель: ${session.model} | Фаза: ${session.phase} | Результат: ${session.result || '—'}`,
        style: 'sessionMeta',
      })
      if (session.ego_deaths > 0) {
        content.push({ text: `Смертей эго: ${session.ego_deaths}`, style: 'sessionMeta' })
      }
      content.push('\n')
    }

    if (mirrors.length > 0) {
      content.push({ text: 'Разбитые зеркала', style: 'header' })
      for (const m of mirrors) {
        content.push({ text: `"${m.quote}"`, style: 'mirrorQuote' })
        content.push({ text: m.comment, style: 'mirrorComment' })
        content.push('\n')
      }
    }

    content.push('\n')
    content.push({ text: '＿人＞_人＜_人＿', style: 'footer' })

    const docDefinition = {
      content,
      styles: {
        title: { fontSize: 28, bold: true, alignment: 'center', color: '#3d3e80' },
        subtitle: { fontSize: 14, alignment: 'center', color: '#6b6c9a' },
        header: { fontSize: 18, bold: true, color: '#4d3d80', margin: [0, 10, 0, 5] },
        sessionHeader: { fontSize: 14, bold: true, color: '#8b5cf6', margin: [0, 8, 0, 2] },
        sessionMeta: { fontSize: 10, color: '#6b6c9a' },
        mirrorQuote: { fontSize: 12, italics: true, color: '#c44d8b', margin: [0, 5, 0, 2] },
        mirrorComment: { fontSize: 10, color: '#6b6c9a' },
        footer: { fontSize: 16, alignment: 'center', color: '#3d3e80', margin: [0, 20, 0, 0] },
      },
      defaultStyle: { font: 'Roboto' },
    }

    const outputPath = path.join(os.homedir(), 'Desktop', 'Книга_Бездны.pdf')
    const doc = printer.createPdfKitDocument(docDefinition)
    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)
    doc.end()

    return new Promise((resolve) => {
      stream.on('finish', () => resolve(outputPath))
      stream.on('error', () => resolve(null))
    }) as any
  } catch (err) {
    console.error('Export error:', err)
    return null
  }
}
