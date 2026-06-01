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

            # Find user by email in username
            for user in users:
                if email.split("@")[0] in user.get("username", ""):
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

            # Find all users with this email in username
            email_base = email.split("@")[0]
            matching_users = []

            for user in users:
                username = user.get("username", "")
                if email_base in username:
                    purchased_bytes = int(purchased_by_username.get(username, 0) or 0)
                    rollover = self.apply_monthly_traffic_rollover(user, purchased_bytes)
                    if rollover.get("success") and rollover.get("data"):
                        matching_users.append(rollover["data"])
                    else:
                        matching_users.append(user)

            if matching_users:
                logger.info(f"✓ Found {len(matching_users)} keys for {email}")
                return {
                    "success": True,
                    "data": matching_users,
                    "count": len(matching_users),
                }
            else:
                return {
                    "success": False,
                    "error": "No keys found",
                    "data": [],
                    "count": 0,
                }

        except Exception as e:
            logger.error(f"Failed to get all users for {email}: {str(e)}")
            return {"success": False, "error": str(e), "data": [], "count": 0}

    def get_user_by_username(self, username: str) -> Dict[str, Any]:
        """Get user information by exact username"""
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
            # Get user first to find username
            response = requests.get(
                f"{self.base_url}/api/users",
                headers=self._get_headers(),
                params={"size": 100},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json().get("response", {})
            users = data.get("users", [])

            # Find user by UUID
            user = None
            for u in users:
                if u.get("uuid") == user_uuid:
                    user = u
                    break

            if not user:
                logger.error(f"User with UUID {user_uuid} not found")
                return {"success": False, "error": "User not found"}

            username = user.get("username")

            # Update email
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
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Failed to update email for user {user_uuid}: {str(e)}")
            return {"success": False, "error": str(e)}

    def _renew_user_record(self, user: Dict[str, Any], days: int) -> Dict[str, Any]:
        """Extend subscription for an existing Remnawave user."""
        username = user.get("username")
        if not username:
            return {"success": False, "error": "Username missing in Remnawave user"}

        current_expire = user.get("expireAt")
        if current_expire:
            expire_dt = datetime.fromisoformat(current_expire.replace("Z", "+00:00"))
            if expire_dt.tzinfo:
                expire_dt = expire_dt.astimezone().replace(tzinfo=None)
            base_date = max(expire_dt, datetime.now())
        else:
            base_date = datetime.now()

        new_expire = base_date + timedelta(days=int(days))

        # Продление только продлевает срок; перенос трафика — отдельно в apply_monthly_traffic_rollover.
        traffic_limit = int(user.get("trafficLimitBytes") or self.BASE_LIMIT)
        used_traffic = int(user.get("userTraffic", {}).get("usedTrafficBytes") or 0)

        payload = {
            "username": username,
            "expireAt": new_expire.isoformat(),
            "hwidDeviceLimit": user.get("hwidDeviceLimit", 3),
            "trafficLimitStrategy": "MONTH_ROLLING",
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
        user_response = result.get("response", result)

        return {
            "success": True,
            "data": result,
            "username": username,
            "user_uuid": user.get("uuid") or user_response.get("uuid"),
            "expire_at": user_response.get("expireAt") or new_expire.isoformat(),
            "traffic_limit": traffic_limit,
            "used_traffic": used_traffic,
        }

    def renew_by_username(self, username: str, days: int = 30) -> Dict[str, Any]:
        """Renew subscription by exact Remnawave username."""
        try:
            user_data = self.get_user_by_username(username)
            if not user_data["success"]:
                return {"success": False, "error": f"Ключ {username} не найден в Remnawave"}

            result = self._renew_user_record(user_data["data"], days)
            if result["success"]:
                logger.info(f"✓ Renewed subscription for {username} (+{days} days)")
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
            result = api.renew_by_username(username, days)

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
