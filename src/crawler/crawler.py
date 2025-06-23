import sys
import logging
from typing import Optional, Dict, Any

from .article import Article
from .jina_client import JinaClient
from .readability_extractor import ReadabilityExtractor

logger = logging.getLogger(__name__)


class Crawler:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.jina_client = JinaClient(self.config)
        self.readability_extractor = ReadabilityExtractor()

    def crawl(self, url: str) -> Optional[Article]:
        """Crawl a URL and return an Article object."""
        try:
            html_content = self.jina_client.get_html(url)
            if html_content:
                article = self.readability_extractor.extract(html_content, url)
                return article
            else:
                logger.error(f"Failed to get HTML content for URL: {url}")
                return None
        except Exception as e:
            logger.error(f"Error crawling URL {url}: {e}")
            return None


if __name__ == "__main__":
    if len(sys.argv) == 2:
        url = sys.argv[1]
    else:
        url = "https://fintel.io/zh-hant/s/br/nvdc34"
    crawler = Crawler()
    article = crawler.crawl(url)
    print(article.to_markdown())
