import requests

try:
    # 测试API端点
    response = requests.get('http://localhost:8000/api/browser_history/fc94a01e-af05-4632-a6fe-81eb29859180.gif')
    print(f'Status Code: {response.status_code}')
    print(f'Content-Type: {response.headers.get("content-type", "N/A")}')
    print(f'Content-Length: {len(response.content)} bytes')
    
    if response.status_code == 200:
        print('✅ API访问成功')
    else:
        print(f'❌ API访问失败: {response.text}')
        
except Exception as e:
    print(f'❌ 请求异常: {e}')