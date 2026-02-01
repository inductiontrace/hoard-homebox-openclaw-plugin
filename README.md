# Hoard — HomeBox Plugin for OpenClaw

Build an **intelligent inventory database** for your physical belongings. Turn HomeBox (open-source inventory management) into an AI-powered personal assistant that helps you find, organize, and track your stuff.

## Vision & Use Cases

### The Problem
You have stuff everywhere—tools in the garage, parts in drawers, supplies in boxes. Finding things takes forever. You buy duplicates because you forgot what you had.

### The Solution
An AI-powered inventory system that:

1. **Finds your stuff** — "Where are my 10kΩ resistors?" → Instant answer with location
2. **Prevents duplicates** — "Add 50 resistors" → System checks what you have, avoids re-buying
3. **Organizes intelligently** — Suggest storage locations based on item type and existing patterns
4. **Tracks stock levels** — Know when you're low on consumables
5. **Integrates with physical tags** — Scan QR codes, RFID tags, or Apple AirTags to locate valuable items

### Use Cases

- **Electronics/Maker Workshop**: Track components, tools, finished projects by part number and specs
- **Home Warehouse**: Manage paint, lumber, fasteners, tools across multiple storage areas
- **Lab/Office**: Catalog supplies, equipment, consumables with expiration tracking
- **Collections**: Organize books, games, hobby materials with detailed metadata
- **Supply Chain**: Small business inventory, parts tracking, stock forecasting (future)


## What is OpenClaw?

