// REST
export {
  customFetch,
  setAccessTokenGetter,
  setOnUnauthorized,
  setOnForbidden,
  setRefreshTokenCallback,
} from "./rest/mutator/customFetch";
export type {
  AccessTokenGetter,
  OnUnauthorized,
  OnForbidden,
  RefreshTokenCallback,
} from "./rest/mutator/customFetch";
export type { ApiError } from "./rest/mutator/types";

// GraphQL
export { graphqlFetch } from "./graphql/mutator/graphqlFetch";
export type { GraphqlApiError } from "./graphql/mutator/types";

// Supabase
export {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  updateSupabaseSession,
  supabase,
} from "./supabase";
export type { Database } from "./supabase/types";
