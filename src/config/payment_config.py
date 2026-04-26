import json
import os
import time
import threading
from typing import Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class PaymentConfig:
    """支付配置管理器，支持热更新"""
    
    def __init__(self, config_path: str = "payment_config.json"):
        self.config_path = Path(config_path)
        self._config: Dict[str, Any] = {}
        self._last_modified: float = 0
        self._lock = threading.RLock()
        self._load_config()
        self._start_watcher()
    
    def _load_config(self) -> None:
        """加载配置文件"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    self._config = json.load(f)
                self._last_modified = self.config_path.stat().st_mtime
                logger.info(f"Payment config loaded from {self.config_path}")
            else:
                logger.warning(f"Payment config file not found: {self.config_path}")
                self._config = self._get_default_config()
        except Exception as e:
            logger.error(f"Failed to load payment config: {e}")
            self._config = self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """获取默认配置"""
        return {
            "wechat": {
                "enabled": False,
                "sandbox": True,
                "mch_id": "",
                "app_id": "",
                "api_key": "",
                "cert_path": "",
                "key_path": "",
                "notify_url": "",
                "refund_notify_url": "",
                "api_base": "https://api.mch.weixin.qq.com",
                "sandbox_base": "https://api.mch.weixin.qq.com/sandboxnew",
                "sign_type": "HMAC-SHA256",
                "timeout": 30
            },
            "alipay": {
                "enabled": False,
                "sandbox": True,
                "app_id": "",
                "private_key_path": "",
                "public_key_path": "",
                "alipay_public_key_path": "",
                "notify_url": "",
                "return_url": "",
                "api_base": "https://openapi.alipay.com/gateway.do",
                "sandbox_base": "https://openapi.alipaydev.com/gateway.do",
                "sign_type": "RSA2",
                "charset": "utf-8",
                "format": "JSON",
                "version": "1.0",
                "timeout": 30
            },
            "common": {
                "default_currency": "CNY",
                "default_region": "CN",
                "max_refund_amount": 100000,
                "min_payment_amount": 1,
                "max_payment_amount": 1000000,
                "order_expire_minutes": 30,
                "query_interval_seconds": 5,
                "max_query_attempts": 12,
                "webhook_timeout_seconds": 30,
                "idempotency_key_expire_hours": 24
            },
            "security": {
                "encrypt_key": "",
                "webhook_secret": "",
                "rate_limit_per_minute": 60,
                "max_concurrent_requests": 100
            }
        }
    
    def _start_watcher(self) -> None:
        """启动配置文件监控线程"""
        def watch_config():
            while True:
                try:
                    if self.config_path.exists():
                        current_modified = self.config_path.stat().st_mtime
                        if current_modified > self._last_modified:
                            logger.info(f"Config file changed, reloading...")
                            self._load_config()
                    time.sleep(5)  # 每5秒检查一次
                except Exception as e:
                    logger.error(f"Config watcher error: {e}")
                    time.sleep(10)  # 出错时延长检查间隔
        
        watcher_thread = threading.Thread(target=watch_config, daemon=True)
        watcher_thread.start()
        logger.info("Payment config watcher started")
    
    def get_config(self) -> Dict[str, Any]:
        """获取当前配置"""
        with self._lock:
            return self._config.copy()
    
    def get_wechat_config(self) -> Dict[str, Any]:
        """获取微信支付配置"""
        with self._lock:
            return self._config.get("wechat", {}).copy()
    
    def get_alipay_config(self) -> Dict[str, Any]:
        """获取支付宝配置"""
        with self._lock:
            return self._config.get("alipay", {}).copy()
    
    def get_common_config(self) -> Dict[str, Any]:
        """获取通用配置"""
        with self._lock:
            return self._config.get("common", {}).copy()
    
    def get_security_config(self) -> Dict[str, Any]:
        """获取安全配置"""
        with self._lock:
            return self._config.get("security", {}).copy()
    
    def is_wechat_enabled(self) -> bool:
        """检查微信支付是否启用"""
        return self.get_wechat_config().get("enabled", False)
    
    def is_alipay_enabled(self) -> bool:
        """检查支付宝是否启用"""
        return self.get_alipay_config().get("enabled", False)
    
    def get_channel_config(self, channel: str) -> Dict[str, Any]:
        """获取指定渠道的配置"""
        if channel == "wechat":
            return self.get_wechat_config()
        elif channel == "alipay":
            return self.get_alipay_config()
        else:
            return {}
    
    def is_channel_enabled(self, channel: str) -> bool:
        """检查指定渠道是否启用"""
        config = self.get_channel_config(channel)
        return config.get("enabled", False)
    
    def reload_config(self) -> bool:
        """手动重新加载配置"""
        try:
            self._load_config()
            return True
        except Exception as e:
            logger.error(f"Failed to reload config: {e}")
            return False
    
    def update_config(self, new_config: Dict[str, Any]) -> bool:
        """更新配置文件"""
        try:
            with self._lock:
                # 备份当前配置
                backup_config = self._config.copy()
                
                # 更新配置
                self._config.update(new_config)
                
                # 保存到文件
                with open(self.config_path, 'w', encoding='utf-8') as f:
                    json.dump(self._config, f, indent=2, ensure_ascii=False)
                
                self._last_modified = self.config_path.stat().st_mtime
                logger.info("Payment config updated successfully")
                return True
                
        except Exception as e:
            logger.error(f"Failed to update config: {e}")
            # 回滚配置
            self._config = backup_config
            return False

# 全局配置实例
payment_config = PaymentConfig()

def get_payment_config() -> PaymentConfig:
    """获取支付配置管理器实例"""
    return payment_config