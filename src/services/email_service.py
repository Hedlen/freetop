import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import random
import string
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class EmailService:
    """邮件服务类"""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
    def generate_verification_code(self, length: int = 6) -> str:
        """生成验证码"""
        return ''.join(random.choices(string.digits, k=length))
    
    def generate_reset_token(self, length: int = 64) -> str:
        """生成重置令牌"""
        import secrets
        return secrets.token_urlsafe(length)
    
    def send_verification_email(self, to_email: str, verification_code: str, username: str) -> bool:
        """发送邮箱验证邮件"""
        try:
            subject = "【FreeTop】邮箱验证"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
                    .code {{ background-color: #e8f5e8; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 3px; border-radius: 5px; margin: 20px 0; }}
                    .button {{ display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>FreeTop 邮箱验证</h1>
                    </div>
                    <div class="content">
                        <h2>亲爱的 {username}，</h2>
                        <p>感谢您注册 FreeTop 账户！为了确保您的账户安全，请使用以下验证码完成邮箱验证：</p>
                        
                        <div class="code">{verification_code}</div>
                        
                        <p>验证码有效期为 30 分钟。如果验证码已过期，请重新申请。</p>
                        
                        <div class="footer">
                            <p>如果这不是您的操作，请忽略此邮件。</p>
                            <p>此邮件由 FreeTop 系统自动发送，请勿回复。</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            亲爱的 {username}，
            
            感谢您注册 FreeTop 账户！
            
            您的邮箱验证码是：{verification_code}
            
            验证码有效期为 30 分钟。
            
            如果这不是您的操作，请忽略此邮件。
            
            此邮件由 FreeTop 系统自动发送，请勿回复。
            """
            
            return self._send_email(to_email, subject, html_content, text_content)
            
        except Exception as e:
            logger.error(f"Failed to send verification email to {to_email}: {e}")
            return False
    
    def send_password_reset_email(self, to_email: str, reset_token: str, username: str) -> bool:
        """发送密码重置邮件"""
        try:
            subject = "【FreeTop】密码重置"
            reset_url = f"{self.base_url}/reset-password?token={reset_token}"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #FF6B6B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
                    .button {{ display: inline-block; padding: 12px 24px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>FreeTop 密码重置</h1>
                    </div>
                    <div class="content">
                        <h2>亲爱的 {username}，</h2>
                        <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>
                        
                        <p style="text-align: center;">
                            <a href="{reset_url}" class="button">重置密码</a>
                        </p>
                        
                        <p>或者复制以下链接到浏览器地址栏：</p>
                        <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">{reset_url}</p>
                        
                        <p>重置链接有效期为 1 小时。如果链接已过期，请重新申请密码重置。</p>
                        
                        <div class="footer">
                            <p>如果这不是您的操作，请忽略此邮件。</p>
                            <p>此邮件由 FreeTop 系统自动发送，请勿回复。</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            亲爱的 {username}，
            
            我们收到了您的密码重置请求。
            
            请点击以下链接重置您的密码：
            {reset_url}
            
            重置链接有效期为 1 小时。
            
            如果这不是您的操作，请忽略此邮件。
            
            此邮件由 FreeTop 系统自动发送，请勿回复。
            """
            
            return self._send_email(to_email, subject, html_content, text_content)
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {to_email}: {e}")
            return False
    
    def send_subscription_expiration_reminder(self, to_email: str, username: str, days_remaining: int) -> bool:
        """发送订阅到期提醒邮件"""
        try:
            subject = f"【FreeTop】订阅即将到期提醒"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #FFA500; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
                    .button {{ display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>订阅即将到期</h1>
                    </div>
                    <div class="content">
                        <h2>亲爱的 {username}，</h2>
                        <p>您的 FreeTop 订阅将在 <strong>{days_remaining} 天</strong> 后到期。</p>
                        
                        <p>为了确保您能够继续享受我们的服务，请及时续订您的订阅。</p>
                        
                        <p style="text-align: center;">
                            <a href="{self.base_url}/subscription" class="button">立即续订</a>
                        </p>
                        
                        <div class="footer">
                            <p>此邮件由 FreeTop 系统自动发送，请勿回复。</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_content = f"""
            亲爱的 {username}，
            
            您的 FreeTop 订阅将在 {days_remaining} 天后到期。
            
            为了确保您能够继续享受我们的服务，请及时续订您的订阅。
            
            访问 {self.base_url}/subscription 进行续订。
            
            此邮件由 FreeTop 系统自动发送，请勿回复。
            """
            
            return self._send_email(to_email, subject, html_content, text_content)
            
        except Exception as e:
            logger.error(f"Failed to send subscription expiration reminder to {to_email}: {e}")
            return False
    
    def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """发送邮件的核心方法"""
        try:
            # 创建邮件消息
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            # 添加纯文本和HTML内容
            text_part = MIMEText(text_content, 'plain', 'utf-8')
            html_part = MIMEText(html_content, 'html', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # 发送邮件
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # 启用TLS加密
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

# 创建全局邮件服务实例
email_service = EmailService()