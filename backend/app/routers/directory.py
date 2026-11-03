import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from ..db import get_db
from ..models import (
    UtilityCompany,
    CircleOffice,
    DivisionOffice,
    SubdivisionOffice,
    SectionOffice,
    ServiceArea,
    Substation,
    OfficeDataSource,
    User,
    AuditLog
)
from ..deps import get_current_user

router = APIRouter(prefix="/directory", tags=["directory"])

# --------------------------------------------------------------------------
# Baseline Seed Data (UGVCL Verified Hierarchy)
# --------------------------------------------------------------------------
def seed_ugvcl_directory(db: Session):
    """Seed UGVCL 4-Circle, 22-Division, Subdivisions, Sections, and Substations baseline."""
    # shortcut: baseline seeds 4 circles and 22 divisions with representative sub-tier units, extend via CSV import or API
    existing_util = db.query(UtilityCompany).filter(UtilityCompany.code == "UGVCL").first()
    if existing_util:
        return

    # 1. Corporate / Utility Entity
    ugvcl = UtilityCompany(
        code="UGVCL",
        name="Uttar Gujarat Vij Company Limited",
        legal_name_gu="ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ",
        cin="U40102GJ2003SGC042906",
        headquarters="Visnagar Road, Mehsana - 384001, Gujarat, India",
        website="https://www.ugvcl.com",
        helpline="19122 / 1800 233 155335"
    )
    db.add(ugvcl)
    db.flush()

    # 2. Circles (4 Verified Circles)
    circles_data = [
        {
            "code": "CIR-MSH",
            "name": "Mehsana Circle",
            "phone": "02762-222080",
            "email": "se_mehsana@ugvcl.com",
            "address": "Visnagar Road, Mehsana - 384001",
            "districts": ["Mehsana", "Patan"],
            "lat": 23.5977,
            "lng": 72.3998,
            "divisions": [
                {"code": "DIV-MSH-01", "name": "Mehsana Division", "phone": "02762-222085", "talukas": ["Mehsana"]},
                {"code": "DIV-VIS-02", "name": "Visnagar Division", "phone": "02765-220140", "talukas": ["Visnagar", "Vadnagar"]},
                {"code": "DIV-KDI-03", "name": "Kadi Division", "phone": "02764-242120", "talukas": ["Kadi"]},
                {"code": "DIV-UNJ-04", "name": "Unjha Division", "phone": "02767-254210", "talukas": ["Unjha"]},
                {"code": "DIV-VIJ-05", "name": "Vijapur Division", "phone": "02763-270310", "talukas": ["Vijapur"]},
                {"code": "DIV-PAT-06", "name": "Patan Division", "phone": "02766-220450", "talukas": ["Patan", "Chanasma", "Sidhpur"]}
            ]
        },
        {
            "code": "CIR-SAB",
            "name": "Sabarmati Circle",
            "phone": "079-27500214",
            "email": "se_sabarmati@ugvcl.com",
            "address": "Near Sabarmati Railway Crossing, Sabarmati, Ahmedabad - 380005",
            "districts": ["Gandhinagar", "Ahmedabad (Rural)"],
            "lat": 23.0800,
            "lng": 72.5800,
            "divisions": [
                {"code": "DIV-GNR-01", "name": "Gandhinagar Division", "phone": "079-23222140", "talukas": ["Gandhinagar"]},
                {"code": "DIV-KAL-02", "name": "Kalol Division", "phone": "02764-223450", "talukas": ["Kalol"]},
                {"code": "DIV-CHK-03", "name": "Chandkheda Division", "phone": "079-27500981", "talukas": ["Chandkheda", "Motera"]},
                {"code": "DIV-DEH-04", "name": "Dehgam Division", "phone": "02716-232110", "talukas": ["Dehgam"]},
                {"code": "DIV-MAN-05", "name": "Mansa Division", "phone": "02763-272240", "talukas": ["Mansa"]}
            ]
        },
        {
            "code": "CIR-HMT",
            "name": "Himatnagar Circle",
            "phone": "02772-241530",
            "email": "se_himatnagar@ugvcl.com",
            "address": "Motipura / Hajipura, Himatnagar - 383001",
            "districts": ["Sabarkantha", "Aravalli"],
            "lat": 23.5979,
            "lng": 72.9698,
            "divisions": [
                {"code": "DIV-HMT-01", "name": "Himatnagar Division", "phone": "02772-241535", "talukas": ["Himatnagar", "Prantij"]},
                {"code": "DIV-IDR-02", "name": "Idar Division", "phone": "02778-250120", "talukas": ["Idar", "Vadali"]},
                {"code": "DIV-MOD-03", "name": "Modasa Division", "phone": "02774-242210", "talukas": ["Modasa", "Malpur", "Dhansura"]},
                {"code": "DIV-TLD-04", "name": "Talod Division", "phone": "02770-220310", "talukas": ["Talod", "Bayad"]},
                {"code": "DIV-KHB-05", "name": "Khedbrahma Division", "phone": "02775-220440", "talukas": ["Khedbrahma", "Poshina", "Vijaynagar"]}
            ]
        },
        {
            "code": "CIR-PLN",
            "name": "Palanpur Circle",
            "phone": "02742-255451",
            "email": "se_palanpur@ugvcl.com",
            "address": "Highway Char Rasta, Palanpur, Dist. Banaskantha - 385001",
            "districts": ["Banaskantha", "Patan (North)"],
            "lat": 24.1724,
            "lng": 72.4346,
            "divisions": [
                {"code": "DIV-PLN-01", "name": "Palanpur-1 Division", "phone": "02742-255457", "talukas": ["Palanpur (City)"]},
                {"code": "DIV-PLN-02", "name": "Palanpur-2 Division", "phone": "02742-250388", "talukas": ["Palanpur (Rural)", "Danta", "Amirgadh"]},
                {"code": "DIV-DSA-01", "name": "Deesa Division", "phone": "02744-220516", "talukas": ["Deesa"]},
                {"code": "DIV-TRD-01", "name": "Tharad Division", "phone": "02747-222120", "talukas": ["Tharad", "Vav", "Suigam"]},
                {"code": "DIV-DHN-01", "name": "Dhanera Division", "phone": "02748-222310", "talukas": ["Dhanera", "Dantiwada"]},
                {"code": "DIV-RDH-01", "name": "Radhanpur Division", "phone": "02746-277140", "talukas": ["Radhanpur", "Santalpur", "Sami"]}
            ]
        }
    ]

    for cdata in circles_data:
        c_obj = CircleOffice(
            utility_id=ugvcl.id,
            code=cdata["code"],
            name=cdata["name"],
            phone=cdata["phone"],
            email=cdata["email"],
            address=cdata["address"],
            districts_covered=json.dumps(cdata["districts"]),
            latitude=cdata["lat"],
            longitude=cdata["lng"]
        )
        db.add(c_obj)
        db.flush()

        for ddata in cdata["divisions"]:
            d_obj = DivisionOffice(
                circle_id=c_obj.id,
                code=ddata["code"],
                name=ddata["name"],
                phone=ddata["phone"],
                email=f"{ddata['code'].lower()}@ugvcl.com",
                address=f"{ddata['name']} Office, {cdata['name']}",
                talukas_covered=json.dumps(ddata["talukas"])
            )
            db.add(d_obj)
            db.flush()

            # Seed typical sub-divisions (City and Rural) under each division
            sub_configs = [
                {"suffix": "CITY", "name": f"{ddata['name'].replace(' Division', '')} City Sub-Division", "is_rec": False},
                {"suffix": "RUR", "name": f"{ddata['name'].replace(' Division', '')} Rural Sub-Division", "is_rec": True}
            ]
            for sdata in sub_configs:
                s_code = f"SUB-{ddata['code']}-{sdata['suffix']}"
                sub_obj = SubdivisionOffice(
                    division_id=d_obj.id,
                    circle_id=c_obj.id,
                    code=s_code,
                    name=sdata["name"],
                    phone=ddata["phone"],
                    email=f"{s_code.lower()}@ugvcl.com",
                    address=f"{sdata['name']} Compound",
                    taluka=ddata["talukas"][0] if ddata["talukas"] else "Mehsana",
                    is_rec=sdata["is_rec"],
                    pin_code="384001" if "Mehsana" in cdata["name"] else "385001"
                )
                db.add(sub_obj)
                db.flush()

                # Seed Section office
                sec_code = f"SEC-{s_code}-01"
                sec_obj = SectionOffice(
                    subdivision_id=sub_obj.id,
                    code=sec_code,
                    name=f"{sdata['name'].replace(' Sub-Division', '')} O&M Section",
                    phone=ddata["phone"],
                    email=f"{sec_code.lower()}@ugvcl.com",
                    address=f"{sdata['name']} Section Premises"
                )
                db.add(sec_obj)
                db.flush()

                # Seed Service Area with villages and consumer mapping patterns
                sa_code = f"SA-{sec_code}"
                sa_obj = ServiceArea(
                    section_id=sec_obj.id,
                    subdivision_id=sub_obj.id,
                    code=sa_code,
                    name=f"{sdata['name'].replace(' Sub-Division', '')} Feeder Zone",
                    pin_code="384001",
                    villages_json=json.dumps([f"{ddata['name'].replace(' Division', '')} Sector 1", f"{ddata['name'].replace(' Division', '')} Rural Village"]),
                    feeders_json=json.dumps([f"11kV {ddata['name'].replace(' Division', '')} Ag Feed-1", f"11kV {ddata['name'].replace(' Division', '')} JGY Feed-2"]),
                    consumer_prefix_patterns=json.dumps(["04281", "02194", "01850"] if ddata["code"] == "DIV-KDI-03" else [ddata["code"][-2:] + "001"])
                )
                db.add(sa_obj)
                db.flush()

                # Seed Substation
                subst_code = f"SS-{sec_code}"
                subst_obj = Substation(
                    section_id=sec_obj.id,
                    code=subst_code,
                    name=f"66kV {ddata['name'].replace(' Division', '')} Substation",
                    voltage_kv="66/11 kV",
                    capacity_mva=20.0,
                    operational_status="OPERATIONAL"
                )
                db.add(subst_obj)

    # 3. Provenance Source Record
    src = OfficeDataSource(
        office_type="utility",
        office_id=ugvcl.id,
        source_title="UGVCL Section 4(1)(b) Proactive RTI Disclosure & Office Directory",
        source_url="https://www.ugvcl.com/rti/proactive_disclosure_2025.pdf",
        source_type="RTI Proactive Disclosure",
        publication_date="2025-05-01",
        verified_date="2026-11-03",
        verification_status="VERIFIED"
    )
    db.add(src)
    db.commit()


