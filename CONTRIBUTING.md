# Contributing to SehatSetu

Thank you for contributing to **SehatSetu — Smart Patient Queue & Emergency Triage**. This document outlines our development process, coding standards, branching strategy, and contribution workflow.

---

## 1. Code of Conduct & Clinical Safety Principles

SehatSetu is designed as a healthcare workflow and decision-support system. When contributing code, keep the following core tenets in mind:
- **Patient Privacy First:** Never submit real patient data, medical records, or production identifiers in tests, seed scripts, or issues.
- **Explainability:** Triage logic must remain transparent, deterministic, and traceable. No "black-box" decision models should override clinical rules.
- **Safety Fallbacks:** Always handle network errors, API timeouts, and missing vital observations safely and transparently.

---

## 2. Git Branching & Commit Conventions

### Branch Naming
- `feature/<feature-name>`: New feature implementations (e.g., `feature/triage-rules-engine`, `feature/queue-card-ui`).
- `fix/<bug-name>`: Bug fixes and edge-case corrections (e.g., `fix/concurrency-call-next`).
- `docs/<doc-name>`: Documentation updates and architectural records (e.g., `docs/api-contracts`).
- `refactor/<scope>`: Code refactoring without functional changes.

### Commit Messages (Conventional Commits)
Please follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature for the user or backend capability.
- `fix`: A bug fix.
- `docs`: Documentation only changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Changes to the build process, tooling, or dependencies.

**Example:**
```text
feat(triage): implement pediatric vital sign threshold rules
fix(queue): prevent race condition during simultaneous call-next actions
docs(api): update visit status enum description in api contract
```

---

## 3. Development Setup & Workflow

### Prerequisites
- **Node.js**: v18.x or v20.x LTS
- **Python**: v3.11 or higher
- **PostgreSQL / Supabase account**: Local Supabase CLI or cloud project instance
- **Git**: 2.30+

### Step-by-Step Workflow

1. **Fork or Clone the Repository:**
   ```bash
   git clone https://github.com/Syed-Sameer13/SehatSetu.git
   cd SehatSetu
   ```

2. **Set Up Backend:**
   ```bash
   cd backend
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux / macOS
   source venv/bin/activate

   pip install -r requirements.txt
   cp ../.env.example .env
   ```

3. **Set Up Frontend:**
   ```bash
   cd ../frontend
   npm install
   cp ../.env.example .env.local
   ```

4. **Apply Database Migrations:**
   Run migrations against your Supabase instance using the Supabase CLI or SQL editor:
   ```bash
   supabase db push
   ```

5. **Start Development Servers:**
   - Backend: `uvicorn app.main:app --reload --port 8000`
   - Frontend: `npm run dev` (starts Vite at `http://localhost:5173`)

---

## 4. Code Quality & Testing Expectations

All contributions must pass linting, type checks, and automated tests prior to submission.

### Backend Requirements
- **Linter & Formatter:** `ruff check app/` and `ruff format --check app/`
- **Type Checking:** `mypy app/`
- **Tests:** `pytest tests/` (must maintain test coverage for triage rule changes and queue transitions)

### Frontend Requirements
- **Linter:** `npm run lint`
- **Type Checking:** `npm run typecheck`
- **Build Verification:** `npm run build`

---

## 5. Pull Request (PR) Process

1. Ensure your branch is rebased on the latest `main` branch.
2. Verify all local tests and type checks pass.
3. Update relevant documentation in `docs/` if modifying database schemas, API contracts, or environment variables.
4. Submit a Pull Request with a clear description of changes, screenshots for UI modifications, and verification evidence.
5. Code reviews require approval from at least one project maintainer before merging.
