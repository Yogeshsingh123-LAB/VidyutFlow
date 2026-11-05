"""Export current API schema without starting the app or seeding a database."""
import json
import os
import sys
import types
import importlib.metadata
from pathlib import Path

# Minimal shims if running in environment without optional runtime dependencies
backend = Path(__file__).resolve().parents[1]
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))
if 'pydantic_settings' not in sys.modules:
    try:
        import pydantic_settings
    except ImportError:
        import pydantic
        ps_mod = types.ModuleType('pydantic_settings')
        class BaseSettings(pydantic.BaseModel):
            def __init__(self, **values):
                env_vals = {}
                for k in getattr(self.__class__, "model_fields", {}):
                    val = os.environ.get(k.upper()) or os.environ.get(k)
                    if val is not None:
                        env_vals[k] = val
                env_vals.update(values)
                super().__init__(**env_vals)
        def SettingsConfigDict(**kwargs):
            return kwargs
        ps_mod.BaseSettings = BaseSettings
        ps_mod.SettingsConfigDict = SettingsConfigDict
        sys.modules['pydantic_settings'] = ps_mod

if 'bcrypt' not in sys.modules:
    try:
        import bcrypt
    except ImportError:
        import hashlib
        bc = types.ModuleType('bcrypt')
        bc.gensalt = lambda *a, **k: b"$2b$12$e8Yd8cOqK5yM1vYgq.Gk6e"
        bc.hashpw = lambda password, salt: b"$2b$12$e8Yd8cOqK5yM1vYgq.Gk6e" + hashlib.sha256(password).hexdigest()[:30].encode()
        bc.checkpw = lambda password, hashed: (
            hashed.endswith(hashlib.sha256(password).hexdigest()[:30].encode())
            if isinstance(hashed, bytes)
            else str(hashed).encode().endswith(hashlib.sha256(password).hexdigest()[:30].encode())
        )
        sys.modules['bcrypt'] = bc

if 'jose' not in sys.modules:
    try:
        import jose
    except ImportError:
        import base64
        j_mod = types.ModuleType('jose')
        jwt_mod = types.ModuleType('jwt')
        def _jwt_encode(claims, key, algorithm="HS256", **kwargs):
            h = base64.urlsafe_b64encode(json.dumps({"alg": algorithm}).encode()).decode().rstrip("=")
            clean_claims = {}
            for k, v in claims.items():
                clean_claims[k] = int(v.timestamp()) if hasattr(v, "timestamp") else v
            p = base64.urlsafe_b64encode(json.dumps(clean_claims).encode()).decode().rstrip("=")
            sig = base64.urlsafe_b64encode(hashlib.sha256(f"{h}.{p}".encode()).hexdigest().encode()).decode().rstrip("=")
            return f"{h}.{p}.{sig}"
        def _jwt_decode(token, key=None, algorithms=None, audience=None, issuer=None, **kwargs):
            parts = token.split(".")
            if len(parts) != 3:
                raise Exception("Invalid token")
            h, p, s = parts
            expected_sig = base64.urlsafe_b64encode(hashlib.sha256(f"{h}.{p}".encode()).hexdigest().encode()).decode().rstrip("=")
            if s != expected_sig:
                raise Exception("Invalid signature")
            padded = p + "=" * (-len(p) % 4)
            return json.loads(base64.urlsafe_b64decode(padded).decode())
        jwt_mod.encode = _jwt_encode
        jwt_mod.decode = _jwt_decode
        j_mod.jwt = jwt_mod
        j_mod.JWTError = Exception
        sys.modules['jose'] = j_mod

if 'email_validator' not in sys.modules:
    try:
        import email_validator
    except ImportError:
        ev = types.ModuleType('email_validator')
        class EmailNotValidError(ValueError): pass
        ev.EmailNotValidError = EmailNotValidError
        def _val_email(email, **kw):
            if "@" not in email or email.endswith("@"):
                raise EmailNotValidError("Invalid email")
            lp = email.split("@")[0]
            return types.SimpleNamespace(normalized=email, email=email, local_part=lp)
        ev.validate_email = _val_email
        ev.__version__ = '2.2.0'
        sys.modules['email_validator'] = ev

if 'joblib' not in sys.modules:
    try:
        import joblib
    except ImportError:
        j = types.ModuleType('joblib')
        mock_mdl = lambda p: types.SimpleNamespace(
            predict=lambda X: [1 if "billing" in str(p) else (150.0 if "load" in str(p) else ("NEW_CONNECTION" if "cat" in str(p) else "MEDIUM"))] * (len(X) if hasattr(X, "__len__") else 1),
            predict_proba=lambda X: [[0.8, 0.2]] * (len(X) if hasattr(X, "__len__") else 1),
            decision_function=lambda X: [0.1] * (len(X) if hasattr(X, "__len__") else 1),
            classes_=[0, 1],
        )
        j.load = mock_mdl
        j.dump = lambda *a, **kw: None
        sys.modules['joblib'] = j
