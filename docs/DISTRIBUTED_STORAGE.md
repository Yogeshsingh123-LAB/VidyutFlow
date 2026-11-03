# VidyutFlow – Shared Encrypted Document Storage

**Document Version:** 1.0.0  
**Authority:** Cloud & Data Architecture Lead  
**Specification:** AES-256-GCM Envelope Encryption + Shared Object Storage

---

## 1. Storage Architecture Overview

In multi-instance production environments, storing KYC documents, identity proofs, and field completion photos on local filesystems causes split-brain state and download failures. VidyutFlow resolves this with a unified storage abstraction layer (`BaseStorageProvider`) supporting local filesystem, MinIO, and AWS S3 object stores.

```
                    ┌───────────────────────────┐
                    │  Upload / Retrieval API   │
                    │   (FastAPI uploads.py)    │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │   AES-256-GCM Envelope    │
                    │   Encryption-at-Rest      │
                    │    (HKDF-SHA256 Deriv)    │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │    get_storage_provider   │
                    └──────┬─────────────┬──────┘
                           │             │
              STORAGE_PROVIDER=local     STORAGE_PROVIDER=s3|minio
                           ▼             ▼
                 ┌───────────────┐ ┌────────────────┐
                 │ LocalStorage  │ │ S3MinioStorage │
                 │ (Development) │ │  (Production)  │
                 └───────────────┘ └────────────────┘
```

---

## 2. Encryption-at-Rest Protocol (`VFENC1`)

All files are encrypted before leaving process memory:

1. **Envelope Header:** `VFENC1` (6-byte magic identifier).
2. **Salt:** 16 bytes cryptographically random (`os.urandom(16)`).
3. **Nonce:** 12 bytes cryptographically random initialization vector.
4. **Key Derivation:** HKDF-SHA256 with domain separation `vidyutflow-upload-at-rest-v1` derives a 256-bit AES key from the master secret.
5. **Authenticated Data (AAD):** Bound to the sanitized document filename to prevent ciphertext swapping.
6. **Payload:** AES-256-GCM authenticated ciphertext and 16-byte authentication tag.

---

## 3. Storage Provider Implementation (`backend/app/uploads.py`)

### Interface Contract

```python
class BaseStorageProvider(abc.ABC):
    @abc.abstractmethod
    def save(self, filename: str, encrypted_bytes: bytes) -> str: ...

    @abc.abstractmethod
    def load(self, filename: str, prefix: str | None = None) -> bytes: ...

    @abc.abstractmethod
    def exists(self, filename: str, prefix: str | None = None) -> bool: ...

    @abc.abstractmethod
    def delete(self, filename: str, prefix: str | None = None) -> bool: ...
```

### Configuration Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `STORAGE_PROVIDER` | `local` \| `s3` \| `minio` | `local` | Active storage driver |
| `UPLOAD_VAULT_DIR` | `string` | `uploads_encrypted` | Local disk directory (dev/single-node) |
| `S3_ENDPOINT_URL` | `string` | `""` | MinIO or private S3 endpoint URL |
| `S3_BUCKET_NAME` | `string` | `vidyutflow-documents` | S3 bucket destination |
| `S3_ACCESS_KEY` | `string` | `""` | AWS IAM or MinIO access key |
| `S3_SECRET_KEY` | `string` | `""` | AWS IAM or MinIO secret key |
| `S3_REGION` | `string` | `us-east-1` | S3 AWS Region |

---

## 4. Multi-Instance Production Safeguards

- When `APP_ENV=production` and `STORAGE_PROVIDER=local`, the application issues an operational warning advising configuration of S3 or MinIO.
- Path traversal protection is enforced via POSIX pure path canonicalization before file retrieval.
- File magic bytes (PDF, JPEG, PNG, UTF-8 text) are validated against binary executable disguise signatures prior to encryption.

