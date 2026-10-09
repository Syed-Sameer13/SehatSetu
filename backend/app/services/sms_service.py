import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("sehatsetu.sms")


class SMSService:
    """
    Patient SMS and WhatsApp Notification Service for SehatSetu.
    Handles automated dispatch of tokens, wait times, department details, and emergency calls.
    """

    def send_intake_sms(
        self,
        patient_name: str,
        phone_number: Optional[str],
        uhid: str,
        department_name: str,
        queue_position: int,
        estimated_wait_minutes: int,
    ) -> Dict[str, Any]:
        phone = phone_number or "+91-9876543210"
        message = (
            f"[SehatSetu] Dear {patient_name}, your token #{uhid} for {department_name} is registered. "
            f"Live Queue Position: #{queue_position}. Estimated Wait: ~{estimated_wait_minutes} mins. "
            f"Live Token Slip: http://localhost:5173/tracker?uhid={uhid}"
        )
        
        sms_record = {
            "recipient_phone": phone,
            "patient_name": patient_name,
            "uhid": uhid,
            "department": department_name,
            "queue_position": queue_position,
            "estimated_wait_minutes": estimated_wait_minutes,
            "message": message,
            "status": "DELIVERED",
            "gateway": "SMS_GATEWAY_SIMULATOR",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        logger.info(f"⚡ [SMS SENT TO {phone}] {message}")
        print(f"\n==========================================")
        print(f"📱 [PATIENT SMS DISPATCHED]")
        print(f"To: {phone} ({patient_name})")
        print(f"Message: {message}")
        print(f"==========================================\n")
        
        return sms_record

    def send_call_sms(
        self,
        patient_name: str,
        phone_number: Optional[str],
        uhid: str,
        department_name: str,
        room_name: str,
    ) -> Dict[str, Any]:
        phone = phone_number or "+91-9876543210"
        message = (
            f"[SehatSetu Alert] Dear {patient_name}, your token #{uhid} has been CALLED to "
            f"{department_name} ({room_name}). Please proceed immediately to the consultation room!"
        )

        sms_record = {
            "recipient_phone": phone,
            "patient_name": patient_name,
            "uhid": uhid,
            "department": department_name,
            "room": room_name,
            "message": message,
            "status": "DELIVERED",
            "gateway": "SMS_GATEWAY_SIMULATOR",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        logger.info(f"🚨 [CALL SMS SENT TO {phone}] {message}")
        print(f"\n==========================================")
        print(f"🚨 [PATIENT CALL SMS DISPATCHED]")
        print(f"To: {phone} ({patient_name})")
        print(f"Message: {message}")
        print(f"==========================================\n")

        return sms_record


sms_service = SMSService()
