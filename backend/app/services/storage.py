import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from app.schemas.department import DepartmentResponse
from app.schemas.patient import PatientResponse
from app.schemas.visit import VisitResponse, VisitStatusType
from app.schemas.triage import TriageAssessmentResponse, VitalObservations, UrgencyCategoryType
from app.schemas.intake import PatientIntakeRequest, PatientIntakeData
from app.schemas.queue import QueueEntryResponse
from app.schemas.audit import AuditLogResponse
from app.services.triage_engine import evaluate_triage, URGENCY_WEIGHTS


class InMemoryDataStore:
    def __init__(self):
        self.departments: Dict[str, DepartmentResponse] = {}
        self.patients: Dict[str, PatientResponse] = {}
        self.visits: Dict[str, VisitResponse] = {}
        self.triage_assessments: Dict[str, TriageAssessmentResponse] = {}
        self.audit_logs: List[AuditLogResponse] = []
        self._seed_initial_data()

    def _seed_initial_data(self):
        # 1. Seed departments
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
            self.departments[d.id] = d

        # 2. Seed synthetic demo patients and visits with different wait times and urgencies
        dept_er = depts[0].id

        # Patient 1: Moderate (Arrived 35 mins ago)
        p1 = PatientResponse(
            id="c1f72a4e-1234-5678-9abc-def012345678",
            uhid="SS-2026-0001",
            full_name="Rajesh Patel",
            age=35,
            gender="MALE",
            phone_number="+91-9876543212",
            address="12/4, Station Road, Ahmedabad, GJ",
            created_at=now - timedelta(minutes=35),
            updated_at=now - timedelta(minutes=35),
        )
        self.patients[p1.id] = p1
        v1_id = "v1-rajesh-patel"
        v1 = VisitResponse(
            id=v1_id,
            patient_id=p1.id,
            department_id=dept_er,
            chief_complaint="Moderate right ankle sprain and swelling after slipping on stairs.",
            vital_observations=VitalObservations(
                systolic_bp=128, diastolic_bp=82, heart_rate=78, spo2=98, temperature_f=98.6, gcs=15
            ),
            status="WAITING",
            arrival_time=now - timedelta(minutes=35),
            created_at=now - timedelta(minutes=35),
            updated_at=now - timedelta(minutes=35),
        )
        self.visits[v1_id] = v1
        self.triage_assessments[v1_id] = TriageAssessmentResponse(
            id="t1-rajesh",
            visit_id=v1_id,
            urgency_category="MODERATE",
            urgency_score=35,
            rule_evidence=["Stable vitals recorded.", "Moderate localized ankle trauma."],
            missing_vital_flags=[],
            is_overridden=False,
            created_at=now - timedelta(minutes=35),
            updated_at=now - timedelta(minutes=35),
        )

        # Patient 2: High Urgency (Arrived 20 mins ago)
        p2 = PatientResponse(
            id="d2e83b5f-5678-9abc-def0-123456789abc",
            uhid="SS-2026-0002",
            full_name="Sunita Devi",
            age=62,
            gender="FEMALE",
            phone_number="+91-9876543211",
            address="Flat 102, Shanti Nagar, Lucknow, UP",
            created_at=now - timedelta(minutes=20),
            updated_at=now - timedelta(minutes=20),
        )
        self.patients[p2.id] = p2
        v2_id = "v2-sunita-devi"
        v2 = VisitResponse(
            id=v2_id,
            patient_id=p2.id,
            department_id=dept_er,
            chief_complaint="High grade fever for 3 days with persistent vomiting, extreme lethargy and dizziness.",
            vital_observations=VitalObservations(
                systolic_bp=110, diastolic_bp=70, heart_rate=114, spo2=95, temperature_f=103.0, gcs=15
            ),
            status="WAITING",
            arrival_time=now - timedelta(minutes=20),
            created_at=now - timedelta(minutes=20),
            updated_at=now - timedelta(minutes=20),
        )
        self.visits[v2_id] = v2
        self.triage_assessments[v2_id] = TriageAssessmentResponse(
            id="t2-sunita",
            visit_id=v2_id,
            urgency_category="HIGH",
            urgency_score=75,
            rule_evidence=["Marked Tachycardia: 114 bpm", "High Fever: 103.0°F"],
            missing_vital_flags=[],
            is_overridden=False,
            created_at=now - timedelta(minutes=20),
            updated_at=now - timedelta(minutes=20),
        )

    def log_audit(
        self,
        action_type: str,
        visit_id: Optional[str] = None,
        previous_state: Optional[Dict[str, Any]] = None,
        new_state: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None,
    ):
        entry = AuditLogResponse(
            id=str(uuid.uuid4()),
            visit_id=visit_id,
            action_type=action_type,
            previous_state=previous_state,
            new_state=new_state,
            reason=reason,
            ip_address="127.0.0.1",
            created_at=datetime.now(timezone.utc),
        )
        self.audit_logs.append(entry)

    def get_departments(self) -> List[DepartmentResponse]:
        return list(self.departments.values())

    def get_department_by_id(self, dept_id: str) -> Optional[DepartmentResponse]:
        return self.departments.get(dept_id)

    def get_patients(self, search: Optional[str] = None) -> List[PatientResponse]:
        patients = list(self.patients.values())
        if search:
            s = search.lower()
            return [p for p in patients if s in p.full_name.lower() or s in p.uhid.lower()]
        return patients

    def get_patient_by_id(self, patient_id: str) -> Optional[PatientResponse]:
        return self.patients.get(patient_id)

    def get_patient_by_uhid(self, uhid: str) -> Optional[PatientResponse]:
        for p in self.patients.values():
            if p.uhid.lower() == uhid.lower():
                return p
        return None

    def create_or_get_patient(self, intake: PatientIntakeRequest) -> PatientResponse:
        now = datetime.now(timezone.utc)
        if intake.uhid:
            existing = self.get_patient_by_uhid(intake.uhid)
            if existing:
                return existing

        patient_id = str(uuid.uuid4())
        uhid_count = len(self.patients) + 1
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
        self.patients[patient_id] = patient
        return patient

    def process_intake(self, intake: PatientIntakeRequest) -> PatientIntakeData:
        now = datetime.now(timezone.utc)
        patient = self.create_or_get_patient(intake)

        visit_id = str(uuid.uuid4())
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
        self.visits[visit_id] = visit

        # Execute Deterministic Triage Rules Engine
        triage_eval = evaluate_triage(
            vitals=intake.vital_observations,
            chief_complaint=intake.chief_complaint,
            age=intake.age,
        )

        triage_id = str(uuid.uuid4())
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
        self.triage_assessments[visit_id] = triage

        # Log audit entry
        self.log_audit(
            action_type="PATIENT_INTAKE",
            visit_id=visit_id,
            new_state={
                "patient_name": patient.full_name,
                "urgency_category": triage.urgency_category,
                "urgency_score": triage.urgency_score,
            },
        )

        # Compute queue position
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
        entries: List[QueueEntryResponse] = []

        for visit in self.visits.values():
            if department_id and visit.department_id != department_id:
                continue
            if status and status != "ALL" and visit.status != status:
                continue

            patient = self.patients.get(visit.patient_id)
            if not patient:
                continue

            triage = self.triage_assessments.get(visit.id)
            urgency_cat = triage.urgency_category if triage else "LOW"
            urgency_score = triage.urgency_score if triage else 0
            evidence = triage.rule_evidence if triage else []
            is_overridden = triage.is_overridden if triage else False
            override_reason = triage.override_reason if triage else None

            # Calculate elapsed wait minutes
            wait_seconds = max((now - visit.arrival_time).total_seconds(), 0)
            wait_minutes = int(wait_seconds // 60)

            # Dynamic Priority Rank Formula: Base Urgency Weight + (Wait Minutes * 10)
            base_weight = URGENCY_WEIGHTS.get(urgency_cat, 500)
            priority_rank = base_weight + (wait_minutes * 10)

            dept = self.departments.get(visit.department_id)
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
                    is_overridden=is_overridden,
                    override_reason=override_reason,
                )
            )

        # Sort strictly by priority_rank DESC, arrival_time ASC
        entries.sort(key=lambda x: (-x.calculated_priority_rank, x.arrival_time))
        return entries

    def call_next(
        self, department_id: str, room_or_desk: str = "Consultation Room 1"
    ) -> Optional[QueueEntryResponse]:
        now = datetime.now(timezone.utc)
        # Get active waiting queue
        queue = self.get_queue(department_id=department_id, status="WAITING")
        if not queue:
            return None

        # Top patient in queue
        top_entry = queue[0]
        visit = self.visits.get(top_entry.visit_id)
        if visit:
            prev_status = visit.status
            visit.status = "CALLED"
            visit.called_at = now
            visit.updated_at = now

            self.log_audit(
                action_type="CALL_NEXT",
                visit_id=visit.id,
                previous_state={"status": prev_status},
                new_state={"status": "CALLED", "room": room_or_desk},
            )

        # Return updated entry
        updated_queue = self.get_queue(department_id=department_id, status="CALLED")
        for q in updated_queue:
            if q.visit_id == top_entry.visit_id:
                return q
        return top_entry

    def update_visit_status(
        self, visit_id: str, new_status: VisitStatusType, notes: Optional[str] = None
    ) -> Optional[VisitResponse]:
        now = datetime.now(timezone.utc)
        visit = self.visits.get(visit_id)
        if not visit:
            return None

        prev_status = visit.status
        visit.status = new_status
        visit.updated_at = now

        if new_status == "IN_CONSULTATION" and not visit.consultation_started_at:
            visit.consultation_started_at = now
        elif new_status == "COMPLETED" and not visit.completed_at:
            visit.completed_at = now

        self.log_audit(
            action_type="STATUS_UPDATE",
            visit_id=visit.id,
            previous_state={"status": prev_status},
            new_state={"status": new_status, "notes": notes},
        )
        return visit

    def override_triage_urgency(
        self, visit_id: str, new_category: UrgencyCategoryType, reason: str
    ) -> Optional[TriageAssessmentResponse]:
        now = datetime.now(timezone.utc)
        triage = self.triage_assessments.get(visit_id)
        if not triage:
            return None

        prev_category = triage.urgency_category
        triage.urgency_category = new_category
        triage.is_overridden = True
        triage.override_reason = reason
        triage.updated_at = now

        self.log_audit(
            action_type="PRIORITY_OVERRIDE",
            visit_id=visit_id,
            previous_state={"urgency_category": prev_category},
            new_state={"urgency_category": new_category, "reason": reason},
            reason=reason,
        )
        return triage

    def get_visit_by_id(self, visit_id: str) -> Optional[VisitResponse]:
        return self.visits.get(visit_id)

    def get_triage_by_visit_id(self, visit_id: str) -> Optional[TriageAssessmentResponse]:
        return self.triage_assessments.get(visit_id)

    def get_audit_logs(self, limit: int = 50) -> List[AuditLogResponse]:
        return sorted(self.audit_logs, key=lambda x: x.created_at, reverse=True)[:limit]


store = InMemoryDataStore()
