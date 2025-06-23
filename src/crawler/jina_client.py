import os
import requests
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class JinaClient:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        # 优先使用配置中的API密钥，否则使用环境变量
        self.api_key = self.config.get('jina_api_key') or os.getenv("JINA_API_KEY")
        self.base_url = "https://r.jina.ai/"

    def get_html(self, url: str) -> Optional[str]:
        """Get HTML content from a URL using Jina API."""
        try:
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"

            response = requests.post(
                self.base_url,
                json={"url": url},
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.text
            else:
                logger.error(f"Jina API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error calling Jina API: {e}")
            return None
