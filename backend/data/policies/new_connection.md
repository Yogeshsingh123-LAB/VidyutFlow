# Procedure for a New Electricity Connection (demo policy extract — synthetic/sample)
1. The consumer submits the new-connection request on the portal with identity/address proof and the requested load in kW. Enter once: the same record is used by the officer, field engineer and billing desk.
2. The system validates the phone, address, load and document. Incomplete requests are marked NEEDS_CORRECTION with the reason shown to the consumer.
3. The request is auto-routed by zone to an officer and a field engineer. No manual re-entry is needed.
4. The field engineer verifies the site, meter point and load, then records FIELD_VERIFIED / COMPLETED in the field app (works offline; syncs on reconnect).
5. The officer approves after field verification. SLA: CRITICAL 24h, HIGH 48h, MEDIUM 72h, LOW 120h from submission.
