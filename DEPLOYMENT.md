# 支付系统部署文档

## 系统概述

本支付系统是一个基于 FastAPI 的多渠道支付平台，支持微信支付和支付宝支付，具有完整的支付生命周期管理、退款处理、异步通知和配置热更新功能。

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   支付网关      │    │   支付渠道      │
│                 │────│                 │────│                 │
│   Web/Mobile    │    │   FastAPI       │    │  微信支付/      │
│   客户端        │    │   支付服务      │    │  支付宝         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              │
                              ▼
                        ┌─────────────────┐
                        │   数据库        │
                        │                 │
                        │   PostgreSQL    │
                        │   Supabase      │
                        └─────────────────┘
```

## 环境要求

### 系统要求
- Python 3.8+
- PostgreSQL 12+
- Redis 6+ (可选，用于缓存)

### Python 依赖
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.25.2
cryptography==41.0.7
python-dotenv==1.0.0
watchdog==3.0.0
```

## 部署步骤

### 1. 环境准备

#### 创建虚拟环境
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows
```

#### 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 数据库配置

#### 创建数据库
```sql
CREATE DATABASE payment_system;
CREATE USER payment_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE payment_system TO payment_user;
```

#### 环境变量配置
创建 `.env` 文件：
```env
# 数据库配置
DATABASE_URL=postgresql://payment_user:your_secure_password@localhost:5432/payment_system

# JWT 配置
SECRET_KEY=your-very-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 应用配置
APP_NAME=Payment System
DEBUG=false
LOG_LEVEL=INFO

# 支付配置
PAYMENT_CONFIG_PATH=payment_config.json
WEBHOOK_SECRET=your-webhook-secret
```

### 3. 支付配置文件

#### 创建支付配置文件 `payment_config.json`
```json
{
  "environment": "sandbox",
  "channels": {
    "wechat": {
      "enabled": true,
      "sandbox": {
        "mch_id": "your_wechat_mch_id",
        "app_id": "your_wechat_app_id",
        "api_key": "your_wechat_api_key",
        "cert_path": "certs/wechat/apiclient_cert.pem",
        "key_path": "certs/wechat/apiclient_key.pem",
        "notify_url": "https://your-domain.com/api/payments/webhook/wechat"
      },
      "production": {
        "mch_id": "your_production_mch_id",
        "app_id": "your_production_app_id",
        "api_key": "your_production_api_key",
        "cert_path": "certs/wechat/apiclient_cert.pem",
        "key_path": "certs/wechat/apiclient_key.pem",
        "notify_url": "https://your-domain.com/api/payments/webhook/wechat"
      }
    },
    "alipay": {
      "enabled": true,
      "sandbox": {
        "app_id": "your_alipay_app_id",
        "private_key_path": "certs/alipay/app_private_key.pem",
        "public_key_path": "certs/alipay/alipay_public_key.pem",
        "alipay_public_key_path": "certs/alipay/alipay_public_key.pem",
        "notify_url": "https://your-domain.com/api/payments/webhook/alipay",
        "return_url": "https://your-domain.com/payment/success"
      },
      "production": {
        "app_id": "your_production_app_id",
        "private_key_path": "certs/alipay/app_private_key.pem",
        "public_key_path": "certs/alipay/alipay_public_key.pem",
        "alipay_public_key_path": "certs/alipay/alipay_public_key.pem",
        "notify_url": "https://your-domain.com/api/payments/webhook/alipay",
        "return_url": "https://your-domain.com/payment/success"
      }
    }
  },
  "settings": {
    "default_currency": "CNY",
    "default_region": "CN",
    "order_expire_minutes": 30,
    "max_refund_amount": 10000,
    "webhook_timeout_seconds": 30,
    "signature_algorithm": "HMAC-SHA256",
    "encryption_key": "your-encryption-key"
  }
}
```

### 4. 证书配置

#### 创建证书目录结构
```bash
mkdir -p certs/wechat certs/alipay
```

#### 微信支付证书
- `certs/wechat/apiclient_cert.pem` - 商户证书
- `certs/wechat/apiclient_key.pem` - 商户私钥

#### 支付宝证书
- `certs/alipay/app_private_key.pem` - 应用私钥
- `certs/alipay/alipay_public_key.pem` - 支付宝公钥

### 5. 应用启动

#### 开发环境启动
```bash
# 启动应用
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# 或使用启动脚本
python start.py
```

#### 生产环境启动
```bash
# 使用 Gunicorn
gunicorn src.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 配置说明

