import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.schemas.department import DepartmentResponse
from app.schemas.patient import PatientResponse
from app.schemas.visit import VisitResponse, VisitStatusType
from app.schemas.triage import TriageAssessmentResponse, VitalObservations, UrgencyCategoryType
from app.schemas.intake import PatientIntakeRequest, PatientIntakeData
from app.schemas.queue import QueueEntryResponse
from app.schemas.audit import AuditLogResponse
from app.schemas.analytics import AnalyticsOverviewResponse, DepartmentLoadStat, HourlyArrivalStat
from app.services.triage_engine import evaluate_triage, URGENCY_WEIGHTS
from app.core.supabase import get_supabase_client


def parse_iso_datetime(val: Any) -> datetime:
    """Robust ISO 8601 parser handling variable-length fractional seconds in Python 3.10."""
    if isinstance(val, datetime):
        return val
    if not val or not isinstance(val, str):
        return datetime.now(timezone.utc)
    s = val.replace("Z", "+00:00")
    if "." in s:
        try:
            main_part, frac_and_tz = s.split(".", 1)
            if "+" in frac_and_tz:
                frac, tz = frac_and_tz.split("+", 1)
                tz_str = "+" + tz
            elif "-" in frac_and_tz:
                frac, tz = frac_and_tz.split("-", 1)
                tz_str = "-" + tz
            else:
                frac = frac_and_tz
                tz_str = "+00:00"
            frac = (frac + "000000")[:6]
            s = f"{main_part}.{frac}{tz_str}"
        except Exception:
            pass
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return datetime.now(timezone.utc)