else:
    import joblib
    if not hasattr(joblib, 'load'):
        mock_mdl = lambda p: types.SimpleNamespace(
            predict=lambda X: [1 if "billing" in str(p) else (150.0 if "load" in str(p) else ("NEW_CONNECTION" if "cat" in str(p) else "MEDIUM"))] * (len(X) if hasattr(X, "__len__") else 1),
            predict_proba=lambda X: [[0.8, 0.2]] * (len(X) if hasattr(X, "__len__") else 1),
            decision_function=lambda X: [0.1] * (len(X) if hasattr(X, "__len__") else 1),
            classes_=[0, 1],
        )
        joblib.load = mock_mdl
        joblib.dump = lambda *a, **kw: None

if 'pyotp' not in sys.modules:
    try:
        import pyotp
    except ImportError:
        p_mod = types.ModuleType('pyotp')
        p_mod.random_base32 = lambda: "JBSWY3DPEHPK3PXP"
        class MockTOTP:
            def __init__(self, s, **kw): self.s = s
            def now(self): return "123456"
            def verify(self, code, **kw): return str(code).strip() in ("123456",)
            def provisioning_uri(self, *a, **kw): return "otpauth://totp/vidyutflow?secret=JBSWY3DPEHPK3PXP"
        p_mod.TOTP = MockTOTP
        sys.modules['pyotp'] = p_mod

if 'sklearn' not in sys.modules:
    try:
        import sklearn
    except ImportError:
        sk = types.ModuleType('sklearn')
        sk.__path__ = []
        fe = types.ModuleType('sklearn.feature_extraction')
        fe.__path__ = []
        fet = types.ModuleType('sklearn.feature_extraction.text')
        class MockTfidf:
            def __init__(self, *a, **kw): pass
            def fit_transform(self, docs): return self
            def transform(self, q): return self
        fet.TfidfVectorizer = MockTfidf
        fe.text = fet
        me = types.ModuleType('sklearn.metrics')
        me.__path__ = []
        mep = types.ModuleType('sklearn.metrics.pairwise')
        try:
            import numpy as _np
            mep.cosine_similarity = lambda a, b: _np.array([[0.5] * (len(b) if hasattr(b, '__len__') else 2)])
        except Exception:
            mep.cosine_similarity = lambda a, b: [[0.5] * (len(b) if hasattr(b, '__len__') else 2)]
        me.pairwise = mep
        sk.feature_extraction = fe
        sk.metrics = me
        sys.modules['sklearn'] = sk
        sys.modules['sklearn.feature_extraction'] = fe
        sys.modules['sklearn.feature_extraction.text'] = fet
        sys.modules['sklearn.metrics'] = me
        sys.modules['sklearn.metrics.pairwise'] = mep

_orig_version = importlib.metadata.version
def _mock_version(name):
    if name == 'email-validator':
        return '2.2.0'
    return _orig_version(name)
importlib.metadata.version = _mock_version

try:
    _orig_dist = importlib.metadata.distribution
    def _mock_dist(name):
        if name == 'email-validator':
            return types.SimpleNamespace(version='2.2.0')
        return _orig_dist(name)
    importlib.metadata.distribution = _mock_dist
except Exception:
    pass

try:
    import pydantic.networks
    pydantic.networks.version = _mock_version
except Exception:
    pass

try:
    import app.ml.predict as p_mod
    p_mod.ensure_models = lambda: None
    p_mod._cache["category_model.joblib"] = types.SimpleNamespace(predict=lambda X: ["NEW_CONNECTION"])
    p_mod._cache["severity_model.joblib"] = types.SimpleNamespace(predict=lambda X: ["MEDIUM"])
    p_mod._cache["sla_model.joblib"] = types.SimpleNamespace(predict_proba=lambda X: [[0.8, 0.2]], classes_=[0, 1])
    p_mod._cache["billing_anomaly_model.joblib"] = types.SimpleNamespace(
        predict=lambda X: [1] * (len(X) if hasattr(X, "__len__") else 1),
        decision_function=lambda X: [0.1] * (len(X) if hasattr(X, "__len__") else 1),
    )
    p_mod._cache["load_forecast_model.joblib"] = types.SimpleNamespace(predict=lambda X: [100.0] * (len(X) if hasattr(X, "__len__") else 1))
except Exception:
    pass

backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend))

def export():
    os.environ["DATABASE_URL"] = "sqlite:///./vidyutflow.db"
    from app.main import app
    path = backend.parent / 'docs' / 'api' / 'openapi.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + '\n')
    print(f'Wrote {path}')

if __name__ == '__main__':
    export()
