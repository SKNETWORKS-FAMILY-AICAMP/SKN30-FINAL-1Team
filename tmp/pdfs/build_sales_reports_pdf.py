from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = "output/pdf/영업보고서_작성가이드.pdf"
PAGE_W, PAGE_H = landscape(A4)

FONT_PATH = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/7a0b5c0f3c1d41c4c52a33343496c9c65ad52c50.asset/AssetData/NanumGothic.ttc"
pdfmetrics.registerFont(TTFont("NanumGothic", FONT_PATH, subfontIndex=0))
FONT = "NanumGothic"

NAVY = colors.HexColor("#17324D")
BLUE = colors.HexColor("#2E75B6")
TEAL = colors.HexColor("#168A8A")
ORANGE = colors.HexColor("#D97925")
PURPLE = colors.HexColor("#7656A6")
INK = colors.HexColor("#203040")
MUTED = colors.HexColor("#647485")
LINE = colors.HexColor("#D9E2EA")
PALE_BLUE = colors.HexColor("#EEF5FB")
PALE_TEAL = colors.HexColor("#EEF9F8")
PALE_ORANGE = colors.HexColor("#FFF5EA")
PALE_PURPLE = colors.HexColor("#F5F0FB")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="TitleK",
        fontName=FONT,
        fontSize=25,
        leading=31,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="SubtitleK",
        fontName=FONT,
        fontSize=10.5,
        leading=15,
        textColor=MUTED,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionK",
        fontName=FONT,
        fontSize=14,
        leading=18,
        textColor=NAVY,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="CardTitleK",
        fontName=FONT,
        fontSize=11.5,
        leading=15,
        textColor=INK,
        spaceAfter=2,
    )
)
styles.add(
    ParagraphStyle(
        name="CardMetaK",
        fontName=FONT,
        fontSize=8.7,
        leading=12,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="FlowMetaK",
        fontName=FONT,
        fontSize=8.3,
        leading=11,
        textColor=colors.HexColor("#E2EEF7"),
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyK",
        fontName=FONT,
        fontSize=9,
        leading=13,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallK",
        fontName=FONT,
        fontSize=8,
        leading=11,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHeadK",
        fontName=FONT,
        fontSize=9.2,
        leading=12,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCellK",
        fontName=FONT,
        fontSize=8.7,
        leading=12.2,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCellCenterK",
        parent=styles["TableCellK"],
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="FlowK",
        fontName=FONT,
        fontSize=9.3,
        leading=13,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="PanelHeadK",
        fontName=FONT,
        fontSize=11.5,
        leading=15,
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        name="PanelLabelK",
        fontName=FONT,
        fontSize=9.3,
        leading=12,
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        name="PanelBodyK",
        fontName=FONT,
        fontSize=9.2,
        leading=14,
        textColor=INK,
    )
)


def P(text, style="BodyK"):
    return Paragraph(text, styles[style])


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.7)
    canvas.line(18 * mm, PAGE_H - 14 * mm, PAGE_W - 18 * mm, PAGE_H - 14 * mm)
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9 * mm, "영업보고서 작성 가이드 | 내부 운영용")
    canvas.drawRightString(PAGE_W - 18 * mm, 9 * mm, f"{doc.page:02d} / 02")
    canvas.restoreState()


def flow_box(title, meta, color):
    table = Table(
        [[P(title, "FlowK")], [P(meta, "FlowMetaK")]],
        colWidths=[57 * mm],
        rowHeights=[11 * mm, 7 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#DCEAF5")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BOX", (0, 0), (-1, -1), 0, color),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def panel(title, subtitle, sequence, note, color, pale):
    head = Table(
        [[P(title, "PanelHeadK"), P(subtitle, "FlowMetaK")]],
        colWidths=[45 * mm, 83 * mm],
    )
    head.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    body = Table(
        [[P("작성 순서", "SmallK")], [P(sequence, "CardTitleK")], [P(note, "PanelBodyK")]],
        colWidths=[128 * mm],
    )
    body.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), pale),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return Table([[head], [body]], colWidths=[128 * mm], style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))


