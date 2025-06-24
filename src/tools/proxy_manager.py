import os
import re
import logging
import subprocess
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class ProxyManager:
    """代理管理器，实现智能代理策略"""
    
    # 国内常见域名后缀和网站
    DOMESTIC_DOMAINS = {
        '.cn', '.com.cn', '.net.cn', '.org.cn', '.gov.cn', '.edu.cn',
        'baidu.com', 'taobao.com', 'tmall.com', 'jd.com', 'qq.com', 
        'weibo.com', 'sina.com', 'sohu.com', '163.com', '126.com',
        'alipay.com', 'zhihu.com', 'bilibili.com', 'douyin.com',
        'tencent.com', 'alibaba.com', 'bytedance.com', 'xiaomi.com',
        'huawei.com', 'oppo.com', 'vivo.com', 'meizu.com'
    }
    
    # 常见需要代理的国外域名
    FOREIGN_DOMAINS = {
        'google.com', 'youtube.com', 'facebook.com', 'twitter.com',
        'instagram.com', 'linkedin.com', 'github.com', 'stackoverflow.com',
        'reddit.com', 'wikipedia.org', 'medium.com', 'discord.com',
        'telegram.org', 'whatsapp.com', 'netflix.com', 'spotify.com'
    }
    
    def __init__(self, strategy: str = 'smart', proxy_config: Dict = None):
        self.strategy = strategy
        self.proxy_config = proxy_config or {}
        self.proxy_whitelist = self.proxy_config.get('whitelist', [])
        self.proxy_blacklist = self.proxy_config.get('blacklist', [])
        self.domestic_direct = self.proxy_config.get('domestic_direct', True)
        self.auto_detect_proxy = self.proxy_config.get('auto_detect_proxy', True)
        
    def should_use_proxy(self, url: str) -> bool:
        """判断是否应该使用代理"""
        if self.strategy == 'direct':
            return False
        elif self.strategy == 'manual':
            return bool(self.proxy_config.get('server'))
        elif self.strategy == 'auto':
            return self._auto_detect_proxy_needed(url)
        elif self.strategy == 'smart':
            return self._smart_proxy_decision(url)
        else:
            return False
    
    def _smart_proxy_decision(self, url: str) -> bool:
        """智能代理决策"""
        domain = self._extract_domain(url)
        
        # 1. 检查白名单（强制使用代理）
        if self._domain_in_list(domain, self.proxy_whitelist):
            logger.info(f"域名 {domain} 在代理白名单中，使用代理")
            return True
        
        # 2. 检查黑名单（强制直连）
        if self._domain_in_list(domain, self.proxy_blacklist):
            logger.info(f"域名 {domain} 在代理黑名单中，直连")
            return False
        
        # 3. 国内网站直连策略
        if self.domestic_direct and self._is_domestic_domain(domain):
            logger.info(f"域名 {domain} 为国内网站，直连")
            return False
        
        # 4. 已知国外网站使用代理
        if self._is_foreign_domain(domain):
            logger.info(f"域名 {domain} 为国外网站，使用代理")
            return True
        
        # 5. 默认策略：未知域名尝试直连，失败后使用代理
        logger.info(f"域名 {domain} 未知，默认直连")
        return False
    
    def _auto_detect_proxy_needed(self, url: str) -> bool:
        """自动检测是否需要代理"""
        if not self.auto_detect_proxy:
            return bool(self.proxy_config.get('server'))
        
        # 尝试检测系统代理设置
        system_proxy = self._detect_system_proxy()
        if system_proxy:
            logger.info(f"检测到系统代理: {system_proxy}")
            return True
        
        return False
    
    def _extract_domain(self, url: str) -> str:
        """提取域名"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            # 移除端口号
            if ':' in domain:
                domain = domain.split(':')[0]
            return domain
        except Exception as e:
            logger.warning(f"解析URL失败: {url}, 错误: {e}")
            return ''
    
    def _domain_in_list(self, domain: str, domain_list: List[str]) -> bool:
        """检查域名是否在列表中（支持通配符）"""
        for pattern in domain_list:
            pattern = pattern.strip().lower()
            if not pattern:
                continue
            
            # 精确匹配
            if domain == pattern:
                return True
            
            # 子域名匹配
            if pattern.startswith('.') and domain.endswith(pattern):
                return True
            
            # 通配符匹配
            if '*' in pattern:
                regex_pattern = pattern.replace('*', '.*')
                if re.match(regex_pattern, domain):
                    return True
        
        return False
    
    def _is_domestic_domain(self, domain: str) -> bool:
        """判断是否为国内域名"""
        # 检查是否以国内域名后缀结尾
        for suffix in self.DOMESTIC_DOMAINS:
            if suffix.startswith('.'):
                if domain.endswith(suffix):
                    return True
            else:
                if domain == suffix or domain.endswith('.' + suffix):
                    return True
        return False
    
    def _is_foreign_domain(self, domain: str) -> bool:
        """判断是否为已知国外域名"""
        for foreign_domain in self.FOREIGN_DOMAINS:
            if domain == foreign_domain or domain.endswith('.' + foreign_domain):
                return True
        return False
    
    def _detect_system_proxy(self) -> Optional[str]:
        """检测系统代理设置"""
        try:
            if os.name == 'nt':  # Windows
                return self._detect_windows_proxy()
            else:  # Linux/Mac
                return self._detect_unix_proxy()
        except Exception as e:
            logger.warning(f"检测系统代理失败: {e}")
            return None
    
    def _detect_windows_proxy(self) -> Optional[str]:
        """检测Windows系统代理"""
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                               r"Software\Microsoft\Windows\CurrentVersion\Internet Settings") as key:
                proxy_enable, _ = winreg.QueryValueEx(key, "ProxyEnable")
                if proxy_enable:
                    proxy_server, _ = winreg.QueryValueEx(key, "ProxyServer")
                    return proxy_server
        except Exception as e:
            logger.(f"检测Windows代理失败: {e}")
        return None
    
    def _detect_unix_proxy(self) -> Optional[str]:
        """检测Unix系统代理"""
        # 检查环境变量
        for var in ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY']:
            proxy = os.environ.get(var)
            if proxy:
                return proxy
        return None
    
    def get_proxy_config(self, url: str) -> Optional[Dict]:
        """获取指定URL的代理配置"""
        if not self.should_use_proxy(url):
            return None
        
        proxy_server = self.proxy_config.get('server')
        if not proxy_server:
            # 尝试自动检测
            if self.strategy == 'auto' and self.auto_detect_proxy:
                proxy_server = self._detect_system_proxy()
        
        if not proxy_server:
            return None
        
        # 构建代理配置
        proxy_config = {
            'server': self._format_proxy_server(proxy_server)
        }
        
        username = self.proxy_config.get('username')
        password = self.proxy_config.get('password')
        
        if username:
            proxy_config['username'] = username
        if password:
            proxy_config['password'] = password
        
        return proxy_config
    
    def _format_proxy_server(self, server: str) -> str:
        """格式化代理服务器地址"""
        if not server:
            return server
        
        # 如果没有协议前缀，根据代理类型添加
        if not server.startswith(('http://', 'https://', 'socks4://', 'socks5://')):
            proxy_type = self.proxy_config.get('type', 'http')
            server = f"{proxy_type}://{server}"
        
        return server
    
    def test_connectivity(self, url: str, timeout: int = 10) -> Tuple[bool, str]:
        """测试连接性"""
        try:
            import requests
            
            proxy_config = self.get_proxy_config(url)
            proxies = None
            
            if proxy_config:
                proxy_url = proxy_config['server']
                if proxy_config.get('username') and proxy_config.get('password'):
                    # 添加认证信息到URL
                    parsed = urlparse(proxy_url)
                    proxy_url = f"{parsed.scheme}://{proxy_config['username']}:{proxy_config['password']}@{parsed.netloc}"
                
                proxies = {
                    'http': proxy_url,
                    'https': proxy_url
                }
            
            response = requests.get(url, proxies=proxies, timeout=timeout)
            return True, f"连接成功，状态码: {response.status_code}"
        
        except Exception as e:
            return False, f"连接失败: {str(e)}"