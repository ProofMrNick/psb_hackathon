import re

CLAUSE_RE = re.compile(r"^\s*(\d+(?:\.\d+)*\.?\s|\d+\)\s|Статья\s+\d+|Раздел\s+\d+)", re.I)
ARTICLE_RE = re.compile(r"^\s*(Статья\s+\d+(?:\.\d+)?[^\n]{0,100})", re.I)
