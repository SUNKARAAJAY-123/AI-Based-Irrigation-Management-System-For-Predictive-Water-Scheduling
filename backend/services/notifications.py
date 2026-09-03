import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from database import models
from backend.utils.config import settings
from backend.services import sarvam_ai

logger = logging.getLogger("NotificationService")

# Optional third-party imports with soft fail
HAS_WEBPUSH = False
try:
    from pywebpush import webpush, WebPushException
    HAS_WEBPUSH = True
except ImportError:
    pass

HAS_TWILIO = False
try:
    from twilio.rest import Client as TwilioClient
    HAS_TWILIO = True
except ImportError:
    pass

HAS_SENDGRID = False
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail as SendGridMail
    HAS_SENDGRID = True
except ImportError:
    pass

def init_user_preferences(db: Session, user_id: str):
    """Initializes default notification preferences if they do not exist."""
    existing = db.query(models.NotificationPreference).filter(
        models.NotificationPreference.user_id == user_id
    ).all()
    if not existing:
        for channel in ["in_app", "web_push", "sms", "email"]:
            pref = models.NotificationPreference(
                user_id=user_id,
                channel=channel,
                enabled=True
            )
            db.add(pref)
        db.commit()

async def create_notification_log(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    category: str,
    channel: str,
    language: str,
    field_id: Optional[str] = None,
    severity: Optional[str] = None,
    recommended_action: Optional[str] = None,
    notification_type: Optional[str] = None,
    alert_id: Optional[str] = None,
    notification_metadata: Optional[dict] = None
) -> Optional[models.NotificationLog]:
    """Saves a notification record to the database for tracking and display."""
    try:
        # Find user's farm
        farm = db.query(models.Farm).filter(models.Farm.user_id == user_id).first()
        if not farm:
            farm = db.query(models.Farm).first()
        
        if not farm:
            logger.warning(f"Could not find any farm to attach notification for user {user_id}")
            return None

        new_log = models.NotificationLog(
            farm_id=farm.id,
            farmer_id=user_id,
            field_id=field_id,
            title=title,
            message=message,
            category=category,
            severity=severity,
            recommended_action=recommended_action,
            notification_type=notification_type,
            alert_id=alert_id,
            channel=channel,
            language=language,
            sent_at=datetime.now(timezone.utc),
            notification_metadata=notification_metadata,
            is_read=False
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        return new_log
    except Exception as e:
        logger.error(f"Failed to create notification log for user {user_id}: {e}")
        return None

async def send_in_app(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    category: str,
    field_id: Optional[str] = None,
    severity: Optional[str] = None,
    recommended_action: Optional[str] = None,
    notification_type: Optional[str] = None,
    notification_metadata: Optional[dict] = None,
    alert_id: Optional[str] = None,
    language: Optional[str] = "en-IN"
) -> bool:
    """Delivers in-app notification by writing to the NotificationLog table."""
    log = await create_notification_log(
        db=db,
        user_id=user_id,
        title=title,
        message=message,
        category=category,
        channel="in_app",
        language=language,
        field_id=field_id,
        severity=severity,
        recommended_action=recommended_action,
        notification_type=notification_type,
        alert_id=alert_id,
        notification_metadata=notification_metadata
    )
    return log is not None

async def send_web_push(db: Session, user_id: str, title: str, message: str, field_id: Optional[str] = None) -> bool:
    """Delivers Web Push notification to user browser subscriptions using pywebpush."""
    subscriptions = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == user_id
    ).all()
    
    if not subscriptions:
        logger.info(f"No web push subscriptions found for user {user_id}")
        return False

    success = False
    payload = {
        "notification": {
            "title": title,
            "body": message,
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/icon-192x192.png",
            "data": {
                "url": f"/fields/{field_id}" if field_id else "/dashboard"
            }
        }
    }

    for sub in subscriptions:
        if HAS_WEBPUSH and settings.VAPID_PRIVATE_KEY and settings.VAPID_PUBLIC_KEY:
            try:
                subscription_info = {
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                }
                webpush(
                    subscription_info=subscription_info,
                    data=json.dumps(payload),
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIM_EMAIL}"},
                    timeout=5
                )
                logger.info(f"Web Push sent successfully to subscription {sub.id}")
                success = True
            except WebPushException as ex:
                logger.error(f"Web Push failed for subscription {sub.id}: {ex}")
                # Remove expired subscription
                if ex.response and ex.response.status_code in [404, 410]:
                    db.delete(sub)
                    db.commit()
            except Exception as e:
                logger.error(f"Unexpected error during web push to subscription {sub.id}: {e}")
        else:
            # Mock Web Push
            logger.info(f"[Mock Web Push] Sent to user {user_id} subscription {sub.id}: {title} - {message}")
            success = True
            
    return success

