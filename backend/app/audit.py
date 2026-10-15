from .models import AuditLog
def audit(db, actor, action, entity="", entity_id="", detail=""):
    db.add(AuditLog(actor_id=getattr(actor, "id", "system"), actor_role=getattr(actor, "role", "system"),
                    action=action, entity=entity, entity_id=entity_id, detail=str(detail)[:2000]))
