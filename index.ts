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
        "Search HomeBox inventory by keyword (e.g., resistor, capacitor, TL072)",
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
        const items = await client.searchItems(params.query);

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
            description: "Location ID",
          },
        },
        required: ["name", "quantity"],
      },
      async execute(_id, params) {
        const client = getClient();
        const created = await client.createItem({
          name: params.name,
          quantity: params.quantity,
          description: params.description,
          locationId: params.locationId,
        });

        const text = `✓ Added to HomeBox:\n• Name: ${created.name}\n• Quantity: ${created.quantity}\n• Location: ${created.location?.name || "Unknown"}`;

        return {
          content: [{ type: "text", text }],
        };
      },
    });
  },
};

export default plugin;
