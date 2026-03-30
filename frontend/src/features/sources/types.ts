// Source data types (gamma-ray sources from various catalogs)

export type SourceClass = 'PSR' | 'BLL' | 'FSRQ' | 'AGN' | 'UNK' | 'BIN' | 'HMB' | 'SNR';

export interface Source {
  id: string;
  name: string;
  ra: number; // Right Ascension (degrees, 0-360)
  dec: number; // Declination (degrees, -90 to 90)
  glon: number; // Galactic longitude (degrees, 0-360)
  glat: number; // Galactic latitude (degrees, -90 to 90)
  sourceClass: SourceClass;
  flux: number; // Photon flux (ph/cm²/s)
  spectralIndex: number;
  significance: number; // Detection significance (sigma)
}

export interface SourcesQueryParams {
  page: number; // 1-indexed
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Filters
  search?: string;
  sourceClass?: SourceClass[];
  raMin?: number;
  raMax?: number;
  decMin?: number;
  decMax?: number;
  fluxMin?: number;
  fluxMax?: number;
  significanceMin?: number;
}

export interface SourcesResponse {
  data: Source[];
  total: number;
  page: number;
  pageSize: number;
}

export const SOURCE_CLASS_LABELS: Record<SourceClass, string> = {
  PSR: 'Pulsar',
  BLL: 'BL Lac',
  FSRQ: 'Flat Spectrum Radio Quasar',
  AGN: 'Active Galactic Nucleus',
  UNK: 'Unknown',
  BIN: 'Binary System',
  HMB: 'High-Mass Binary',
  SNR: 'Supernova Remnant',
};

export const SOURCE_CLASS_OPTIONS: Array<{ value: SourceClass; label: string }> = 
  Object.entries(SOURCE_CLASS_LABELS).map(([value, label]) => ({
    value: value as SourceClass,
    label,
  }));
