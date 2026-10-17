from sqlalchemy.exc import SQLAlchemyError

from app.models import User
from app.routers.system import status


class BrokenDatabase:
    rolled_back = False

    def execute(self, _statement):
        raise SQLAlchemyError('database unavailable')

    def rollback(self):
        self.rolled_back = True

    def query(self, _model):
        raise AssertionError('status must not query counts after the health check fails')


def test_database_failure_returns_degraded_status_without_count_queries():
    db = BrokenDatabase()
    result = status(db=db, u=User())

    assert db.rolled_back
    assert result['status'] == 'degraded'
    assert result['database']['ok'] is False
    assert result['counts'] is None
    assert next(service for service in result['services'] if service['name'] == 'Database')['status'] == 'Down'
