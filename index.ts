/**
 * HomeBox Integration Plugin for Moltbot/OpenClaw
 *
 * Provides tools to query and manage HomeBox inventory
 */

import type { MoltbotPluginApi } from "openclaw/plugin-sdk";
import { HomeBoxClient } from "./src/client.js";

const plugin = {
  id: "homebox",
  name: "HomeBox Integration",
  description: "Query and manage HomeBox inventory",
  configSchema: {
    type: "object",
    properties: {
      baseUrl: {
        type: "string",
        description: "HomeBox server URL",
        default: "http://localhost:3100",
      },
      username: {
        type: "string",
        description: "HomeBox username",
      },
      password: {
        type: "string",
        description: "HomeBox password",
      },
    },
    required: ["username", "password"],
  },

  register(api: MoltbotPluginApi) {
    let client: HomeBoxClient | null = null;

    // Initialize client from plugin config or environment
    function getClient(): HomeBoxClient {
      if (client) return client;

      // Try plugin config first, then environment variables
      const pluginCfg = api.pluginConfig as any;
      const baseUrl =
        pluginCfg?.baseUrl ||
        process.env.HOMEBOX_URL ||
        "http://localhost:3100";
      const username =
        pluginCfg?.username || process.env.HOMEBOX_USERNAME;
      const password =
        pluginCfg?.password || process.env.HOMEBOX_PASSWORD;

      if (!username || !password) {
        throw new Error(
          "HomeBox plugin requires username and password (set in openclaw.json under plugins.entries.homebox.config or HOMEBOX_USERNAME/HOMEBOX_PASSWORD environment variables)"
        );
      }

      client = new HomeBoxClient({
        baseUrl,
        username,
        password,
      });

      return client;
    }

    // Tool 1: Search HomeBox inventory
    api.registerTool({
      name: "homebox_search",
      description:
        "Search HomeBox inventory by keyword (e.g., resistor, capacitor, TL072) - returns full item details",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What to search for",
          },
        },
        required: ["query"],
      },
      async execute(_id, params: { query: string }) {
        const client = getClient();
        const items = await client.searchItemsExtended(params.query);

        const text =
          items.length === 0
            ? "No items found."
            : `Found ${items.length} items:\n${items
                .map(
                  (item) =>
                    `• ${item.name} (qty: ${item.quantity}) @ ${item.location?.name || "Unknown"}${item.description ? `: ${item.description}` : ""}`
                )
                .join("\n")}`;

        return {
          content: [{ type: "text", text }],
        };
      },
    });

    // Tool 2: Get available locations
    api.registerTool({
      name: "homebox_get_locations",
      description: "List all available locations/bins in HomeBox",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      async execute(_id) {
        const client = getClient();
        const locations = await client.getLocations();

        const text =
          locations.length === 0
            ? "No locations found."
            : `Available locations:\n${locations.map((loc) => `• ${loc.name} (${loc.id})`).join("\n")}`;

        return {
          content: [{ type: "text", text }],
        };
      },
    });

    // Tool 3: Add item to HomeBox
    api.registerTool({
      name: "homebox_add_item",
      description: "Add a new item to HomeBox inventory",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Item name",
          },
          quantity: {
            type: "number",
            description: "Quantity",
          },
          description: {
            type: "string",
            description: "Item description",
          },
          locationId: {
            type: "string",
            description: "Location ID where item is stored",
          },
          notes: {
            type: "string",
            description: "Additional notes or comments",
          },
          serialNumber: {
            type: "string",
            description: "Serial number or asset ID",
          },
          modelNumber: {
            type: "string",
            description: "Model number or identifier",
          },
          manufacturer: {
            type: "string",
            description: "Manufacturer name",
          },
          insured: {
            type: "boolean",
            description: "Whether item is insured",
          },
          archived: {
            type: "boolean",
            description: "Archive item (hidden from normal search)",
          },
          lifetimeWarranty: {
            type: "boolean",
            description: "Whether item has lifetime warranty",
          },
          warrantyExpires: {
            type: "string",
            description: "Warranty expiration date (YYYY-MM-DD format)",
          },
          warrantyDetails: {
            type: "string",
            description: "Warranty coverage details",
          },
          purchaseTime: {
            type: "string",
            description: "Date item was purchased (YYYY-MM-DD format)",
          },
          purchaseFrom: {
            type: "string",
            description: "Where item was purchased (store, seller, etc.)",
          },
          purchasePrice: {
            type: "number",
            description: "Purchase price",
          },
          tagIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of tag IDs to assign",
          },
          parentId: {
            type: "string",
            description: "Parent item ID (for nested/bundled items)",
          },
        },
        required: ["name", "quantity"],
      },
      async execute(_id, params: any) {
        const client = getClient();
        const created = await client.createItem({
          name: params.name,
          quantity: params.quantity,
          description: params.description,
          locationId: params.locationId,
          notes: params.notes,
          serialNumber: params.serialNumber,
          modelNumber: params.modelNumber,
          manufacturer: params.manufacturer,
          insured: params.insured,
          archived: params.archived,
          lifetimeWarranty: params.lifetimeWarranty,
          warrantyExpires: params.warrantyExpires,
          warrantyDetails: params.warrantyDetails,
          purchaseTime: params.purchaseTime,
          purchaseFrom: params.purchaseFrom,
          purchasePrice: params.purchasePrice,
          tagIds: params.tagIds,
          parentId: params.parentId,
        });

        const text = `✓ Added to HomeBox:\n• Name: ${created.name}\n• Quantity: ${created.quantity}\n• Location: ${created.location?.name || "Unknown"}`;

        return {
          content: [{ type: "text", text }],
        };
      },
    });

    // Tool 4: Attach file or image to item
    api.registerTool({
      name: "homebox_attach_file",
      description: "Attach a file or image to a HomeBox item (supports jpg, png, pdf, etc.)",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The ID of the item to attach the file to",
          },
          filePath: {
            type: "string",
            description: "Path to the file to attach (e.g., /path/to/image.jpg or /tmp/document.pdf)",
          },
          fileName: {
            type: "string",
            description: "Display name for the file (e.g., 'receipt.jpg', 'manual.pdf'). If not provided, uses the filename from filePath",
          },
          type: {
            type: "string",
            description: "Type of attachment: 'photo' for images, 'attachment' for documents. Auto-detected if not provided",
          },
          primary: {
            type: "boolean",
            description: "Mark this as the primary/thumbnail image for the item",
          },
        },
        required: ["itemId", "filePath"],
      },
      async execute(_id, params: any) {
        const fs = require("fs");
        const path = require("path");

        try {
          const client = getClient();
          const filePath = params.filePath;
          const fileName = params.fileName || path.basename(filePath);

          // Resolve relative paths from current working directory
          const resolvedPath = path.resolve(filePath);

          // Check if file exists
          if (!fs.existsSync(resolvedPath)) {
            return {
              content: [
                {
                  type: "text",
                  text: `✗ File not found: ${resolvedPath}`,
                },
              ],
            };
          }

          // Read file as buffer
          const fileBuffer = fs.readFileSync(resolvedPath);

          // Attach file to item
          const result = await client.attachFile(params.itemId, fileBuffer, fileName, {
            type: params.type,
            primary: params.primary,
          });

          const attachment = result.attachments?.[result.attachments.length - 1];
          const text = `✓ Attached to ${result.name}:\n• File: ${fileName}\n• Type: ${attachment?.type || "file"}${params.primary ? "\n• Set as primary image" : ""}`;

          return {
            content: [{ type: "text", text }],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `✗ Failed to attach file: ${error.message}`,
              },
            ],
          };
        }
      },
    });

    // Tool 5: Delete an item
    api.registerTool({
      name: "homebox_delete_item",
      description: "Permanently delete an item from HomeBox (cannot be undone)",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The ID of the item to delete",
          },
        },
        required: ["itemId"],
      },
      async execute(_id, params: { itemId: string }) {
        try {
          const client = getClient();
          await client.deleteItem(params.itemId);
          return {
            content: [
              {
                type: "text",
                text: `✓ Item deleted successfully`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `✗ Failed to delete item: ${error.message}`,
              },
            ],
          };
        }
      },
    });

    // Tool 6: Remove an attachment from an item
    api.registerTool({
      name: "homebox_remove_attachment",
      description: "Remove a file or image attachment from an item",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The ID of the item",
          },
          attachmentId: {
            type: "string",
            description: "The ID of the attachment to remove",
          },
        },
        required: ["itemId", "attachmentId"],
      },
      async execute(_id, params: { itemId: string; attachmentId: string }) {
        try {
          const client = getClient();
          await client.deleteAttachment(params.itemId, params.attachmentId);
          return {
            content: [
              {
                type: "text",
                text: `✓ Attachment removed`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `✗ Failed to remove attachment: ${error.message}`,
              },
            ],
          };
        }
      },
    });

    // Tool 7: Create a new location
    api.registerTool({
      name: "homebox_create_location",
      description: "Create a new location/container in HomeBox (e.g., drawer, shelf, cabinet)",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the location (e.g., 'Shelf A', 'Tool Drawer')",
          },
          description: {
            type: "string",
            description: "Optional description of the location",
          },
          parentId: {
            type: "string",
            description: "Optional ID of parent location (for nested locations)",
          },
        },
        required: ["name"],
      },
      async execute(_id, params: any) {
        try {
          const client = getClient();
          const location = await client.createLocation({
            name: params.name,
            description: params.description,
            parentId: params.parentId,
          });
          const text = `✓ Created location:\n• Name: ${location.name}\n• ID: ${location.id}${location.description ? `\n• Description: ${location.description}` : ""}`;
          return {
            content: [{ type: "text", text }],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `✗ Failed to create location: ${error.message}`,
              },
            ],
          };
        }
      },
    });

    // Tool 8: Update an existing location
    api.registerTool({
      name: "homebox_update_location",
      description: "Update a location's name, description, or parent",
      parameters: {
        type: "object",
        properties: {
          locationId: {
            type: "string",
            description: "The ID of the location to update",
          },
          name: {
            type: "string",
            description: "New name for the location",
          },
          description: {
            type: "string",
            description: "New description for the location",
          },
          parentId: {
            type: "string",
            description: "New parent location ID (for moving to nested structure)",
          },
        },
        required: ["locationId"],
      },
      async execute(_id, params: any) {
        try {
          const client = getClient();
          const location = await client.updateLocation(params.locationId, {
            name: params.name,
            description: params.description,
            parentId: params.parentId,
          });
          const text = `✓ Updated location:\n• Name: ${location.name}${location.description ? `\n• Description: ${location.description}` : ""}`;
          return {
            content: [{ type: "text", text }],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `✗ Failed to update location: ${error.message}`,
              },
            ],
          };
        }
      },
    });

    // Tool 9: Delete a location
    api.registerTool({
      name: "homebox_delete_location",
      description: "Permanently delete a location (cannot be undone, items are not deleted)",
      parameters: {
        type: "object",
        properties: {
          locationId: {
            type: "string",
            description: "The ID of the location to delete",
          },
        },
        required: ["locationId"],
      },
      async execute(_id, params: { locationId: string }) {
        try {
          const client = getClient();
          await client.deleteLocation(params.locationId);
          return {
            content: [
              {
                type: "text",
                text: `✓ Location deleted successfully`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `✗ Failed to delete location: ${error.message}`,
              },
            ],
          };
        }
      },
    });
  },
};

export default plugin;
