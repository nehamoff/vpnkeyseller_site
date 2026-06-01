#!/usr/bin/env python3
"""
YooKassa Payment Integration Module
Handles payment creation and payment status checks via official SDK.
"""

import os
import sys
import json
import logging
import uuid
from typing import Optional, Dict, Any
from dotenv import load_dotenv

script_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(script_dir, ".env"))
load_dotenv(os.path.join(script_dir, "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="[YOOKASSA] %(levelname)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger(__name__)


def _iso_datetime(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


try:
    from yookassa import Configuration, Payment

    YOOKASSA_AVAILABLE = True
except ImportError:
    logger.warning("YooKassa SDK not installed. Install with: pip install yookassa")
    YOOKASSA_AVAILABLE = False


def _format_amount(amount: float) -> str:
    return f"{amount:.2f}"


class YooKassaAPI:
    """YooKassa Payment API client"""

    def __init__(self):
        self.account_id = os.getenv("YOOKASSA_ACCOUNT_ID")
        self.secret_key = os.getenv("YOOKASSA_SECRET_KEY")
        self.return_url = (
            os.getenv("YOOKASSA_RETURN_URL")
            or os.getenv("FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")
            + "/my-keys"
        )

        if not self.account_id or not self.secret_key:
            logger.error("YOOKASSA_ACCOUNT_ID or YOOKASSA_SECRET_KEY not set in .env")
            raise ValueError("Missing YooKassa credentials in environment")

        if not YOOKASSA_AVAILABLE:
            raise RuntimeError("YooKassa SDK is not available")

        Configuration.configure(self.account_id, self.secret_key)
        logger.info(f"YooKassa configured for account: {self.account_id[:10]}...")

    def create_payment(
        self,
        amount: float = 1.0,
        description: str = "VPN Key Purchase",
        order_id: Optional[str] = None,
        customer_email: Optional[str] = None,
        return_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a redirect payment with embedded fiscal receipt (54-FZ)."""
        try:
            amount_str = _format_amount(amount)
            logger.info(f"Creating payment: {amount_str} RUB for order {order_id}")

            payment_data = {
                "amount": {"value": amount_str, "currency": "RUB"},
                "description": description,
                "confirmation": {
                    "type": "redirect",
                    "return_url": return_url or self.return_url,
                },
                "capture": True,
                "metadata": {"order_id": order_id} if order_id else {},
            }

            if customer_email:
                payment_data["receipt"] = {
                    "customer": {"email": customer_email},
                    "items": [
                        {
                            "description": description[:128],
                            "quantity": "1.00",
                            "amount": {"value": amount_str, "currency": "RUB"},
                            "vat_code": 1,
                            "payment_mode": "full_payment",
                            "payment_subject": "service",
                        }
                    ],
                }

            response = Payment.create(payment_data, str(uuid.uuid4()))

            confirmation_url = None
            if response.confirmation:
                confirmation_url = response.confirmation.confirmation_url

            logger.info(f"Payment created: {response.id} ({response.status})")

            return {
                "success": True,
                "payment_id": response.id,
                "confirmation_url": confirmation_url,
                "status": response.status,
                "amount": float(response.amount.value),
                "data": {
                    "id": response.id,
                    "status": response.status,
                    "amount": str(response.amount.value),
                    "currency": response.amount.currency,
                    "description": response.description,
                    "created_at": _iso_datetime(response.created_at),
                    "confirmation_url": confirmation_url,
                    "test": response.test,
                    "paid": response.paid,
                },
            }

        except Exception as e:
            error_msg = f"Failed to create payment: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Get payment status by payment ID."""
        try:
            logger.info(f"Checking payment status: {payment_id}")

            response = Payment.find_one(payment_id)

            confirmation_url = None
            if response.confirmation:
                confirmation_url = response.confirmation.confirmation_url

            logger.info(f"Payment status: {response.status}, paid={response.paid}")

            return {
                "success": True,
                "payment_id": payment_id,
                "status": response.status,
                "paid": response.paid,
                "amount": float(response.amount.value),
                "data": {
                    "id": response.id,
                    "status": response.status,
                    "amount": str(response.amount.value),
                    "currency": response.amount.currency,
                    "description": response.description,
                    "created_at": _iso_datetime(response.created_at),
                    "confirmation_url": confirmation_url,
                    "paid": response.paid,
                    "test": response.test,
                },
            }

        except Exception as e:
            error_msg = f"Failed to get payment status: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def cancel_payment(self, payment_id: str) -> Dict[str, Any]:
        """Cancel a payment waiting for capture."""
        try:
            logger.info(f"Cancelling payment: {payment_id}")

            response = Payment.cancel(payment_id)

            logger.info(f"Payment cancelled: {payment_id}")

            return {
                "success": True,
                "payment_id": payment_id,
                "status": response.status,
                "data": {"id": response.id, "status": response.status},
            }

        except Exception as e:
            error_msg = f"Failed to cancel payment: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}


def main():
    """CLI interface for testing"""
    if len(sys.argv) < 2:
        print("Usage: python yookassa_integration.py <command> [args...]")
        print("Commands:")
        print("  create <order_id> <email> [amount]  - Create payment")
        print("  status <payment_id>                 - Get payment status")
        print("  cancel <payment_id>                 - Cancel payment")
        sys.exit(1)

    try:
        api = YooKassaAPI()
        command = sys.argv[1]
        result = {}

        if command == "create":
            order_id = sys.argv[2] if len(sys.argv) > 2 else "test-order"
            email = sys.argv[3] if len(sys.argv) > 3 else None
            amount = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
            return_url = sys.argv[5] if len(sys.argv) > 5 else None
            result = api.create_payment(
                amount,
                description=f"VPN: {order_id}",
                order_id=order_id,
                customer_email=email,
                return_url=return_url,
            )

        elif command == "status":
            payment_id = sys.argv[2]
            result = api.get_payment_status(payment_id)

        elif command == "cancel":
            payment_id = sys.argv[2]
            result = api.cancel_payment(payment_id)

        else:
            print(f"Unknown command: {command}")
            sys.exit(1)

        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0 if result.get("success") else 1)

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, indent=2, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