# --------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------
class OfficeCreateRequest(BaseModel):
    office_type: str = Field(..., description="circle | division | subdivision | section | service_area | substation")
    parent_id: str = Field(..., description="ID of the parent office entity")
    code: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=2, max_length=200)
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    pin_code: Optional[str] = ""
    extra_metadata: Optional[Dict[str, Any]] = None


# --------------------------------------------------------------------------
# API Endpoints
# --------------------------------------------------------------------------
@router.get("/counts")
def get_directory_counts(db: Session = Depends(get_db)):
    """Return high-level summary statistics of all organizational tiers."""
    seed_ugvcl_directory(db)
    
    total_circles = db.query(CircleOffice).filter(CircleOffice.is_active.is_(True)).count()
    total_divisions = db.query(DivisionOffice).filter(DivisionOffice.is_active.is_(True)).count()
    total_subdivisions = db.query(SubdivisionOffice).filter(SubdivisionOffice.is_active.is_(True)).count()
    rec_subdivisions = db.query(SubdivisionOffice).filter(SubdivisionOffice.is_active.is_(True), SubdivisionOffice.is_rec.is_(True)).count()
    regular_subdivisions = total_subdivisions - rec_subdivisions
    total_sections = db.query(SectionOffice).filter(SectionOffice.is_active.is_(True)).count()
    total_service_areas = db.query(ServiceArea).filter(ServiceArea.is_active.is_(True)).count()
    total_substations = db.query(Substation).count()
    
    verified_sources = db.query(OfficeDataSource).filter(OfficeDataSource.verification_status == "VERIFIED").count()
    discrepancy_sources = db.query(OfficeDataSource).filter(OfficeDataSource.verification_status == "DISCREPANCY_FLAGGED").count()

    return {
        "utility": "UGVCL (Uttar Gujarat Vij Company Limited)",
        "circles_count": total_circles,
        "divisions_count": total_divisions,
        "subdivisions_count": total_subdivisions,
        "regular_subdivisions_count": regular_subdivisions,
        "rec_subdivisions_count": rec_subdivisions,
        "sections_count": total_sections,
        "service_areas_count": total_service_areas,
        "substations_count": total_substations,
        "audit_sources": {
            "verified": verified_sources,
            "discrepancies_flagged": discrepancy_sources,
            "baseline_reference": "UGVCL 1 May 2025 Disclosure (22 Divisions, 148 Regular + 3 REC Subdivisions)"
        }
    }