async def send_sms(user: models.User, message: str) -> bool:
    """Delivers SMS using Twilio."""
    phone = user.phone_number
    if not phone:
        logger.info(f"User {user.id} has no phone number configured for SMS.")
        return False

    if HAS_TWILIO and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
        try:
            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone
            )
            logger.info(f"SMS sent successfully via Twilio to {phone}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS via Twilio: {e}")
            return False
    else:
        # Mock SMS Delivery
        logger.info(f"[Mock SMS] Sent to {phone}: {message}")
        return True

async def send_email(user: models.User, title: str, message: str) -> bool:
    """Delivers email using SendGrid."""
    email = user.email
    if not email:
        return False

    if HAS_SENDGRID and settings.SENDGRID_API_KEY and settings.SENDGRID_FROM_EMAIL:
        try:
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            mail = SendGridMail(
                from_email=settings.SENDGRID_FROM_EMAIL,
                to_emails=email,
                subject=title,
                plain_text_content=message
            )
            sg.send(mail)
            logger.info(f"Email sent successfully via SendGrid to {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SendGrid: {e}")
            return False
    else:
        # Mock Email Delivery
        logger.info(f"[Mock Email] Sent to {email}: {title} - {message}")
        return True

async def dispatch_alert_notifications(db: Session, alert_event: models.AlertEvent, stats: Optional[Dict[str, int]] = None):
    """
    Core notification router. Routes a newly created alert event
    to the farmer (Web Push / SMS) and supervisors (Email), plus In-app.
    """
    field = alert_event.field
    farm = field.farm
    farmer = farm.owner  # The User entity who owns the farm

    # Ensure preferences are initialized
    init_user_preferences(db, farmer.id)

    # 1. Cooldown Check (Anti-Spam)
    # Check if a notification of the same type was already sent for the same field within the cooldown period
    sev_upper = alert_event.severity.upper()
    if sev_upper == "CRITICAL":
        cooldown_minutes = getattr(settings, "COOLDOWN_CRITICAL_MINUTES", 30)
    elif sev_upper == "WARNING":
        cooldown_minutes = getattr(settings, "COOLDOWN_WARNING_MINUTES", 120)
    else: # INFO or INFORMATION
        cooldown_minutes = getattr(settings, "COOLDOWN_INFO_MINUTES", 1440)

    cooldown_period = timedelta(minutes=cooldown_minutes)

    if field.id and alert_event.alert_type:
        last_notif = db.query(models.NotificationLog).filter(
            models.NotificationLog.field_id == field.id,
            models.NotificationLog.notification_type == alert_event.alert_type
        ).order_by(models.NotificationLog.created_at.desc()).first()

        if last_notif:
            time_since_last = datetime.now(timezone.utc) - last_notif.created_at.replace(tzinfo=timezone.utc)
            if time_since_last < cooldown_period:
                logger.info(f"Skipping duplicate alert notification for {alert_event.alert_type} on field {field.id} (Cooldown active: {time_since_last} elapsed, configured: {cooldown_minutes} mins)")
                if stats is not None:
                    stats["duplicates_skipped"] += 1
                return

    # 2. Quiet Hours & Critical Alert Filter Check
    is_critical = alert_event.severity == "CRITICAL"
    mute_external = False

    if not is_critical:
        if farmer.critical_alerts_only:
            logger.info(f"Muting external notifications for non-critical alert because critical_alerts_only is enabled")
            mute_external = True
        elif farmer.quiet_hours_start and farmer.quiet_hours_end:
            try:
                # Calculate current time in Indian Standard Time (IST, UTC+5:30) for quiet hours check
                utc_now = datetime.now(timezone.utc)
                ist_now = utc_now + timedelta(hours=5, minutes=30)
                current_time_str = ist_now.strftime("%H:%M")

                start_h, start_m = map(int, farmer.quiet_hours_start.split(":"))
                end_h, end_m = map(int, farmer.quiet_hours_end.split(":"))
                curr_h, curr_m = ist_now.hour, ist_now.minute

                in_quiet_hours = False
                if start_h > end_h:
                    if curr_h >= start_h or curr_h < end_h:
                        in_quiet_hours = True
                    elif curr_h == end_h and curr_m < end_m:
                        in_quiet_hours = True
                else:
                    if start_h <= curr_h < end_h:
                        in_quiet_hours = True
                    elif curr_h == end_h and curr_m < end_m:
                        in_quiet_hours = True

                if in_quiet_hours:
                    logger.info(f"Muting external notifications because current time ({current_time_str}) is within quiet hours ({farmer.quiet_hours_start} - {farmer.quiet_hours_end})")
                    mute_external = True
            except Exception as ex:
                logger.error(f"Error checking quiet hours: {ex}")
                if stats is not None:
                    stats["errors"] += 1

    # 3. Message translation with Sarvam AI
    pref_lang = farmer.preferred_language or "en-IN"
    
    # Map friendly languages to standard language codes supported by Sarvam AI
    lang_map = {
        "english": "en-IN", "en": "en-IN", "en-in": "en-IN",
        "hindi": "hi-IN", "hi": "hi-IN", "hi-in": "hi-IN",
        "telugu": "te-IN", "te": "te-IN", "te-in": "te-IN",
        "kannada": "kn-IN", "kn": "kn-IN", "kn-in": "kn-IN",
        "tamil": "ta-IN", "ta": "ta-IN", "ta-in": "ta-IN",
        "malayalam": "ml-IN", "ml": "ml-IN", "ml-in": "ml-IN",
        "marathi": "mr-IN", "mr": "mr-IN", "mr-in": "mr-IN",
        "bengali": "bn-IN", "bn": "bn-IN", "bn-in": "bn-IN",
        "gujarati": "gu-IN", "gu": "gu-IN", "gu-in": "gu-IN",
        "punjabi": "pa-IN", "pa": "pa-IN", "pa-in": "pa-IN",
        "odia": "or-IN", "or": "or-IN", "or-in": "or-IN",
        "assamese": "as-IN", "as": "as-IN", "as-in": "as-IN",
        "urdu": "ur-IN", "ur": "ur-IN", "ur-in": "ur-IN"
    }
    pref_lang = lang_map.get(pref_lang.lower().strip(), pref_lang)

    raw_title = f"{alert_event.severity} Alert: {alert_event.alert_type.replace('_', ' ').title()}"
    raw_message = f"Field: {field.name}. Crop: {field.crops[0].name if field.crops else 'Unknown'}.\n{alert_event.message}\nAction: {alert_event.recommended_action or 'Monitor status'}"
    raw_action = alert_event.recommended_action or "Monitor status"

    title = raw_title
    message = raw_message
    action = raw_action

    if pref_lang != "en-IN":
        try:
            title = await sarvam_ai.translate_text(raw_title, "en-IN", pref_lang)
            message = await sarvam_ai.translate_text(raw_message, "en-IN", pref_lang)
            if alert_event.recommended_action:
                action = await sarvam_ai.translate_text(raw_action, "en-IN", pref_lang)
        except Exception as e:
            logger.error(f"Sarvam AI translation failed for alert {alert_event.id}: {e}")
            if stats is not None:
                stats["errors"] += 1

    # Log in NotificationDeliveryLog helper
    def log_delivery(channel: str, status: str, err: str = None):
        delivery_log = models.NotificationDeliveryLog(
            alert_event_id=alert_event.id,
            user_id=farmer.id,
            channel=channel,
            status=status,
            error_message=err
        )
        db.add(delivery_log)
        db.commit()

    # Check farmer preferences
    farmer_prefs = {
        p.channel: p.enabled for p in db.query(models.NotificationPreference).filter(
            models.NotificationPreference.user_id == farmer.id
        ).all()
    }

    # Deliver In-App
    if farmer_prefs.get("in_app", True):
        ok = await send_in_app(
            db=db,
            user_id=farmer.id,
            title=title,
            message=message,
            category=alert_event.severity.lower(),
            field_id=field.id,
            severity=alert_event.severity,
            recommended_action=action,
            notification_type=alert_event.alert_type,
            alert_id=alert_event.id,
            language=pref_lang,
            notification_metadata={
                "field_id": field.id,
                "alert_event_id": alert_event.id,
                "type": alert_event.alert_type
            }
        )
        if ok and stats is not None:
            stats["notifications_sent"] += 1
        log_delivery("in_app", "sent" if ok else "failed")

    # Deliver Web Push
    push_sent = False
    if farmer_prefs.get("web_push", True) and not mute_external:
        push_sent = await send_web_push(db, farmer.id, title, message, field_id=field.id)
        if push_sent:
            await create_notification_log(
                db=db, user_id=farmer.id, title=title, message=message, category=alert_event.severity.lower(),
                channel="web_push", language=pref_lang, field_id=field.id, severity=alert_event.severity,
                recommended_action=action, notification_type=alert_event.alert_type, alert_id=alert_event.id
            )
            if stats is not None:
                stats["notifications_sent"] += 1
        log_delivery("web_push", "sent" if push_sent else "failed")
    elif mute_external:
        log_delivery("web_push", "muted")

    # Deliver SMS with fallback
    # Critical messages get SMS delivered (if preference is checked), or if sms_always is active
    is_critical_alert = (alert_event.severity == "CRITICAL")
    if farmer_prefs.get("sms", True) and not mute_external and (is_critical_alert or farmer_prefs.get("sms_always", False)):
        sms_ok = await send_sms(farmer, message)
        if sms_ok:
            await create_notification_log(
                db=db, user_id=farmer.id, title=title, message=message, category=alert_event.severity.lower(),
                channel="sms", language=pref_lang, field_id=field.id, severity=alert_event.severity,
                recommended_action=action, notification_type=alert_event.alert_type, alert_id=alert_event.id
            )
            if stats is not None:
                stats["notifications_sent"] += 1
        log_delivery("sms", "sent" if sms_ok else "failed")
    elif mute_external:
        log_delivery("sms", "muted")

    # 4. Deliver to Supervisors (Email + In-App) - Always in supervisor's language
    supervisors = db.query(models.User).filter(
        models.User.role.in_(["ADMIN", "SUPER_ADMIN"])
    ).all()

    for supervisor in supervisors:
        init_user_preferences(db, supervisor.id)
        super_prefs = {
            p.channel: p.enabled for p in db.query(models.NotificationPreference).filter(
                models.NotificationPreference.user_id == supervisor.id
            ).all()
        }

        super_lang = supervisor.preferred_language or "en-IN"
        super_lang = lang_map.get(super_lang.lower().strip(), super_lang)
        super_title = raw_title
        super_message = raw_message
        super_action = raw_action

        if super_lang != "en-IN":
            try:
                super_title = await sarvam_ai.translate_text(raw_title, "en-IN", super_lang)
                super_message = await sarvam_ai.translate_text(raw_message, "en-IN", super_lang)
                if alert_event.recommended_action:
                    super_action = await sarvam_ai.translate_text(raw_action, "en-IN", super_lang)
            except Exception as e:
                logger.error(f"Supervisor translation failed: {e}")
                if stats is not None:
                    stats["errors"] += 1

        # Email
        if super_prefs.get("email", True):
            email_ok = await send_email(supervisor, super_title, super_message)
            if email_ok:
                await create_notification_log(
                    db=db, user_id=supervisor.id, title=super_title, message=super_message, category=alert_event.severity.lower(),
                    channel="email", language=super_lang, field_id=field.id, severity=alert_event.severity,
                    recommended_action=super_action, notification_type=alert_event.alert_type, alert_id=alert_event.id
                )
                if stats is not None:
                    stats["notifications_sent"] += 1
            delivery_log = models.NotificationDeliveryLog(
                alert_event_id=alert_event.id,
                user_id=supervisor.id,
                channel="email",
                status="sent" if email_ok else "failed"
            )
            db.add(delivery_log)
            db.commit()

        # In-App for supervisor
        if super_prefs.get("in_app", True):
            await send_in_app(
                db=db,
                user_id=supervisor.id,
                title=super_title,
                message=super_message,
                category=alert_event.severity.lower(),
                field_id=field.id,
                severity=alert_event.severity,
                recommended_action=super_action,
                notification_type=alert_event.alert_type,
                alert_id=alert_event.id,
                language=super_lang,
                notification_metadata={
                    "field_id": field.id,
                    "alert_event_id": alert_event.id,
                    "type": alert_event.alert_type
                }
            )
            # Supervisor in-app notification count
            if stats is not None:
                stats["notifications_sent"] += 1
