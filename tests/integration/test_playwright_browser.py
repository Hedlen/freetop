#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Playwright浏览器连接性测试脚本
测试playwright浏览器是否能够访问Google、携程等网站
"""

import asyncio
import time
import sys
import os
from typing import List, Dict, Any

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright未安装，请先安装: pip install playwright")
    print("然后运行: playwright install")
    sys.exit(1)

class PlaywrightConnectivityTester:
    """Playwright浏览器连接性测试器"""
    
    def __init__(self):
        self.test_sites = [
            {
                'name': 'Google',
                'url': 'https://www.google.com',
                'expected_keywords': ['google', 'search'],
                'timeout': 15000
            },
            {
                'name': '携程',
                'url': 'https://www.ctrip.com',
                'expected_keywords': ['携程', 'ctrip'],
                'timeout': 20000
            },
            {
                'name': '百度',
                'url': 'https://www.baidu.com',
                'expected_keywords': ['百度', 'baidu'],
                'timeout': 15000
            },
            {
                'name': 'GitHub',
                'url': 'https://github.com',
                'expected_keywords': ['github', 'repository'],
                'timeout': 20000
            },
            {
                'name': 'Stack Overflow',
                'url': 'https://stackoverflow.com',
                'expected_keywords': ['stack overflow', 'questions'],
                'timeout': 20000
            }
        ]
        
    async def test_direct_browser(self) -> Dict[str, Any]:
        """测试直连浏览器访问"""
        print("\n=== 测试Playwright浏览器直连访问 ===")
        results = []
        
        async with async_playwright() as p:
            # 启动浏览器
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            
            for site in self.test_sites:
                try:
                    print(f"\n测试访问 {site['name']} ({site['url']})...")
                    start_time = time.time()
                    
                    # 访问页面
                    response = await page.goto(
                        site['url'], 
                        timeout=site['timeout'],
                        wait_until='domcontentloaded'
                    )
                    
                    # 等待页面加载
                    await page.wait_for_timeout(2000)
                    
                    # 获取页面信息
                    title = await page.title()
                    content = await page.content()
                    response_time = time.time() - start_time
                    
                    # 检查是否成功加载
                    success = False
                    if response and response.status < 400:
                        # 检查页面内容是否包含预期关键词
                        content_lower = content.lower()
                        title_lower = title.lower()
                        
                        for keyword in site['expected_keywords']:
                            if keyword.lower() in content_lower or keyword.lower() in title_lower:
                                success = True
                                break
                    
                    result = {
                        'site': site['name'],
                        'url': site['url'],
                        'success': success,
                        'status_code': response.status if response else None,
                        'title': title,
                        'response_time': round(response_time, 2),
                        'content_length': len(content),
                        'error': None
                    }
                    
                    if success:
                        print(f"✅ {site['name']} 访问成功")
                        print(f"   状态码: {response.status}")
                        print(f"   响应时间: {response_time:.2f}s")
                        print(f"   页面标题: {title[:50]}...")
                        print(f"   内容长度: {len(content)} 字符")
                    else:
                        print(f"❌ {site['name']} 访问失败")
                        print(f"   状态码: {response.status if response else 'N/A'}")
                        print(f"   页面标题: {title}")
                        
                except asyncio.TimeoutError:
                    result = {
                        'site': site['name'],
                        'url': site['url'],
                        'success': False,
                        'status_code': None,
                        'title': None,
                        'response_time': None,
                        'content_length': None,
                        'error': '页面加载超时'
                    }
                    print(f"❌ {site['name']} 页面加载超时")
                    
                except Exception as e:
                    result = {
                        'site': site['name'],
                        'url': site['url'],
                        'success': False,
                        'status_code': None,
                        'title': None,
                        'response_time': None,
                        'content_length': None,
                        'error': str(e)
                    }
                    print(f"❌ {site['name']} 访问异常: {str(e)}")
                
                results.append(result)
                await asyncio.sleep(2)  # 避免请求过于频繁
            
            await browser.close()
        
        return {
            'strategy': 'playwright_direct',
            'results': results,
            'summary': self._generate_summary(results)
        }
    
    async def test_with_proxy(self, proxy_server: str, proxy_username: str = None, proxy_password: str = None) -> Dict[str, Any]:
        """测试使用代理的浏览器访问"""
        print(f"\n=== 测试Playwright浏览器代理访问 (代理: {proxy_server}) ===")
        results = []
        
        async with async_playwright() as p:
            # 配置代理
            proxy_config = {'server': proxy_server}
            if proxy_username and proxy_password:
                proxy_config['username'] = proxy_username
                proxy_config['password'] = proxy_password
            
            # 启动浏览器
            browser = await p.chromium.launch(
                headless=True,
                proxy=proxy_config,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                viewport={'width': 1920, 'height': 1080}
            )
            
            page = await context.new_page()
            
            for site in self.test_sites:
                try:
                    print(f"\n测试访问 {site['name']} ({site['url']})...")
                    start_time = time.time()
                    
                    # 访问页面
                    response = await page.goto(
                        site['url'], 
                        timeout=site['timeout'],
                        wait_until='domcontentloaded'
                    )
                    
                    # 等待页面加载
                    await page.wait_for_timeout(2000)
                    
                    # 获取页面信息
                    title = await page.title()
                    content = await page.content()
                    response_time = time.time() - start_time
                    
                    # 检查是否成功加载
                    success = False
                    if response and response.status < 400:
                        # 检查页面内容是否包含预期关键词
                        content_lower = content.lower()
                        title_lower = title.lower()
                        
                        for keyword in site['expected_keywords']:
                            if keyword.lower() in content_lower or keyword.lower() in title_lower:
                                success = True
                                break
                    
                    result = {
                        'site': site['name'],
                        'url': site['url'],
                        'success': success,
                        'status_code': response.status if response else None,
                        'title': title,
                        'response_time': round(response_time, 2),
                        'content_length': len(content),
                        'error': None
                    }
                    
                    if success:
                        print(f"✅ {site['name']} 访问成功")
                        print(f"   状态码: {response.status}")
                        print(f"   响应时间: {response_time:.2f}s")
                        print(f"   页面标题: {title[:50]}...")
                        print(f"   内容长度: {len(content)} 字符")
                    else:
                        print(f"❌ {site['name']} 访问失败")
                        print(f"   状态码: {response.status if response else 'N/A'}")
                        print(f"   页面标题: {title}")
                        
                except asyncio.TimeoutError:
                    result = {
                        'site': site['name'],
                        'url': site['url'],
                        'success': False,
                        'status_code': None,
                        'title': None,
                        'response_time': None,
                        'content_length': None,
                        'error': '页面加载超时'
                    }
                    print(f"❌ {site['name']} 页面加载超时")
                    
                except Exception as e:
                    result = {
                        'site': site['name'],
                        'url': site['url'],
                        'success': False,
                        'status_code': None,
                        'title': None,
                        'response_time': None,
                        'content_length': None,
                        'error': str(e)
                    }
                    print(f"❌ {site['name']} 访问异常: {str(e)}")
                
                results.append(result)
                await asyncio.sleep(2)  # 避免请求过于频繁
            
            await browser.close()
        
        return {
            'strategy': 'playwright_proxy',
            'proxy_server': proxy_server,
            'results': results,
            'summary': self._generate_summary(results)
        }
    
    def _generate_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """生成测试摘要"""
        total = len(results)
        successful = sum(1 for r in results if r['success'])
        failed = total - successful
        
        avg_response_time = None
        if successful > 0:
            response_times = [r['response_time'] for r in results if r['success'] and r['response_time']]
            if response_times:
                avg_response_time = round(sum(response_times) / len(response_times), 2)
        
        return {
            'total_sites': total,
            'successful': successful,
            'failed': failed,
            'success_rate': round(successful / total * 100, 1) if total > 0 else 0,
            'avg_response_time': avg_response_time
        }
    
    def print_final_report(self, test_results: List[Dict[str, Any]]):
        """打印最终测试报告"""
        print("\n" + "="*60)
        print("Playwright浏览器连接性测试报告")
        print("="*60)
        
        for test_result in test_results:
            strategy = test_result['strategy']
            summary = test_result['summary']
            
            print(f"\n【{strategy.upper()} 策略】")
            if 'proxy_server' in test_result:
                print(f"  代理服务器: {test_result['proxy_server']}")
            print(f"  总测试站点: {summary['total_sites']}")
            print(f"  成功访问: {summary['successful']}")
            print(f"  访问失败: {summary['failed']}")
            print(f"  成功率: {summary['success_rate']}%")
            if summary['avg_response_time']:
                print(f"  平均响应时间: {summary['avg_response_time']}s")
            
            # 显示失败的站点
            failed_sites = [r for r in test_result['results'] if not r['success']]
            if failed_sites:
                print(f"  失败站点:")
                for site in failed_sites:
                    error_msg = site.get('error', '未知错误')
                    print(f"    - {site['site']}: {error_msg}")
            
            # 显示成功的站点详情
            successful_sites = [r for r in test_result['results'] if r['success']]
            if successful_sites:
                print(f"  成功站点:")
                for site in successful_sites:
                    print(f"    - {site['site']}: {site['response_time']}s, {site['content_length']} 字符")
        
        print("\n" + "="*60)
        
        # 分析结果
        print("\n【分析建议】")
        direct_test = next((t for t in test_results if t['strategy'] == 'playwright_direct'), None)
        if direct_test:
            success_rate = direct_test['summary']['success_rate']
            if success_rate >= 80:
                print("✅ Playwright浏览器网络连接良好，大部分网站都能正常访问")
                print("   建议：可以正常使用浏览器工具进行网页抓取和自动化操作")
            elif success_rate >= 50:
                print("⚠️ Playwright浏览器网络连接一般，部分网站访问可能有问题")
                print("   建议：考虑配置代理或检查网络设置")
            else:
                print("❌ Playwright浏览器网络连接较差，建议检查网络设置或使用代理")
                print("   建议：配置代理服务器或检查防火墙设置")
            
            # 分析具体问题
            failed_sites = [r for r in direct_test['results'] if not r['success']]
            google_failed = any(r['site'] == 'Google' for r in failed_sites)
            github_failed = any(r['site'] == 'GitHub' for r in failed_sites)
            
            if google_failed and github_failed:
                print("🌐 Google和GitHub都无法访问，强烈建议配置代理访问国外网站")
            elif google_failed:
                print("🌐 Google无法访问，建议配置代理")
            
            domestic_sites = ['百度', '携程']
            domestic_failed = [r for r in failed_sites if r['site'] in domestic_sites]
            if domestic_failed:
                print("🏠 国内网站访问也有问题，建议检查基础网络连接")
        
        # 代理测试分析
        proxy_tests = [t for t in test_results if t['strategy'] == 'playwright_proxy']
        if proxy_tests:
            print("\n【代理测试分析】")
            for proxy_test in proxy_tests:
                proxy_success_rate = proxy_test['summary']['success_rate']
                if proxy_success_rate > (direct_test['summary']['success_rate'] if direct_test else 0):
                    print(f"✅ 代理 {proxy_test['proxy_server']} 提升了访问成功率")
                else:
                    print(f"❌ 代理 {proxy_test['proxy_server']} 没有改善访问情况")

async def main():
    """主函数"""
    tester = PlaywrightConnectivityTester()
    test_results = []
    
    try:
        print("开始Playwright浏览器连接性测试...")
        
        # 1. 测试直连
        direct_result = await tester.test_direct_browser()
        test_results.append(direct_result)
        
        # 2. 如果用户有代理设置，可以在这里测试
        # 示例代理配置（需要用户提供实际的代理服务器）
        proxy_configs = [
            # {
            #     'server': 'http://proxy.example.com:8080',
            #     'username': None,
            #     'password': None
            # },
            # {
            #     'server': 'socks5://127.0.0.1:1080',
            #     'username': None,
            #     'password': None
            # },
        ]
        
        for proxy_config in proxy_configs:
            try:
                proxy_result = await tester.test_with_proxy(
                    proxy_config['server'],
                    proxy_config.get('username'),
                    proxy_config.get('password')
                )
                test_results.append(proxy_result)
            except Exception as e:
                print(f"代理测试失败 ({proxy_config['server']}): {str(e)}")
        
        # 打印最终报告
        tester.print_final_report(test_results)
        
    except Exception as e:
        print(f"测试过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())