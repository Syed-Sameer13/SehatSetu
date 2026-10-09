import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.schemas.department import DepartmentResponse
from app.schemas.patient import PatientResponse, PatientBase
from app.schemas.visit import VisitResponse
from app.schemas.triage import TriageAssessmentResponse, VitalObservations
from app.schemas.intake import PatientIntakeRequest, PatientIntakeData


class InMemoryDataStore:
    def __init__(self):
        self.departments: Dict[str, DepartmentResponse] = {}
        self.patients: Dict[str, PatientResponse] = {}
        self.visits: Dict[str, VisitResponse] = {}
        self.triage_assessments: Dict[str, TriageAssessmentResponse] = {}
        self._seed_initial_data()

    def _seed_initial_data(self):
        # Seed default departments
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

        # Seed demo patients
        demo_patient = PatientResponse(
            id="c1f72a4e-1234-5678-9abc-def012345678",
            uhid="SS-2026-0001",
            full_name="Aarav Sharma",
            age=48,
            gender="MALE",
            phone_number="+91-9876543210",
            emergency_contact_phone="+91-9876543211",
            address="B-42, Sector 14, Noida, UP",
            created_at=now,
            updated_at=now,
        )
        self.patients[demo_patient.id] = demo_patient

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

        # Compute preliminary assessment placeholder (connected to rules engine in Milestone 3)
        triage_id = str(uuid.uuid4())
        
        # Simple initial rule evaluation
        category = "MODERATE"
        score = 45
        evidence = ["Preliminary vitals recorded at intake."]
        missing = []
        
        v = intake.vital_observations
        if v.spo2 is not None and v.spo2 < 92:
            category = "CRITICAL"
            score = 95
            evidence.append(f"Severe Hypoxia: SpO2 < 92% (recorded: {v.spo2}%)")
        elif v.heart_rate is not None and v.heart_rate > 115:
            category = "HIGH"
            score = 75
            evidence.append(f"Marked Tachycardia: Heart Rate > 115 bpm (recorded: {v.heart_rate} bpm)")

        if v.spo2 is None:
            missing.append("spo2")
        if v.systolic_bp is None:
            missing.append("systolic_bp")

        triage = TriageAssessmentResponse(
            id=triage_id,
            visit_id=visit_id,
            urgency_category=category, # type: ignore
            urgency_score=score,
            rule_evidence=evidence,
            missing_vital_flags=missing,
            is_overridden=False,
            created_at=now,
            updated_at=now,
        )
        self.triage_assessments[visit_id] = triage

        # Compute queue position
        dept_waiting_visits = [
            v for v in self.visits.values()
            if v.department_id == intake.department_id and v.status == "WAITING"
        ]
        position = len(dept_waiting_visits)

        return PatientIntakeData(
            patient=patient,
            visit=visit,
            triage_assessment=triage,
            queue_position=position,
        )

    def get_visit_by_id(self, visit_id: str) -> Optional[VisitResponse]:
        return self.visits.get(visit_id)

    def get_triage_by_visit_id(self, visit_id: str) -> Optional[TriageAssessmentResponse]:
        return self.triage_assessments.get(visit_id)


store = InMemoryDataStore()
