export const PLOT_STATUSES = ["pending", "enrolled", "rejected"] as const;

export type PlotStatus = (typeof PLOT_STATUSES)[number];

export type PlotRow = {
  id: string;
  farmer_name: string;
  farmer_id: string;
  village_id: string;
  village_name: string;
  base: string;
  field_type: string | null;
  plot_id: string;
  lat: number | null;
  long: number | null;
  sample_id: string | null;
  sample_date: string | null;
  sample_picture_url: string | null;
  core_cut_type: string | null;
  sample_lat: number | null;
  sample_long: number | null;
  surveyor_name: string | null;
  surveyor_email: string | null;
  status: PlotStatus;
  collected_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Surveyor = {
  id: string;
  email: string;
  name: string;
  active: boolean;
};

export type VillageOption = {
  village_id: string;
  village_name: string;
};

export type FarmerGroup = {
  farmer_id: string;
  farmer_name: string;
  village_name: string;
  status: PlotStatus;
  plotCount: number;
  collectedCount: number;
  latestSampleDate: string | null;
};

export type SampleDraft = {
  sampleId: string;
  sampleDate: string;
  coreCutType: string;
  sampleLat: number | null;
  sampleLong: number | null;
  pictureFile: File | null;
  picturePreview: string | null;
  existingPictureUrl: string | null;
};
