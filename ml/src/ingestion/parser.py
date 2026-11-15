"""Structural markers for Russian legal documents.

A heading is not the same as an editorial note such as
"Статья 70 изменена ...": the latter must not reset the article context.
"""
import re

ARTICLE_RE = re.compile(
    r'^\s*(Статья\s+\d+(?:\.\d+)?\.\s*[^\n]{0,130})\s*$', re.I
)
SECTION_RE = re.compile(r'^\s*(\d{1,2})\.\s+(.{2,95})\s*$')
CLAUSE_RE = re.compile(
    r'^\s*(?:\d+(?:\.\d+)*[.)]\s+|Статья\s+\d+\.\s+|Раздел\s+\d+)',
    re.I,
)


def is_section_heading(text):
    """Recognize contract/regulation section titles, not long legal sentences."""
    match = SECTION_RE.match(text)
    if not match:
        return False
    description = match.group(2).strip()
    return (len(description) <= 75 and not description.endswith(('.', ';', ':'))
            and not re.search(r'[.!?]\s', description))
