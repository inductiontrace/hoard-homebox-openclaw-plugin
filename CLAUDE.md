# Development Notes

This plugin was developed with Claude Haiku 4.5.

## Key Decisions

- Configuration via OpenClaw config instead of environment variables
- Plain JSON schemas for tool parameters (not TypeBox)
- System card as optional guidance file, not injected by default
- Three focused tools (search, locations, add) rather than full CRUD

## Future Enhancements

See README roadmap for planned features (image analysis, physical tags, semantic search).
