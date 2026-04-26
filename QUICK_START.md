# 支付系统快速开始指南

## 概述

本指南帮助您快速启动和运行支付系统，适用于开发和测试环境。

## 快速部署（5分钟）

### 1. 环境准备
```bash
# 克隆代码仓库
git clone <your-repo-url>
cd payment-system

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 数据库配置
```bash
# 创建SQLite数据库（开发环境）
sqlite3 payment.db < sql/init.sql

# 或使用PostgreSQL（推荐）
createdb payment_system
```

### 3. 配置文件
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
vim .env
vim payment_config.json
```

### 4. 证书配置（测试环境）
```bash
# 创建测试证书目录
mkdir -p certs/wechat certs/alipay

# 生成测试证书（仅用于开发测试）
openssl req -x509 -newkey rsa:2048 -keyout certs/wechat/test_key.pem -out certs/wechat/test_cert.pem -days 365 -nodes
openssl req -x509 -newkey rsa:2048 -keyout certs/alipay/test_key.pem -out certs/alipay/test_cert.pem -days 365 -nodes
```

### 5. 启动应用
```bash
# 开发模式启动
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# 访问API文档
open http://localhost:8000/docs
```

## 快速测试

### 1. 创建支付意图
```bash
curl -X POST "http://localhost:8000/api/payments/intent" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "CNY",
    "description": "测试订单",
    "idempotency_key": "test-123456"
  }'
```

### 2. 查询支付状态
```bash
curl -X GET "http://localhost:8000/api/payments/intent/{intent_id}"
```

### 3. 创建退款
```bash
curl -X POST "http://localhost:8000/api/payments/refunds" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "payment_123",
    "amount": 50,
    "reason": "测试退款"
  }'
```

## 配置文件模板

### .env 文件
```env
# 数据库配置
DATABASE_URL=sqlite:///./payment.db
# 或 PostgreSQL: postgresql://user:password@localhost/payment_system

# JWT配置
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 应用配置
APP_NAME=Payment System
DEBUG=true
LOG_LEVEL=INFO

# 支付配置
PAYMENT_CONFIG_PATH=payment_config.json
WEBHOOK_SECRET=webhook-secret
```

### payment_config.json（开发环境）
```json
{
  "environment": "sandbox",
  "channels": {
    "wechat": {
      "enabled": true,
      "sandbox": {
        "mch_id": "test_mch_id",
        "app_id": "test_app_id",
        "api_key": "test_api_key_32_characters_long",
        "cert_path": "certs/wechat/test_cert.pem",
        "key_path": "certs/wechat/test_key.pem",
        "notify_url": "http://localhost:8000/api/payments/webhook/wechat"
      }
    },
    "alipay": {
      "enabled": true,
      "sandbox": {
        "app_id": "test_app_id",
        "private_key_path": "certs/alipay/test_key.pem",
        "public_key_path": "certs/alipay/test_cert.pem",
        "alipay_public_key_path": "certs/alipay/test_cert.pem",
        "notify_url": "http://localhost:8000/api/payments/webhook/alipay",
        "return_url": "http://localhost:8000/payment/success"
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
    "encryption_key": "test-encryption-key-32-chars"
  }
}
```

## Docker 快速部署

### 使用 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  payment-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/payment
      - SECRET_KEY=your-secret-key
    volumes:
      - ./payment_config.json:/app/payment_config.json
      - ./certs:/app/certs
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=payment
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 启动命令
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f payment-api

# 停止服务
docker-compose down
```

## API 端点速查

### 支付相关
- `POST /api/payments/intent` - 创建支付意图
- `POST /api/payments/intent/{intent_id}/confirm` - 确认支付
- `GET /api/payments/intent/{intent_id}` - 查询支付状态
- `POST /api/payments/refunds` - 创建退款
- `GET /api/payments/refunds/{refund_id}` - 查询退款状态

### 配置管理
- `GET /api/payments/config` - 获取配置状态
- `POST /api/payments/config/reload` - 手动重载配置

### Webhook
- `POST /api/payments/webhook/wechat` - 微信支付通知
- `POST /api/payments/webhook/alipay` - 支付宝支付通知

### 系统管理
- `GET /health` - 健康检查
- `GET /health/db` - 数据库连接检查

## 测试数据

### 创建测试用户
```bash
# 注册测试用户
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpassword123",
    "full_name": "Test User"
  }'

# 登录获取Token
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpassword123"
  }'
```

### 测试支付流程
```bash
# 1. 创建支付意图
# 2. 模拟支付确认（测试环境）
# 3. 查询支付结果
# 4. 测试退款流程
```

## 常见问题

### Q: 启动时报数据库连接错误？
A: 检查 `.env` 文件中的 `DATABASE_URL` 配置，确保数据库服务已启动。

### Q: 证书文件找不到？
A: 确保证书目录和文件存在，检查 `payment_config.json` 中的路径配置。

### Q: 支付测试失败？
A: 检查配置文件中的测试参数是否正确，查看应用日志获取详细错误信息。

### Q: Webhook 接收失败？
A: 确保 webhook URL 可访问，检查防火墙和网络配置。

## 下一步

1. **生产环境准备**：按照 [DEPLOYMENT.md](DEPLOYMENT.md) 进行生产环境配置
2. **证书配置**：按照 [CERTIFICATE_SETUP.md](CERTIFICATE_SETUP.md) 配置正式证书
3. **安全检查**：使用 [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) 进行安全检查

## 获取帮助

- 📖 完整文档：[DEPLOYMENT.md](DEPLOYMENT.md)
- 🔧 证书配置：[CERTIFICATE_SETUP.md](CERTIFICATE_SETUP.md)
- ✅ 生产检查：[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)
- 🐛 问题反馈：提交 Issue 或联系技术支持

## 快速命令汇总

```bash
# 安装依赖
pip install -r requirements.txt

# 运行测试
pytest tests/unit/ -v
pytest tests/integration/ -v

# 启动开发服务器
uvicorn src.main:app --reload

# 检查配置
python -c "from src.config.payment_config import PaymentConfig; print('Config OK')"

# 验证证书
bash wechat_cert_check.sh
bash alipay_cert_check.sh
```

🎉 **恭喜！** 您的支付系统已成功启动并运行！