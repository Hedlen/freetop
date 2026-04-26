import pytest
import json
from datetime import datetime
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.api.app import app
from src.database.connection import get_db, Base
from src.models.payment import Order, Payment, Refund, WebhookEvent, IdempotencyKey
from src.config.payment_config import PaymentConfig


class TestPaymentsAPI:
    """支付API集成测试"""
    
    @pytest.fixture(scope="function")
    def test_db(self):
        """测试数据库"""
        # 创建内存数据库
        engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # 创建表
        Base.metadata.create_all(bind=engine)
        
        # 创建会话
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture(scope="function")
    def client(self, test_db):
        """测试客户端"""
        def override_get_db():
            try:
                yield test_db
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as test_client:
            yield test_client
        
        app.dependency_overrides.clear()
    
    @pytest.fixture
    def sample_payment_request(self):
        """示例支付请求"""
        return {
            "amount": 100.00,
            "currency": "CNY",
            "region": "CN",
            "idempotency_key": f"test_key_{datetime.now().timestamp()}",
            "user_id": 1,
            "description": "Test payment",
            "metadata": {"test": "data"}
        }
    
    def test_create_payment_intent_success(self, client, sample_payment_request):
        """测试成功创建支付意图"""
        response = client.post("/api/payments/intent", json=sample_payment_request)
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证响应结构
        assert "order_id" in data
        assert "gateway_order_id" in data
        assert "channel" in data
        assert "method" in data
        assert "status" in data
        assert "pay_url" in data
        assert "amount" in data
        assert "currency" in data
        
        # 验证数据
        assert data["amount"] == 100.00
        assert data["currency"] == "CNY"
        assert data["channel"] in ["wechat", "alipay"]
        assert data["method"] == "h5"
        assert data["status"] == "created"
        assert data["pay_url"] != ""
    
    def test_create_payment_intent_invalid_amount(self, client):
        """测试无效金额的支付意图"""
        request = {
            "amount": -100.00,
            "currency": "CNY",
            "idempotency_key": f"test_key_{datetime.now().timestamp()}"
        }
        
        response = client.post("/api/payments/intent", json=request)
        
        assert response.status_code == 422  # 验证错误
    
    def test_create_payment_intent_invalid_currency(self, client):
        """测试无效货币的支付意图"""
        request = {
            "amount": 100.00,
            "currency": "INVALID",
            "idempotency_key": f"test_key_{datetime.now().timestamp()}"
        }
        
        response = client.post("/api/payments/intent", json=request)
        
        assert response.status_code == 422  # 验证错误
    
    def test_create_payment_intent_idempotency(self, client, sample_payment_request):
        """测试幂等性支付意图创建"""
        # 第一次创建
        response1 = client.post("/api/payments/intent", json=sample_payment_request)
        assert response1.status_code == 200
        data1 = response1.json()
        
        # 使用相同的幂等键再次创建
        response2 = client.post("/api/payments/intent", json=sample_payment_request)
        assert response2.status_code == 200
        data2 = response2.json()
        
        # 验证幂等性：应该返回相同的结果
        assert data1["order_id"] == data2["order_id"]
        assert data1["gateway_order_id"] == data2["gateway_order_id"]
    
    def test_query_payment_status(self, client, sample_payment_request):
        """测试查询支付状态"""
        # 先创建支付意图
        response = client.post("/api/payments/intent", json=sample_payment_request)
        assert response.status_code == 200
        order_data = response.json()
        order_id = order_data["order_id"]
        
        # 查询支付状态
        response = client.get(f"/api/payments/status/{order_id}")
        assert response.status_code == 200
        
        status_data = response.json()
        
        # 验证状态信息
        assert status_data["order_id"] == order_id
        assert status_data["status"] == "created"
        assert status_data["amount"] == 100.00
        assert status_data["currency"] == "CNY"
        assert "payment" in status_data
    
    def test_query_nonexistent_payment_status(self, client):
        """测试查询不存在的支付状态"""
        response = client.get("/api/payments/status/99999")
        
        assert response.status_code == 404
    
    def test_create_refund_success(self, client, sample_payment_request, test_db):
        """测试成功创建退款"""
        # 先创建支付意图
        response = client.post("/api/payments/intent", json=sample_payment_request)
        assert response.status_code == 200
        order_data = response.json()
        
        # 获取支付ID（这里简化处理，实际应该从订单获取支付ID）
        payment = test_db.query(Payment).filter_by(order_id=order_data["order_id"]).first()
        assert payment is not None
        
        # 模拟支付成功状态
        payment.status = Payment.STATUS_SUCCEEDED
        test_db.commit()
        
        # 创建退款
        refund_request = {
            "payment_id": payment.id,
            "amount": 50.00,
            "reason": "Customer request"
        }
        
        response = client.post("/api/payments/refund", json=refund_request)
        assert response.status_code == 200
        
        refund_data = response.json()
        
        # 验证退款信息
        assert "refund_id" in refund_data
        assert "gateway_refund_id" in refund_data
        assert refund_data["amount"] == 50.00
        assert refund_data["status"] == "pending"
        assert refund_data["reason"] == "Customer request"
    
    def test_create_refund_exceeds_payment_amount(self, client, sample_payment_request, test_db):
        """测试退款金额超过支付金额"""
        # 先创建支付意图
        response = client.post("/api/payments/intent", json=sample_payment_request)
        assert response.status_code == 200
        order_data = response.json()
        
        # 获取支付ID
        payment = test_db.query(Payment).filter_by(order_id=order_data["order_id"]).first()
        assert payment is not None
        
        # 模拟支付成功状态
        payment.status = Payment.STATUS_SUCCEEDED
        test_db.commit()
        
        # 尝试创建超过支付金额的退款
        refund_request = {
            "payment_id": payment.id,
            "amount": 200.00,  # 超过支付金额
            "reason": "Invalid refund"
        }
        
        response = client.post("/api/payments/refund", json=refund_request)
        assert response.status_code == 400
    
    def test_create_refund_unsuccessful_payment(self, client, sample_payment_request, test_db):
        """测试对未成功支付创建退款"""
        # 先创建支付意图
        response = client.post("/api/payments/intent", json=sample_payment_request)
        assert response.status_code == 200
        order_data = response.json()
        
        # 获取支付ID
        payment = test_db.query(Payment).filter_by(order_id=order_data["order_id"]).first()
        assert payment is not None
        
        # 保持支付为待处理状态（未成功）
        assert payment.status == Payment.STATUS_PENDING
        
        # 尝试创建退款
        refund_request = {
            "payment_id": payment.id,
            "amount": 50.00,
            "reason": "Invalid refund"
        }
        
        response = client.post("/api/payments/refund", json=refund_request)
        assert response.status_code == 400
    
    def test_query_refund_status(self, client, sample_payment_request, test_db):
        """测试查询退款状态"""
        # 先创建支付意图
        response = client.post("/api/payments/intent", json=sample_payment_request)
        assert response.status_code == 200
        order_data = response.json()
        
        # 获取支付ID
        payment = test_db.query(Payment).filter_by(order_id=order_data["order_id"]).first()
        assert payment is not None
        
        # 模拟支付成功状态
        payment.status = Payment.STATUS_SUCCEEDED
        test_db.commit()
        
        # 创建退款
        refund_request = {
            "payment_id": payment.id,
            "amount": 50.00,
            "reason": "Customer request"
        }
        
        response = client.post("/api/payments/refund", json=refund_request)
        assert response.status_code == 200
        refund_data = response.json()
        refund_id = refund_data["refund_id"]
        
        # 查询退款状态
        response = client.get(f"/api/payments/refund/status/{refund_id}")
        assert response.status_code == 200
        
        status_data = response.json()
        
        # 验证退款状态信息
        assert status_data["refund_id"] == refund_id
        assert status_data["amount"] == 50.00
        assert status_data["status"] == "pending"
        assert "payment" in status_data
        assert status_data["payment"]["payment_id"] == payment.id
    
    def test_query_nonexistent_refund_status(self, client):
        """测试查询不存在的退款状态"""
        response = client.get("/api/payments/refund/status/99999")
        
        assert response.status_code == 404
    
    def test_wechat_webhook_processing(self, client):
        """测试微信支付webhook处理"""
        # 模拟微信支付通知
        webhook_data = """<?xml version="1.0" encoding="UTF-8"?>
        <xml>
            <appid><![CDATA[wx123456789]]></appid>
            <mch_id><![CDATA[1234567890]]></mch_id>
            <nonce_str><![CDATA[random_string]]></nonce_str>
            <result_code><![CDATA[SUCCESS]]></result_code>
            <openid><![CDATA[openid123]]></openid>
            <out_trade_no><![CDATA[ORDER_123]]></out_trade_no>
            <transaction_id><![CDATA[TRANS_123]]></transaction_id>
            <total_fee>10000</total_fee>
            <cash_fee>10000</cash_fee>
            <time_end><![CDATA[20231201120000]]></time_end>
            <sign><![CDATA[test_sign]]></sign>
        </xml>"""
        
        response = client.post(
            "/api/payments/webhooks/wechat",
            data=webhook_data,
            headers={"Content-Type": "application/xml"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data
        assert "event_id" in data
    
    def test_alipay_webhook_processing(self, client):
        """测试支付宝webhook处理"""
        # 模拟支付宝支付通知
        webhook_data = {
            "notify_time": "2023-12-01 12:00:00",
            "notify_type": "trade_status_sync",
            "notify_id": "notify_id_123",
            "app_id": "app_id_123",
            "charset": "utf-8",
            "version": "1.0",
            "sign_type": "RSA2",
            "sign": "test_sign",
            "trade_no": "TRADE_123",
            "out_trade_no": "ORDER_123",
            "out_biz_no": "",
            "buyer_id": "buyer_123",
            "buyer_logon_id": "buyer@example.com",
            "seller_id": "seller_123",
            "seller_email": "seller@example.com",
            "trade_status": "TRADE_SUCCESS",
            "total_amount": "100.00",
            "receipt_amount": "100.00",
            "invoice_amount": "0.00",
            "buyer_pay_amount": "100.00",
            "point_amount": "0.00",
            "refund_fee": "0.00",
            "subject": "Test Payment",
            "body": "Test Payment Body",
            "gmt_create": "2023-12-01 12:00:00",
            "gmt_payment": "2023-12-01 12:01:00",
            "gmt_refund": "",
            "gmt_close": "",
            "fund_bill_list": "[{\"fundChannel\":\"ALIPAYACCOUNT\",\"amount\":\"100.00\"}]"
        }
        
        response = client.post(
            "/api/payments/webhooks/alipay",
            data=webhook_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "message" in data
        assert "event_id" in data
    
    def test_get_payment_statistics(self, client, sample_payment_request):
        """测试获取支付统计信息"""
        # 创建多个支付意图
        for i in range(3):
            request = sample_payment_request.copy()
            request["idempotency_key"] = f"test_key_{i}_{datetime.now().timestamp()}"
            response = client.post("/api/payments/intent", json=request)
            assert response.status_code == 200
        
        # 获取统计信息
        response = client.get("/api/payments/statistics")
        assert response.status_code == 200
        
        stats = response.json()
        
        # 验证统计信息
        assert "total_orders" in stats
        assert "successful_orders" in stats
        assert "failed_orders" in stats
        assert "success_rate" in stats
        assert "total_amount" in stats
        assert "successful_amount" in stats
        assert "conversion_rate" in stats
        
        assert stats["total_orders"] >= 3
        assert stats["total_amount"] >= 300.00
    
    def test_generate_idempotency_key(self, client):
        """测试生成幂等键"""
        response = client.get("/api/payments/idempotency/key")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "idempotency_key" in data
        assert len(data["idempotency_key"]) > 10
    
    def test_config_reload(self, client):
        """测试配置重载"""
        response = client.post("/api/payments/config/reload")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "message" in data
        assert "config" in data
        assert data["success"] is True
    
    def test_get_config_status(self, client):
        """测试获取配置状态"""
        response = client.get("/api/payments/config/status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "wechat_enabled" in data
        assert "alipay_enabled" in data
        assert "wechat_configured" in data
        assert "alipay_configured" in data
        assert "sandbox_mode" in data
        assert "last_modified" in data
    
    def test_health_check(self, client):
        """测试健康检查"""
        response = client.get("/api/payments/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "timestamp" in data
        assert "channels" in data
        assert data["status"] == "healthy"
        assert "wechat" in data["channels"]
        assert "alipay" in data["channels"]


class TestPaymentChannelIndependence:
    """支付渠道独立性测试"""
    
    @pytest.fixture(scope="function")
    def test_db(self):
        """测试数据库"""
        engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture(scope="function")
    def client(self, test_db):
        """测试客户端"""
        def override_get_db():
            try:
                yield test_db
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        
        with TestClient(app) as test_client:
            yield test_client
        
        app.dependency_overrides.clear()
    
    def test_wechat_only_payment(self, client):
        """测试仅微信支付场景"""
        request = {
            "amount": 100.00,
            "currency": "CNY",
            "region": "CN",
            "channel": "wechat",
            "idempotency_key": f"wechat_only_{datetime.now().timestamp()}",
            "user_id": 1
        }
        
        response = client.post("/api/payments/intent", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["channel"] == "wechat"
        assert "wechat" in data["pay_url"]
    
    def test_alipay_only_payment(self, client):
        """测试仅支付宝支付场景"""
        request = {
            "amount": 200.00,
            "currency": "USD",
            "region": "US",
            "channel": "alipay",
            "idempotency_key": f"alipay_only_{datetime.now().timestamp()}",
            "user_id": 1
        }
        
        response = client.post("/api/payments/intent", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["channel"] == "alipay"
        assert "alipay" in data["qrcode"]
    
    def test_auto_routing_cny_to_wechat(self, client):
        """测试人民币自动路由到微信支付"""
        request = {
            "amount": 150.00,
            "currency": "CNY",
            "region": "SG",  # 非中国地区，但货币是人民币
            "idempotency_key": f"cny_routing_{datetime.now().timestamp()}",
            "user_id": 1
        }
        
        response = client.post("/api/payments/intent", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["channel"] == "wechat"
    
    def test_auto_routing_cn_region_to_wechat(self, client):
        """测试中国地区自动路由到微信支付"""
        request = {
            "amount": 80.00,
            "currency": "USD",  # 非人民币，但地区是中国
            "region": "CN",
            "idempotency_key": f"cn_routing_{datetime.now().timestamp()}",
            "user_id": 1
        }
        
        response = client.post("/api/payments/intent", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["channel"] == "wechat"
    
    def test_auto_routing_other_to_alipay(self, client):
        """测试其他情况自动路由到支付宝"""
        request = {
            "amount": 300.00,
            "currency": "USD",
            "region": "US",
            "idempotency_key": f"us_routing_{datetime.now().timestamp()}",
            "user_id": 1
        }
        
        response = client.post("/api/payments/intent", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["channel"] == "alipay"


if __name__ == "__main__":
    pytest.main([__file__])