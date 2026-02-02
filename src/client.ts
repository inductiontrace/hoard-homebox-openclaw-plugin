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

  async searchItemsExtended(query: string): Promise<HomeBoxItem[]> {
    // Get basic search results first
    const results = await this.searchItems(query);

    // Fetch full details for each item in parallel
    const fullItems = await Promise.all(
      results.map(item =>
        item.id ? this.request<HomeBoxItem>(`/api/v1/items/${item.id}`) : Promise.resolve(item)
      )
    );

    return fullItems;
  }

  async getLocations(): Promise<HomeBoxLocation[]> {
    return this.request<HomeBoxLocation[]>("/api/v1/locations");
  }

  async createItem(item: HomeBoxItem): Promise<HomeBoxItem> {
    // Step 1: Create item with basic fields (POST only accepts these)
    const createPayload: Record<string, unknown> = {
      name: item.name,
      quantity: item.quantity,
    };

    if (item.description !== undefined) createPayload.description = item.description;
    if (item.locationId !== undefined) createPayload.locationId = item.locationId;
    if (item.parentId !== undefined) createPayload.parentId = item.parentId;
    if (item.tagIds !== undefined) createPayload.tagIds = item.tagIds;

    const created = await this.request<HomeBoxItem>("/api/v1/items", "POST", createPayload);

    // Step 2: If extended fields provided, update item with PUT (POST endpoint ignores them)
    const hasExtendedFields =
      item.notes !== undefined ||
      item.serialNumber !== undefined ||
      item.modelNumber !== undefined ||
      item.manufacturer !== undefined ||
      item.insured !== undefined ||
      item.archived !== undefined ||
      item.lifetimeWarranty !== undefined ||
      item.warrantyExpires !== undefined ||
      item.warrantyDetails !== undefined ||
      item.purchaseTime !== undefined ||
      item.purchaseFrom !== undefined ||
      item.purchasePrice !== undefined;

    if (hasExtendedFields && created.id) {
      const updatePayload: Record<string, unknown> = {
        id: created.id,
        name: created.name,
        quantity: created.quantity,
      };

      if (item.description !== undefined) updatePayload.description = item.description;
      if (item.locationId !== undefined) updatePayload.locationId = item.locationId;
      if (item.notes !== undefined) updatePayload.notes = item.notes;
      if (item.serialNumber !== undefined) updatePayload.serialNumber = item.serialNumber;
      if (item.modelNumber !== undefined) updatePayload.modelNumber = item.modelNumber;
      if (item.manufacturer !== undefined) updatePayload.manufacturer = item.manufacturer;
      if (item.insured !== undefined) updatePayload.insured = item.insured;
      if (item.archived !== undefined) updatePayload.archived = item.archived;
      if (item.lifetimeWarranty !== undefined) updatePayload.lifetimeWarranty = item.lifetimeWarranty;
      if (item.warrantyExpires !== undefined) updatePayload.warrantyExpires = item.warrantyExpires;
      if (item.warrantyDetails !== undefined) updatePayload.warrantyDetails = item.warrantyDetails;
      if (item.purchaseTime !== undefined) updatePayload.purchaseTime = item.purchaseTime;
      if (item.purchaseFrom !== undefined) updatePayload.purchaseFrom = item.purchaseFrom;
      if (item.purchasePrice !== undefined) updatePayload.purchasePrice = item.purchasePrice;
      if (item.parentId !== undefined) updatePayload.parentId = item.parentId;
      if (item.tagIds !== undefined) updatePayload.tagIds = item.tagIds;

      return this.request<HomeBoxItem>(`/api/v1/items/${created.id}`, "PUT", updatePayload);
    }

    return created;
  }

  async attachFile(
    itemId: string,
    fileBuffer: Buffer,
    fileName: string,
    options?: { type?: string; primary?: boolean }
  ): Promise<HomeBoxItem> {
    const token = await this.ensureToken();
    const url = `${this.config.baseUrl}/api/v1/items/${itemId}/attachments`;

    // Build FormData
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substr(2, 16);
    const lines: string[] = [];

    // Add file field
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"`);
    lines.push(`Content-Type: application/octet-stream`);
    lines.push("");

    // Add name field
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="name"`);
    lines.push("");
    lines.push(fileName);

    // Add type field if provided
    if (options?.type) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Disposition: form-data; name="type"`);
      lines.push("");
      lines.push(options.type);
    }

    // Add primary field if provided
    if (options?.primary !== undefined) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Disposition: form-data; name="primary"`);
      lines.push("");
      lines.push(String(options.primary));
    }

    lines.push(`--${boundary}--`);

    // Build multipart body
    const textPart = lines.join("\r\n");
    const textBuffer = Buffer.from(textPart.substring(0, textPart.lastIndexOf("\r\n--" + boundary)));
    const endBuffer = Buffer.from("\r\n--" + boundary + "--\r\n");

    // Find the file insertion point (after the "filename" line + empty line)
    const fileMarkerIndex = textPart.indexOf('Content-Type: application/octet-stream\r\n\r\n');
    const beforeFile = textPart.substring(0, fileMarkerIndex + 'Content-Type: application/octet-stream\r\n\r\n'.length);
    const afterFile = textPart.substring(fileMarkerIndex + 'Content-Type: application/octet-stream\r\n\r\n'.length);
    const afterFileStart = afterFile.indexOf("\r\n--" + boundary);

    const beforeFileBuffer = Buffer.from(beforeFile);
    const afterFileBuffer = Buffer.from(afterFile.substring(afterFileStart));

    const body = Buffer.concat([beforeFileBuffer, fileBuffer, afterFileBuffer, endBuffer]);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`HomeBox API error ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as HomeBoxItem;
  }

  async deleteAttachment(itemId: string, attachmentId: string): Promise<void> {
    await this.request<void>(
      `/api/v1/items/${itemId}/attachments/${attachmentId}`,
      "DELETE"
    );
  }

  async updateAttachment(
    itemId: string,
    attachmentId: string,
    updates: { primary?: boolean }
  ): Promise<HomeBoxItem> {
    return this.request<HomeBoxItem>(
      `/api/v1/items/${itemId}/attachments/${attachmentId}`,
      "PUT",
      updates
    );
  }
}