[OpenClaw](https://openclaw.ai) is an open-source agent framework that runs AI agents locally on your infrastructure. Unlike cloud-based assistants, OpenClaw gives you:

- **Local execution**: Agents run on your hardware, no data sent to third parties
- **Plugin architecture**: Extend agents with tools and integrations (like HomeBox)
- **Multi-channel support**: Deploy agents on WhatsApp, Signal, Discord, Telegram, and web
- **Flexible workflows**: Build multi-step autonomous processes combining multiple tools

This plugin bridges HomeBox and OpenClaw, letting you query and manage your inventory via natural language with any AI agent from a vast array of interface options.


## Status

**Alpha** — Core functionality stable. Configuration and API patterns validated.

## What It Does

Provides three agent tools:

- **`homebox_search`** — Search inventory by keyword (e.g., "resistors", "TL072 chips", "paint")
- **`homebox_get_locations`** — List all storage locations/bins
- **`homebox_add_item`** — Add new items to inventory with quantities, descriptions, and locations

Agents can combine these tools to manage inventory, answer "where is X?" questions, and prevent duplicate purchases.

## Installation

### Prerequisites
- OpenClaw installed and running
- HomeBox instance running and accessible
- HomeBox username and password

### Steps

1. **Install the plugin:**
   ```bash
   openclaw plugins install /path/to/homebox-plugin-dev
   ```
   (Or use `-l` for development: `openclaw plugins install -l /path/to/homebox-plugin-dev`)

2. **Configure credentials** in `~/.openclaw/openclaw.json`:
   ```json
   {
     "plugins": {
       "entries": {
         "hoard": {
           "enabled": true,
           "config": {
             "baseUrl": "http://localhost:3100",
             "username": "your-homebox-username",
             "password": "your-homebox-password"
           }
         }
       }
     }
   }
   ```

3. **Restart the gateway:**
   ```bash
   openclaw gateway restart
   ```

4. **Test it:**
   ```bash
   openclaw agent --message "what items do i have in storage?"
   ```

## Configuration

All config goes in `plugins.entries.hoard.config`:

| Field | Required | Description |
|-------|----------|-------------|
| `username` | Yes | HomeBox username or email |
| `password` | Yes | HomeBox password |
| `baseUrl` | No | HomeBox server URL (default: `http://localhost:3100`) |

Credentials must use `http://` or `https://` schemes. Other schemes are blocked for security.

## Usage Examples

### Basic Search
```bash
openclaw agent --message "do i have any resistors?"
```
→ Lists matching items with quantities and locations

### Add Items to Inventory
```bash
openclaw agent --message "add 25 1kΩ resistors to the electronics drawer"
```
Agent will:
1. Search for existing 1kΩ resistors (check for duplicates)
2. Confirm the item name and quantity
3. Find the location ID for "electronics drawer"
4. Create the inventory entry

**Multi-item example:**
```bash
openclaw agent --message "I just got new supplies. Add the following to the workshop:
- 50 assorted resistors (mixed 1k-100k ohms), store in parts bin 3
- 10 capacitors (ceramic, 0.1µF), parts bin 3
- 1 Arduino Nano clone, electronics cabinet
Make sure to include part numbers and specs in the descriptions."
```
Agent will:
1. Search for similar items (avoid duplicates)
2. Add each item with descriptive metadata
3. Organize by your suggested locations
4. Confirm what was added

### Inventory Organization
```bash
openclaw agent --message "what's in the garage? organize it for me and suggest a better layout"
```
Agent will:
1. List all items in the Garage location
2. Group by category (tools, materials, projects, etc.)
3. Suggest more efficient storage organization
4. Help you decide what to move

### Stock Management
```bash
openclaw agent --message "check inventory and tell me what i'm low on"
```
Agent can:
1. Search for consumables (resistors, solder, paint, etc.)
2. Flag items with low quantities
3. Suggest reordering popular items

## System Card & Agent Behavior

The plugin includes a `SYSTEM_CARD.md` that guides agent behavior when using HomeBox. It defines:

- How the agent should search and suggest locations
- Best practices for adding items with metadata
- Proactive organization suggestions
- Future tag integration behavior

### Loading the System Card

**Option 1: Let the agent use its defaults**
- The agent will use generic inventory management logic

**Option 2: Inject the system card into your agent's context**
- In your OpenClaw config, add to the agent's system prompt:
  ```json
  {
    "agents": {
      "list": [
        {
          "id": "default",
          "systemPrompt": "You are an intelligent inventory assistant...[include SYSTEM_CARD.md content]"
        }
      ]
    }
  }
  ```

**Option 3: Use a custom system prompt**
- Copy `SYSTEM_CARD.md`, modify it for your use case, and inject it as shown above
- Example customizations: focus on electronics vs. tools, enable stock forecasting, add your own location naming conventions

### Understanding System Injection

In OpenClaw, **system injection** refers to how context and instructions (system prompts) are passed to the LLM:

1. **Gateway Level**: OpenClaw's gateway applies a base system prompt to all agents
2. **Agent Level**: Each agent can have custom `systemPrompt` in config
3. **Plugin Level**: This plugin can register hooks (future) to modify prompts dynamically
4. **Tool Level**: Tools receive context about the session and agent, but don't inject prompts directly

The HomeBox plugin **respects** the agent's system context. If you have a system prompt that says "you are a librarian," the HomeBox tools will work within that context. You can modify system prompts in your OpenClaw config—no plugin changes needed.

**Customization Example:**
```json
{
  "agents": {
    "list": [
      {
        "id": "inventory-expert",
        "systemPrompt": "You are an expert warehouse manager specializing in inventory optimization. You have access to HomeBox tools. Before adding items, always search to prevent duplicates. Suggest locations based on item type, size, and access frequency. Ask clarifying questions about part numbers, specifications, and storage conditions."
      }
    ]
  }
}
```

## Roadmap

### Phase 1: Multi-step Autonomous Workflows (Planned)
**Goal**: Single-interaction workflow for cataloging items from photos

- Image analysis: User sends photo of workbench, tools, or parts
- QR code detection: Automatically scan QR codes on bins to identify location
- OCR for component analysis: Read resistor color codes, chip markings, labels
- Auto-categorization: Extract part numbers, specs, quantities from packaging
- Markdown export: Generate asset inventory lists for wikis and knowledge graphs

Example: *"I'm organizing my electronics drawer. Here's a photo."* → Agent detects location QR code + 47 resistors + 12 capacitors → Creates entries with part numbers from the packaging

### Phase 2: Physical Tag Integration (Planned)
**Goal**: Find items by scanning physical tags, not just searching

Support for multiple tagging systems:
- **QR Codes**: Link QR stickers to inventory entries (cheapest, reliable)
- **RFID Tags**: Passive/active RFID for warehouse-scale inventory
- **Apple AirTags**: Integration for valuable tools and equipment
- **Tile Trackers**: Bluetooth tracking for portable items
- **Generic BLE Tags**: Support other Bluetooth beacons

Features:
- Scan QR code with phone camera → Instant item lookup
- RFID reader at door → Alert if item leaves the workspace
- Find-My network → Locate lost or misplaced valuable items
- Location-based alerts → "Chisel left the workshop" notifications

### Phase 3: Semantic Search & AI Recommendations (Future)
- Vector embeddings for fuzzy matching ("ball peen hammer" finds "hammer, peen")
- Cross-reference with bill-of-materials databases
- Smart suggestions: "You have 3 Arduino Nano clones; add to existing project bin?"
- Expiration tracking with alerts for consumables
- Stock forecasting based on usage patterns

### Phase 4: Multi-Agent Coordination (Future)
- Multiple agents managing different warehouse sections
- Real-time sync across inventory instances
- Collaborative workflows: "Agent A checks tools out, Agent B tracks usage"
- Integration with supply chain systems for small business

## Architecture

- **Plugin SDK**: OpenClaw `plugin-sdk` for type-safe tool registration
- **Config Management**: Credentials in OpenClaw config, marked as sensitive
- **API Client**: Thin wrapper around HomeBox REST API with token-based auth
- **Error Handling**: Descriptive errors without credential leakage
- **System Card**: Optional guidance for agent behavior (not injected automatically)

## Development

### Project Structure
```
homebox-plugin-dev/
├── openclaw.plugin.json      # Manifest + configSchema
├── package.json              # Dependencies
├── index.ts                  # Tool registration (entry point)
├── src/
│   └── client.ts             # HomeBox API client wrapper
├── SYSTEM_CARD.md            # Agent behavior guidance (optional)
├── README.md                 # This file
└── package-lock.json
```

### Running Tests
```bash
npm install
npm test
```

### Making Changes
1. Edit code in `src/` or `index.ts`
2. If using symlink install (`-l`), gateway auto-reloads on restart
3. Restart gateway: `openclaw gateway restart`
4. Test: `openclaw agent --message "test query"`

### Adding Features
- New tools: Register in `index.ts` via `api.registerTool()`
- System hooks: Implement `api.registerHook()` for dynamic behavior (see Phase 1)
- Tag support: Extend `HomeBoxClient` with tag scanning/validation

## Security

- Credentials stored in config, marked `sensitive: true` in UI
- Token auth cached in memory, never exposed in logs or errors
- URL validation prevents pointing to non-HTTP(S) endpoints
- Plugin runs in-process with gateway; only install from trusted sources
- No file system access beyond what OpenClaw provides

## Troubleshooting

**"Hoard plugin requires username and password"**
- Check `plugins.entries.hoard.config.username` and `.password` in `~/.openclaw/openclaw.json`
- Verify no typos in the config path
- Restart gateway: `openclaw gateway restart`

**"HomeBox login failed"**
- Check HomeBox server is running at the configured `baseUrl`
- Verify username/password are correct
- Ensure HomeBox is accessible from your network (firewall, ports, etc.)

**Tools not appearing in agent**
- Verify plugin is installed: `openclaw plugins list`
- Check it's enabled: `openclaw plugins info hoard`
- Restart gateway: `openclaw gateway restart`

**Agent adds duplicate items**
- Agent doesn't know to search first (use SYSTEM_CARD to guide behavior)
- Or HomeBox search doesn't find the item (try broader search terms)
- Or item already exists with different name (consolidate manually in HomeBox UI)

**Can't connect to HomeBox**
- Check HomeBox is running: `curl http://localhost:3100`
- Verify firewall: Check if port 3100 is open
- Try IP address instead of hostname: `192.168.1.x:3100`

## Related

- [HomeBox](https://www.homebox.app/) — Open-source inventory management system
- [OpenClaw](https://openclaw.ai) — Local AI agent framework
- [OpenClaw Docs](https://docs.openclaw.ai) — Full documentation and guides

## Contributing

Found a bug or have a feature request? Open an issue or PR. Ideas for Phase 2+ are welcome!

## License

Same as the OpenClaw project.
