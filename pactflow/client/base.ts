export interface ProviderState {
  name: string;
  params?: Record<string, any> | null;
  consumers: string[];
}

export interface ProviderStatesResponse {
  providerStates: ProviderState[];
}
