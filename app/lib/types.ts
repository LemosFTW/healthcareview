export interface ApiMessage {
  id: string;
  protocol: string;
  message_type: string;
  status: string;
  review_status?: string;
  raw_payload: string;
  decoded_payload: Record<string, unknown>;
  normalized_payload: {
    patient?: { id?: string; name?: string; date_of_birth?: string; sex?: string };
    identifiers?: { message_control_id?: string; sending_application?: string; sending_facility?: string };
    message_type?: string;
    datetime?: string;
    clinical_observations?: { identifier: string; value: string; units: string; reference_range: string; abnormal_flags: string; status: string }[];
    warnings?: string[];
  };
  warnings: unknown[];
  errors: unknown[];
  created_at: string;
}

export interface ApiLog {
  id: string;
  protocol: string;
  status: string;
  errors: unknown[];
  created_at: string;
  updated_at: string;
}

export interface UiLog {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
}