### 支付渠道配置

#### 微信支付配置
- **mch_id**: 微信支付商户号
- **app_id**: 应用ID（公众号/小程序/APP）
- **api_key**: API密钥（32位字符串）
- **cert_path**: 商户证书路径
- **key_path**: 商户私钥路径
- **notify_url**: 支付结果通知URL

#### 支付宝配置
- **app_id**: 支付宝应用ID
- **private_key_path**: 应用私钥路径
- **public_key_path**: 应用公钥路径
- **alipay_public_key_path**: 支付宝公钥路径
- **notify_url**: 异步通知URL
- **return_url**: 同步跳转URL

### 系统配置参数

#### 通用设置
- **environment**: 环境类型（sandbox/production）
- **default_currency**: 默认货币（CNY）
- **default_region**: 默认地区（CN）
- **order_expire_minutes**: 订单过期时间（分钟）
- **max_refund_amount**: 最大退款金额
- **webhook_timeout_seconds**: Webhook超时时间
- **signature_algorithm**: 签名算法
- **encryption_key**: 加密密钥

## 测试验证

### 1. 单元测试
```bash
# 运行所有单元测试
pytest tests/unit/ -v

# 运行特定测试模块
pytest tests/unit/test_payment_service.py -v
```

### 2. 集成测试
```bash
# 运行集成测试
pytest tests/integration/ -v

# 运行API测试
pytest tests/integration/test_payments_api.py -v
```

### 3. 配置测试
```bash
# 测试配置文件热更新
python tests/integration/test_config_reload.py
```

## 监控与维护

### 1. 日志监控
- 应用日志：`logs/app.log`
- 错误日志：`logs/error.log`
- 支付日志：`logs/payment.log`

### 2. 健康检查
```bash
# 检查应用状态
curl -f http://localhost:8000/health

# 检查数据库连接
curl -f http://localhost:8000/health/db
```

## 故障排查

### 常见问题

#### 1. 配置文件热更新失败
- 检查文件权限
- 验证JSON格式
- 查看应用日志

#### 2. 支付通知处理失败
- 检查网络连接
- 验证签名
- 检查证书有效性

#### 3. 数据库连接问题
- 检查数据库服务状态
- 验证连接参数
- 检查防火墙设置

### 日志分析
```bash
# 查看错误日志
tail -f logs/error.log

# 查看支付日志
tail -f logs/payment.log

# 搜索特定错误
grep "ERROR" logs/app.log
```

## 安全建议

### 1. 网络安全
- 使用HTTPS协议
- 配置防火墙规则
- 限制IP访问

### 2. 数据安全
- 加密敏感数据
- 定期备份数据库
- 使用强密码策略

### 3. 证书管理
- 定期更新证书
- 安全存储私钥
- 使用证书吊销列表

## API 文档

### 主要端点

#### 支付相关
- `POST /api/payments/intent` - 创建支付意图
- `POST /api/payments/intent/{intent_id}/confirm` - 确认支付
- `GET /api/payments/intent/{intent_id}` - 查询支付状态
- `POST /api/payments/refunds` - 创建退款
- `GET /api/payments/refunds/{refund_id}` - 查询退款状态

#### 配置管理
- `GET /api/payments/config` - 获取配置状态
- `POST /api/payments/config/reload` - 手动重载配置

#### Webhook
- `POST /api/payments/webhook/wechat` - 微信支付通知
- `POST /api/payments/webhook/alipay` - 支付宝支付通知

完整的API文档可在应用启动后访问：`http://localhost:8000/docs`

## 联系支持

如遇到部署问题，请提供以下信息：
- 系统日志（错误日志和应用日志）
- 配置文件（去除敏感信息）
- 环境信息（操作系统、Python版本、数据库版本）
- 错误复现步骤