"""RAG가 찾은 계약서 요약 필드와 계약관리 값을 비교한다."""

from __future__ import annotations

import re
from collections.abc import Mapping
from datetime import date
from typing import Any

_FIELD_SPECS = {
    "contract_amount": {
        "label": "계약금액",
        "aliases": ("계약금액", "총계약금액", "계약대금", "총계약대금"),
        "kind": "money",
    },
    "contract_ends_on": {
        "label": "계약 종료일",
        "aliases": ("계약종료일", "계약만료일", "종료일", "만료일"),
        "kind": "date",
    },
    "contract_payment_terms": {
        "label": "지급조건",
        "aliases": ("지급조건", "대금지급조건", "대금지급기일", "결제조건", "지급기일"),
        "kind": "text",
    },
}
_CONTRACT_CATEGORIES = {"계약서", "contract"}


def build_differences(context: Mapping[str, Any], deals: list[Mapping[str, Any]]) -> list[dict]:
    """딜에 직접 연결된 최신 계약서 요약과 그 딜의 DB 값을 비교한다."""
    deals_by_id = {str(item.get("id")): item for item in deals if item.get("id")}
    sources = context.get("sources") if isinstance(context.get("sources"), list) else []
    differences: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    for summary in context.get("summaries") or []:
        if not isinstance(summary, Mapping):
            continue
        if str(summary.get("category_code")) not in _CONTRACT_CATEGORIES:
            continue
        deal_id = str(summary.get("sales_deal_id") or "")
        deal = deals_by_id.get(deal_id)
        payload = summary.get("summary_payload")
        fields = payload.get("extracted_fields") if isinstance(payload, Mapping) else None
        if deal is None or not isinstance(fields, Mapping):
            continue

        for field_code, spec in _FIELD_SPECS.items():
            document_raw = _field_value(fields, spec["aliases"])
            if document_raw is None:
                continue
            document_value = _canonical(document_raw, spec["kind"])
            current_raw = deal.get(field_code)
            current_value = _canonical(current_raw, spec["kind"])
            if document_value is None or document_value == current_value:
                continue

            document_id = str(summary.get("document_id") or "")
            key = (deal_id, field_code, document_id)
            if not document_id or key in seen:
                continue
            seen.add(key)
            evidence = _evidence(sources, document_id, spec["aliases"])
            differences.append(
                {
                    "sales_deal_id": deal_id,
                    "sales_deal_title": str(deal.get("title") or "계약"),
                    "field_code": field_code,
                    "field_label": spec["label"],
                    "current_value": _display(current_raw, spec["kind"]),
                    "document_value": _display(document_raw, spec["kind"]),
                    "document_id": document_id,
                    "file_id": str(summary.get("file_id") or ""),
                    "file_name": str(summary.get("file_name") or "계약서"),
                    "page_start": evidence.get("page_start"),
                    "page_end": evidence.get("page_end"),
                    "evidence": evidence.get("content"),
                }
            )
    return differences


def _normalized_key(value: object) -> str:
    return re.sub(r"[^0-9a-z가-힣]", "", str(value).lower())


def _field_value(fields: Mapping[str, Any], aliases: tuple[str, ...]) -> object | None:
    wanted = {_normalized_key(alias) for alias in aliases}
    for key, value in fields.items():
        if _normalized_key(key) in wanted:
            if isinstance(value, Mapping):
                for child in ("value", "값", "amount", "date", "text"):
                    if child in value:
                        return value[child]
            return value
        if isinstance(value, Mapping):
            nested = _field_value(value, aliases)
            if nested is not None:
                return nested
    return None


def _canonical(value: object, kind: str) -> object | None:
    if value is None or value == "":
        return None
    if kind == "money":
        if isinstance(value, int):
            return value
        text = str(value).replace(",", "")
        numbers = [int(item) for item in re.findall(r"\d+", text)]
        # 괄호 안에 원 단위 숫자가 함께 적힌 계약서는 그 명시값을 우선한다.
        full_amount = max((item for item in numbers if item >= 10_000), default=None)
        if full_amount is not None:
            return full_amount
        eok = re.search(r"(\d+(?:\.\d+)?)\s*억", text)
        man = re.search(r"(\d+(?:\.\d+)?)\s*만", text)
        if eok or man:
            return int(
                (float(eok.group(1)) * 100_000_000 if eok else 0)
                + (float(man.group(1)) * 10_000 if man else 0)
            )
        match = re.search(r"\d+", text)
        if not match:
            return None
        return int(match.group())
    if kind == "date":
        if isinstance(value, date):
            return value.isoformat()
        match = re.search(r"(20\d{2})\D{0,3}(\d{1,2})\D{0,3}(\d{1,2})", str(value))
        if not match:
            return None
        try:
            return date(*(int(part) for part in match.groups())).isoformat()
        except ValueError:
            return None
    return re.sub(r"\s+", "", str(value)).lower()


def _display(value: object, kind: str) -> str | None:
    canonical = _canonical(value, kind)
    if canonical is None:
        return None
    if kind == "money":
        return f"{canonical:,}원"
    if kind == "date":
        return str(canonical)
    return str(value).strip()


def _evidence(sources: list, document_id: str, aliases: tuple[str, ...]) -> Mapping[str, Any]:
    candidates = [
        item
        for item in sources
        if isinstance(item, Mapping) and str(item.get("document_id")) == document_id
    ]
    for item in candidates:
        content = _normalized_key(item.get("content", ""))
        if any(_normalized_key(alias) in content for alias in aliases):
            return item
    return candidates[0] if candidates else {}
