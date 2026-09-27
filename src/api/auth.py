"""
auth.py -- Authentication & Role-Based Access Control (RBAC) Module
Provides HMAC-SHA256 JWT creation/verification, seed user database,
and FastAPI security dependencies for role enforcement.
"""

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, Header, status

SECRET_KEY = "quantvision_super_secret_jwt_key_2026"
TOKEN_EXPIRY_SECONDS = 86400  # 24 hours

# Seed Users Database
SEED_USERS: Dict[str, Dict[str, Any]] = {
    "admin@quantvision.com": {
        "email": "admin@quantvision.com",
        "password": "AdminPassword123!",
        "name": "Admin User",
        "role": "admin",
    },
    "trader@quantvision.com": {
        "email": "trader@quantvision.com",
        "password": "UserPassword123!",
        "name": "Standard Trader",
        "role": "user",
    },
}

def _urlsafe_b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def _urlsafe_b64decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode((data + padding).encode('utf-8'))

def create_access_token(user_data: Dict[str, Any], expires_in: int = TOKEN_EXPIRY_SECONDS) -> str:
    """Generates a standard JWT HS256 token."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": user_data["email"],
        "name": user_data["name"],
        "role": user_data["role"],
        "iat": now,
        "exp": now + expires_in,
    }

    header_b64 = _urlsafe_b64encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b64 = _urlsafe_b64encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))

    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = _urlsafe_b64encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT HS256 token."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid token format")

        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_sig = _urlsafe_b64decode(signature_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")

        payload = json.loads(_urlsafe_b64decode(payload_b64).decode('utf-8'))
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token has expired")

        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI Dependency: extracts Bearer token and validates user."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Must be 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    return decode_access_token(token)

def get_current_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """FastAPI Dependency: enforces admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin privileges required",
        )
    return current_user
