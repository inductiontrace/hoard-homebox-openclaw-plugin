/**
 * HomeBox API Client
 *
 * Handles authentication and API calls to HomeBox
 */

export interface HomeBoxConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export interface HomeBoxItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  locationId?: string;
  location?: { id: string; name: string };
  notes?: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  insured?: boolean;
  archived?: boolean;
  lifetimeWarranty?: boolean;
  warrantyExpires?: string;
  warrantyDetails?: string;
  purchaseTime?: string;
  purchaseFrom?: string;
  purchasePrice?: number;
  tagIds?: string[];
  parentId?: string;
}

export interface HomeBoxLocation {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
}

export class HomeBoxClient {
  private config: HomeBoxConfig;
  private token: string | null = null;

  constructor(config: HomeBoxConfig) {
    // Validate URL scheme for security
    const url = config.baseUrl.toLowerCase();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new Error(
        "HomeBox baseUrl must use http:// or https:// scheme"
      );
    }
    this.config = config;
  }

  private async ensureToken(): Promise<string> {
    if (this.token) return this.token;

    const response = await fetch(
      `${this.config.baseUrl}/api/v1/users/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HomeBox login failed: ${response.statusText}`);
    }

    const data = (await response.json()) as LoginResponse;
    // Strip "Bearer " prefix if present
    this.token = data.token.replace(/^Bearer\s+/i, "");

    return this.token;
  }

  private async request<T>(
    endpoint: string,
    method: string = "GET",
    body?: unknown
  ): Promise<T> {
    const token = await this.ensureToken();
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `HomeBox API error ${response.status}: ${response.statusText}`
      );
    }

    return (await response.json()) as T;
  }

  async searchItems(query: string): Promise<HomeBoxItem[]> {
    const response = await this.request<{ items: HomeBoxItem[] }>(
      `/api/v1/items?search=${encodeURIComponent(query)}`
    );
    return response.items || [];
  }

  async getLocations(): Promise<HomeBoxLocation[]> {
    return this.request<HomeBoxLocation[]>("/api/v1/locations");
  }

  async createItem(item: HomeBoxItem): Promise<HomeBoxItem> {
    const payload: Record<string, unknown> = {
      name: item.name,
      quantity: item.quantity,
    };

    // Add optional fields if provided
    if (item.description !== undefined) payload.description = item.description;
    if (item.locationId !== undefined) payload.locationId = item.locationId;
    if (item.notes !== undefined) payload.notes = item.notes;
    if (item.serialNumber !== undefined) payload.serialNumber = item.serialNumber;
    if (item.modelNumber !== undefined) payload.modelNumber = item.modelNumber;
    if (item.manufacturer !== undefined) payload.manufacturer = item.manufacturer;
    if (item.insured !== undefined) payload.insured = item.insured;
    if (item.archived !== undefined) payload.archived = item.archived;
    if (item.lifetimeWarranty !== undefined) payload.lifetimeWarranty = item.lifetimeWarranty;
    if (item.warrantyExpires !== undefined) payload.warrantyExpires = item.warrantyExpires;
    if (item.warrantyDetails !== undefined) payload.warrantyDetails = item.warrantyDetails;
    if (item.purchaseTime !== undefined) payload.purchaseTime = item.purchaseTime;
    if (item.purchaseFrom !== undefined) payload.purchaseFrom = item.purchaseFrom;
    if (item.purchasePrice !== undefined) payload.purchasePrice = item.purchasePrice;
    if (item.tagIds !== undefined) payload.tagIds = item.tagIds;
    if (item.parentId !== undefined) payload.parentId = item.parentId;

    return this.request<HomeBoxItem>("/api/v1/items", "POST", payload);
  }
}
