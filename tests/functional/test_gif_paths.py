import requests

print('测试不同的GIF文件名格式:')

# 测试只有文件名的情况
filename_only = 'fc94a01e-af05-4632-a6fe-81eb29859180.gif'
response1 = requests.get(f'http://localhost:8000/api/browser_history/{filename_only}')
print(f'只有文件名: {filename_only} -> Status: {response1.status_code}')

# 测试包含路径的情况
with_path = 'static/browser_history/fc94a01e-af05-4632-a6fe-81eb29859180.gif'
response2 = requests.get(f'http://localhost:8000/api/browser_history/{with_path}')
print(f'包含路径: {with_path} -> Status: {response2.status_code}')

# 测试URL编码的路径
import urllib.parse
encoded_path = urllib.parse.quote(with_path)
response3 = requests.get(f'http://localhost:8000/api/browser_history/{encoded_path}')
print(f'编码路径: {encoded_path} -> Status: {response3.status_code}')