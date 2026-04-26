# 支付网关证书配置指南

## 概述

本指南详细说明如何获取和配置微信支付及支付宝支付所需的证书文件。

## 微信支付证书配置

### 1. 获取微信支付证书

#### 商户证书申请流程
1. 登录微信支付商户平台：https://pay.weixin.qq.com
2. 进入【账户中心】→【API安全】
3. 申请API证书
4. 下载证书压缩包

#### 证书文件说明
微信支付证书压缩包包含以下文件：
- `apiclient_cert.pem` - 商户证书（公钥）
- `apiclient_key.pem` - 商户私钥
- `rootca.pem` - 根证书（可选）

### 2. 证书文件配置

#### 创建证书目录
```bash
mkdir -p certs/wechat
```

#### 复制证书文件
```bash
# 将下载的证书文件复制到指定目录
cp apiclient_cert.pem certs/wechat/
cp apiclient_key.pem certs/wechat/
```

#### 设置文件权限
```bash
# 设置私钥文件权限（仅所有者可读写）
chmod 600 certs/wechat/apiclient_key.pem
chmod 644 certs/wechat/apiclient_cert.pem
```

### 3. 证书验证

#### 验证证书有效性
```bash
# 检查证书信息
openssl x509 -in certs/wechat/apiclient_cert.pem -text -noout

# 验证私钥
openssl rsa -in certs/wechat/apiclient_key.pem -check
```

#### 检查证书有效期
```bash
# 查看证书有效期
openssl x509 -in certs/wechat/apiclient_cert.pem -dates -noout
```

## 支付宝证书配置

### 1. 获取支付宝证书

#### 应用公钥和私钥生成
1. 登录支付宝开放平台：https://open.alipay.com
2. 进入【控制台】→【应用】
3. 选择对应应用，进入【开发设置】
4. 生成或上传RSA密钥

#### 使用OpenSSL生成密钥对
```bash
# 生成私钥（2048位）
openssl genrsa -out app_private_key.pem 2048

# 生成公钥
openssl rsa -in app_private_key.pem -pubout -out app_public_key.pem

# 将公钥上传到支付宝平台
```

### 2. 获取支付宝公钥

#### 从支付宝平台获取
1. 在支付宝开放平台【开发设置】中
2. 查看【接口加签方式】
3. 获取支付宝公钥
4. 保存为 `alipay_public_key.pem`

### 3. 证书文件配置

#### 创建证书目录
```bash
mkdir -p certs/alipay
```

#### 配置证书文件
```bash
# 复制私钥
cp app_private_key.pem certs/alipay/

# 复制支付宝公钥
cp alipay_public_key.pem certs/alipay/

# 可选：复制应用公钥（用于验证）
cp app_public_key.pem certs/alipay/
```

#### 设置文件权限
```bash
# 设置私钥文件权限
chmod 600 certs/alipay/app_private_key.pem
chmod 644 certs/alipay/alipay_public_key.pem
```

### 4. 证书格式转换

#### PKCS1转PKCS8（如需要）
```bash
# 如果私钥是PKCS1格式，转换为PKCS8
openssl pkcs8 -topk8 -inform PEM -in app_private_key.pem -outform PEM -nocrypt -out app_private_key_pkcs8.pem
```

#### 验证密钥对
```bash
# 验证私钥
openssl rsa -in certs/alipay/app_private_key.pem -check

# 验证公钥
openssl rsa -pubin -in certs/alipay/alipay_public_key.pem -text -noout
```

## 证书配置检查清单

### 微信支付证书检查
- [ ] `apiclient_cert.pem` 文件存在且有效
- [ ] `apiclient_key.pem` 文件存在且权限正确
- [ ] 证书未过期
- [ ] 证书与商户号匹配
- [ ] 证书文件路径配置正确

### 支付宝证书检查
- [ ] `app_private_key.pem` 文件存在且权限正确
- [ ] `alipay_public_key.pem` 文件存在
- [ ] 私钥与上传到支付宝的公钥匹配
- [ ] 证书文件路径配置正确

## 常见问题解决

### 微信支付证书问题

#### 问题1：证书文件格式错误
**症状**：支付请求返回证书错误
**解决**：
```bash
# 检查证书格式
openssl x509 -in apiclient_cert.pem -text | grep "Certificate"

# 确保证书是PEM格式
file apiclient_cert.pem
# 应该显示：PEM certificate
```

