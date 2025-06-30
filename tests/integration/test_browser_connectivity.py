#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版浏览器连接性测试脚本
测试基本的网络连接性
"""

import asyncio
import time
import requests
from typing import List, Dict, Any

class SimpleConnectivityTester:
    """简化版连接性测试器"""
    
    def __init__(self):
        self.test_sites = [
            {
                'name': 'Google',
                'url': 'https://www.google.com',
                'timeout': 10
            },
            {
                'name': '携程',
                'url': 'https://www.ctrip.com',
                'timeout': 15
            },
            {
                'name': '百度',
                'url': 'https://www.baidu.com',
                'timeout': 10
            },
            {
                'name': 'GitHub',
                'url': 'https://github.com',
                'timeout': 15
            },
            {
                'name': 'Stack Overflow',
                'url': 'https://stackoverflow.com',
                'timeout': 15
            }
        ]
        
    def test_http_requests(self) -> Dict[str, Any]:
        """使用requests库测试HTTP连接"""
        print("\n=== 使用 requests 库测试HTTP连接 ===")
        results = []
        
        for site in self.test_sites:
            try:
                print(f"\n测试访问 {site['name']} ({site['url']})...")
                start_time = time.time()
                
                response = requests.get(
                    site['url'], 
                    timeout=site['timeout'],
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                )
                
                response_time = time.time() - start_time
                success = response.status_code < 400
                
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': success,
                    'status_code': response.status_code,
                    'response_time': round(response_time, 2),
                    'content_length': len(response.content),
                    'error': None
                }
                
                if success:
                    print(f"✅ {site['name']} 访问成功 - 状态码: {response.status_code}, 响应时间: {response_time:.2f}s, 内容长度: {len(response.content)} bytes")
                else:
                    print(f"❌ {site['name']} 访问失败 - 状态码: {response.status_code}")
                    
            except requests.exceptions.Timeout:
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': False,
                    'status_code': None,
                    'response_time': None,
                    'content_length': None,
                    'error': '请求超时'
                }
                print(f"❌ {site['name']} 访问超时")
                
            except requests.exceptions.ConnectionError:
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': False,
                    'status_code': None,
                    'response_time': None,
                    'content_length': None,
                    'error': '连接错误'
                }
                print(f"❌ {site['name']} 连接错误")
                
            except Exception as e:
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': False,
                    'status_code': None,
                    'response_time': None,
                    'content_length': None,
                    'error': str(e)
                }
                print(f"❌ {site['name']} 访问异常: {str(e)}")
            
            results.append(result)
            time.sleep(1)  # 避免请求过于频繁
        
        return {
            'strategy': 'requests',
            'results': results,
            'summary': self._generate_summary(results)
        }
    
    def test_with_proxy(self, proxy_url: str) -> Dict[str, Any]:
        """使用代理测试HTTP连接"""
        print(f"\n=== 使用代理测试HTTP连接 (代理: {proxy_url}) ===")
        results = []
        
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        for site in self.test_sites:
            try:
                print(f"\n测试访问 {site['name']} ({site['url']})...")
                start_time = time.time()
                
                response = requests.get(
                    site['url'], 
                    timeout=site['timeout'],
                    proxies=proxies,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                )
                
                response_time = time.time() - start_time
                success = response.status_code < 400
                
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': success,
                    'status_code': response.status_code,
                    'response_time': round(response_time, 2),
                    'content_length': len(response.content),
                    'error': None
                }
                
                if success:
                    print(f"✅ {site['name']} 访问成功 - 状态码: {response.status_code}, 响应时间: {response_time:.2f}s, 内容长度: {len(response.content)} bytes")
                else:
                    print(f"❌ {site['name']} 访问失败 - 状态码: {response.status_code}")
                    
            except requests.exceptions.Timeout:
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': False,
                    'status_code': None,
                    'response_time': None,
                    'content_length': None,
                    'error': '请求超时'
                }
                print(f"❌ {site['name']} 访问超时")
                
            except requests.exceptions.ProxyError:
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': False,
                    'status_code': None,
                    'response_time': None,
                    'content_length': None,
                    'error': '代理连接错误'
                }
                print(f"❌ {site['name']} 代理连接错误")
                
            except requests.exceptions.ConnectionError:
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': False,
                    'status_code': None,
                    'response_time': None,
                    'content_length': None,
                    'error': '连接错误'
                }
                print(f"❌ {site['name']} 连接错误")
                
            except Exception as e:
                result = {
                    'site': site['name'],
                    'url': site['url'],
                    'success': False,
                    'status_code': None,
                    'response_time': None,
                    'content_length': None,
                    'error': str(e)
                }
                print(f"❌ {site['name']} 访问异常: {str(e)}")
            
            results.append(result)
            time.sleep(1)  # 避免请求过于频繁
        
        return {
            'strategy': 'proxy',
            'proxy_url': proxy_url,
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
        print("网络连接性测试报告")
        print("="*60)
        
        for test_result in test_results:
            strategy = test_result['strategy']
            summary = test_result['summary']
            
            print(f"\n【{strategy.upper()} 策略】")
            if 'proxy_url' in test_result:
                print(f"  代理服务器: {test_result['proxy_url']}")
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
                    print(f"    - {site['site']}: {site['response_time']}s, {site['content_length']} bytes")
        
        print("\n" + "="*60)
        
        # 分析结果
        print("\n【分析建议】")
        direct_test = next((t for t in test_results if t['strategy'] == 'requests'), None)
        if direct_test:
            success_rate = direct_test['summary']['success_rate']
            if success_rate >= 80:
                print("✅ 网络连接良好，大部分网站都能正常访问")
            elif success_rate >= 50:
                print("⚠️ 网络连接一般，部分网站访问可能有问题")
            else:
                print("❌ 网络连接较差，建议检查网络设置或使用代理")
            
            # 分析具体问题
            failed_sites = [r for r in direct_test['results'] if not r['success']]
            google_failed = any(r['site'] == 'Google' for r in failed_sites)
            github_failed = any(r['site'] == 'GitHub' for r in failed_sites)
            
            if google_failed and github_failed:
                print("🌐 Google和GitHub都无法访问，可能需要使用代理访问国外网站")
            elif google_failed:
                print("🌐 Google无法访问，可能需要使用代理")
            
            domestic_sites = ['百度', '携程']
            domestic_failed = [r for r in failed_sites if r['site'] in domestic_sites]
            if domestic_failed:
                print("🏠 国内网站访问也有问题，建议检查基础网络连接")

def main():
    """主函数"""
    tester = SimpleConnectivityTester()
    test_results = []
    
    try:
        # 1. 测试直连
        print("开始网络连接性测试...")
        direct_result = tester.test_http_requests()
        test_results.append(direct_result)
        
        # 2. 如果用户有代理设置，可以在这里测试
        # 示例代理配置（需要用户提供实际的代理服务器）
        proxy_servers = [
            # 'http://proxy.example.com:8080',
            # 'socks5://127.0.0.1:1080',
        ]
        
        for proxy_url in proxy_servers:
            try:
                proxy_result = tester.test_with_proxy(proxy_url)
                test_results.append(proxy_result)
            except Exception as e:
                print(f"代理测试失败 ({proxy_url}): {str(e)}")
        
        # 打印最终报告
        tester.print_final_report(test_results)
        
    except Exception as e:
        print(f"测试过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()