export interface GraphqlApiError {
  message: string;
  status?: number;
  code?: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
}