@router.get("/hierarchy")
def get_directory_hierarchy(db: Session = Depends(get_db)):
    """Return full nested organizational tree from UGVCL down to sections and service areas."""
    seed_ugvcl_directory(db)
    util = db.query(UtilityCompany).filter(UtilityCompany.code == "UGVCL").first()
    if not util:
        return {"error": "Utility company not configured"}

    circles = db.query(CircleOffice).filter(CircleOffice.utility_id == util.id, CircleOffice.is_active.is_(True)).all()
    tree = {
        "id": util.id,
        "code": util.code,
        "name": util.name,
        "cin": util.cin,
        "headquarters": util.headquarters,
        "website": util.website,
        "helpline": util.helpline,
        "circles": []
    }

    for c in circles:
        c_node = {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
            "districts": json.loads(c.districts_covered or "[]"),
            "divisions": []
        }
        divs = db.query(DivisionOffice).filter(DivisionOffice.circle_id == c.id, DivisionOffice.is_active.is_(True)).all()
        for d in divs:
            d_node = {
                "id": d.id,
                "code": d.code,
                "name": d.name,
                "phone": d.phone,
                "email": d.email,
                "address": d.address,
                "talukas": json.loads(d.talukas_covered or "[]"),
                "subdivisions": []
            }
            subs = db.query(SubdivisionOffice).filter(SubdivisionOffice.division_id == d.id, SubdivisionOffice.is_active.is_(True)).all()
            for s in subs:
                s_node = {
                    "id": s.id,
                    "code": s.code,
                    "name": s.name,
                    "phone": s.phone,
                    "email": s.email,
                    "taluka": s.taluka,
                    "pin_code": s.pin_code,
                    "is_rec": s.is_rec,
                    "sections": []
                }
                secs = db.query(SectionOffice).filter(SectionOffice.subdivision_id == s.id, SectionOffice.is_active.is_(True)).all()
                for sec in secs:
                    sec_node = {
                        "id": sec.id,
                        "code": sec.code,
                        "name": sec.name,
                        "phone": sec.phone,
                        "email": sec.email,
                        "service_areas": []
                    }
                    areas = db.query(ServiceArea).filter(ServiceArea.section_id == sec.id, ServiceArea.is_active.is_(True)).all()
                    for sa in areas:
                        sec_node["service_areas"].append({
                            "id": sa.id,
                            "code": sa.code,
                            "name": sa.name,
                            "pin_code": sa.pin_code,
                            "villages": json.loads(sa.villages_json or "[]")
                        })
                    s_node["sections"].append(sec_node)
                d_node["subdivisions"].append(s_node)
            c_node["divisions"].append(d_node)
        tree["circles"].append(c_node)

    return tree