class DataStore:
    def __init__(self):
        self.fallback_departments: Dict[str, DepartmentResponse] = {}
        self.fallback_patients: Dict[str, PatientResponse] = {}
        self.fallback_visits: Dict[str, VisitResponse] = {}
        self.fallback_triage: Dict[str, TriageAssessmentResponse] = {}
        self.fallback_audit_logs: List[AuditLogResponse] = []
        self._seed_fallback_data()

    def _seed_fallback_data(self):
        now = datetime.now(timezone.utc)
        depts = [
            DepartmentResponse(
                id="9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                code="EMERGENCY",
                name="Emergency Department (ER)",
                description="Immediate acute stabilization and critical triage unit",
                is_active=True,
                created_at=now,
            ),
            DepartmentResponse(
                id="a2c3d4e5-1111-2222-3333-444455556666",
                code="GEN_MED",
                name="General Medicine (OPD)",
                description="Outpatient consultations for acute and chronic internal illnesses",
                is_active=True,
                created_at=now,
            ),
            DepartmentResponse(
                id="b3c4d5e6-2222-3333-4444-555566667777",
                code="PEDIATRICS",
                name="Pediatrics Unit",
                description="Child and adolescent clinical care",
                is_active=True,
                created_at=now,
            ),
        ]
        for d in depts:
            self.fallback_departments[d.id] = d

    def log_audit(
        self,
        action_type: str,
        visit_id: Optional[str] = None,
        previous_state: Optional[Dict[str, Any]] = None,
        new_state: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None,
        patient_name: Optional[str] = None,
        uhid: Optional[str] = None,
        department_name: Optional[str] = None,
        summary: Optional[str] = None,
    ):
        now = datetime.now(timezone.utc)
        log_id = str(uuid.uuid4())
        client = get_supabase_client()

        # Merge patient metadata into new_state if not already present
        audit_state = dict(new_state or {})
        if patient_name and "patient_name" not in audit_state:
            audit_state["patient_name"] = patient_name
        if uhid and "uhid" not in audit_state:
            audit_state["uhid"] = uhid
        if department_name and "department_name" not in audit_state:
            audit_state["department_name"] = department_name
        if summary and "summary" not in audit_state:
            audit_state["summary"] = summary

        if client:
            try:
                client.table("audit_logs").insert({
                    "id": log_id,
                    "visit_id": visit_id,
                    "action_type": action_type,
                    "previous_state": previous_state,
                    "new_state": audit_state,
                    "reason": reason,
                    "ip_address": "127.0.0.1",
                    "created_at": now.isoformat(),
                }).execute()
                return
            except Exception as e:
                print(f"[Supabase Audit Error] {e}")

        # Fallback in-memory
        entry = AuditLogResponse(
            id=log_id,
            visit_id=visit_id,
            patient_name=patient_name or audit_state.get("patient_name"),
            uhid=uhid or audit_state.get("uhid"),
            department_name=department_name or audit_state.get("department_name"),
            action_type=action_type,
            summary=summary or audit_state.get("summary"),
            previous_state=previous_state,
            new_state=audit_state,
            reason=reason,
            ip_address="127.0.0.1",
            created_at=now,
        )
        self.fallback_audit_logs.append(entry)

    def get_departments(self) -> List[DepartmentResponse]:
        client = get_supabase_client()
        if client:
            try:
                res = client.table("departments").select("*").eq("is_active", True).execute()
                if res.data:
                    return [
                        DepartmentResponse(
                            id=row["id"],
                            code=row["code"],
                            name=row["name"],
                            description=row.get("description"),
                            is_active=row.get("is_active", True),
                            created_at=parse_iso_datetime(row["created_at"]),
                        )
                        for row in res.data
                    ]
            except Exception as e:
                print(f"[Supabase get_departments Error] {e}")

        return list(self.fallback_departments.values())

    def get_department_by_id(self, dept_id: str) -> Optional[DepartmentResponse]:
        depts = self.get_departments()
        for d in depts:
            if d.id == dept_id:
                return d
        return None

    def get_patients(self, search: Optional[str] = None) -> List[PatientResponse]:
        client = get_supabase_client()
        if client:
            try:
                query = client.table("patients").select("*")
                if search:
                    query = query.ilike("full_name", f"%{search}%")
                res = query.order("created_at", desc=True).execute()
                if res.data:
                    return [
                        PatientResponse(
                            id=row["id"],
                            uhid=row["uhid"],
                            full_name=row["full_name"],
                            age=row["age"],
                            gender=row["gender"],
                            phone_number=row.get("phone_number"),
                            emergency_contact_phone=row.get("emergency_contact_phone"),
                            address=row.get("address"),
                            created_at=parse_iso_datetime(row["created_at"]),
                            updated_at=parse_iso_datetime(row.get("updated_at", row["created_at"])),
                        )
                        for row in res.data
                    ]
            except Exception as e:
                print(f"[Supabase get_patients Error] {e}")

        patients = list(self.fallback_patients.values())
        if search:
            s = search.lower()
            return [p for p in patients if s in p.full_name.lower() or s in p.uhid.lower()]
        return patients

    def get_patient_by_id(self, patient_id: str) -> Optional[PatientResponse]:
        client = get_supabase_client()
        if client:
            try:
                res = client.table("patients").select("*").eq("id", patient_id).execute()
                if res.data:
                    row = res.data[0]
                    return PatientResponse(
                        id=row["id"],
                        uhid=row["uhid"],
                        full_name=row["full_name"],
                        age=row["age"],
                        gender=row["gender"],
                        phone_number=row.get("phone_number"),
                        emergency_contact_phone=row.get("emergency_contact_phone"),
                        address=row.get("address"),
                        created_at=parse_iso_datetime(row["created_at"]),
                        updated_at=parse_iso_datetime(row.get("updated_at", row["created_at"])),
                    )
            except Exception as e:
                print(f"[Supabase get_patient_by_id Error] {e}")

        return self.fallback_patients.get(patient_id)

    def create_or_get_patient(self, intake: PatientIntakeRequest) -> PatientResponse:
        now = datetime.now(timezone.utc)
        client = get_supabase_client()

        if client:
            try:
                if intake.uhid:
                    existing = client.table("patients").select("*").eq("uhid", intake.uhid).execute()
                    if existing.data:
                        row = existing.data[0]
                        return PatientResponse(
                            id=row["id"],
                            uhid=row["uhid"],
                            full_name=row["full_name"],
                            age=row["age"],
                            gender=row["gender"],
                            phone_number=row.get("phone_number"),
                            emergency_contact_phone=row.get("emergency_contact_phone"),
                            address=row.get("address"),
                            created_at=parse_iso_datetime(row["created_at"]),
                            updated_at=parse_iso_datetime(row.get("updated_at", row["created_at"])),
                        )

                count_res = client.table("patients").select("id", count="exact").execute()
                total_count = (count_res.count or 0) + 1
                uhid = intake.uhid or f"SS-2026-{total_count:04d}"
                patient_id = str(uuid.uuid4())

                insert_res = client.table("patients").insert({
                    "id": patient_id,
                    "uhid": uhid,
                    "full_name": intake.full_name,
                    "age": intake.age,
                    "gender": intake.gender,
                    "phone_number": intake.phone_number,
                    "emergency_contact_phone": intake.emergency_contact_phone,
                    "address": intake.address,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }).execute()

                if insert_res.data:
                    row = insert_res.data[0]
                    return PatientResponse(
                        id=row["id"],
                        uhid=row["uhid"],
                        full_name=row["full_name"],
                        age=row["age"],
                        gender=row["gender"],
                        phone_number=row.get("phone_number"),
                        emergency_contact_phone=row.get("emergency_contact_phone"),
                        address=row.get("address"),
                        created_at=now,
                        updated_at=now,
                    )
            except Exception as e:
                print(f"[Supabase create_or_get_patient Error] {e}")

        # Fallback
        patient_id = str(uuid.uuid4())
        uhid_count = len(self.fallback_patients) + 1
        uhid = intake.uhid or f"SS-2026-{uhid_count:04d}"
        patient = PatientResponse(
            id=patient_id,
            uhid=uhid,
            full_name=intake.full_name,
            age=intake.age,
            gender=intake.gender,
            phone_number=intake.phone_number,
            emergency_contact_phone=intake.emergency_contact_phone,
            address=intake.address,
            created_at=now,
            updated_at=now,
        )
        self.fallback_patients[patient_id] = patient
        return patient

    def process_intake(self, intake: PatientIntakeRequest) -> PatientIntakeData:
        now = datetime.now(timezone.utc)
        patient = self.create_or_get_patient(intake)

        visit_id = str(uuid.uuid4())
        vitals_dict = intake.vital_observations.model_dump(exclude_none=True)

        triage_eval = evaluate_triage(
            vitals=intake.vital_observations,
            chief_complaint=intake.chief_complaint,
            age=intake.age,
        )
        triage_id = str(uuid.uuid4())

        client = get_supabase_client()
        if client:
            try:
                client.table("visits").insert({
                    "id": visit_id,
                    "patient_id": patient.id,
                    "department_id": intake.department_id,
                    "status": "WAITING",
                    "chief_complaint": intake.chief_complaint,
                    "vital_observations": vitals_dict,
                    "arrival_time": now.isoformat(),
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }).execute()

                client.table("triage_assessments").insert({
                    "id": triage_id,
                    "visit_id": visit_id,
                    "urgency_category": triage_eval.urgency_category,
                    "urgency_score": triage_eval.urgency_score,
                    "rule_evidence": triage_eval.rule_evidence,
                    "missing_vital_flags": triage_eval.missing_vital_flags,
                    "is_overridden": False,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }).execute()

                self.log_audit(
                    action_type="PATIENT_INTAKE",
                    visit_id=visit_id,
                    new_state={
                        "patient_name": patient.full_name,
                        "uhid": patient.uhid,
                        "urgency_category": triage_eval.urgency_category,
                        "urgency_score": triage_eval.urgency_score,
                    },
                )
            except Exception as e:
                print(f"[Supabase process_intake Write Error] {e}")

        visit = VisitResponse(
            id=visit_id,
            patient_id=patient.id,
            department_id=intake.department_id,
            chief_complaint=intake.chief_complaint,
            vital_observations=intake.vital_observations,
            status="WAITING",
            arrival_time=now,
            created_at=now,
            updated_at=now,
        )
        self.fallback_visits[visit_id] = visit

        triage = TriageAssessmentResponse(
            id=triage_id,
            visit_id=visit_id,
            urgency_category=triage_eval.urgency_category,
            urgency_score=triage_eval.urgency_score,
            rule_evidence=triage_eval.rule_evidence,
            missing_vital_flags=triage_eval.missing_vital_flags,
            is_overridden=False,
            created_at=now,
            updated_at=now,
        )
        self.fallback_triage[visit_id] = triage

        queue = self.get_queue(department_id=intake.department_id, status="WAITING")
        position = 1
        for idx, entry in enumerate(queue):
            if entry.visit_id == visit_id:
                position = idx + 1
                break

        return PatientIntakeData(
            patient=patient,
            visit=visit,
            triage_assessment=triage,
            queue_position=position,
        )

    def get_queue(
        self,
        department_id: Optional[str] = None,
        status: Optional[str] = "WAITING",
    ) -> List[QueueEntryResponse]:
        now = datetime.now(timezone.utc)
        client = get_supabase_client()

        if client:
            try:
                query = client.table("visits").select("*, patients(*), triage_assessments(*), departments(name)")
                if department_id:
                    query = query.eq("department_id", department_id)
                if status and status != "ALL":
                    query = query.eq("status", status)

                res = query.execute()
                if res.data:
                    entries: List[QueueEntryResponse] = []
                    for row in res.data:
                        patient_data = row.get("patients") or {}
                        triage_data = row.get("triage_assessments") or {}
                        dept_data = row.get("departments") or {}

                        urgency_cat = triage_data.get("urgency_category") or "LOW"
                        urgency_score = triage_data.get("urgency_score") or 0
                        evidence = triage_data.get("rule_evidence") or []
                        is_overridden = triage_data.get("is_overridden", False)
                        override_reason = triage_data.get("override_reason")

                        arrival_time = parse_iso_datetime(row["arrival_time"])
                        wait_seconds = max((now - arrival_time).total_seconds(), 0)
                        wait_minutes = int(wait_seconds // 60)

                        base_weight = URGENCY_WEIGHTS.get(urgency_cat, 500)
                        priority_rank = base_weight + (wait_minutes * 10)

                        vitals_raw = row.get("vital_observations") or {}
                        vitals_obj = VitalObservations(**vitals_raw) if isinstance(vitals_raw, dict) else VitalObservations()

                        entries.append(
                            QueueEntryResponse(
                                visit_id=row["id"],
                                patient_id=row["patient_id"],
                                uhid=patient_data.get("uhid", "SS-2026-XXXX"),
                                full_name=patient_data.get("full_name", "Unknown Patient"),
                                age=patient_data.get("age", 0),
                                gender=patient_data.get("gender", "OTHER"),
                                department_id=row["department_id"],
                                department_name=dept_data.get("name", "Clinical Department"),
                                urgency_category=urgency_cat,
                                urgency_score=urgency_score,
                                status=row["status"],
                                arrival_time=arrival_time,
                                waiting_duration_minutes=wait_minutes,
                                calculated_priority_rank=priority_rank,
                                chief_complaint=row.get("chief_complaint", ""),
                                rule_evidence=evidence,
                                vital_observations=vitals_obj,
                                is_overridden=is_overridden,
                                override_reason=override_reason,
                            )
                        )

                    entries.sort(key=lambda x: (-x.calculated_priority_rank, x.arrival_time))
                    return entries
            except Exception as e:
                print(f"[Supabase get_queue Error] {e}")

        # Fallback
        entries = []
        for visit in self.fallback_visits.values():
            if department_id and visit.department_id != department_id:
                continue
            if status and status != "ALL" and visit.status != status:
                continue

            patient = self.fallback_patients.get(visit.patient_id)
            if not patient:
                continue

            triage = self.fallback_triage.get(visit.id)
            urgency_cat = triage.urgency_category if triage else "LOW"
            urgency_score = triage.urgency_score if triage else 0
            evidence = triage.rule_evidence if triage else []

            wait_seconds = max((now - visit.arrival_time).total_seconds(), 0)
            wait_minutes = int(wait_seconds // 60)
            base_weight = URGENCY_WEIGHTS.get(urgency_cat, 500)
            priority_rank = base_weight + (wait_minutes * 10)

            dept = self.fallback_departments.get(visit.department_id)
            dept_name = dept.name if dept else "General Department"

            entries.append(
                QueueEntryResponse(
                    visit_id=visit.id,
                    patient_id=patient.id,
                    uhid=patient.uhid,
                    full_name=patient.full_name,
                    age=patient.age,
                    gender=patient.gender,
                    department_id=visit.department_id,
                    department_name=dept_name,
                    urgency_category=urgency_cat,
                    urgency_score=urgency_score,
                    status=visit.status,
                    arrival_time=visit.arrival_time,
                    waiting_duration_minutes=wait_minutes,
                    calculated_priority_rank=priority_rank,
                    chief_complaint=visit.chief_complaint,
                    rule_evidence=evidence,
                    vital_observations=visit.vital_observations,
                    is_overridden=triage.is_overridden if triage else False,
                    override_reason=triage.override_reason if triage else None,
                )
            )

        entries.sort(key=lambda x: (-x.calculated_priority_rank, x.arrival_time))
        return entries

    def call_next(
        self, department_id: str, room_or_desk: str = "Consultation Room 1"
    ) -> Optional[QueueEntryResponse]:
        now = datetime.now(timezone.utc)
        queue = self.get_queue(department_id=department_id, status="WAITING")
        if not queue:
            return None

        top_entry = queue[0]
        client = get_supabase_client()

        if client:
            try:
                client.table("visits").update({
                    "status": "CALLED",
                    "called_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }).eq("id", top_entry.visit_id).execute()

                self.log_audit(
                    action_type="CALL_NEXT",
                    visit_id=top_entry.visit_id,
                    previous_state={"status": "WAITING"},
                    new_state={"status": "CALLED", "room": room_or_desk},
                )
            except Exception as e:
                print(f"[Supabase call_next Error] {e}")

        top_entry.status = "CALLED"
        return top_entry

    def update_visit_status(
        self, visit_id: str, new_status: VisitStatusType, notes: Optional[str] = None
    ) -> Optional[VisitResponse]:
        now = datetime.now(timezone.utc)
        client = get_supabase_client()

        if client:
            try:
                update_data: Dict[str, Any] = {
                    "status": new_status,
                    "updated_at": now.isoformat(),
                }
                if new_status == "IN_CONSULTATION":
                    update_data["consultation_started_at"] = now.isoformat()
                elif new_status == "COMPLETED":
                    update_data["completed_at"] = now.isoformat()

                res = client.table("visits").update(update_data).eq("id", visit_id).execute()
                if res.data:
                    row = res.data[0]
                    self.log_audit(
                        action_type="STATUS_UPDATE",
                        visit_id=visit_id,
                        new_state={"status": new_status, "notes": notes},
                    )
                    return VisitResponse(
                        id=row["id"],
                        patient_id=row["patient_id"],
                        department_id=row["department_id"],
                        chief_complaint=row["chief_complaint"],
                        vital_observations=VitalObservations(**(row.get("vital_observations") or {})),
                        status=row["status"],
                        arrival_time=parse_iso_datetime(row["arrival_time"]),
                        called_at=parse_iso_datetime(row["called_at"]) if row.get("called_at") else None,
                        consultation_started_at=parse_iso_datetime(row["consultation_started_at"]) if row.get("consultation_started_at") else None,
                        completed_at=parse_iso_datetime(row["completed_at"]) if row.get("completed_at") else None,
                        created_at=parse_iso_datetime(row["created_at"]),
                        updated_at=now,
                    )
            except Exception as e:
                print(f"[Supabase update_visit_status Error] {e}")

        v = self.fallback_visits.get(visit_id)
        if v:
            v.status = new_status
            v.updated_at = now
            return v
        return None

    def override_triage_urgency(
        self, visit_id: str, new_category: UrgencyCategoryType, reason: str
    ) -> Optional[TriageAssessmentResponse]:
        now = datetime.now(timezone.utc)
        client = get_supabase_client()

        if client:
            try:
                res = client.table("triage_assessments").update({
                    "urgency_category": new_category,
                    "is_overridden": True,
                    "override_reason": reason,
                    "updated_at": now.isoformat(),
                }).eq("visit_id", visit_id).execute()

                if res.data:
                    row = res.data[0]
                    self.log_audit(
                        action_type="PRIORITY_OVERRIDE",
                        visit_id=visit_id,
                        new_state={"urgency_category": new_category, "reason": reason},
                        reason=reason,
                    )
                    return TriageAssessmentResponse(
                        id=row["id"],
                        visit_id=row["visit_id"],
                        urgency_category=row["urgency_category"],
                        urgency_score=row["urgency_score"],
                        rule_evidence=row.get("rule_evidence") or [],
                        missing_vital_flags=row.get("missing_vital_flags") or [],
                        is_overridden=True,
                        override_reason=reason,
                        created_at=parse_iso_datetime(row["created_at"]),
                        updated_at=now,
                    )
            except Exception as e:
                print(f"[Supabase override_triage_urgency Error] {e}")

        t = self.fallback_triage.get(visit_id)
        if t:
            t.urgency_category = new_category
            t.is_overridden = True
            t.override_reason = reason
            t.updated_at = now
            return t
        return None

    def get_visit_by_id(self, visit_id: str) -> Optional[VisitResponse]:
        client = get_supabase_client()
        if client:
            try:
                res = client.table("visits").select("*").eq("id", visit_id).execute()
                if res.data:
                    row = res.data[0]
                    return VisitResponse(
                        id=row["id"],
                        patient_id=row["patient_id"],
                        department_id=row["department_id"],
                        chief_complaint=row["chief_complaint"],
                        vital_observations=VitalObservations(**(row.get("vital_observations") or {})),
                        status=row["status"],
                        arrival_time=parse_iso_datetime(row["arrival_time"]),
                        called_at=parse_iso_datetime(row["called_at"]) if row.get("called_at") else None,
                        consultation_started_at=parse_iso_datetime(row["consultation_started_at"]) if row.get("consultation_started_at") else None,
                        completed_at=parse_iso_datetime(row["completed_at"]) if row.get("completed_at") else None,
                        created_at=parse_iso_datetime(row["created_at"]),
                        updated_at=parse_iso_datetime(row.get("updated_at", row["created_at"])),
                    )
            except Exception as e:
                print(f"[Supabase get_visit_by_id Error] {e}")

        return self.fallback_visits.get(visit_id)

    def get_triage_by_visit_id(self, visit_id: str) -> Optional[TriageAssessmentResponse]:
        client = get_supabase_client()
        if client:
            try:
                res = client.table("triage_assessments").select("*").eq("visit_id", visit_id).execute()
                if res.data:
                    row = res.data[0]
                    return TriageAssessmentResponse(
                        id=row["id"],
                        visit_id=row["visit_id"],
                        urgency_category=row["urgency_category"],
                        urgency_score=row["urgency_score"],
                        rule_evidence=row.get("rule_evidence") or [],
                        missing_vital_flags=row.get("missing_vital_flags") or [],
                        is_overridden=row.get("is_overridden", False),
                        override_reason=row.get("override_reason"),
                        created_at=parse_iso_datetime(row["created_at"]),
                        updated_at=parse_iso_datetime(row.get("updated_at", row["created_at"])),
                    )
            except Exception as e:
                print(f"[Supabase get_triage_by_visit_id Error] {e}")

        return self.fallback_triage.get(visit_id)

    def get_audit_logs(self, limit: int = 50) -> List[AuditLogResponse]:
        client = get_supabase_client()
        if client:
            try:
                res = client.table("audit_logs").select("*").order("created_at", desc=True).limit(limit).execute()
                if res.data:
                    logs: List[AuditLogResponse] = []
                    for row in res.data:
                        n_state = row.get("new_state") or {}
                        p_name = n_state.get("patient_name")
                        p_uhid = n_state.get("uhid")
                        d_name = n_state.get("department_name")
                        summary = n_state.get("summary")

                        # Fallback lookup if not cached in new_state
                        if not p_name and row.get("visit_id"):
                            try:
                                v_res = client.table("visits").select("patient_id, department_id, departments(name), patients(full_name, uhid)").eq("id", row["visit_id"]).execute()
                                if v_res.data:
                                    v_row = v_res.data[0]
                                    p_data = v_row.get("patients") or {}
                                    d_data = v_row.get("departments") or {}
                                    p_name = p_data.get("full_name")
                                    p_uhid = p_data.get("uhid")
                                    d_name = d_data.get("name")
                            except Exception:
                                pass

                        if not summary:
                            act = row.get("action_type", "")
                            if act == "PATIENT_INTAKE":
                                summary = f"Patient {p_name or 'Unknown'} registered with intake triage assessment."
                            elif act == "CALL_NEXT":
                                summary = f"Patient {p_name or 'Unknown'} called to consultation desk."
                            elif act == "PRIORITY_OVERRIDE":
                                summary = f"Priority category overridden to {n_state.get('urgency_category')} by clinician."
                            elif act == "STATUS_UPDATE":
                                summary = f"Patient visit status updated to {n_state.get('status')}."
                            else:
                                summary = f"Clinical action {act} executed."

                        logs.append(
                            AuditLogResponse(
                                id=row["id"],
                                visit_id=row.get("visit_id"),
                                patient_name=p_name,
                                uhid=p_uhid,
                                department_name=d_name,
                                action_type=row["action_type"],
                                summary=summary,
                                previous_state=row.get("previous_state"),
                                new_state=n_state,
                                reason=row.get("reason"),
                                ip_address=row.get("ip_address"),
                                created_at=parse_iso_datetime(row["created_at"]),
                            )
                        )
                    return logs
            except Exception as e:
                print(f"[Supabase get_audit_logs Error] {e}")

        return sorted(self.fallback_audit_logs, key=lambda x: x.created_at, reverse=True)[:limit]

    def get_analytics_overview(self) -> AnalyticsOverviewResponse:
        now = datetime.now(timezone.utc)
        all_visits = self.get_queue(status="ALL")
        depts = self.get_departments()

        total_registered = len(all_visits)
        waiting_count = sum(1 for v in all_visits if v.status == "WAITING")
        in_consultation_count = sum(1 for v in all_visits if v.status == "IN_CONSULTATION")
        completed_count = sum(1 for v in all_visits if v.status == "COMPLETED")

        # Urgency Distribution
        urgency_counts: Dict[str, int] = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MODERATE": 0,
            "LOW": 0,
            "NEEDS_REVIEW": 0,
        }
        for v in all_visits:
            cat = v.urgency_category
            if cat in urgency_counts:
                urgency_counts[cat] += 1
            else:
                urgency_counts["NEEDS_REVIEW"] += 1

        # Calculate average wait time (in minutes)
        wait_times = [v.waiting_duration_minutes for v in all_visits if v.status in ["WAITING", "CALLED"]]
        avg_wait = round(sum(wait_times) / len(wait_times), 1) if wait_times else 0.0

        # Department Load Breakdown
        dept_loads: List[DepartmentLoadStat] = []
        for d in depts:
            dept_visits = [v for v in all_visits if v.department_id == d.id]
            d_waiting = sum(1 for v in dept_visits if v.status == "WAITING")
            d_consulting = sum(1 for v in dept_visits if v.status == "IN_CONSULTATION")
            d_completed = sum(1 for v in dept_visits if v.status == "COMPLETED")
            d_waits = [v.waiting_duration_minutes for v in dept_visits if v.status in ["WAITING", "CALLED"]]
            d_avg = round(sum(d_waits) / len(d_waits), 1) if d_waits else 0.0

            dept_loads.append(
                DepartmentLoadStat(
                    department_id=d.id,
                    department_name=d.name,
                    waiting_count=d_waiting,
                    in_consultation_count=d_consulting,
                    completed_today=d_completed,
                    avg_wait_minutes=d_avg,
                )
            )

        # Hourly Intake Trend (Simulate / Group by arrival hour)
        hourly_map: Dict[str, int] = {
            "08:00": 4,
            "10:00": 8,
            "12:00": 14,
            "14:00": 11,
            "16:00": 7,
            "18:00": 5,
        }
        for v in all_visits:
            hour_str = f"{v.arrival_time.hour:02d}:00"
            hourly_map[hour_str] = hourly_map.get(hour_str, 0) + 1

        hourly_trends = [
            HourlyArrivalStat(hour_label=k, patient_count=v)
            for k, v in sorted(hourly_map.items())
        ]

        return AnalyticsOverviewResponse(
            total_registered_today=total_registered,
            currently_waiting=waiting_count,
            in_consultation=in_consultation_count,
            completed_today=completed_count,
            average_wait_time_minutes=avg_wait,
            urgency_distribution=urgency_counts,
            department_load=dept_loads,
            hourly_intake_trend=hourly_trends,
        )


store = DataStore()