def build():
    doc = BaseDocTemplate(
        OUTPUT,
        pagesize=landscape(A4),
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=17 * mm,
        bottomMargin=13 * mm,
        title="영업보고서 작성 가이드",
        author="SalesLuv",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="landscape", frames=[frame], onPage=header_footer)])

    story = []
    story.append(P("영업보고서 작성 가이드", "TitleK"))
    story.append(P("미팅 -> 일일 -> 주간 -> 월간 | 보고서를 연결해 영업 판단에 사용하기", "SubtitleK"))
    story.append(Spacer(1, 4 * mm))

    flow = Table(
        [[
            flow_box("미팅보고서", "개별 기록 | 무엇을 논의했나?", BLUE),
            P("->", "SectionK"),
            flow_box("일일업무보고서", "당일 집계 | 오늘 무엇을 했나?", TEAL),
            P("->", "SectionK"),
            flow_box("주간업무보고서", "주간 분석 | 이번 주 결과는?", ORANGE),
            P("->", "SectionK"),
            flow_box("월간업무보고서", "의사결정 | 다음 달 무엇을 결정?", PURPLE),
        ]],
        colWidths=[57 * mm, 5 * mm, 57 * mm, 5 * mm, 57 * mm, 5 * mm, 57 * mm],
    )
    flow.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.append(flow)
    story.append(Spacer(1, 7 * mm))
    story.append(P("보고서별 최소 필수 항목", "SectionK"))

    data = [
        [P("보고서", "TableHeadK"), P("필수 입력 항목", "TableHeadK"), P("작성 핵심", "TableHeadK")],
        [
            P("미팅보고서", "TableCellCenterK"),
            P("일시 · 거래처 · 참석자 · 목적 · 논의내용 · 고객요구 · 합의사항 · 후속조치 · 담당자 · 기한 · 근거자료", "TableCellK"),
            P("미팅 사실과 다음 행동을 기록", "TableCellK"),
        ],
        [
            P("일일업무보고서", "TableCellCenterK"),
            P("보고일 · 거래처별 방문·접촉내역 · 접촉목적 · 결과 · 완료·미완료업무 · 이슈 · 다음 일정 · 미팅보고서 링크", "TableCellK"),
            P("당일 활동과 결과를 거래처별로 요약", "TableCellK"),
        ],
        [
            P("주간업무보고서", "TableCellCenterK"),
            P("보고기간 · 목표 · 실적 · 목표 대비 차이 · 원인 · 거래처 진행상황 · 성과 · 이슈 · 다음 주 계획 · 지원요청", "TableCellK"),
            P("목표와 실적을 비교하고 원인을 분석", "TableCellK"),
        ],
        [
            P("월간업무보고서", "TableCellCenterK"),
            P("보고월 · 목표 · 실적 · 거래처·상품별 성과 · 계약·수주·매출 · 파이프라인 · 성공·실패 원인 · 고객 이슈 · 다음 달 계획 · 의사결정 요청", "TableCellK"),
            P("성과 원인과 다음 달 우선순위를 결정", "TableCellK"),
        ],
    ]
    main_table = Table(data, colWidths=[42 * mm, 160 * mm, 59 * mm], rowHeights=[10 * mm, 22 * mm, 22 * mm, 22 * mm, 25 * mm])
    main_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("BACKGROUND", (0, 1), (-1, 1), PALE_BLUE),
                ("BACKGROUND", (0, 2), (-1, 2), PALE_TEAL),
                ("BACKGROUND", (0, 3), (-1, 3), PALE_ORANGE),
                ("BACKGROUND", (0, 4), (-1, 4), PALE_PURPLE),
                ("GRID", (0, 0), (-1, -1), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(main_table)
    story.append(Spacer(1, 2 * mm))

    common = Table(
        [[
            P("공통 작성 공식", "CardTitleK"),
            P("사실 -> 결과 -> 판단 -> 실행", "CardTitleK"),
            P("모든 후속 업무에 담당자 · 기한 · 완료 기준", "BodyK"),
            P("방문 / 전화 / 온라인 / 이메일 구분", "BodyK"),
        ]],
        colWidths=[43 * mm, 73 * mm, 91 * mm, 54 * mm],
    )
    common.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F7FA")),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(common)

    story.append(PageBreak())
    story.append(P("보고서별 작성 순서", "TitleK"))
    story.append(P("각 보고서는 아래 순서로 작성하면 내용이 겹치지 않고 다음 단계의 근거로 연결됩니다.", "SubtitleK"))
    story.append(Spacer(1, 5 * mm))

    panels = [
        panel(
            "미팅보고서", "개별 미팅의 사실 기록", "미팅 목적 -> 논의 내용 -> 고객 요구 -> 합의사항 -> 후속조치", "고객의 발언·요청·합의사항을 근거로 작성합니다. '반응이 좋음' 같은 감상 표현은 피합니다.", BLUE, PALE_BLUE
        ),
        panel(
            "일일업무보고서", "당일 활동과 결과 집계", "오늘 한 일 -> 거래처별 결과 -> 미완료·문제 -> 다음 업무", "미팅 내용 전체를 복사하지 않고 거래처별 결과와 후속 조치만 요약합니다.", TEAL, PALE_TEAL
        ),
        panel(
            "주간업무보고서", "목표 대비 성과 분석", "목표 -> 실적 -> 차이 -> 원인 -> 다음 주 조치", "업무 목록보다 목표와 실적의 차이, 차이가 발생한 이유, 해결 행동을 중심으로 씁니다.", ORANGE, PALE_ORANGE
        ),
        panel(
            "월간업무보고서", "성과와 의사결정", "성과 -> 원인 -> 문제 -> 개선안 -> 다음 달 계획", "일지 형태가 아니라 다음 달 우선순위와 지원·승인이 필요한 내용을 중심으로 씁니다.", PURPLE, PALE_PURPLE
        ),
    ]
    panel_grid = Table(
        [[panels[0], "", panels[1]], [panels[2], "", panels[3]]],
        colWidths=[128 * mm, 5 * mm, 128 * mm],
        rowHeights=[46 * mm, 46 * mm],
    )
    panel_grid.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(panel_grid)
    story.append(Spacer(1, 7 * mm))

    lower = Table(
        [
            [P("후속 조치 필수 5요소", "PanelLabelK"), P("할 일 / 담당자 / 기한 / 완료 기준 / 근거 링크", "BodyK")],
            [P("성과 수치 작성 원칙", "PanelLabelK"), P("수주액 / 계약액 / 매출액을 구분하고, 단위와 기간을 동일하게 유지", "BodyK")],
            [P("영업활동 구분", "PanelLabelK"), P("방문 / 전화 / 온라인 미팅 / 이메일을 분리해 기록", "BodyK")],
            [P("개인정보 주의", "PanelLabelK"), P("명함·고객 원본자료는 접근권한을 확인한 뒤 첨부", "BodyK")],
        ],
        colWidths=[50 * mm, 211 * mm],
        rowHeights=[11 * mm, 11 * mm, 11 * mm, 11 * mm],
    )
    lower.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), NAVY),
                ("BACKGROUND", (1, 0), (1, -1), colors.HexColor("#F4F7FA")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(lower)
    story.append(Spacer(1, 3 * mm))

    doc.build(story)


if __name__ == "__main__":
    build()