#### 问题2：私钥权限错误
**症状**：无法读取私钥文件
**解决**：
```bash
# 修正权限
chmod 600 certs/wechat/apiclient_key.pem
```

#### 问题3：证书已过期
**症状**：支付请求返回证书过期错误
**解决**：
- 重新申请微信支付证书
- 更新证书文件
- 重启应用服务

### 支付宝证书问题

#### 问题1：签名验证失败
**症状**：支付宝返回签名错误
**解决**：
```bash
# 验证密钥对是否匹配
openssl rsa -in app_private_key.pem -pubout -out temp_public.pem
diff temp_public.pem app_public_key.pem
```

#### 问题2：支付宝公钥错误
**症状**：无法验证支付宝通知签名
**解决**：
- 重新从支付宝平台获取正确的公钥
- 确保证书文件路径配置正确

#### 问题3：私钥格式不兼容
**症状**：签名算法报错
**解决**：
```bash
# 转换私钥格式
openssl pkcs8 -topk8 -inform PEM -in app_private_key.pem -outform PEM -nocrypt -out app_private_key_pkcs8.pem
```

## 安全配置建议

### 1. 证书文件安全
- 私钥文件权限设置为600（仅所有者可读写）
- 公钥文件权限设置为644（所有者可读写，其他只读）
- 定期备份证书文件
- 使用安全的文件传输方式

### 2. 证书存储安全
- 不要将证书文件提交到代码仓库
- 使用环境变量或配置文件指定证书路径
- 定期轮换证书
- 监控证书使用情况

### 3. 证书更新流程
1. 提前申请新证书（证书过期前30天）
2. 在测试环境验证新证书
3. 在生产环境部署新证书
4. 验证支付功能正常
5. 移除旧证书文件

## 证书验证脚本

### 微信支付证书验证脚本
```bash
#!/bin/bash
# wechat_cert_check.sh

echo "检查微信支付证书..."

# 检查文件存在
if [ ! -f "certs/wechat/apiclient_cert.pem" ]; then
    echo "❌ 缺少商户证书文件"
    exit 1
fi

if [ ! -f "certs/wechat/apiclient_key.pem" ]; then
    echo "❌ 缺少商户私钥文件"
    exit 1
fi

# 检查证书有效期
echo "检查证书有效期..."
openssl x509 -in certs/wechat/apiclient_cert.pem -dates -noout

# 检查私钥
echo "检查私钥..."
openssl rsa -in certs/wechat/apiclient_key.pem -check > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 私钥有效"
else
    echo "❌ 私钥无效"
    exit 1
fi

echo "微信支付证书检查完成"
```

### 支付宝证书验证脚本
```bash
#!/bin/bash
# alipay_cert_check.sh

echo "检查支付宝证书..."

# 检查文件存在
if [ ! -f "certs/alipay/app_private_key.pem" ]; then
    echo "❌ 缺少应用私钥文件"
    exit 1
fi

if [ ! -f "certs/alipay/alipay_public_key.pem" ]; then
    echo "❌ 缺少支付宝公钥文件"
    exit 1
fi

# 检查私钥
echo "检查私钥..."
openssl rsa -in certs/alipay/app_private_key.pem -check > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 私钥有效"
else
    echo "❌ 私钥无效"
    exit 1
fi

# 检查公钥
echo "检查支付宝公钥..."
openssl rsa -pubin -in certs/alipay/alipay_public_key.pem -text -noout > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 支付宝公钥有效"
else
    echo "❌ 支付宝公钥无效"
    exit 1
fi

echo "支付宝证书检查完成"
```

## 证书配置测试

### 测试证书配置
```bash
# 运行证书检查脚本
bash wechat_cert_check.sh
bash alipay_cert_check.sh

# 测试支付配置
python -c "
from src.config.payment_config import PaymentConfig
config = PaymentConfig()
print('微信支付配置:', config.get_wechat_config())
print('支付宝配置:', config.get_alipay_config())
"
```

## 联系支持

如果在证书配置过程中遇到问题：
- 微信支付支持：访问微信支付商户平台获取技术支持
- 支付宝支持：访问支付宝开放平台获取技术支持
- 证书相关问题：联系证书颁发机构或支付平台技术支持