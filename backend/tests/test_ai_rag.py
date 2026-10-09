# -*- coding: utf-8 -*-
"""
Comprehensive AI RAG Pipeline test and diagnostic script.
Run with: python backend/tests/test_ai_rag.py
"""
import sys
import io
import os
import asyncio
import json

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ.setdefault('ENVIRONMENT', 'development')


async def run_tests():
    from app.schemas.ai import PatientAssistantRequest
    from app.services.ai_service import solve_patient_doubt
    from app.services.rag_engine import rag_retriever, build_dynamic_patient_chunks, build_dynamic_department_snapshots

    print("=" * 70)
    print(" SehatSetu AI RAG Pipeline Diagnostic Test Suite")
    print("=" * 70)

    # --- 1. RAG Retrieval Tests ---
    print("\n[1] RAG Retrieval Diagnostics")
    patient_docs = build_dynamic_patient_chunks()
    dept_docs = build_dynamic_department_snapshots()
    print(f"  Dynamic patient chunks: {len(patient_docs)}")
    print(f"  Live dept snapshots: {len(dept_docs)}")
    if patient_docs:
        p = patient_docs[0]
        print(f"  Sample patient: {p.title}")
        print(f"  Content snippet: {p.content[:180].replace(chr(10),' | ')}")
    if dept_docs:
        d = dept_docs[0]
        print(f"  Sample dept snapshot: {d.title}")

    # --- 2. Retrieval scoring tests ---
    print("\n[2] Retrieval Scoring Tests")
    test_queries = [
        ("token 21 status", None),
        ("SS-2026-0021", None),
        ("how many waiting in emergency", None),
        ("Where is cardiology room", None),
        ("OPD timings and hours", None),
        ("Who gets called first why", None),
        ("Give me paracetamol", None),
        ("emergency ambulance number", None),
    ]

    for query, uhid in test_queries:
        chunks = rag_retriever.retrieve(query=query, uhid=uhid, top_k=3)
        top_cats = [c.document.category for c in chunks]
        top_titles = [c.document.title[:40] for c in chunks]
        top_scores = [round(c.similarity_score, 3) for c in chunks]
        print(f"\n  Q: '{query}'")
        print(f"    Top cats : {top_cats}")
        print(f"    Top titles: {top_titles}")
        print(f"    Scores   : {top_scores}")

    # --- 3. Full AI solve_patient_doubt tests ---
    print("\n\n[3] Full solve_patient_doubt Response Tests")
    ai_tests = [
        ("What is the current status of token 21?", "en"),
        ("How long will I have to wait? I have SS-2026-0021", "en"),
        ("How many patients are currently waiting in the emergency department?", "en"),
        ("Cardiology room number kya hai?", "hi"),
        ("Why was someone else called before me?", "en"),
        ("Where is the pharmacy and lab?", "en"),
        ("Can you give me paracetamol for my headache?", "en"),
        ("Emergency ambulance number kya hai?", "hi"),
        ("What documents should I bring to my appointment?", "en"),
    ]

    for question, lang in ai_tests:
        req = PatientAssistantRequest(question=question, language=lang)
        try:
            resp = await solve_patient_doubt(req)
            ans_snippet = resp.answer[:200].replace('\n', ' | ') if resp.answer else "(empty)"
            print(f"\n  Q [{lang}]: {question}")
            print(f"  Model     : {resp.model}")
            print(f"  AI Gen    : {resp.is_ai_generated}")
            print(f"  Sources   : {resp.grounded_sources[:2]}")
            print(f"  NeedsStaff: {resp.needs_staff_consultation}")
            print(f"  Answer    : {ans_snippet[:180]}")
        except Exception as e:
            print(f"\n  Q [{lang}]: {question}")
            print(f"  ERROR: {type(e).__name__}: {e}")

    print("\n" + "=" * 70)
    print(" All RAG tests completed.")
    print("=" * 70)


if __name__ == '__main__':
    asyncio.run(run_tests())
