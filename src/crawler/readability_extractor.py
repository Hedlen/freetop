from readabilipy import simple_json_from_html_string

from .article import Article


class ReadabilityExtractor:
    def extract(self, html: str, url: str) -> Article:
        article = simple_json_from_html_string(html, use_readability=True)
        return Article(
            title=article.get("title"),
            html_content=article.get("content"),
            url=url
        )
