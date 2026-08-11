from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.database import Base, engine, init_db


@pytest.fixture(autouse=True, scope="module")
def reset_database():
	Base.metadata.drop_all(bind=engine)
	init_db()
