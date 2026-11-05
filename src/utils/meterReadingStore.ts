/**
 * Meter Reading and Field Photo Store following IndexedDB photo blob pattern.
 */
export {
  openInspectionDb,
  storeInspectionPhoto,
  getInspectionPhoto,
  enqueueOfflineInspection,
  getOfflineInspections,
  removeOfflineInspection,
  syncOfflineInspections,
  IDB_NAME,
} from './transformerInspectionStore';

