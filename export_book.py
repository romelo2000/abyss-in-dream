#!/usr/bin/env python3
"""Export player journey as a beautiful PDF — Book of Abyss."""

import sys
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Frame, PageTemplate, BaseDocTemplate
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus.flowables import HRFlowable

# Register fonts
pdfmetrics.registerFont(TTFont('Georgia', '/System/Library/Fonts/Supplemental/Georgia.ttf'))
pdfmetrics.registerFont(TTFont('Georgia-Bold', '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'))
pdfmetrics.registerFont(TTFont('Georgia-Italic', '/System/Library/Fonts/Supplemental/Georgia Italic.ttf'))
pdfmetrics.registerFont(TTFont('Verdana', '/System/Library/Fonts/Supplemental/Verdana.ttf'))
pdfmetrics.registerFont(TTFont('Verdana-Bold', '/System/Library/Fonts/Supplemental/Verdana Bold.ttf'))

ABYSS_DEEP = HexColor('#0a0b1a')
ABYSS_DARK = HexColor('#15152a')
ABYSS_GLOW = HexColor('#8b5cf6')
ABYSS_GOLD = HexColor('#d4a843')
ABYSS_TEXT = HexColor('#e0e0f0')
ABYSS_MIST = HexColor('#a0a0c0')
ABYSS_DIM = HexColor('#6b6c9a')
ABYSS_EDGE = HexColor('#2a2b4a')

title_style = ParagraphStyle('Title', fontName='Georgia-Bold', fontSize=28, leading=34, textColor=ABYSS_GLOW, alignment=TA_CENTER, spaceAfter=6)
subtitle_style = ParagraphStyle('Subtitle', fontName='Georgia-Italic', fontSize=14, leading=18, textColor=ABYSS_MIST, alignment=TA_CENTER, spaceAfter=20)
h1_style = ParagraphStyle('H1', fontName='Verdana-Bold', fontSize=16, leading=22, textColor=ABYSS_GOLD, spaceBefore=24, spaceAfter=10)
h2_style = ParagraphStyle('H2', fontName='Verdana-Bold', fontSize=13, leading=18, textColor=ABYSS_GLOW, spaceBefore=16, spaceAfter=8)
body_style = ParagraphStyle('Body', fontName='Georgia', fontSize=11, leading=16, textColor=ABYSS_TEXT, alignment=TA_JUSTIFY, spaceAfter=6)
body_italic = ParagraphStyle('BodyItalic', fontName='Georgia-Italic', fontSize=11, leading=16, textColor=ABYSS_MIST, alignment=TA_JUSTIFY, spaceAfter=6)
quote_style = ParagraphStyle('Quote', fontName='Georgia-Italic', fontSize=12, leading=17, textColor=ABYSS_GLOW, alignment=TA_CENTER, spaceBefore=10, spaceAfter=10, leftIndent=30, rightIndent=30)
bullet_style = ParagraphStyle('Bullet', fontName='Georgia', fontSize=11, leading=16, textColor=ABYSS_TEXT, leftIndent=20, spaceAfter=4)
small_style = ParagraphStyle('Small', fontName='Georgia', fontSize=9, leading=13, textColor=ABYSS_DIM, alignment=TA_CENTER, spaceAfter=4)

def abyss_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ABYSS_DEEP)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.setFillColor(HexColor('#0f0f25'))
    canvas.rect(0, A4[1] - 120, A4[0], 120, fill=1, stroke=0)
    canvas.setStrokeColor(ABYSS_EDGE)
    canvas.setLineWidth(0.5)
    canvas.line(30, 25, A4[0] - 30, 25)
    canvas.setFont('Georgia', 9)
    canvas.setFillColor(ABYSS_DIM)
    canvas.drawCentredString(A4[0] / 2, 15, f"— {doc.page} —")
    canvas.setFont('Georgia-Italic', 8)
    canvas.drawString(30, 15, "Книга Бездны")
    canvas.drawRightString(A4[0] - 30, 15, "Dialogue with the Abyss")
    canvas.restoreState()