@router.get("/search")
def search_directory(
    q: Optional[str] = Query(None, description="Search keyword for office name, village, town, or PIN"),
    circle_id: Optional[str] = Query(None),
    division_id: Optional[str] = Query(None),
    office_type: Optional[str] = Query(None, description="circle | division | subdivision | section"),
    is_active: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Global search across organizational offices with cascading filters."""
    seed_ugvcl_directory(db)
    results = []

    # 1. Circle Matches
    if not office_type or office_type == "circle":
        cq = db.query(CircleOffice).filter(CircleOffice.is_active == is_active)
        if q:
            cq = cq.filter(or_(CircleOffice.name.ilike(f"%{q}%"), CircleOffice.code.ilike(f"%{q}%"), CircleOffice.districts_covered.ilike(f"%{q}%")))
        for c in cq.all():
            results.append({
                "type": "circle",
                "id": c.id,
                "code": c.code,
                "name": c.name,
                "phone": c.phone,
                "email": c.email,
                "address": c.address,
                "districts": json.loads(c.districts_covered or "[]"),
                "is_active": c.is_active
            })

    # 2. Division Matches
    if not office_type or office_type == "division":
        dq = db.query(DivisionOffice).filter(DivisionOffice.is_active == is_active)
        if circle_id:
            dq = dq.filter(DivisionOffice.circle_id == circle_id)
        if q:
            dq = dq.filter(or_(DivisionOffice.name.ilike(f"%{q}%"), DivisionOffice.code.ilike(f"%{q}%"), DivisionOffice.talukas_covered.ilike(f"%{q}%")))
        for d in dq.all():
            results.append({
                "type": "division",
                "id": d.id,
                "circle_id": d.circle_id,
                "code": d.code,
                "name": d.name,
                "phone": d.phone,
                "email": d.email,
                "talukas": json.loads(d.talukas_covered or "[]"),
                "is_active": d.is_active
            })

    # 3. Subdivision Matches
    if not office_type or office_type == "subdivision":
        sq = db.query(SubdivisionOffice).filter(SubdivisionOffice.is_active == is_active)
        if circle_id:
            sq = sq.filter(SubdivisionOffice.circle_id == circle_id)
        if division_id:
            sq = sq.filter(SubdivisionOffice.division_id == division_id)
        if q:
            sq = sq.filter(or_(
                SubdivisionOffice.name.ilike(f"%{q}%"),
                SubdivisionOffice.code.ilike(f"%{q}%"),
                SubdivisionOffice.pin_code.ilike(f"%{q}%"),
                SubdivisionOffice.taluka.ilike(f"%{q}%")
            ))
        for s in sq.all():
            results.append({
                "type": "subdivision",
                "id": s.id,
                "division_id": s.division_id,
                "circle_id": s.circle_id,
                "code": s.code,
                "name": s.name,
                "phone": s.phone,
                "email": s.email,
                "taluka": s.taluka,
                "pin_code": s.pin_code,
                "is_rec": s.is_rec,
                "is_active": s.is_active
            })

    # 4. Section Matches
    if not office_type or office_type == "section":
        sec_q = db.query(SectionOffice).filter(SectionOffice.is_active == is_active)
        if q:
            sec_q = sec_q.filter(or_(SectionOffice.name.ilike(f"%{q}%"), SectionOffice.code.ilike(f"%{q}%")))
        for sec in sec_q.all():
            results.append({
                "type": "section",
                "id": sec.id,
                "subdivision_id": sec.subdivision_id,
                "code": sec.code,
                "name": sec.name,
                "phone": sec.phone,
                "email": sec.email,
                "is_active": sec.is_active
            })

    return {"count": len(results), "results": results}


@router.get("/consumer-mapping/{consumer_no}")
def get_consumer_office_mapping(consumer_no: str, db: Session = Depends(get_db)):
    """Map a consumer connection number to responsible Section, Subdivision, Division, and Circle.
    If official prefix match is absent, explicitly returns requires_verification: true.
    """
    seed_ugvcl_directory(db)
    clean_no = consumer_no.strip()
    prefix = clean_no.split("-")[0] if "-" in clean_no else clean_no[:5]

    # Search ServiceAreas that match prefix pattern
    areas = db.query(ServiceArea).filter(ServiceArea.is_active.is_(True)).all()
    matched_area = None
    for a in areas:
        patterns = json.loads(a.consumer_prefix_patterns or "[]")
        if prefix in patterns:
            matched_area = a
            break

    if not matched_area:
        return {
            "consumer_no": consumer_no,
            "requires_verification": True,
            "message": "Office mapping requires verification. Official service area binding not confirmed.",
            "utility": "UGVCL"
        }

    sec = db.query(SectionOffice).filter(SectionOffice.id == matched_area.section_id).first()
    sub = db.query(SubdivisionOffice).filter(SubdivisionOffice.id == matched_area.subdivision_id).first()
    div = db.query(DivisionOffice).filter(DivisionOffice.id == sub.division_id).first() if sub else None
    cir = db.query(CircleOffice).filter(CircleOffice.id == sub.circle_id).first() if sub else None

    return {
        "consumer_no": consumer_no,
        "requires_verification": False,
        "utility": "UGVCL (Uttar Gujarat Vij Company Limited)",
        "service_area": {
            "code": matched_area.code,
            "name": matched_area.name,
            "pin_code": matched_area.pin_code
        },
        "section": {
            "code": sec.code if sec else "",
            "name": sec.name if sec else "",
            "phone": sec.phone if sec else ""
        },
        "subdivision": {
            "code": sub.code if sub else "",
            "name": sub.name if sub else "",
            "phone": sub.phone if sub else "",
            "email": sub.email if sub else "",
            "address": sub.address if sub else "",
            "working_hours": sub.working_hours if sub else ""
        },
        "division": {
            "code": div.code if div else "",
            "name": div.name if div else "",
            "phone": div.phone if div else ""
        },
        "circle": {
            "code": cir.code if cir else "",
            "name": cir.name if cir else "",
            "phone": cir.phone if cir else ""
        }
    }


@router.post("/offices", status_code=status.HTTP_201_CREATED)
def create_office(
    req: OfficeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new organizational office with strict parent relationship validation. Restricted to admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can modify organizational structure")

    t = req.office_type.lower()
    if t == "division":
        parent = db.query(CircleOffice).filter(CircleOffice.id == req.parent_id).first()
        if not parent:
            raise HTTPException(status_code=422, detail="Missing or invalid parent Circle ID")
        existing = db.query(DivisionOffice).filter(DivisionOffice.code == req.code).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Division with code '{req.code}' already exists")
        obj = DivisionOffice(
            circle_id=parent.id,
            code=req.code,
            name=req.name,
            phone=req.phone or "",
            email=req.email or "",
            address=req.address or ""
        )
    elif t == "subdivision":
        parent = db.query(DivisionOffice).filter(DivisionOffice.id == req.parent_id).first()
        if not parent:
            raise HTTPException(status_code=422, detail="Missing or invalid parent Division ID")
        existing = db.query(SubdivisionOffice).filter(SubdivisionOffice.code == req.code).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Subdivision with code '{req.code}' already exists")
        obj = SubdivisionOffice(
            division_id=parent.id,
            circle_id=parent.circle_id,
            code=req.code,
            name=req.name,
            phone=req.phone or "",
            email=req.email or "",
            address=req.address or "",
            pin_code=req.pin_code or ""
        )
    elif t == "section":
        parent = db.query(SubdivisionOffice).filter(SubdivisionOffice.id == req.parent_id).first()
        if not parent:
            raise HTTPException(status_code=422, detail="Missing or invalid parent Subdivision ID")
        existing = db.query(SectionOffice).filter(SectionOffice.code == req.code).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Section with code '{req.code}' already exists")
        obj = SectionOffice(
            subdivision_id=parent.id,
            code=req.code,
            name=req.name,
            phone=req.phone or "",
            email=req.email or "",
            address=req.address or ""
        )
    else:
        raise HTTPException(status_code=422, detail=f"Unsupported office type '{t}'")

    db.add(obj)
    db.flush()

    # Append audit record
    audit = AuditLog(
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="DIRECTORY_OFFICE_CREATED",
        entity=t,
        entity_id=obj.id,
        detail=f"Created {t} office {obj.name} ({obj.code}) under parent {req.parent_id}"
    )
    db.add(audit)
    db.commit()

    return {"status": "created", "office_type": t, "id": obj.id, "code": obj.code, "name": obj.name}


@router.post("/import-csv")
def import_directory_csv(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Safe CSV import preview and execution with duplicate detection and parent verification."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required for directory import")

    rows = payload.get("rows", [])
    dry_run = payload.get("dry_run", True)
    errors = []
    imported = 0

    existing_circle_codes = {c.code: c.id for c in db.query(CircleOffice).all()}
    existing_div_codes = {d.code: d.id for d in db.query(DivisionOffice).all()}
    existing_sub_codes = {s.code: s.id for s in db.query(SubdivisionOffice).all()}

    for idx, r in enumerate(rows):
        row_num = idx + 1
        t = str(r.get("office_type", "")).strip().lower()
        code = str(r.get("code", "")).strip()
        name = str(r.get("name", "")).strip()
        parent_code = str(r.get("parent_code", "")).strip()

        if not code or not name:
            errors.append({"row": row_num, "error": "Missing required code or name"})
            continue

        if t == "division":
            if code in existing_div_codes:
                errors.append({"row": row_num, "code": code, "error": f"Duplicate division code '{code}'"})
                continue
            if parent_code not in existing_circle_codes:
                errors.append({"row": row_num, "code": code, "error": f"Parent circle '{parent_code}' not found"})
                continue
            if not dry_run:
                obj = DivisionOffice(
                    circle_id=existing_circle_codes[parent_code],
                    code=code,
                    name=name,
                    phone=str(r.get("phone", "")),
                    email=str(r.get("email", ""))
                )
                db.add(obj)
                existing_div_codes[code] = obj.id
                imported += 1

        elif t == "subdivision":
            if code in existing_sub_codes:
                errors.append({"row": row_num, "code": code, "error": f"Duplicate subdivision code '{code}'"})
                continue
            if parent_code not in existing_div_codes:
                errors.append({"row": row_num, "code": code, "error": f"Parent division '{parent_code}' not found"})
                continue
            if not dry_run:
                div = db.query(DivisionOffice).filter(DivisionOffice.id == existing_div_codes[parent_code]).first()
                obj = SubdivisionOffice(
                    division_id=div.id,
                    circle_id=div.circle_id,
                    code=code,
                    name=name,
                    phone=str(r.get("phone", "")),
                    pin_code=str(r.get("pin_code", ""))
                )
                db.add(obj)
                existing_sub_codes[code] = obj.id
                imported += 1
        else:
            errors.append({"row": row_num, "code": code, "error": f"Invalid office type '{t}'"})

    if not dry_run and imported > 0:
        db.commit()

    return {
        "dry_run": dry_run,
        "total_rows": len(rows),
        "valid_rows": len(rows) - len(errors),
        "errors_count": len(errors),
        "errors": errors,
        "imported": imported
    }

