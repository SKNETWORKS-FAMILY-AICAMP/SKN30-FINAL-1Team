from uuid import uuid4

import pytest

from app.services import briefing_documents, contract_document_comparison


class _Rows:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class _Db:
    def __init__(self, rows):
        self.rows = rows

    async def execute(self, _statement):
        return _Rows(self.rows)


def test_build_differences_compares_only_linked_contract_document():
    context = {
        "summaries": [
            {
                "document_id": "doc-contract",
                "file_id": "file-contract",
                "file_name": "최종계약서.pdf",
                "category_code": "계약서",
                "sales_deal_id": "deal-1",
                "summary_payload": {
                    "extracted_fields": {
                        "계약금액": "금 일억이천만원정 (120,000,000원)",
                        "계약 종료일": "2027년 9월 30일",
                        "지급조건": "납품 후 30일 이내",
                    }
                },
            },
            {
                "document_id": "doc-quote",
                "file_id": "file-quote",
                "file_name": "견적서.pdf",
                "category_code": "견적서",
                "sales_deal_id": "deal-1",
                "summary_payload": {"extracted_fields": {"계약금액": "999원"}},
            },
        ],
        "sources": [
            {
                "document_id": "doc-contract",
                "content": "제3조 계약금액은 120,000,000원으로 한다.",
                "page_start": 3,
                "page_end": 3,
            },
            {
                "document_id": "doc-contract",
                "content": "계약 종료일은 2027년 9월 30일이다.",
                "page_start": 5,
                "page_end": 5,
            },
        ],
    }
    deals = [
        {
            "id": "deal-1",
            "title": "A병원 공급 계약",
            "contract_amount": 100_000_000,
            "contract_ends_on": "2027-08-31",
            "contract_payment_terms": "납품 후 30일 이내",
        }
    ]

    result = contract_document_comparison.build_differences(context, deals)

    assert [
        (item["field_code"], item["current_value"], item["document_value"]) for item in result
    ] == [
        ("contract_amount", "100,000,000원", "120,000,000원"),
        ("contract_ends_on", "2027-08-31", "2027-09-30"),
    ]
    assert result[0]["page_start"] == 3
    assert result[1]["page_start"] == 5


def test_build_differences_reports_missing_db_value_but_skips_unlinked_document():
    summary = {
        "document_id": "doc-1",
        "file_id": "file-1",
        "file_name": "계약서.pdf",
        "category_code": "contract",
        "sales_deal_id": "deal-1",
        "summary_payload": {"extracted_fields": {"대금 지급기일": {"value": "납품 후 30일"}}},
    }

    result = contract_document_comparison.build_differences(
        {"summaries": [summary], "sources": []},
        [{"id": "deal-1", "title": "계약", "contract_payment_terms": None}],
    )
    unlinked = contract_document_comparison.build_differences(
        {"summaries": [{**summary, "sales_deal_id": None}], "sources": []},
        [{"id": "deal-1", "title": "계약", "contract_payment_terms": None}],
    )

    assert result[0]["field_code"] == "contract_payment_terms"
    assert result[0]["current_value"] is None
    assert unlinked == []


@pytest.mark.anyio
async def test_visible_documents_places_comparison_on_the_rag_document_row():
    document_id, file_id = uuid4(), uuid4()
    difference = {
        "sales_deal_id": "deal-1",
        "field_code": "contract_amount",
        "document_id": str(document_id),
        "current_value": "100,000,000원",
        "document_value": "120,000,000원",
    }
    context = {
        "sources": [
            {
                "document_id": str(document_id),
                "file_id": str(file_id),
                "file_name": "최종계약서.pdf",
                "chunk_id": "chunk-contract-1",
                "content": "계약금액은 120,000,000원이다.",
            }
        ],
        "contract_differences": [difference],
        "search": {"method": "hybrid", "status": "completed"},
    }

    shown = await briefing_documents.visible_documents(
        _Db([(file_id, document_id)]), team_id=uuid4(), context=context
    )

    assert shown["related"][0]["contract_differences"] == [difference]
    assert shown["related"][0]["excerpts"][0]["chunk_id"] == "chunk-contract-1"
    assert shown["search"]["method"] == "hybrid"