def make_table(data, col_widths, header_color=ABYSS_GLOW):
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), ABYSS_DARK),
        ('TEXTCOLOR', (0, 0), (-1, -1), ABYSS_TEXT),
        ('FONTNAME', (0, 0), (-1, -1), 'Georgia'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('LEADING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, 0), 1, header_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [ABYSS_DARK, HexColor('#12122a')]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    return t

def main():
    data = json.loads(sys.argv[1])
    output_path = sys.argv[2]

    sessions = data.get('sessions', [])
    mirrors = data.get('mirrors', [])
    awakening = data.get('awakening', 0)
    ego_deaths = data.get('egoDeaths', 0)
    paradox_score = data.get('paradoxScore', 0)
    karma = data.get('karma', 0)

    doc = BaseDocTemplate(output_path, pagesize=A4, leftMargin=25*mm, rightMargin=25*mm, topMargin=25*mm, bottomMargin=30*mm)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='normal')
    doc.addPageTemplates([PageTemplate(id='abyss', frames=[frame], onPage=abyss_background)])

    story = []

    # Cover
    story.append(Spacer(1, 60*mm))
    story.append(Paragraph("КНИГА БЕЗДНЫ", title_style))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Путь игрока", subtitle_style))
    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="60%", thickness=0.5, color=ABYSS_EDGE, spaceBefore=10, spaceAfter=10))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(
        "＿人＞_人＜_人＿",
        ParagraphStyle('Ascii', fontName='Verdana', fontSize=14, leading=18, textColor=ABYSS_DIM, alignment=TA_CENTER)
    ))
    story.append(PageBreak())

    # Stats summary
    story.append(Paragraph("Сводка пути", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.3, color=ABYSS_EDGE, spaceAfter=10))

    stats = [
        ["Метрика", "Значение"],
        ["Снов проведено", str(len(sessions))],
        ["Пробуждённость", f"{round(awakening)}%"],
        ["Ego Death Counter", str(ego_deaths)],
        ["Парадоксальный счёт", str(paradox_score)],
        ["Карма", f"{'+' if karma >= 0 else ''}{karma}"],
        ["Разбитых зеркал", str(len(mirrors))],
    ]
    story.append(make_table(stats, [80*mm, 80*mm]))

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "«Бездна смотрит на этот лист. Она не хвастается. Она не скромничает. Она просто — есть. Как и ты. Или нет.»",
        quote_style
    ))

    story.append(PageBreak())

    # Sessions timeline
    story.append(Paragraph("Хронология снов", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.3, color=ABYSS_EDGE, spaceAfter=10))

    if sessions:
        timeline_data = [["№", "Дата", "Фаза", "Результат", "☠", "◈", "☯"]]
        for i, s in enumerate(sessions, 1):
            date = s.get('created_at', '')[:10]
            phase = s.get('phase', '')
            result = s.get('result') or '—'
            ego = str(s.get('ego_deaths', 0))
            paradox = str(s.get('paradox_score', 0))
            k = str(s.get('karma', 0))
            timeline_data.append([str(i), date, phase, result, ego, paradox, k])

        story.append(make_table(timeline_data, [12*mm, 30*mm, 30*mm, 25*mm, 15*mm, 15*mm, 15*mm]))
    else:
        story.append(Paragraph("Снов пока нет. Всё начинается с первого.", body_italic))

    story.append(PageBreak())

    # Broken mirrors
    story.append(Paragraph("Разбитые зеркала", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.3, color=ABYSS_EDGE, spaceAfter=10))

    if mirrors:
        for m in mirrors:
            mode = m.get('mode', '')
            quote = m.get('quote', '')[:200]
            comment = m.get('comment', '')
            timestamp = m.get('timestamp', '')[:10]

            story.append(Paragraph(f"[{mode}] {timestamp}", ParagraphStyle(
                'MirrorMeta', fontName='Verdana-Bold', fontSize=9, leading=12,
                textColor=ABYSS_DIM, spaceAfter=4
            )))
            story.append(Paragraph(f"«{quote}»", ParagraphStyle(
                'MirrorQuote', fontName='Georgia-Italic', fontSize=11, leading=16,
                textColor=ABYSS_GLOW, leftIndent=20, rightIndent=20, spaceAfter=4
            )))
            if comment:
                story.append(Paragraph(comment, ParagraphStyle(
                    'MirrorComment', fontName='Georgia', fontSize=10, leading=14,
                    textColor=ABYSS_MIST, leftIndent=20, rightIndent=20, spaceAfter=12
                )))
            story.append(HRFlowable(width="80%", thickness=0.2, color=ABYSS_EDGE, spaceAfter=12))
    else:
        story.append(Paragraph("Зеркала пока целы. Разобьёшь — осколки останутся здесь.", body_italic))

    story.append(PageBreak())

    # Closing
    story.append(Spacer(1, 40*mm))
    story.append(Paragraph(
        "«Ты пришёл. Ты увидел. Ты... всё ещё здесь?»",
        quote_style
    ))
    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "Бездна не прощается. Бездна не провожает. Бездна просто — есть. И ты — есть. Или нет. В любом случае — путь продолжается.",
        body_italic
    ))
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="40%", thickness=0.5, color=ABYSS_EDGE))
    story.append(Spacer(1, 8))
    story.append(Paragraph("＿人＞_人＜_人＿", ParagraphStyle('End', fontName='Verdana', fontSize=16, leading=20, textColor=ABYSS_DIM, alignment=TA_CENTER)))
    story.append(Paragraph("Книга Бездны · Dialogue with the Abyss", small_style))

    doc.build(story)
    print(f"Book exported: {output_path}")

if __name__ == '__main__':
    main()
