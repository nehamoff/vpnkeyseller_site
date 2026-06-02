#!/usr/bin/env python3
"""
Remnawave VPN Panel Integration Module
Handles user creation, subscription renewal, and traffic management
"""

import os
import sys
import json
import calendar
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
from dotenv import load_dotenv
import uuid

# Load environment variables from .env file in the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_file = os.path.join(script_dir, ".env")
load_dotenv(env_file)

# Setup logging - log to stderr to not interfere with JSON output
logging.basicConfig(
    level=logging.INFO, format="[PYTHON] %(levelname)s: %(message)s", stream=sys.stderr
)
logger = logging.getLogger(__name__)


class RemnawaveAPI:
    """Remnawave API client for VPN key management"""

    BASE_LIMIT = 26843545600  # 25 GB in bytes
    WEEK_LIMIT = 7516192768  # ~7 GB — тариф на 7 дней (как в Telegram-боте)
    TRIAL_SQUAD_ID = "ffa0ca48-bb6e-447b-a404-f1808b09c967"
    PAID_SQUAD_ID = "6f11955f-6b95-4f96-bba4-3d866de8ce83"

    def __init__(self):
        self.base_url = os.getenv("REMNAWAVE_BASE_URL", "").rstrip("/")
        self.token = os.getenv("REMNAWAVE_TOKEN")
        self.admin_login = os.getenv("REMNAWAVE_ADMIN_LOGIN")
        self.admin_password = os.getenv("REMNAWAVE_ADMIN_PASSWORD")

        logger.info(
            f"REMNAWAVE_BASE_URL: {self.base_url[:50]}..."
            if self.base_url
            else "REMNAWAVE_BASE_URL: NOT SET"
        )
        logger.info(
            f"REMNAWAVE_TOKEN: {self.token[:20]}..."
            if self.token
            else "REMNAWAVE_TOKEN: NOT SET"
        )
        logger.info(
            f"REMNAWAVE_ADMIN_LOGIN: {self.admin_login if self.admin_login else 'NOT SET'}"
        )

        if not self.base_url or not self.token:
            raise ValueError(
                "REMNAWAVE_BASE_URL and REMNAWAVE_TOKEN must be set in environment"
            )

    def _get_headers(self) -> Dict[str, str]:
        """Get common API headers"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}",
        }

    @staticmethod
    def _parse_dt(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo:
            dt = dt.astimezone().replace(tzinfo=None)
        return dt

    def _is_month_rolling_reset_day(self, user: Dict[str, Any]) -> bool:
        """Совпадает с логикой MONTH_ROLLING: день месяца = день создания ключа."""
        created = self._parse_dt(user.get("createdAt"))
        if not created:
            return False

        now = datetime.now()
        reset_day = created.day
        last_day_of_month = calendar.monthrange(now.year, now.month)[1]

        if now.day == reset_day:
            return True
        if reset_day > last_day_of_month and now.day == last_day_of_month:
            return True
        return False

    def _should_apply_monthly_rollover(self, user: Dict[str, Any]) -> bool:
        if user.get("trafficLimitStrategy") != "MONTH_ROLLING":
            return False
        if not self._is_month_rolling_reset_day(user):
            return False

        last_reset = self._parse_dt(user.get("lastTrafficResetAt"))
        now = datetime.now()

        if last_reset is None:
            return True

        if last_reset.date() < now.date():
            return True

        used = int(user.get("userTraffic", {}).get("usedTrafficBytes") or 0)
        if used > 0 and last_reset.date() == now.date():
            return True

        return False

    @staticmethod
    def compute_rollover_new_limit(
        traffic_limit: int,
        used: int,
        purchased_bytes: int = 0,
        base_limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Лимит после месячного переноса (MONTH_ROLLING).

        - Без докупок: 25 ГБ + неиспользованный остаток подписки (как раньше).
        - С докупками: сохраняем общий пул (остаток), без «+25 ГБ» поверх докупки.
        - Только перенос подписки (лимит > 25 без докупок): новый лимит = остаток.
        - Докупка исчерпана (остаток 0): снова базовые 25 ГБ.
        """
        base = int(base_limit if base_limit is not None else RemnawaveAPI.BASE_LIMIT)
        traffic_limit = max(0, int(traffic_limit or 0))
        used = max(0, int(used or 0))
        purchased_bytes = max(0, int(purchased_bytes or 0))

        leftover = max(0, traffic_limit - used)
        has_purchased = purchased_bytes > 0

        if leftover == 0:
            if has_purchased:
                new_limit = base
                mode = "purchased_depleted"
            elif traffic_limit <= base:
                return {
                    "new_limit": base,
                    "leftover": 0,
                    "mode": "skip",
                    "should_skip": True,
                }
            else:
                new_limit = base
                mode = "carry_depleted"
        elif has_purchased:
            used_from_purchased = max(0, used - base)
            purchased_remaining = max(0, purchased_bytes - used_from_purchased)
            purchased_remaining = min(purchased_remaining, leftover)
            new_limit = leftover
            mode = "with_purchase"
        elif traffic_limit > base:
            new_limit = leftover
            mode = "carry_only"
        else:
            new_limit = base + leftover
            mode = "subscription"

        return {
            "new_limit": new_limit,
            "leftover": leftover,
            "mode": mode,
            "should_skip": False,
            "purchased_bytes": purchased_bytes,
            "purchased_remaining": (
                max(0, min(purchased_bytes, leftover) - max(0, used - base))
                if has_purchased and leftover > 0
                else 0
            ),
        }

    def apply_monthly_traffic_rollover(
        self, user: Dict[str, Any], purchased_bytes: int = 0
    ) -> Dict[str, Any]:
        """
        Перед месячным сбросом Remnawave: выставить лимит с учётом докупок и переноса.
        purchased_bytes — сумма активных gb_topup из БД (в байтах).
        """
        username = user.get("username")
        if not username:
            return {"success": False, "error": "Username missing"}

        if not self._should_apply_monthly_rollover(user):
            return {"success": True, "skipped": True, "data": user}

        traffic_limit = int(user.get("trafficLimitBytes") or self.BASE_LIMIT)
        used = int(user.get("userTraffic", {}).get("usedTrafficBytes") or 0)

        calc = self.compute_rollover_new_limit(
            traffic_limit, used, purchased_bytes, self.BASE_LIMIT
        )

        if calc.get("should_skip"):
            return {"success": True, "skipped": True, "data": user}

        new_limit = int(calc["new_limit"])
        leftover = int(calc["leftover"])

        if new_limit == traffic_limit and leftover > 0:
            return {"success": True, "skipped": True, "data": user}

        try:
            payload = {
                "username": username,
                "trafficLimitBytes": new_limit,
                "trafficLimitStrategy": "MONTH_ROLLING",
                "hwidDeviceLimit": user.get("hwidDeviceLimit", 3),
                "activeInternalSquads": [self.PAID_SQUAD_ID],
            }

            response = requests.patch(
                f"{self.base_url}/api/users",
                headers=self._get_headers(),
                json=payload,
                timeout=30,
            )
            response.raise_for_status()

            refreshed = self.get_user_by_username(username)
            if refreshed.get("success"):
                logger.info(
                    f"✓ Rollover {username} [{calc.get('mode')}]: "
                    f"limit {traffic_limit} → {new_limit} "
                    f"({round(leftover / 1073741824, 2)} ГБ остаток, "
                    f"докупка {round(purchased_bytes / 1073741824, 2)} ГБ)"
                )
                return {
                    "success": True,
                    "skipped": False,
                    "data": refreshed["data"],
                    "leftover_bytes": leftover,
                    "new_limit": new_limit,
                    "rollover_mode": calc.get("mode"),
                }

            return {
                "success": True,
                "skipped": False,
                "data": user,
                "new_limit": new_limit,
                "rollover_mode": calc.get("mode"),
            }
        except Exception as e:
            logger.error(f"Rollover failed for {username}: {e}")
            return {"success": False, "error": str(e), "data": user}

    def create_new_user(
        self, email: str, key_number: int = 1, days: int = 30
    ) -> Dict[str, Any]:
        """
        Create new user in Remnawave panel

        Args:
            email: User email
            key_number: Sequential key number for this user (1, 2, 3, etc.)
            days: Subscription duration in days

        Returns:
            Response JSON from API
        """
        try:
            expire_at = (datetime.now() + timedelta(days=int(days))).isoformat()
            created_at = datetime.now().isoformat()

            # Generate username from email and unique suffix: user_shortUuid
            email_base = email.split("@")[0]
            short_uuid = str(uuid.uuid4())[:8]
            username = f"{email_base}_{short_uuid}"

            payload = {
                "username": username,
                "trafficLimitBytes": self.BASE_LIMIT,
                "expireAt": expire_at,
                "createdAt": created_at,
                "trafficLimitStrategy": "MONTH_ROLLING",
                "hwidDeviceLimit": 3,
                "activeInternalSquads": [self.PAID_SQUAD_ID],
            }

            logger.info(
                f"Creating user with username: {username}, email: {email}, key#: {key_number}, days: {days}"
            )

            response = requests.post(
                f"{self.base_url}/api/users",
                headers=self._get_headers(),
                json=payload,
                timeout=30,
            )

            response.raise_for_status()
            result = response.json()

            user_uuid = result.get("response", {}).get("uuid")
            logger.info(f"✓ Created user {username} with UUID: {user_uuid}")

            # Update user email
            self.update_user_email(user_uuid, email)

            return {
                "success": True,
                "data": result,
                "user_uuid": user_uuid,
                "username": username,
                "email": email,
            }
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to create user {email}: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg, "user_uuid": None}
        except Exception as e:
            error_msg = f"Unexpected error creating user {email}: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg, "user_uuid": None}

    def get_user_by_email(self, email: str) -> Dict[str, Any]:
        """Get user information by email"""
        try:
            # Try to get user by email or telegram ID
            response = requests.get(
                f"{self.base_url}/api/users",
                headers=self._get_headers(),
                params={"size": 100},
                timeout=30,
            )

            response.raise_for_status()
            data = response.json().get("response", {})
            users = data.get("users", [])

            # Find user by email in username or panel email field
            email_lower = email.strip().lower()
            email_base = email.split("@")[0]
            for user in users:
                username = user.get("username", "")
                panel_email = (user.get("email") or "").strip().lower()
                if panel_email == email_lower or (
                    email_base and email_base in username
                ):
                    return {
                        "success": True,
                        "data": user,
                        "user_uuid": user.get("uuid"),
                    }

            return {"success": False, "error": "User not found"}
        except Exception as e:
            logger.error(f"Failed to get user {email}: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_all_users_by_email(
        self, email: str, purchased_by_username: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        """Get ALL users (keys) for an email address"""
        purchased_by_username = purchased_by_username or {}
        try:
            # Get all users from Remnawave
            response = requests.get(
                f"{self.base_url}/api/users",
                headers=self._get_headers(),
                params={"size": 1000},
                timeout=30,
            )

            response.raise_for_status()
            data = response.json().get("response", {})
            users = data.get("users", [])

            # Find keys by username prefix or email field in panel
            email_lower = email.strip().lower()
            email_base = email.split("@")[0]
            matching_users = []

            for user in users:
                username = user.get("username", "")
                panel_email = (user.get("email") or "").strip().lower()
                if panel_email == email_lower or (
                    email_base and email_base in username
                ):
                    matching_users.append(
                        self._finalize_user_with_rollover(user, purchased_by_username)
                    )

            if matching_users:
                logger.info(f"✓ Found {len(matching_users)} keys for {email}")
                return {
                    "success": True,
                    "data": matching_users,
                    "count": len(matching_users),
                }
            else:
                return {
                    "success": True,
                    "data": [],
                    "count": 0,
                }

        except Exception as e:
            logger.error(f"Failed to get all users for {email}: {str(e)}")
            return {"success": False, "error": str(e), "data": [], "count": 0}

    @staticmethod
    def _normalize_users_list(payload: Any) -> list:
        """Приводит ответ Remnawave к списку пользователей."""
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            nested = payload.get("users")
            if isinstance(nested, list):
                return nested
            if payload.get("uuid") or payload.get("username"):
                return [payload]
        return []

    def _finalize_user_with_rollover(
        self, user: Dict[str, Any], purchased_by_username: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        purchased_by_username = purchased_by_username or {}
        username = user.get("username", "")
        purchased_bytes = int(purchased_by_username.get(username, 0) or 0)
        rollover = self.apply_monthly_traffic_rollover(user, purchased_bytes)
        if rollover.get("success") and rollover.get("data"):
            return rollover["data"]
        return user

    def get_users_by_telegram_id(
        self, telegram_id: int, purchased_by_username: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        """Ключ(и) из Telegram-бота по telegramId в панели Remnawave."""
        purchased_by_username = purchased_by_username or {}
        try:
            response = requests.get(
                f"{self.base_url}/api/users/by-telegram-id/{int(telegram_id)}",
                headers=self._get_headers(),
                timeout=30,
            )

            if response.status_code == 404:
                return {"success": True, "data": [], "count": 0}

            response.raise_for_status()
            payload = response.json().get("response", {})
            users = self._normalize_users_list(payload)

            matching_users = []
            for user in users:
                matching_users.append(
                    self._finalize_user_with_rollover(user, purchased_by_username)
                )

            if matching_users:
                logger.info(
                    f"✓ Found {len(matching_users)} Telegram key(s) for tg_id {telegram_id}"
                )
                return {
                    "success": True,
                    "data": matching_users,
                    "count": len(matching_users),
                }

            return {"success": True, "data": [], "count": 0}
        except Exception as e:
            logger.error(f"Failed to get users by telegram_id {telegram_id}: {e}")
            return {"success": False, "error": str(e), "data": [], "count": 0}

    def get_user_by_uuid(self, user_uuid: str) -> Dict[str, Any]:
        """Get user by UUID (прямой запрос к API)."""
        try:
            response = requests.get(
                f"{self.base_url}/api/users/{user_uuid}",
                headers=self._get_headers(),
                timeout=30,
            )
            if response.status_code == 404:
                return {"success": False, "error": "User not found"}
            response.raise_for_status()
            user = response.json().get("response", {})
            if not user:
                return {"success": False, "error": "User not found"}
            return {
                "success": True,
                "data": user,
                "user_uuid": user.get("uuid"),
            }
        except Exception as e:
            logger.error(f"Failed to get user by uuid {user_uuid}: {e}")
            return {"success": False, "error": str(e)}

    def get_user_by_username_direct(self, username: str) -> Dict[str, Any]:
        """Get user by exact username (прямой API, без перебора списка)."""
        try:
            from urllib.parse import quote

            safe_username = quote(username, safe="")
            response = requests.get(
                f"{self.base_url}/api/users/by-username/{safe_username}",
                headers=self._get_headers(),
                timeout=30,
            )
            if response.status_code == 404:
                return {"success": False, "error": "User not found"}
            response.raise_for_status()
            user = response.json().get("response", {})
            if not user:
                return {"success": False, "error": "User not found"}
            logger.info(f"Found user by username API: {username}")
            return {
                "success": True,
                "data": user,
                "user_uuid": user.get("uuid"),
            }
        except Exception as e:
            logger.error(f"Failed to get user by username {username}: {e}")
            return {"success": False, "error": str(e)}

    def resolve_user(
        self,
        username: Optional[str] = None,
        user_uuid: Optional[str] = None,
        telegram_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Найти пользователя: UUID → Telegram ID → username."""
        if user_uuid:
            by_uuid = self.get_user_by_uuid(user_uuid)
            if by_uuid.get("success"):
                return by_uuid

        if telegram_id:
            tg_result = self.get_users_by_telegram_id(int(telegram_id))
            if tg_result.get("success") and tg_result.get("data"):
                user = tg_result["data"][0]
                return {
                    "success": True,
                    "data": user,
                    "user_uuid": user.get("uuid"),
                }

        if username:
            direct = self.get_user_by_username_direct(username)
            if direct.get("success"):
                return direct
            return self.get_user_by_username(username)

        return {"success": False, "error": "User not found"}

    def get_user_by_username(self, username: str) -> Dict[str, Any]:
        """Get user information by exact username"""
        direct = self.get_user_by_username_direct(username)
        if direct.get("success"):
            return direct
        try:
            response = requests.get(
                f"{self.base_url}/api/users",
                headers=self._get_headers(),
                params={"size": 100},
                timeout=30,
            )

            response.raise_for_status()
            data = response.json().get("response", {})
            users = data.get("users", [])

            # Find user by exact username
            for user in users:
                if user.get("username", "") == username:
                    logger.info(f"Found user: {username}")
                    return {
                        "success": True,
                        "data": user,
                        "user_uuid": user.get("uuid"),
                    }

            logger.info(f"User not found: {username}")
            return {"success": False, "error": "User not found"}
        except Exception as e:
            logger.error(f"Failed to get user {username}: {str(e)}")
            return {"success": False, "error": str(e)}

    def update_user_email(self, user_uuid: str, email: str) -> Dict[str, Any]:
        """Update user email in Remnawave panel"""
        try:
            user_data = self.get_user_by_uuid(user_uuid)
            if not user_data.get("success"):
                return user_data

            user = user_data["data"]
            username = user.get("username")
            if not username:
                return {"success": False, "error": "Username missing"}

            payload = {
                "username": username,
                "email": email,
            }

            response = requests.patch(
                f"{self.base_url}/api/users",
                headers=self._get_headers(),
                json=payload,
                timeout=30,
            )

            response.raise_for_status()
            result = response.json()
            logger.info(f"✓ Updated email for user {username}: {email}")
            return {"success": True, "data": result, "username": username}
        except Exception as e:
            logger.error(f"Failed to update email for user {user_uuid}: {e}")
            return {"success": False, "error": str(e)}

    def sync_account_emails(
        self,
        old_email: str,
        new_email: str,
        telegram_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Обновить email во всех ключах аккаунта после смены почты на сайте."""
        keys_by_uuid: Dict[str, Dict[str, Any]] = {}

        by_email = self.get_all_users_by_email(old_email)
        for user in by_email.get("data") or []:
            uuid = user.get("uuid")
            if uuid:
                keys_by_uuid[uuid] = user

        if telegram_id:
            tg_result = self.get_users_by_telegram_id(int(telegram_id))
            for user in tg_result.get("data") or []:
                uuid = user.get("uuid")
                if uuid:
                    keys_by_uuid[uuid] = user

        if not keys_by_uuid:
            logger.info(f"No Remnawave keys to sync email {old_email} → {new_email}")
            return {
                "success": True,
                "updated": 0,
                "total": 0,
                "failed": [],
            }

        updated = 0
        failed = []
        for user_uuid in keys_by_uuid:
            result = self.update_user_email(user_uuid, new_email)
            if result.get("success"):
                updated += 1
            else:
                failed.append(
                    {
                        "uuid": user_uuid,
                        "username": keys_by_uuid[user_uuid].get("username"),
                        "error": result.get("error"),
                    }
                )

        logger.info(
            f"✓ Synced Remnawave email {old_email} → {new_email}: "
            f"{updated}/{len(keys_by_uuid)} keys"
        )
        return {
            "success": len(failed) == 0,
            "updated": updated,
            "total": len(keys_by_uuid),
            "failed": failed,
        }

    def _renew_user_record(
        self,
        user: Dict[str, Any],
        days: int,
        db_expire_iso: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Продление как в Telegram-боте: срок от max(БД, панель, сейчас) + перенос остатка трафика.
        """
        username = user.get("username")
        if not username:
            return {"success": False, "error": "Username missing in Remnawave user"}

        now = datetime.now()
        panel_expire = self._parse_dt(user.get("expireAt"))
        db_expire = self._parse_dt(db_expire_iso)
        base_expire = max((dt for dt in (db_expire, panel_expire, now) if dt is not None))
        new_expire = base_expire + timedelta(days=int(days))

        used_traffic = int(user.get("userTraffic", {}).get("usedTrafficBytes") or 0)
        rollover_leftover = max(0, self.BASE_LIMIT - used_traffic)
        if int(days) == 7:
            new_traffic_limit = self.WEEK_LIMIT + rollover_leftover
        else:
            new_traffic_limit = self.BASE_LIMIT + rollover_leftover

        payload = {
            "username": username,
            "trafficLimitBytes": new_traffic_limit,
            "expireAt": new_expire.isoformat(),
            "hwidDeviceLimit": int(user.get("hwidDeviceLimit") or 3),
            "trafficLimitStrategy": "MONTH_ROLLING",
            "activeInternalSquads": [self.PAID_SQUAD_ID],
        }
        if user.get("telegramId") is not None:
            payload["telegramId"] = user.get("telegramId")

        response = requests.patch(
            f"{self.base_url}/api/users",
            headers=self._get_headers(),
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        user_response = result.get("response", result)

        logger.info(
            f"✓ Renewed {username}: +{days}d → {new_expire.isoformat()}, "
            f"limit {round(new_traffic_limit / 1073741824, 2)} GB"
        )

        return {
            "success": True,
            "data": result,
            "username": username,
            "user_uuid": user.get("uuid") or user_response.get("uuid"),
            "expire_at": user_response.get("expireAt") or new_expire.isoformat(),
            "traffic_limit": new_traffic_limit,
            "used_traffic": used_traffic,
        }

    def create_user_telegram(
        self, telegram_id: int, days: int = 30, email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Создать или продлить ключ user_{telegram_id} (логика Telegram-бота)."""
        tg_id = int(telegram_id)
        existing = self.get_users_by_telegram_id(tg_id)
        if existing.get("success") and existing.get("data"):
            logger.info(f"Telegram user {tg_id} exists — renewing instead of create")
            return self._renew_user_record(existing["data"][0], days)

        expire_at = (datetime.now() + timedelta(days=int(days))).isoformat()
        username = f"user_{tg_id}"
        payload = {
            "username": username,
            "trafficLimitBytes": self.BASE_LIMIT,
            "expireAt": expire_at,
            "createdAt": datetime.now().isoformat(),
            "telegramId": tg_id,
            "trafficLimitStrategy": "MONTH_ROLLING",
            "hwidDeviceLimit": 3,
            "activeInternalSquads": [self.PAID_SQUAD_ID],
        }

        response = requests.post(
            f"{self.base_url}/api/users",
            headers=self._get_headers(),
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        user_uuid = result.get("response", {}).get("uuid")
        if email and user_uuid:
            self.update_user_email(user_uuid, email)

        return {
            "success": True,
            "data": result,
            "user_uuid": user_uuid,
            "username": username,
            "email": email,
        }

    def renew_by_telegram_id(
        self,
        telegram_id: int,
        days: int = 30,
        db_expire_iso: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Продлить подписку по Telegram ID."""
        try:
            tg_result = self.get_users_by_telegram_id(int(telegram_id))
            if not tg_result.get("success") or not tg_result.get("data"):
                return self.create_user_telegram(telegram_id, days)

            user = tg_result["data"][0]
            return self._renew_user_record(user, days, db_expire_iso)
        except Exception as e:
            logger.error(f"Failed to renew telegram {telegram_id}: {e}")
            return {"success": False, "error": str(e)}

    def renew_by_username(
        self,
        username: str,
        days: int = 30,
        db_expire_iso: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Renew subscription by exact Remnawave username."""
        try:
            user_data = self.get_user_by_username(username)
            if not user_data["success"]:
                return {"success": False, "error": f"Ключ {username} не найден"}

            result = self._renew_user_record(user_data["data"], days, db_expire_iso)
            return result
        except Exception as e:
            logger.error(f"Failed to renew {username}: {str(e)}")
            return {"success": False, "error": str(e)}

    def renew_subscription(
        self, email: str, key_number: int = 1, days: int = 30
    ) -> Dict[str, Any]:
        """Legacy renew by email + key number (only if username matches email_key)."""
        try:
            email_base = email.split("@")[0]
            username = f"{email_base}_{key_number}"

            user_data = self.get_user_by_username(username)
            if not user_data["success"]:
                logger.info(f"User {username} not found, creating new")
                return self.create_new_user(email, key_number, days)

            return self._renew_user_record(user_data["data"], days)
        except Exception as e:
            logger.error(f"Failed to renew subscription for {email}: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_traffic_by_username(self, username: str) -> Dict[str, Any]:
        """Traffic stats for a single key."""
        try:
            user_data = self.get_user_by_username(username)
            if not user_data["success"]:
                return {"success": False, "error": "User not found"}

            user = user_data["data"]
            traffic_limit = user.get("trafficLimitBytes", 0)
            used_traffic = user.get("userTraffic", {}).get("usedTrafficBytes", 0)
            leftover = max(0, traffic_limit - used_traffic)

            return {
                "success": True,
                "username": username,
                "traffic_limit": traffic_limit,
                "used_traffic": used_traffic,
                "leftover": leftover,
            }
        except Exception as e:
            logger.error(f"Failed to get traffic for {username}: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_leftover_bytes(self, email: str) -> Dict[str, Any]:
        """Get user traffic information"""
        try:
            user_data = self.get_user_by_email(email)
            if not user_data["success"]:
                return {"success": False, "error": "User not found"}

            user = user_data["data"]
            traffic_limit = user.get("trafficLimitBytes", 0)
            used_traffic = user.get("userTraffic", {}).get("usedTrafficBytes", 0)
            leftover = max(0, traffic_limit - used_traffic)

            return {
                "success": True,
                "traffic_limit": traffic_limit,
                "used_traffic": used_traffic,
                "leftover": leftover,
            }
        except Exception as e:
            logger.error(f"Failed to get traffic for {email}: {str(e)}")
            return {"success": False, "error": str(e)}

    def give_gb_by_username(self, username: str, gb_amount: float) -> Dict[str, Any]:
        """Разовое увеличение лимита трафика на ключе (до исчерпания)."""
        try:
            user_data = self.get_user_by_username(username)
            if not user_data["success"]:
                return {"success": False, "error": f"Ключ {username} не найден"}

            user = user_data["data"]
            bytes_amount = int(float(gb_amount) * 1073741824)
            traffic_limit = int(user.get("trafficLimitBytes") or 0)
            new_limit = traffic_limit + bytes_amount

            payload = {
                "username": username,
                "trafficLimitBytes": new_limit,
                "trafficLimitStrategy": user.get("trafficLimitStrategy", "MONTH_ROLLING"),
                "hwidDeviceLimit": user.get("hwidDeviceLimit", 3),
                "activeInternalSquads": [self.PAID_SQUAD_ID],
            }

            response = requests.patch(
                f"{self.base_url}/api/users",
                headers=self._get_headers(),
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()

            refreshed = self.get_user_by_username(username)
            logger.info(f"✓ Added {gb_amount} GB to {username} (limit {new_limit})")

            return {
                "success": True,
                "data": result,
                "username": username,
                "user_uuid": user.get("uuid"),
                "traffic_limit": new_limit,
                "added_bytes": bytes_amount,
                "user": refreshed.get("data") if refreshed.get("success") else user,
            }
        except Exception as e:
            logger.error(f"Failed to add GB to {username}: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_hwid_devices(self, user_uuid: str) -> Dict[str, Any]:
        """Список HWID-устройств, привязанных к ключу."""
        try:
            response = requests.get(
                f"{self.base_url}/api/hwid/devices/{user_uuid}",
                headers=self._get_headers(),
                timeout=30,
            )
            response.raise_for_status()
            payload = response.json().get("response", {})
            devices = payload.get("devices") or []
            mapped = []
            for device in devices:
                mapped.append(
                    {
                        "hwid": device.get("hwid"),
                        "platform": device.get("platform"),
                        "osVersion": device.get("osVersion"),
                        "deviceModel": device.get("deviceModel"),
                        "userAgent": device.get("userAgent"),
                        "requestIp": device.get("requestIp"),
                        "createdAt": device.get("createdAt"),
                        "updatedAt": device.get("updatedAt"),
                    }
                )
            return {
                "success": True,
                "devices": mapped,
                "total": int(payload.get("total") or len(mapped)),
            }
        except Exception as e:
            logger.error(f"Failed to list HWID devices for {user_uuid}: {e}")
            return {"success": False, "error": str(e), "devices": [], "total": 0}

    def delete_hwid_device(self, user_uuid: str, hwid: str) -> Dict[str, Any]:
        """Удалить одно HWID-устройство (освободить слот)."""
        try:
            response = requests.post(
                f"{self.base_url}/api/hwid/devices/delete",
                headers=self._get_headers(),
                json={"userUuid": user_uuid, "hwid": hwid},
                timeout=30,
            )
            response.raise_for_status()
            logger.info(f"✓ Deleted HWID device for {user_uuid}: {hwid[:16]}…")
            return {"success": True, "hwid": hwid}
        except Exception as e:
            logger.error(f"Failed to delete HWID {hwid} for {user_uuid}: {e}")
            return {"success": False, "error": str(e)}

    def get_hwid_devices_for_key(
        self,
        username: Optional[str] = None,
        user_uuid: Optional[str] = None,
        telegram_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        user_data = self.resolve_user(username, user_uuid, telegram_id)
        if not user_data.get("success"):
            return user_data
        resolved_uuid = user_data.get("user_uuid") or user_data["data"].get("uuid")
        if not resolved_uuid:
            return {"success": False, "error": "UUID ключа не найден"}
        result = self.get_hwid_devices(resolved_uuid)
        if result.get("success"):
            result["user_uuid"] = resolved_uuid
            result["hwid_device_limit"] = int(
                user_data["data"].get("hwidDeviceLimit") or 3
            )
        return result

    def get_hwid_devices_by_username(self, username: str) -> Dict[str, Any]:
        return self.get_hwid_devices_for_key(username=username)

    def delete_hwid_device_for_key(
        self,
        hwid: str,
        username: Optional[str] = None,
        user_uuid: Optional[str] = None,
        telegram_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        user_data = self.resolve_user(username, user_uuid, telegram_id)
        if not user_data.get("success"):
            return user_data
        resolved_uuid = user_data.get("user_uuid") or user_data["data"].get("uuid")
        if not resolved_uuid:
            return {"success": False, "error": "UUID ключа не найден"}
        return self.delete_hwid_device(resolved_uuid, hwid)

    def delete_hwid_device_by_username(self, username: str, hwid: str) -> Dict[str, Any]:
        return self.delete_hwid_device_for_key(hwid, username=username)

    def give_gb(self, email: str, gb_amount: float) -> Dict[str, Any]:
        """Add traffic to user by email (first matching key)."""
        try:
            user_data = self.get_user_by_email(email)
            if not user_data["success"]:
                return {"success": False, "error": "User not found"}
            return self.give_gb_by_username(user_data["data"].get("username"), gb_amount)
        except Exception as e:
            logger.error(f"Failed to add GB to {email}: {str(e)}")
            return {"success": False, "error": str(e)}


def main():
    """CLI interface for testing"""
    if len(sys.argv) < 2:
        print("Usage: python remnawave_integration.py <command> [args...]")
        print("Commands:")
        print("  create <email> [key_number] [days]  - Create new user")
        print("  renew <email> [key_number] [days]   - Renew subscription (legacy)")
        print("  renew-user <username> [days]        - Renew by Remnawave username")
        print("  traffic <email>                      - Get traffic info")
        print("  traffic-user <username>              - Traffic by username")
        print("  rollover-user <username>             - Apply monthly traffic rollover")
        print("  add-gb <email> <gb_amount>          - Add GB by email")
        print("  add-gb-user <username> <gb_amount>  - Add GB by username")
        print("  hwid-list <username>                 - List HWID devices")
        print("  hwid-delete <username> <hwid>        - Delete HWID device")
        print("  sync-emails <old_email> <new_email> [telegram_id]")
        sys.exit(1)

    command = sys.argv[1]

    try:
        api = RemnawaveAPI()

        if command == "create":
            email = sys.argv[2]
            key_number = (
                int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 1
            )
            # Check if 4th arg is days or if 3rd arg contains days
            if len(sys.argv) > 4:
                days = int(sys.argv[4])
            elif len(sys.argv) > 3 and not sys.argv[3].isdigit():
                days = int(sys.argv[3])
            else:
                days = 30
            result = api.create_new_user(email, key_number, days)

        elif command == "renew":
            email = sys.argv[2]
            key_number = (
                int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 1
            )
            if len(sys.argv) > 4:
                days = int(sys.argv[4])
            elif len(sys.argv) > 3 and not sys.argv[3].isdigit():
                days = int(sys.argv[3])
            else:
                days = 30
            result = api.renew_subscription(email, key_number, days)

        elif command == "renew-user":
            username = sys.argv[2]
            days = int(sys.argv[3]) if len(sys.argv) > 3 else 30
            db_expire = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None
            result = api.renew_by_username(username, days, db_expire)

        elif command == "create-telegram":
            tg_id = int(sys.argv[2])
            days = int(sys.argv[3]) if len(sys.argv) > 3 else 30
            email = sys.argv[4] if len(sys.argv) > 4 else None
            result = api.create_user_telegram(tg_id, days, email)

        elif command == "renew-telegram":
            tg_id = int(sys.argv[2])
            days = int(sys.argv[3]) if len(sys.argv) > 3 else 30
            db_expire = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None
            result = api.renew_by_telegram_id(tg_id, days, db_expire)

        elif command == "traffic":
            email = sys.argv[2]
            result = api.get_leftover_bytes(email)

        elif command == "traffic-user":
            username = sys.argv[2]
            result = api.get_traffic_by_username(username)

        elif command == "rollover-user":
            username = sys.argv[2]
            purchased_bytes = int(sys.argv[3]) if len(sys.argv) > 3 else 0
            user_data = api.get_user_by_username(username)
            if not user_data["success"]:
                result = user_data
            else:
                result = api.apply_monthly_traffic_rollover(
                    user_data["data"], purchased_bytes
                )

        elif command == "add-gb":
            email = sys.argv[2]
            gb_amount = float(sys.argv[3])
            result = api.give_gb(email, gb_amount)

        elif command == "add-gb-user":
            username = sys.argv[2]
            gb_amount = float(sys.argv[3])
            result = api.give_gb_by_username(username, gb_amount)

        elif command == "hwid-list":
            username = sys.argv[2] if len(sys.argv) > 2 else ""
            user_uuid = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
            telegram_id = (
                int(sys.argv[4])
                if len(sys.argv) > 4 and sys.argv[4] and str(sys.argv[4]).isdigit()
                else None
            )
            result = api.get_hwid_devices_for_key(
                username=username or None,
                user_uuid=user_uuid,
                telegram_id=telegram_id,
            )

        elif command == "hwid-delete":
            username = sys.argv[2] if len(sys.argv) > 2 else ""
            hwid = sys.argv[3] if len(sys.argv) > 3 else ""
            user_uuid = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None
            telegram_id = (
                int(sys.argv[5])
                if len(sys.argv) > 5 and sys.argv[5] and str(sys.argv[5]).isdigit()
                else None
            )
            result = api.delete_hwid_device_for_key(
                hwid,
                username=username or None,
                user_uuid=user_uuid,
                telegram_id=telegram_id,
            )

        elif command == "get-user":
            email = sys.argv[2]
            user_data = api.get_user_by_email(email)
            if user_data["success"]:
                result = {"success": True, "data": user_data["data"]}
            else:
                result = user_data

        elif command == "get-all-users":
            email = sys.argv[2]
            purchased_map: Dict[str, int] = {}
            if len(sys.argv) > 3 and sys.argv[3]:
                map_path = sys.argv[3]
                if os.path.isfile(map_path):
                    with open(map_path, encoding="utf-8") as f:
                        purchased_map = json.load(f)
            users_data = api.get_all_users_by_email(email, purchased_map)
            result = users_data

        elif command == "get-by-telegram-id":
            telegram_id = int(sys.argv[2])
            purchased_map: Dict[str, int] = {}
            if len(sys.argv) > 3 and sys.argv[3]:
                map_path = sys.argv[3]
                if os.path.isfile(map_path):
                    with open(map_path, encoding="utf-8") as f:
                        purchased_map = json.load(f)
            result = api.get_users_by_telegram_id(telegram_id, purchased_map)

        elif command == "sync-emails":
            old_email = sys.argv[2]
            new_email = sys.argv[3]
            telegram_id = (
                int(sys.argv[4])
                if len(sys.argv) > 4 and sys.argv[4] and str(sys.argv[4]).isdigit()
                else None
            )
            result = api.sync_account_emails(old_email, new_email, telegram_id)

        else:
            print(f"Unknown command: {command}")
            sys.exit(1)

        print(json.dumps(result, indent=2))
        sys.exit(0 if result.get("success") else 1)

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
